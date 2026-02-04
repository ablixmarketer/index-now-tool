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
  console.log(`[FETCH START] Fetching: ${url}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`[FETCH TIMEOUT] Request timeout after ${timeout}ms for ${url}`);
      controller.abort();
    }, timeout);

    console.log(`[FETCH] Sending request with timeout: ${timeout}ms`);

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

    console.log(`[FETCH RESPONSE] Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    console.log(`[FETCH] Content-Type: ${contentType}`);

    if (!contentType.includes('text/html')) {
      throw new Error(`Invalid content type: ${contentType}`);
    }

    const html = await response.text();

    console.log(`[FETCH SUCCESS] Received ${html.length} bytes`);

    if (!html || html.length < 100) {
      throw new Error(`Response body too small (${html.length} bytes) or empty`);
    }

    // Log HTML fetch details
    console.log(`[DEBUG FETCH] URL: ${url}`);
    console.log(`[DEBUG FETCH] HTML size: ${html.length} bytes`);
    console.log(`[DEBUG FETCH] Has <script type="application/ld+json">: ${html.includes('type="application/ld+json"')}`);
    console.log(`[DEBUG FETCH] Schema.org mentions: ${(html.match(/schema\.org/g) || []).length}`);

    return {
      url,
      html,
      statusCode: response.status,
      contentType,
    };
  } catch (error) {
    const errorDetails = error instanceof Error ? {
      name: error.name,
      message: error.message,
      cause: (error as any).cause,
    } : error;

    console.error(`[FETCH ERROR] Failed to fetch ${url}:`, errorDetails);

    const message = error instanceof Error ? error.message : String(error);
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
      // Don't load external resources - just parse the HTML as-is
    });

    const document = dom.window.document;

    // Debug: Check if we can find any scripts
    const allScripts = document.querySelectorAll('script');
    console.log(`[DEBUG DOM] Total <script> tags found: ${allScripts.length}`);
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    console.log(`[DEBUG DOM] JSON-LD <script> tags found: ${jsonLdScripts.length}`);

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

    // Extract schema markup using multiple detection strategies
    const schemas: Record<string, unknown>[] = [];
    const processedSchemas = new Set<string>(); // Track unique schemas to avoid duplicates

    console.log(`[SCHEMA] === COMPREHENSIVE SCHEMA EXTRACTION ===`);
    console.log(`[SCHEMA] HTML length: ${fetched.html.length} bytes`);

    // First, let's diagnose where schema.org mentions are and what's around them
    console.log(`[SCHEMA DEBUG] Analyzing schema.org occurrences...`);
    let schemaOrgPos = 0;
    const schemaOrgMatches: Array<{ pos: number; context: string; type: string }> = [];
    while ((schemaOrgPos = fetched.html.indexOf('schema.org', schemaOrgPos)) !== -1) {
      const start = Math.max(0, schemaOrgPos - 200);
      const end = Math.min(fetched.html.length, schemaOrgPos + 250);
      const context = fetched.html.substring(start, end);

      // Determine what type of schema.org mention this is
      let type = 'unknown';
      if (context.includes('"@context"')) type = '@context';
      else if (context.includes('@context')) type = '@context (unquoted)';
      else if (context.includes('application/ld+json')) type = 'JSON-LD script';
      else if (context.includes('schema#') || context.includes('http://schema.org')) type = 'URL reference';
      else if (context.includes('{') && context.includes('}')) type = 'JSON object';

      schemaOrgMatches.push({ pos: schemaOrgPos, context, type });
      schemaOrgPos += 10;
    }

    console.log(`[SCHEMA DEBUG] Found ${schemaOrgMatches.length} schema.org mentions`);

    // Group by type
    const byType = schemaOrgMatches.reduce((acc, match) => {
      acc[match.type] = (acc[match.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`[SCHEMA DEBUG] Breakdown:`, byType);

    // Show first few matches of each type
    schemaOrgMatches.slice(0, 5).forEach((match, idx) => {
      const preview = match.context.length > 100 ? match.context.substring(0, 100) + '...' : match.context;
      console.log(`[SCHEMA DEBUG] #${idx + 1} (${match.type}): ${preview}`);
    });

    // Pre-extraction: Check HEAD section specifically (common for Next.js)
    console.log(`[SCHEMA] Pre-check: Looking for schemas in HEAD section...`);
    const headMatch = fetched.html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    if (headMatch) {
      const headContent = headMatch[1];
      const schemaCount = (headContent.match(/schema\.org/gi) || []).length;
      const jsonLdCount = (headContent.match(/application\/ld\+json/gi) || []).length;
      console.log(`[SCHEMA] HEAD section: schema.org=${schemaCount}, JSON-LD scripts=${jsonLdCount}`);
    }

    // Strategy 1: Look for all JSON objects containing @context and schema.org
    console.log(`[SCHEMA] Strategy 1: Searching for @context with schema.org...`);

    const contextVariations = [
      '@context',
      '"@context"',
    ];

    let strategy1Count = 0;
    for (const contextKey of contextVariations) {
      let searchPos = 0;
      while ((searchPos = fetched.html.indexOf(contextKey, searchPos)) !== -1) {
        // Found @context key, now check if it contains schema.org
        const nextSegment = fetched.html.substring(searchPos, Math.min(searchPos + 500, fetched.html.length));
        if (nextSegment.includes('schema.org')) {
          console.log(`[SCHEMA] Found @context with schema.org at index ${searchPos}`);

          // Search backwards for opening brace
          let openIndex = searchPos - 1;
          let depth = 0;
          while (openIndex >= 0) {
            if (fetched.html[openIndex] === '}') depth++;
            else if (fetched.html[openIndex] === '{') {
              if (depth === 0) break;
              depth--;
            }
            openIndex--;
          }

          if (openIndex >= 0) {
            // Search forwards for closing brace
            let closeIndex = searchPos + contextKey.length;
            depth = 0;
            while (closeIndex < fetched.html.length) {
              if (fetched.html[closeIndex] === '{') depth++;
              else if (fetched.html[closeIndex] === '}') {
                if (depth === 0) break;
                depth--;
              }
              closeIndex++;
            }

            if (closeIndex < fetched.html.length) {
              const jsonStr = fetched.html.substring(openIndex, closeIndex + 1);
              const jsonHash = JSON.stringify(jsonStr).substring(0, 50); // Quick fingerprint

              if (!processedSchemas.has(jsonHash)) {
                try {
                  const schema = JSON.parse(jsonStr);
                  if (schema['@context'] && String(schema['@context']).includes('schema.org')) {
                    console.log(`[SCHEMA] ✅ Strategy 1: Extracted schema (@type: ${JSON.stringify(schema['@type'])})`);
                    schemas.push(schema);
                    processedSchemas.add(jsonHash);
                    strategy1Count++;
                  }
                } catch (e) {
                  const err = e as Error;
                  console.log(`[SCHEMA] Strategy 1: Parse error at ${openIndex}-${closeIndex}: ${err.message}`);
                }
              }
            }
          }
        }
        searchPos += contextKey.length;
      }
    }

    console.log(`[SCHEMA] Strategy 1 found: ${strategy1Count} schemas`);

    // Strategy 2: Extract from <script type="application/ld+json"> tags
    console.log(`[SCHEMA] Strategy 2: Looking for JSON-LD script tags...`);

    // Try multiple regex patterns to handle variations
    const scriptTagPatterns = [
      /<script[^>]*type=["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi,
      /<script[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi,
      /<script\s+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ];

    let strategy2Count = 0;

    for (const pattern of scriptTagPatterns) {
      let match;
      while ((match = pattern.exec(fetched.html)) !== null) {
        const jsonStr = match[1].trim();
        const jsonHash = JSON.stringify(jsonStr).substring(0, 50);

        if (!processedSchemas.has(jsonHash)) {
          try {
            const schema = JSON.parse(jsonStr);
            // Accept schemas even without @context - just check for @type
            if (schema['@type'] || schema['@context']) {
              console.log(`[SCHEMA] ✅ Strategy 2: From script tag: (@type: ${JSON.stringify(schema['@type'])})`);
              schemas.push(schema);
              processedSchemas.add(jsonHash);
              strategy2Count++;
            }
          } catch (e) {
            const err = e as Error;
            console.log(`[SCHEMA] Strategy 2: Parse error at position - ${err.message}`);
          }
        }
      }
    }

    console.log(`[SCHEMA] Strategy 2 found: ${strategy2Count} schemas`);

    // Strategy 3: Try JSON.parse on segments containing "schema.org"
    console.log(`[SCHEMA] Strategy 3: Extracting all schema.org JSON objects...`);
    let pos = 0;
    let strategy3Count = 0;
    let strategy3Attempts = 0;

    while ((pos = fetched.html.indexOf('schema.org', pos)) !== -1) {
      strategy3Attempts++;

      // Look for nearby opening and closing braces
      let openIdx = pos - 1;
      let closeIdx = pos + 10;
      let depth = 0;

      // Find opening brace (search backwards up to 5KB)
      while (openIdx >= Math.max(0, pos - 5000)) {
        if (fetched.html[openIdx] === '}') depth++;
        else if (fetched.html[openIdx] === '{') {
          if (depth === 0) break;
          depth--;
        }
        openIdx--;
      }

      if (openIdx >= 0) {
        depth = 0;
        // Find closing brace (search forwards up to 50KB)
        while (closeIdx < Math.min(fetched.html.length, pos + 50000)) {
          if (fetched.html[closeIdx] === '{') depth++;
          else if (fetched.html[closeIdx] === '}') {
            if (depth === 0) break;
            depth--;
          }
          closeIdx++;
        }

        if (closeIdx < fetched.html.length) {
          const jsonStr = fetched.html.substring(openIdx, closeIdx + 1);
          const jsonHash = JSON.stringify(jsonStr).substring(0, 50);

          if (!processedSchemas.has(jsonHash) && jsonStr.length < 200000) {
            try {
              const schema = JSON.parse(jsonStr);
              if (schema['@context'] || schema['@type']) {
                console.log(`[SCHEMA] ✅ Strategy 3: Found schema (@type: ${JSON.stringify(schema['@type'])})`);
                schemas.push(schema);
                processedSchemas.add(jsonHash);
                strategy3Count++;
              }
            } catch (e) {
              // Ignore parse errors in this strategy
            }
          }
        }
      }
      pos += 10;
    }

    console.log(`[SCHEMA] Strategy 3 processed: ${strategy3Attempts} schema.org mentions, found ${strategy3Count} schemas`);

    // Strategy 4: Look for ALL script tags that might contain JSON (regardless of schema.org mention)
    console.log(`[SCHEMA] Strategy 4: Scanning all script tags for potential schema markup...`);
    let strategy4Count = 0;

    // Find all script tags
    const allScriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let scriptMatch;
    while ((scriptMatch = allScriptRegex.exec(fetched.html)) !== null) {
      const content = scriptMatch[1].trim();
      const jsonHash = JSON.stringify(content).substring(0, 50);

      // Try to parse any script content that starts with { or [
      if ((content.startsWith('{') || content.startsWith('[')) && !processedSchemas.has(jsonHash)) {
        try {
          const parsed = JSON.parse(content);

          // Check if it's a schema object
          if (Array.isArray(parsed)) {
            // Array of schemas
            for (const item of parsed) {
              if (item['@type'] || item['@context']) {
                schemas.push(item);
                processedSchemas.add(jsonHash);
                strategy4Count++;
              }
            }
          } else if (parsed['@type'] || parsed['@context']) {
            // Single schema
            schemas.push(parsed);
            processedSchemas.add(jsonHash);
            strategy4Count++;
            console.log(`[SCHEMA] ✅ Strategy 4: Found schema (@type: ${JSON.stringify(parsed['@type'])})`);
          }
        } catch (e) {
          // Not JSON, skip
        }
      }
    }

    console.log(`[SCHEMA] Strategy 4 found: ${strategy4Count} schemas`);
    console.log(`[SCHEMA] === FINAL RESULT: Found ${schemas.length} total unique schemas ===`);

    if (schemas.length === 0) {
      // Add comprehensive diagnostic info
      const contextCount = (fetched.html.match(/@context/gi) || []).length;
      const schemaOrgCount = (fetched.html.match(/schema\.org/gi) || []).length;
      const jsonLdCount = (fetched.html.match(/application\/ld\+json/gi) || []).length;
      const microDataCount = (fetched.html.match(/itemtype=/gi) || []).length;
      const rdFaCount = (fetched.html.match(/vocab=/gi) || []).length;

      console.log(`[SCHEMA] ⚠️  No JSON-LD schemas extracted. Full Diagnostics:`);
      console.log(`[SCHEMA]    - JSON-LD script tags: ${jsonLdCount} (expected: 1+)`);
      console.log(`[SCHEMA]    - @context declarations: ${contextCount} (expected: 1+ if JSON-LD)`);
      console.log(`[SCHEMA]    - schema.org mentions: ${schemaOrgCount} (found: ${schemaOrgCount > 0 ? 'YES' : 'NO'})`);
      console.log(`[SCHEMA]    - Microdata (itemtype): ${microDataCount}`);
      console.log(`[SCHEMA]    - RDFa (vocab): ${rdFaCount}`);

      // Provide specific warnings based on what was detected
      if (jsonLdCount === 0 && schemaOrgCount > 0) {
        console.log(`[SCHEMA]    ⚠️  Possible issue: schema.org found in text but no JSON-LD scripts`);
        warnings.push('No JSON-LD schema markup found (only text references to schema.org)');
      } else if (jsonLdCount > 0 && contextCount === 0) {
        console.log(`[SCHEMA]    ⚠️  JSON-LD scripts found but missing @context fields`);
        warnings.push('JSON-LD scripts found but no valid @context declarations');
      } else if (schemaOrgCount === 0 && (microDataCount > 0 || rdFaCount > 0)) {
        console.log(`[SCHEMA]    ℹ️  Page uses Microdata or RDFa, not JSON-LD`);
        warnings.push('Page uses Microdata or RDFa structured data, not JSON-LD (schema.org)');
      } else {
        console.log(`[SCHEMA]    ⚠️  No schema.org markup detected in any format`);
        warnings.push('No schema.org markup found in JSON-LD, Microdata, or RDFa formats');
      }
    } else {
      console.log(`[SCHEMA] ✅ Successfully extracted ${schemas.length} schemas`);
      schemas.forEach((schema, idx) => {
        const type = Array.isArray(schema['@type'])
          ? schema['@type'].join(', ')
          : schema['@type'];
        console.log(`[SCHEMA]    ${idx + 1}. Type: ${type}`);
      });
    }

    // Validate content quality
    const textContent = mainContent.replace(/<[^>]*>/g, ' ').trim();
    const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length;

    // Content quality checks
    if (textContent.length < 100) {
      warnings.push('⚠️ Text content is too short (< 100 characters)');
    } else if (textContent.length < 300) {
      warnings.push('⚠️ Text content is short (< 300 characters)');
    }

    if (wordCount < 50) {
      warnings.push(`⚠️ Text content has very few words (${wordCount} words)`);
    } else if (wordCount < 100) {
      warnings.push(`ℹ️ Text content is relatively short (${wordCount} words)`);
    }

    // Check for duplicate/minimal content - but don't warn if this is expected
    if (mainContent.includes('<script') || mainContent.includes('<style')) {
      // This is normal for extracted content - it's just a notice
      if (mainContent.match(/<script/gi)?.length ?? 0 > 5) {
        warnings.push('ℹ️ Content contains many script tags (HTML not fully cleaned)');
      }
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
