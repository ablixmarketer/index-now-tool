import { JSDOM } from 'jsdom';

export interface FetchedContent {
  url: string;
  html: string;
  statusCode: number;
  contentType: string;
}

export interface ExtractedPageContent {
  url: string;
  mainContent: string;
  sourceTag: 'main' | 'article' | 'body' | 'none';
  metadata: {
    title: string;
    description: string;
    canonical: string;
    robots: string;
    publishDate: string | null;
    lastModified: string | null;
  };
  schemas: Record<string, unknown>[];
  contentLength: number;
  warnings: string[];
}

// Fetch URL content with proper headers
export async function fetchUrlContent(
  url: string,
  timeout: number = 15000
): Promise<FetchedContent> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; IndexNow-Extension/1.0; +http://indexnow.org)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      throw new Error(`Invalid content type: ${contentType}`);
    }

    const html = await response.text();

    if (!html || html.length < 100) {
      throw new Error('Response body too small or empty');
    }

    return {
      url,
      html,
      statusCode: response.status,
      contentType,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to fetch ${url}: ${message}`);
  }
}

// Extract content from HTML
export function extractPageContent(fetched: FetchedContent): ExtractedPageContent {
  const warnings: string[] = [];

  try {
    // Parse HTML using JSDOM
    const dom = new JSDOM(fetched.html, {
      url: fetched.url,
      pretendToBeVisual: true,
    });

    const document = dom.window.document;

    // Extract main content - priority: <main> -> <article> -> <body>
    let mainContent = '';
    let sourceTag: 'main' | 'article' | 'body' | 'none' = 'none';

    const mainElement = document.querySelector('main');
    if (mainElement && mainElement.textContent?.trim()) {
      mainContent = mainElement.innerHTML;
      sourceTag = 'main';
    } else {
      const articleElement = document.querySelector('article');
      if (articleElement && articleElement.textContent?.trim()) {
        mainContent = articleElement.innerHTML;
        sourceTag = 'article';
      } else {
        const bodyElement = document.querySelector('body');
        if (bodyElement) {
          // Remove script, style, nav, footer from body
          const clone = bodyElement.cloneNode(true) as HTMLElement;

          // Remove unwanted elements
          const selectorsToRemove = ['script', 'style', 'nav', 'footer', 'header', '.sidebar', '.ads'];
          selectorsToRemove.forEach((selector) => {
            clone.querySelectorAll(selector).forEach((el) => el.remove());
          });

          mainContent = clone.innerHTML;
          sourceTag = 'body';

          if (mainContent.length < 500) {
            warnings.push('Content extracted from body tag is very short - may include headers/footers only');
          }
        }
      }
    }

    // Validate content
    if (!mainContent || mainContent.length < 100) {
      warnings.push('Extracted content is very short (< 100 chars)');
    }

    // Extract metadata
    const title =
      document.querySelector('title')?.textContent ||
      document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
      '';

    const description =
      document.querySelector('meta[name="description"]')?.getAttribute('content') ||
      document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
      '';

    const canonical =
      document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';

    const robots =
      document.querySelector('meta[name="robots"]')?.getAttribute('content') || '';

    // Extract dates
    const publishDate =
      document
        .querySelector('meta[property="article:published_time"]')
        ?.getAttribute('content') ||
      document.querySelector('meta[name="publish_date"]')?.getAttribute('content') ||
      document.querySelector('time[datetime]')?.getAttribute('datetime') ||
      null;

    const lastModified =
      document
        .querySelector('meta[property="article:modified_time"]')
        ?.getAttribute('content') ||
      document
        .querySelector('meta[http-equiv="last-modified"]')
        ?.getAttribute('content') ||
      null;

    // Extract schema markup (JSON-LD) - ONLY schema.org schemas
    const schemas: Record<string, unknown>[] = [];
    const schemaScripts = document.querySelectorAll('script[type="application/ld+json"]');
    let totalSchemaScripts = schemaScripts.length;

    // Debug: Log all found scripts
    console.log(`[DEBUG SCHEMA] Total JSON-LD scripts found: ${totalSchemaScripts}`);

    schemaScripts.forEach((script, index) => {
      try {
        const rawText = script.textContent || '';
        console.log(`[DEBUG SCHEMA] Script ${index + 1}: ${rawText.substring(0, 100)}...`);

        // Skip empty scripts
        if (!rawText.trim()) {
          console.log(`[DEBUG SCHEMA] Script ${index + 1}: Skipped (empty)`);
          return;
        }

        const schema = JSON.parse(rawText);
        console.log(`[DEBUG SCHEMA] Script ${index + 1} parsed successfully`);

        // Check if this is a schema.org schema by validating @context
        const context = schema['@context'];
        console.log(`[DEBUG SCHEMA] Script ${index + 1} @context:`, context);

        const isSchemaOrg =
          context === 'https://schema.org' ||
          (Array.isArray(context) && context.includes('https://schema.org'));

        if (isSchemaOrg) {
          console.log(`[DEBUG SCHEMA] Script ${index + 1}: MATCHED as schema.org (${schema['@type']})`);
          schemas.push(schema);
        } else {
          // Log non-schema.org schemas found
          const contextStr = typeof context === 'string' ? context : JSON.stringify(context);
          console.log(`[DEBUG SCHEMA] Script ${index + 1}: Skipped non-schema.org (@context = ${contextStr})`);
          warnings.push(`Skipped non-schema.org markup: @context = ${contextStr}`);
        }
      } catch (e) {
        const errorMsg = `Invalid JSON-LD schema: ${(e as Error).message}`;
        console.log(`[DEBUG SCHEMA] Script ${index + 1}: ${errorMsg}`);
        warnings.push(errorMsg);
      }
    });

    console.log(`[DEBUG SCHEMA] Final result: Found ${schemas.length} schema.org schemas out of ${totalSchemaScripts} total JSON-LD scripts`);

    if (totalSchemaScripts > 0 && schemas.length === 0) {
      warnings.push(`Found ${totalSchemaScripts} JSON-LD script(s) but none contained schema.org markup`);
    }

    // Validate content quality
    const textContent = mainContent.replace(/<[^>]*>/g, ' ').trim();

    if (textContent.length < 100) {
      warnings.push('Text content is too short');
    }

    if (textContent.split(' ').length < 50) {
      warnings.push('Text content has very few words');
    }

    // Check for duplicate/minimal content
    if (mainContent.includes('<script') || mainContent.includes('<style')) {
      warnings.push('Content contains script or style tags');
    }

    return {
      url: fetched.url,
      mainContent,
      sourceTag,
      metadata: {
        title,
        description,
        canonical,
        robots,
        publishDate,
        lastModified,
      },
      schemas,
      contentLength: mainContent.length,
      warnings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parsing error';
    throw new Error(`Failed to extract content: ${message}`);
  }
}

// Convert content to Bing submission format
export function convertToBingPayload(
  extracted: ExtractedPageContent
): {
  siteUrl: string;
  url: string;
  httpMessage: string;
  structuredData?: string;
  dynamicServing: '0' | '1';
} {
  // Extract site URL from full URL
  const urlObj = new URL(extracted.url);
  const siteUrl = urlObj.origin;

  // Clean HTML - remove scripts, styles, event handlers
  let cleanContent = extracted.mainContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Build HTTP message (Bing expects base64 encoded HTTP response)
  const httpResponse = `HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${cleanContent}`;

  // Encode to base64
  const httpMessage = Buffer.from(httpResponse).toString('base64');

  // Get first schema if available
  let structuredData: string | undefined;
  if (extracted.schemas.length > 0) {
    structuredData = JSON.stringify(extracted.schemas[0]);
  }

  return {
    siteUrl,
    url: extracted.url,
    httpMessage,
    structuredData,
    dynamicServing: '0', // We're not doing JS rendering
  };
}

// Sanitize content for debug preview
export function sanitizeForDebug(html: string, maxLength: number = 500): string {
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...';
  }

  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  return sanitized;
}
