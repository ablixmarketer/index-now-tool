import { debugLogger } from '@shared/debug-types';

// Types for debug information
export interface DebugContext {
  debugModeEnabled: boolean;
  debugData: {
    contentExtraction: unknown;
    metadata: unknown;
    schema: unknown;
    urlSubmission: unknown;
    contentSubmission: unknown;
  };
}

// Helper to sanitize HTML for preview (remove scripts, styles, truncate)
export function sanitizeHTMLForPreview(html: string, maxLength: number = 500): string {
  // Remove script and style tags
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove HTML comments
  sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, '');

  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

  // Truncate and clean whitespace
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...';
  }

  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  return sanitized;
}

// Simple hash function for content comparison
export function generateSimpleHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

// Extract content with debug info
export function extractContentWithDebug(
  url: string,
  html: string,
  debugEnabled: boolean
): {
  content: string;
  sourceTag: 'main' | 'article' | 'body' | 'none';
  debugInfo: unknown;
} {
  // Parse HTML (browser-compatible approach)
  const parser = typeof DOMParser !== 'undefined' ? new DOMParser() : null;
  let doc: Document | null = null;

  try {
    if (parser) {
      doc = parser.parseFromString(html, 'text/html');
    }
  } catch (error) {
    console.error('Failed to parse HTML:', error);
  }

  let content = '';
  let sourceTag: 'main' | 'article' | 'body' | 'none' = 'none';

  if (doc) {
    // Try main tag first
    const mainElement = doc.querySelector('main');
    if (mainElement?.textContent?.trim()) {
      content = mainElement.innerHTML || '';
      sourceTag = 'main';
    } else {
      // Try article tag
      const articleElement = doc.querySelector('article');
      if (articleElement?.textContent?.trim()) {
        content = articleElement.innerHTML || '';
        sourceTag = 'article';
      } else {
        // Fallback to body
        const bodyElement = doc.querySelector('body');
        content = bodyElement?.innerHTML || '';
        sourceTag = 'body';
      }
    }
  }

  const debugInfo = debugEnabled
    ? {
        sourceTag,
        characterCount: content.length,
        sanitizedPreview: sanitizeHTMLForPreview(content),
        isValid: content.length > 100, // Valid if more than 100 chars
        isEmpty: content.length === 0,
        isHeaderFooterOnly: detectHeaderFooterOnly(content),
        warnings: validateContentQuality(content),
      }
    : null;

  if (debugEnabled) {
    console.log(
      `[DEBUG] Content Extraction for ${url}:`,
      debugInfo
    );
  }

  return { content, sourceTag, debugInfo };
}

// Extract metadata with debug info
export function extractMetadataWithDebug(
  url: string,
  html: string,
  debugEnabled: boolean
): {
  metadata: {
    title: string;
    description: string;
    canonical: string;
    robots: string;
    publishDate: string | null;
    lastModified: string | null;
  };
  debugInfo: unknown;
} {
  const parser = typeof DOMParser !== 'undefined' ? new DOMParser() : null;
  let doc: Document | null = null;

  try {
    if (parser) {
      doc = parser.parseFromString(html, 'text/html');
    }
  } catch (error) {
    console.error('Failed to parse HTML:', error);
  }

  const metadata = {
    title: doc?.querySelector('title')?.textContent || '',
    description:
      doc?.querySelector('meta[name="description"]')?.getAttribute('content') || '',
    canonical: doc?.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
    robots: doc?.querySelector('meta[name="robots"]')?.getAttribute('content') || '',
    publishDate: extractDate(doc, 'article:published_time') || extractDate(doc, 'publish_date'),
    lastModified:
      extractDate(doc, 'article:modified_time') || extractDate(doc, 'last-modified'),
  };

  const debugInfo = debugEnabled
    ? {
        title: metadata.title,
        description: metadata.description,
        canonical: metadata.canonical,
        robots: metadata.robots,
        publishDate: metadata.publishDate,
        lastModified: metadata.lastModified,
        extracted: {
          hasTitle: !!metadata.title,
          hasDescription: !!metadata.description,
          hasCanonical: !!metadata.canonical,
        },
      }
    : null;

  if (debugEnabled) {
    console.log(`[DEBUG] Metadata Extraction for ${url}:`, debugInfo);
  }

  return { metadata, debugInfo };
}

