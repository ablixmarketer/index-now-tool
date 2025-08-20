import { XMLParser } from 'fast-xml-parser';
import pLimit from 'p-limit';
import { SitemapUrl } from '@shared/indexnow';

// Configure XML parser
const parser = new XMLParser({
  ignoreAttributes: false,
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true
});

// Concurrency limiter for HTTP requests
const limit = pLimit(5);

interface SitemapEntry {
  loc: string;
  lastmod?: string;
}

interface SitemapIndex {
  sitemap: Array<{
    loc: string;
    lastmod?: string;
  }>;
}

interface Sitemap {
  url: SitemapEntry[];
}

export class SitemapProcessor {
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
    
    const contentType = response.headers.get('content-type') || '';
    const isGzipped = contentType.includes('gzip') || url.endsWith('.gz');
    
    if (isGzipped) {
      // For browser environment, we'll need to handle gzipped content differently
      // In a real implementation, you might need a different approach for client-side gzip
      const arrayBuffer = await response.arrayBuffer();
      const decoder = new TextDecoder();
      return decoder.decode(arrayBuffer);
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
        // If no lastmod, try HEAD request
        try {
          const lastModified = await this.getLastModifiedFromHead(normalizedUrl);
          if (lastModified && lastModified < cutoffDate) {
            sitemapUrl.reason = 'old';
            sitemapUrl.lastmod = lastModified.toISOString();
          } else if (!lastModified) {
            sitemapUrl.reason = 'no-lastmod';
          }
        } catch {
          sitemapUrl.reason = 'no-lastmod';
        }
      }
      
      results.push(sitemapUrl);
    }
    
    return results;
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove trailing slash for consistency
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
      // Try as regex first
      if (pattern.startsWith('/') && pattern.endsWith('/')) {
        const regex = new RegExp(pattern.slice(1, -1), 'i');
        return regex.test(url);
      }
      // Otherwise treat as prefix match
      return url.toLowerCase().includes(pattern.toLowerCase());
    } catch {
      // Fallback to simple string match
      return url.toLowerCase().includes(pattern.toLowerCase());
    }
  }

  private async getLastModifiedFromHead(url: string): Promise<Date | null> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const lastModified = response.headers.get('last-modified');
      return lastModified ? new Date(lastModified) : null;
    } catch {
      return null;
    }
  }
}

export const sitemapProcessor = new SitemapProcessor();
