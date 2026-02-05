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
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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

    // ===== SERVER-SIDE RENDERING CHECK =====
    console.log(`\n[SERVER-SIDE RENDERING CHECK]`);

    // Check for JSON-LD in multiple ways
    const hasJsonLdExact = html.includes('type="application/ld+json"');
    const hasJsonLdSingle = html.includes("type='application/ld+json'");
    const hasJsonLdSpaces = html.includes('type = "application/ld+json"');
    const hasJsonLdRegex = /type\s*=\s*["']?application\/ld\+json["']?/i.test(html);
    const hasApplicationLdJson = html.includes('application/ld+json');

    console.log(`[SSR] JSON-LD Script Tags Detection:`);
    console.log(`[SSR]   - type="application/ld+json": ${hasJsonLdExact}`);
    console.log(`[SSR]   - type='application/ld+json': ${hasJsonLdSingle}`);
    console.log(`[SSR]   - With spaces: ${hasJsonLdSpaces}`);
    console.log(`[SSR]   - Regex match (any variation): ${hasJsonLdRegex}`);
    console.log(`[SSR]   - Contains "application/ld+json": ${hasApplicationLdJson}`);

    // Count occurrences
    const jsonLdMatches = html.match(/<script[^>]*application\/ld\+json[^>]*>/gi) || [];
    console.log(`[SSR] Total JSON-LD script tags found: ${jsonLdMatches.length}`);

    // Check for @context in HTML
    const contextMatches = html.match(/"?@context"?\s*:\s*["']https?:\/\/schema\.org[^"']*["']/gi) || [];
    console.log(`[SSR] Total @context with schema.org found: ${contextMatches.length}`);

    // Schema.org mentions
    const schemaOrgCount = (html.match(/schema\.org/gi) || []).length;
    console.log(`[SSR] Total schema.org mentions: ${schemaOrgCount}`);

    // Check HEAD vs BODY
    const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

    if (headMatch) {
      const headContent = headMatch[1];
      const headJsonLd = (headContent.match(/application\/ld\+json/gi) || []).length;
      console.log(`[SSR] JSON-LD in HEAD section: ${headJsonLd} tags`);
    }

    if (bodyMatch) {
      const bodyContent = bodyMatch[1];
      const bodyJsonLd = (bodyContent.match(/application\/ld\+json/gi) || []).length;
      console.log(`[SSR] JSON-LD in BODY section: ${bodyJsonLd} tags`);
    }

    // ===== CLIENT-SIDE RENDERING INDICATORS =====
    console.log(`\n[CLIENT-SIDE RENDERING CHECK]`);

    // Check for Next.js hydration markers
    const hasNextJs = html.includes('_next') || html.includes('__NEXT');
    const hasReactRoot = html.includes('__react');
    const hasDataReactRoot = html.includes('data-reactroot');
    const hasReactDom = html.includes('ReactDOM');

    console.log(`[CSR] Next.js Framework: ${hasNextJs}`);
    console.log(`[CSR] React hydration markers: ${hasReactRoot || hasDataReactRoot}`);
    console.log(`[CSR] ReactDOM references: ${hasReactDom}`);

    // Check for script tags that might inject schemas
    const allScriptTags = html.match(/<script[^>]*>/gi) || [];
    console.log(`[CSR] Total <script> tags: ${allScriptTags.length}`);

    // Look for schema injection patterns
    const hasSchemaInScript = /schema\s*=|setSchema|addSchema|initSchema/i.test(html);
    console.log(`[CSR] Schema injection patterns found: ${hasSchemaInScript}`);

    // ===== SAMPLE HEAD CONTENT =====
    console.log(`\n[HEAD CONTENT SAMPLE]`);
    if (headMatch) {
      const headContent = headMatch[1];
      const headSample = headContent.substring(0, 1500);
      console.log(`[HEAD] First 1500 chars: ${headSample}`);
    }

    // ===== DIAGNOSIS =====
    console.log(`\n[DIAGNOSIS & RECOMMENDATION]`);
    console.log(`[SUMMARY] Schema.org: ${schemaOrgCount} | JSON-LD tags: ${jsonLdMatches.length} | @context: ${contextMatches.length}`);

    if (schemaOrgCount === 0) {
      console.log(`[❌ RESULT] No schemas in server response`);
    } else if (schemaOrgCount > 0 && jsonLdMatches.length === 0 && contextMatches.length === 0) {
      console.log(`[⚠️  RESULT] SCHEMAS ARE CLIENT-SIDE RENDERED`);
      console.log(`[EVIDENCE] schema.org found but NO JSON-LD script tags`);
      console.log(`[CAUSE] Next.js renders schemas via JavaScript after hydration`);
      console.log(`[SOLUTION] Need Puppeteer/Playwright for full JS rendering`);
    } else if (hasJsonLdRegex && jsonLdMatches.length > 0) {
      console.log(`[✅ RESULT] Schemas found in server HTML`);
    }

    console.log(`[RESPONSE] HTML: ${html.length} bytes | Type: ${contentType}`);
    console.log(`[COMPLETE: SERVER/CLIENT DETECTION]`);

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
    let headContent = '';
    if (headMatch) {
      headContent = headMatch[1];
      const schemaCount = (headContent.match(/schema\.org/gi) || []).length;
      const jsonLdCount = (headContent.match(/application\/ld\+json/gi) || []).length;
      const jsonLdRegexMatches = headContent.match(/<script[^>]*application\/ld\+json[^>]*>/gi) || [];
      console.log(`[SCHEMA] HEAD section: schema.org=${schemaCount}, JSON-LD strings=${jsonLdCount}, JSON-LD script tags=${jsonLdRegexMatches.length}`);

      if (jsonLdRegexMatches.length > 0) {
        console.log(`[SCHEMA] Found ${jsonLdRegexMatches.length} JSON-LD script tags in HEAD:`);
        jsonLdRegexMatches.slice(0, 3).forEach((tag, idx) => {
          console.log(`[SCHEMA]   #${idx + 1}: ${tag.substring(0, 80)}...`);
        });
      }
    }

    // Strategy 1: Aggressive @context with schema.org brace-matching
    console.log(`[SCHEMA] Strategy 1: AGGRESSIVE - Searching for @context with schema.org...`);

    let strategy1Count = 0;
    let strategy1Attempts = 0;

    // Find all @context occurrences (with or without quotes)
    const contextRegex = /"?@context"?\s*:\s*["']https?:\/\/schema\.org[^"']*["']/gi;
    let contextMatch;

    // Get all positions of context matches
    const contextMatches: { pos: number; match: string }[] = [];
    while ((contextMatch = contextRegex.exec(fetched.html)) !== null) {
      contextMatches.push({
        pos: contextMatch.index,
        match: contextMatch[0],
      });
    }

    console.log(`[SCHEMA] Strategy 1: Found ${contextMatches.length} @context with schema.org entries`);

    for (const contextItem of contextMatches) {
      strategy1Attempts++;
      const searchIndex = contextItem.pos;
      console.log(`[SCHEMA] Strategy 1 #${strategy1Attempts}: Processing @context at index ${searchIndex}`);

      // Search backwards for opening brace - be aggressive
      let openIndex = searchIndex - 1;
      let depth = 0;
      let maxSearchBack = Math.max(0, searchIndex - 50000); // Search up to 50KB backwards

      while (openIndex >= maxSearchBack) {
        const char = fetched.html[openIndex];
        if (char === '}') {
          depth++;
        } else if (char === '{') {
          if (depth === 0) {
            break;
          }
          depth--;
        }
        openIndex--;
      }

      if (openIndex < maxSearchBack) {
        console.log(`[SCHEMA] Strategy 1 #${strategy1Attempts}: ❌ No opening brace found`);
        continue;
      }

      console.log(`[SCHEMA] Strategy 1 #${strategy1Attempts}: Found opening brace at index ${openIndex}`);

      // Search forwards for closing brace
      let closeIndex = searchIndex + contextItem.match.length;
      depth = 0;
      let maxSearchForward = Math.min(fetched.html.length, searchIndex + 100000); // Search up to 100KB forwards

      while (closeIndex < maxSearchForward) {
        const char = fetched.html[closeIndex];
        if (char === '{') {
          depth++;
        } else if (char === '}') {
          if (depth === 0) {
            break;
          }
          depth--;
        }
        closeIndex++;
      }

      if (closeIndex >= maxSearchForward) {
        console.log(`[SCHEMA] Strategy 1 #${strategy1Attempts}: ❌ No closing brace found`);
        continue;
      }

      console.log(`[SCHEMA] Strategy 1 #${strategy1Attempts}: Found closing brace at index ${closeIndex}`);

      // Extract and parse JSON
      const jsonStr = fetched.html.substring(openIndex, closeIndex + 1);
      console.log(`[SCHEMA] Strategy 1 #${strategy1Attempts}: Extracted JSON size: ${jsonStr.length} bytes`);

      const jsonHash = JSON.stringify(jsonStr).substring(0, 50);

      if (!processedSchemas.has(jsonHash)) {
        try {
          const schema = JSON.parse(jsonStr);
          const schemaType = JSON.stringify(schema['@type']);
          console.log(`[SCHEMA] Strategy 1 #${strategy1Attempts}: ✅ EXTRACTED (@type: ${schemaType})`);
          schemas.push(schema);
          processedSchemas.add(jsonHash);
          strategy1Count++;
        } catch (e) {
          const err = e as Error;
          console.log(`[SCHEMA] Strategy 1 #${strategy1Attempts}: ❌ Parse error - ${err.message}`);
          console.log(`[SCHEMA]   First 100 chars: ${jsonStr.substring(0, 100)}`);
        }
      }
    }

    console.log(`[SCHEMA] Strategy 1 found: ${strategy1Count} schemas from ${strategy1Attempts} attempts`);

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

    // Strategy 2.5: Extract from HEAD section directly (for Next.js)
    if (headContent && strategy2Count === 0) {
      console.log(`[SCHEMA] Strategy 2.5: Extracting schemas from HEAD section...`);
      const headScriptRegex = /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi;
      let headMatch;
      let strategy25Count = 0;

      while ((headMatch = headScriptRegex.exec(headContent)) !== null) {
        const jsonStr = headMatch[1].trim();
        const jsonHash = JSON.stringify(jsonStr).substring(0, 50);

        if (!processedSchemas.has(jsonHash)) {
          try {
            const schema = JSON.parse(jsonStr);
            if (schema['@type'] || schema['@context']) {
              console.log(`[SCHEMA] ✅ Strategy 2.5: From HEAD: (@type: ${JSON.stringify(schema['@type'])})`);
              schemas.push(schema);
              processedSchemas.add(jsonHash);
              strategy25Count++;
            }
          } catch (e) {
            const err = e as Error;
            console.log(`[SCHEMA] Strategy 2.5: Parse error - ${err.message}`);
          }
        }
      }

      console.log(`[SCHEMA] Strategy 2.5 found: ${strategy25Count} schemas`);
    }

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

    // Strategy 5: Extract from Next.js Hydration Format
    console.log(`[SCHEMA] Strategy 5: Checking for Next.js hydration format...`);
    const hasNextJsHydration = /self\.__next_s|__next_s=/.test(fetched.html);
    console.log(`[SCHEMA] Has Next.js hydration: ${hasNextJsHydration}`);

    if (hasNextJsHydration && schemas.length === 0) {
      console.log(`[SCHEMA] Attempting to extract from Next.js hydration format...`);
      let strategy5Count = 0;

      // Pattern: [0,{"type":"application/ld+json","children":"JSON_STRING","id":"schema-id"}]
      const nextJsRegex = /\[0,\s*\{\s*"type"\s*:\s*"application\/ld\+json"\s*,\s*"children"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
      let nextJsMatch;

      while ((nextJsMatch = nextJsRegex.exec(fetched.html)) !== null) {
        try {
          const escapedJson = nextJsMatch[1];
          const jsonString = escapedJson
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t');

          const parsed = JSON.parse(jsonString);

          if (parsed['@type'] || parsed['@context']) {
            console.log(`[SCHEMA] ✅ Strategy 5: Extracted from Next.js hydration (@type: ${JSON.stringify(parsed['@type'])})`);
            schemas.push(parsed);
            strategy5Count++;
          }
        } catch (e) {
          // Skip invalid entries
          const err = e as Error;
          console.log(`[SCHEMA] Strategy 5: Parse error - ${err.message}`);
        }
      }

      console.log(`[SCHEMA] Strategy 5 found: ${strategy5Count} schemas from Next.js hydration`);
    }
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

  // Clean HTML - remove any remaining scripts, styles, comments, and event handlers
  let cleanContent = extracted.mainContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove style attributes that might remain
    .replace(/\s+style\s*=\s*["'][^"']*["']/gi, '')
    // Remove class attributes if they're too long (inline generated classes)
    .replace(/\s+class\s*=\s*"[^"]{200,}"/gi, '');

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

// Clean and format HTML content properly (based on reference implementation)
export function cleanAndFormatHtml(html: string, baseUrl: string): string {
  const parser = new JSDOM(html, {
    url: baseUrl,
    pretendToBeVisual: true,
  });

  const document = parser.window.document;

  // Find main content element
  let mainElement = document.querySelector('main');
  if (!mainElement) {
    mainElement = document.querySelector('article');
  }
  if (!mainElement) {
    mainElement = document.querySelector('[role="main"]');
  }

  if (!mainElement) {
    return '';
  }

  // Only remove: script, style, noscript, iframe, svg, canvas
  const removeOnly = ['script', 'style', 'noscript', 'iframe', 'svg', 'canvas'];
  removeOnly.forEach(tag => {
    mainElement!.querySelectorAll(tag).forEach(el => el.remove());
  });

  // Allowed tags for content extraction
  const allowedTags = new Set([
    // Structure
    'main', 'header', 'section', 'article', 'aside', 'footer', 'nav', 'div',
    // Headings
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Text
    'p', 'span', 'a', 'strong', 'em', 'b', 'i', 'u', 's', 'mark', 'small', 'sub', 'sup', 'br', 'hr',
    // Lists
    'ul', 'ol', 'li', 'menu', 'dl', 'dt', 'dd',
    // Tables
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
    // Media
    'img', 'figure', 'figcaption', 'picture', 'source', 'video', 'audio',
    // Interactive
    'button', 'details', 'summary',
    // Meta & Schema
    'meta', 'time', 'data', 'address',
    // Code
    'code', 'pre', 'kbd', 'var', 'samp',
    // Quote
    'blockquote', 'q', 'cite', 'abbr', 'dfn',
    // Others
    'ins', 'del', 'wbr', 'ruby', 'rt', 'rp'
  ]);

  // Allowed attributes for specific tags
  const allowedAttributes: Record<string, string[]> = {
    'a': ['href', 'rel', 'title', 'aria-label'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'time': ['datetime'],
    'meta': ['itemprop', 'content', 'name'],
    'data': ['value'],
    'ol': ['type', 'start'],
    'li': ['value', 'itemprop', 'itemscope', 'itemtype'],
    'source': ['src', 'srcset', 'type', 'media'],
    'video': ['src', 'poster', 'controls', 'width', 'height'],
    'audio': ['src', 'controls'],
    'blockquote': ['cite'],
    'q': ['cite'],
    'abbr': ['title'],
    'dfn': ['title'],
    '_global': ['itemprop', 'itemscope', 'itemtype', 'aria-label', 'aria-current', 'aria-hidden', 'role', 'id']
  };

  // Process nodes recursively
  const processNode = (node: Node): string => {
    // Text node
    if (node.nodeType === 3) { // Node.TEXT_NODE
      return node.textContent || '';
    }

    // Comment node
    if (node.nodeType === 8) { // Node.COMMENT_NODE
      return `<!--${(node as Comment).textContent || ''}-->`;
    }

    // Element node
    if (node.nodeType === 1) { // Node.ELEMENT_NODE
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();

      // Skip removed tags
      if (removeOnly.includes(tagName)) {
        return '';
      }

      // Process children
      let childContent = '';
      element.childNodes.forEach(child => {
        childContent += processNode(child);
      });

      // If tag is allowed, preserve it
      if (allowedTags.has(tagName)) {
        let attrStr = '';
        const tagAttrs = allowedAttributes[tagName] || [];
        const globalAttrs = allowedAttributes['_global'] || [];
        const allAttrs = [...tagAttrs, ...globalAttrs];

        // Special handling for img tags
        if (tagName === 'img') {
          let src = element.getAttribute('src') ||
                    element.getAttribute('data-src') ||
                    element.getAttribute('data-lazy-src') ||
                    element.getAttribute('data-original') || '';

          // Convert relative URLs to absolute
          if (src && !src.startsWith('http') && !src.startsWith('data:')) {
            try {
              src = new URL(src, baseUrl).href;
            } catch (e) {
              // Keep original if URL construction fails
            }
          }

          if (!src) return childContent;

          const alt = element.getAttribute('alt') || '';
          const title = element.getAttribute('title') || '';
          const width = element.getAttribute('width') || '';
          const height = element.getAttribute('height') || '';

          attrStr = ` src="${src}"`;
          if (alt) attrStr += ` alt="${alt}"`;
          if (title) attrStr += ` title="${title}"`;
          if (width) attrStr += ` width="${width}"`;
          if (height) attrStr += ` height="${height}"`;

          return `<img${attrStr}>`;
        }

        // Special handling for anchors
        if (tagName === 'a') {
          let href = element.getAttribute('href') || '';
          if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('javascript:')) {
            try {
              href = new URL(href, baseUrl).href;
            } catch (e) {
              // Keep original
            }
          }
          if (href && !href.startsWith('javascript:')) {
            attrStr += ` href="${href}"`;
          }
          const rel = element.getAttribute('rel');
          if (rel) attrStr += ` rel="${rel}"`;
          const ariaLabel = element.getAttribute('aria-label');
          if (ariaLabel) attrStr += ` aria-label="${ariaLabel}"`;

          return `<a${attrStr}>${childContent}</a>`;
        }

        // For other elements, preserve allowed attributes only
        allAttrs.forEach(attr => {
          const value = element.getAttribute(attr);
          if (value !== null) {
            attrStr += ` ${attr}="${value}"`;
          }
        });

        // Self-closing tags
        if (['br', 'hr', 'img', 'meta', 'source', 'col', 'wbr'].includes(tagName)) {
          return `<${tagName}${attrStr}>`;
        }

        return `<${tagName}${attrStr}>${childContent}</${tagName}>`;
      }

      // Non-allowed tag - return children only (unwrap)
      return childContent;
    }

    return '';
  };

  // Extract and process content
  let result = '';
  mainElement.childNodes.forEach(child => {
    result += processNode(child);
  });

  // Format the HTML with proper indentation
  result = formatExtractedHtml(result);

  return result;
}

// Format extracted HTML with proper indentation and newlines
function formatExtractedHtml(html: string): string {
  const blockTags = ['main', 'header', 'section', 'article', 'aside', 'footer', 'nav', 'div',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'table', 'thead', 'tbody',
    'tfoot', 'tr', 'th', 'td', 'figure', 'figcaption', 'blockquote', 'pre', 'hr', 'br',
    'details', 'summary', 'menu', 'address', 'form', 'fieldset', 'legend'];

  const indentTags = ['main', 'header', 'section', 'article', 'aside', 'footer', 'nav', 'div',
    'ul', 'ol', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'figure', 'blockquote', 'details', 'dl', 'dt', 'dd'];

  let result = html;

  // Add newlines before opening block tags
  blockTags.forEach(tag => {
    const regex = new RegExp(`(<${tag}[^>]*>)`, 'gi');
    result = result.replace(regex, '\n$1');
  });

  // Add newlines after closing block tags
  blockTags.forEach(tag => {
    const regex = new RegExp(`(</${tag}>)`, 'gi');
    result = result.replace(regex, '$1\n');
  });

  // Clean up multiple newlines
  result = result.replace(/\n\s*\n/g, '\n').trim();

  // Add indentation
  const lines = result.split('\n');
  let indentLevel = 0;
  const formattedLines: string[] = [];

  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    // Check if this is a closing tag first
    let isClosingTag = false;
    indentTags.forEach(tag => {
      if (trimmedLine.toLowerCase().startsWith(`</${tag}>`)) {
        isClosingTag = true;
      }
    });

    if (isClosingTag && indentLevel > 0) {
      indentLevel--;
    }

    const indent = '  '.repeat(indentLevel);
    formattedLines.push(indent + trimmedLine);

    // Check if this is an opening tag (increase indent for next line)
    if (!isClosingTag) {
      indentTags.forEach(tag => {
        const openRegex = new RegExp(`<${tag}[^>]*>`, 'i');
        const closeRegex = new RegExp(`</${tag}>`, 'i');
        if (openRegex.test(trimmedLine) && !closeRegex.test(trimmedLine)) {
          indentLevel++;
        }
      });
    }
  });

  return formattedLines.join('\n');
}