// Extract schema with debug info
export function extractSchemaWithDebug(
  url: string,
  html: string,
  debugEnabled: boolean
): {
  schemas: Record<string, unknown>[];
  debugInfo: unknown;
} {
  const parser = typeof DOMParser !== 'undefined' ? new DOMParser() : null;
  let doc: Document | null = null;

  try {
    if (parser) {
      doc = parser.parseFromString(html, 'text/html');
    }
  } catch (error) {
    console.error('Failed to parse HTML:', error);
  }

  const schemas: Record<string, unknown>[] = [];
  const schemaTypes: string[] = [];
  const validationErrors: string[] = [];

  if (doc) {
    const schemaScripts = doc.querySelectorAll('script[type="application/ld+json"]');

    schemaScripts.forEach((script, idx) => {
      try {
        const schema = JSON.parse(script.textContent || '');
        schemas.push(schema);

        // Extract type
        if (schema['@type']) {
          schemaTypes.push(
            typeof schema['@type'] === 'string'
              ? schema['@type']
              : Array.isArray(schema['@type'])
                ? schema['@type'][0]
                : 'Unknown'
          );
        }
      } catch (error) {
        validationErrors.push(
          `Schema #${idx + 1}: ${error instanceof Error ? error.message : 'Invalid JSON'}`
        );
        console.warn(`Invalid JSON-LD at index ${idx}:`, error);
      }
    });
  }

  const debugInfo = debugEnabled
    ? {
        found: schemas.length > 0,
        count: schemas.length,
        types: schemaTypes,
        isValid: validationErrors.length === 0,
        validationErrors,
        schemas: schemas.slice(0, 1), // Include first schema for preview
      }
    : null;

  if (debugEnabled) {
    console.log(`[DEBUG] Schema Extraction for ${url}:`, debugInfo);
  }

  return { schemas, debugInfo };
}

// Helper: Detect if content is header/footer only
function detectHeaderFooterOnly(html: string): boolean {
  const text = html.toLowerCase();
  const hasNav = text.includes('<nav') || text.includes('navigation');
  const hasFooter = text.includes('<footer') || text.includes('copyright');
  const hasMain = text.includes('<main') || text.includes('article') || text.includes('content');

  return (hasNav || hasFooter) && !hasMain;
}

// Helper: Validate content quality
function validateContentQuality(html: string): string[] {
  const warnings: string[] = [];
  const text = html.replace(/<[^>]*>/g, ' ').trim();

  if (text.length < 100) {
    warnings.push('Content is too short (< 100 chars)');
  }

  if (html.includes('<script') || html.includes('<style')) {
    warnings.push('Content contains script or style tags');
  }

  if (html.split('<').length < 5) {
    warnings.push('Content has minimal HTML structure');
  }

  return warnings;
}

// Helper: Extract date from meta tags
function extractDate(doc: Document | null, property: string): string | null {
  if (!doc) return null;

  const element = doc.querySelector(
    `meta[property="${property}"], meta[name="${property}"], time[datetime]`
  );

  return element?.getAttribute('content') || element?.getAttribute('datetime') || null;
}

// Log submission attempt
export function logSubmissionAttempt(
  url: string,
  apiType: 'url' | 'content',
  payload: Record<string, unknown>,
  debugEnabled: boolean
): void {
  if (!debugEnabled) return;

  console.group(`[DEBUG] ${apiType.toUpperCase()} Submission Attempt`);
  console.log('URL:', url);
  console.log('Payload:', JSON.stringify(payload, null, 2));
  console.groupEnd();
}

// Log submission response
export function logSubmissionResponse(
  url: string,
  apiType: 'url' | 'content',
  status: number,
  responseText: string,
  latency: number,
  debugEnabled: boolean
): void {
  if (!debugEnabled) return;

  console.group(`[DEBUG] ${apiType.toUpperCase()} Submission Response`);
  console.log('URL:', url);
  console.log('Status:', status);
  console.log('Latency:', `${latency}ms`);
  console.log('Response:', responseText);

  if (status === 200 || status === 202 || status === 204) {
    console.log('%cResult: SUCCESS', 'color: green; font-weight: bold;');
  } else {
    console.log('%cResult: FAILED', 'color: red; font-weight: bold;');
  }

  console.groupEnd();
}
