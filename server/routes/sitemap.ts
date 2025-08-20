import { RequestHandler } from "express";
import { XMLParser } from 'fast-xml-parser';
import pLimit from 'p-limit';
import { SitemapScanRequestSchema, type SitemapScanResponse, type SitemapUrl } from "../../shared/indexnow";

const parser = new XMLParser({
  ignoreAttributes: false,
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true
});

const limit = pLimit(5);

interface SitemapEntry {
  loc: string;
  lastmod?: string;
}

export const handleSitemapScan: RequestHandler = async (req, res) => {
  try {
    const validation = SitemapScanRequestSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.error.errors
      });
    }

    const { sitemapUrl, days, include = [], exclude = [] } = validation.data;
    
    const processor = new SitemapProcessor();
    const urls = await processor.processSitemap(sitemapUrl, days, include, exclude);
    
    const response: SitemapScanResponse = {
      urls,
      totalUrls: urls.length,
      filteredUrls: urls.filter(u => u.reason === 'included').length,
      sitemapType: await processor.detectSitemapType(sitemapUrl)
    };
    
    res.json(response);
  } catch (error) {
    console.error('Sitemap scan error:', error);
    res.status(500).json({
      error: 'Failed to scan sitemap',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

class SitemapProcessor {
  private processedUrls = new Set<string>();
  
  async processSitemap(
    sitemapUrl: string,
    days: number,
    includePatterns: string[] = [],
    excludePatterns: string[] = []
  ): Promise<SitemapUrl[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const allUrls = await this.fetchAndParseSitemap(sitemapUrl);
    return this.filterUrls(allUrls, cutoffDate, includePatterns, excludePatterns);
  }

  async detectSitemapType(url: string): Promise<'standard' | 'index' | 'gzipped'> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('gzip') || url.endsWith('.gz')) {
        return 'gzipped';
      }
      
      // Fetch a small portion to check structure
      const partialResponse = await fetch(url, {
        headers: { 'Range': 'bytes=0-1023' }
      });
      const content = await partialResponse.text();
      
      if (content.includes('<sitemapindex')) {
        return 'index';
      }
      
      return 'standard';
    } catch {
      return 'standard';
    }
  }

  private async fetchAndParseSitemap(url: string): Promise<SitemapEntry[]> {
    const urls: SitemapEntry[] = [];
    
    try {
      const content = await this.fetchSitemapContent(url);
      const parsed = parser.parse(content);
      
      // Check if it's a sitemap index
      if (parsed.sitemapindex && parsed.sitemapindex.sitemap) {
        const sitemaps = Array.isArray(parsed.sitemapindex.sitemap) 
          ? parsed.sitemapindex.sitemap 
          : [parsed.sitemapindex.sitemap];
        
        // Process child sitemaps concurrently
        const childResults = await Promise.all(
          sitemaps.map(sitemap => 
            limit(() => this.fetchAndParseSitemap(sitemap.loc))
          )
        );
        
        urls.push(...childResults.flat());
      }
      // Regular sitemap
      else if (parsed.urlset && parsed.urlset.url) {
        const urlEntries = Array.isArray(parsed.urlset.url) 
          ? parsed.urlset.url 
          : [parsed.urlset.url];
        
        urls.push(...urlEntries.map(entry => ({
          loc: entry.loc,
          lastmod: entry.lastmod
        })));
      }
    } catch (error) {
      console.error(`Failed to process sitemap ${url}:`, error);
      throw new Error(`Failed to process sitemap: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return urls;
  }

  private async fetchSitemapContent(url: string): Promise<string> {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.text();
  }

  private async filterUrls(
    urls: SitemapEntry[],
    cutoffDate: Date,
    includePatterns: string[],
    excludePatterns: string[]
  ): Promise<SitemapUrl[]> {
    const results: SitemapUrl[] = [];
    const seenUrls = new Set<string>();
    
    for (const entry of urls) {
      const normalizedUrl = this.normalizeUrl(entry.loc);
      
      // Skip duplicates
      if (seenUrls.has(normalizedUrl)) continue;
      seenUrls.add(normalizedUrl);
      
      const sitemapUrl: SitemapUrl = {
        url: normalizedUrl,
        lastmod: entry.lastmod,
        reason: 'included',
        checked: true
      };
      
      // Apply exclude patterns first
      if (excludePatterns.length > 0) {
        const isExcluded = excludePatterns.some(pattern => 
          this.matchesPattern(normalizedUrl, pattern)
        );
        if (isExcluded) {
          sitemapUrl.reason = 'excluded';
          results.push(sitemapUrl);
          continue;
        }
      }
      
      // Apply include patterns
      if (includePatterns.length > 0) {
        const isIncluded = includePatterns.some(pattern => 
          this.matchesPattern(normalizedUrl, pattern)
        );
        if (!isIncluded) {
          sitemapUrl.reason = 'excluded';
          results.push(sitemapUrl);
          continue;
        }
      }
      
      // Check date filtering
      if (entry.lastmod) {
        const lastModified = new Date(entry.lastmod);
        if (lastModified < cutoffDate) {
          sitemapUrl.reason = 'old';
          results.push(sitemapUrl);
          continue;
        }
      } else {
        sitemapUrl.reason = 'no-lastmod';
      }
      
      results.push(sitemapUrl);
    }
    
    return results;
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      if (parsed.pathname.endsWith('/') && parsed.pathname.length > 1) {
        parsed.pathname = parsed.pathname.slice(0, -1);
      }
      return parsed.toString().toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  private matchesPattern(url: string, pattern: string): boolean {
    try {
      if (pattern.startsWith('/') && pattern.endsWith('/')) {
        const regex = new RegExp(pattern.slice(1, -1), 'i');
        return regex.test(url);
      }
      return url.toLowerCase().includes(pattern.toLowerCase());
    } catch {
      return url.toLowerCase().includes(pattern.toLowerCase());
    }
  }
}
