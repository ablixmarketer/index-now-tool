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

// Extract content from HTML using EXACT reference tool logic
export function extractPageContent(fetched: FetchedContent): ExtractedPageContent {
  const warnings: string[] = [];

  try {
    // Parse HTML using JSDOM
    const dom = new JSDOM(fetched.html, {
      url: fetched.url,
      pretendToBeVisual: true,
    });

    const document = dom.window.document;

    // Extract main content using EXACT reference tool logic
    let mainContent = '';
    let sourceTag: 'main' | 'article' | 'body' | 'none' = 'none';

    try {
      // Use exact reference tool logic
      const cleanedContent = extractMainTagContent(fetched.html, fetched.url);

      if (cleanedContent && cleanedContent.length > 100) {
        mainContent = cleanedContent;
        sourceTag = 'main';
        console.log(`[DEBUG] Successfully extracted content (${cleanedContent.length} chars)`);
      } else {
        console.log(`[DEBUG] Cleaned content too short, using fallback`);
        // Fallback
        const mainElement = document.querySelector('main');
        if (mainElement && mainElement.textContent?.trim()) {
          mainContent = mainElement.innerHTML;
          sourceTag = 'main';
        } else {
          const articleElement = document.querySelector('article');
          if (articleElement && articleElement.textContent?.trim()) {
            mainContent = articleElement.innerHTML;
            sourceTag = 'article';
          }
        }
      }
    } catch (e) {
      const err = e as Error;
      console.log(`[DEBUG] Error in extraction: ${err.message}`);
      
      const mainElement = document.querySelector('main');
      if (mainElement && mainElement.textContent?.trim()) {
        mainContent = mainElement.innerHTML;
        sourceTag = 'main';
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
    const processedSchemas = new Set<string>();

    console.log(`[SCHEMA] === COMPREHENSIVE SCHEMA EXTRACTION ===`);
    console.log(`[SCHEMA] HTML length: ${fetched.html.length} bytes`);

    // Strategy 1: Aggressive @context with schema.org brace-matching
    console.log(`[SCHEMA] Strategy 1: AGGRESSIVE - Searching for @context with schema.org...`);

    let strategy1Count = 0;
    let strategy1Attempts = 0;

    const contextRegex = /"?@context"?\s*:\s*["']https?:\/\/schema\.org[^"']*["']/gi;
    let contextMatch;

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

      let openIndex = searchIndex - 1;
      let depth = 0;
      let maxSearchBack = Math.max(0, searchIndex - 50000);

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

      let closeIndex = searchIndex + contextItem.match.length;
      depth = 0;
      let maxSearchForward = Math.min(fetched.html.length, searchIndex + 100000);

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

    // Strategy 5: Extract from Next.js Hydration Format
    console.log(`[SCHEMA] Strategy 5: Checking for Next.js hydration format...`);
    const hasNextJsHydration = /self\.__next_s|__next_s=/.test(fetched.html);
    console.log(`[SCHEMA] Has Next.js hydration: ${hasNextJsHydration}`);

    if (hasNextJsHydration && schemas.length === 0) {
      console.log(`[SCHEMA] Attempting to extract from Next.js hydration format...`);
      let strategy5Count = 0;

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
          const err = e as Error;
          console.log(`[SCHEMA] Strategy 5: Parse error - ${err.message}`);
        }
      }

      console.log(`[SCHEMA] Strategy 5 found: ${strategy5Count} schemas from Next.js hydration`);
    }

    console.log(`[SCHEMA] === FINAL RESULT: Found ${schemas.length} total unique schemas ===`);

    if (schemas.length === 0) {
      const contextCount = (fetched.html.match(/@context/gi) || []).length;
      const schemaOrgCount = (fetched.html.match(/schema\.org/gi) || []).length;
      const jsonLdCount = (fetched.html.match(/application\/ld\+json/gi) || []).length;

      console.log(`[SCHEMA] ⚠️  No JSON-LD schemas extracted. Full Diagnostics:`);
      console.log(`[SCHEMA]    - JSON-LD script tags: ${jsonLdCount} (expected: 1+)`);
      console.log(`[SCHEMA]    - @context declarations: ${contextCount} (expected: 1+ if JSON-LD)`);
      console.log(`[SCHEMA]    - schema.org mentions: ${schemaOrgCount} (found: ${schemaOrgCount > 0 ? 'YES' : 'NO'})`);

      if (jsonLdCount === 0 && schemaOrgCount > 0) {
        console.log(`[SCHEMA]    ⚠️  Possible issue: schema.org found in text but no JSON-LD scripts`);
        warnings.push('No JSON-LD schema markup found (only text references to schema.org)');
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

    // Check for remaining dangerous content (comprehensive validation)
    const dangerousPatterns = {
      script: /<script[^>]*>/gi,
      style: /<style[^>]*>/gi,
      iframe: /<iframe[^>]*>/gi,
      svg: /<svg[^>]*>/gi,
      canvas: /<canvas[^>]*>/gi,
      form: /<form[^>]*>/gi,
      onEvent: /\s+on\w+\s*=/gi,
      jsHref: /href\s*=\s*["']javascript:/gi,
      styleAttr: /\s+style\s*=/gi
    };

    Object.entries(dangerousPatterns).forEach(([name, pattern]) => {
      const matches = mainContent.match(pattern) || [];
      if (matches.length > 0) {
        console.log(`[VALIDATION] ⚠️ Found ${matches.length} ${name} pattern(s)`);
        warnings.push(`⚠️ Content contains ${matches.length} ${name} pattern(s) - should be removed`);
      }
    });

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

// Extract main tag content - ROBUST SANITIZATION PIPELINE
function extractMainTagContent(html: string, baseUrl: string): string {
  const parser = new JSDOM(html, {
    url: baseUrl,
    pretendToBeVisual: true,
  });

  const document = parser.window.document;

  // Find main element
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

  console.log(`[EXTRACTION] Found main element, extracting content...`);

  // REMOVE DANGEROUS ELEMENTS COMPLETELY
  const dangerousElements = [
    'script', 'style', 'noscript', 'iframe', 'svg', 'canvas',
    'form', 'input', 'button', 'textarea', 'select', 'link',
    'object', 'embed'
  ];

  dangerousElements.forEach(tag => {
    mainElement!.querySelectorAll(tag).forEach(el => el.remove());
  });

  // ALL allowed tags for content
  const allowedTags = new Set([
    'main', 'header', 'section', 'article', 'aside', 'footer', 'nav', 'div',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'span', 'a', 'strong', 'em', 'b', 'i', 'u', 's', 'mark', 'small', 'sub', 'sup', 'br', 'hr',
    'ul', 'ol', 'li', 'menu', 'dl', 'dt', 'dd',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
    'img', 'figure', 'figcaption', 'picture', 'source', 'video', 'audio',
    'details', 'summary',
    'time', 'address',
    'code', 'pre', 'kbd', 'var', 'samp',
    'blockquote', 'q', 'cite', 'abbr', 'dfn',
    'ins', 'del', 'wbr', 'ruby', 'rt', 'rp'
  ]);

  // Allowed attributes for each tag (strict whitelist)
  const allowedAttributes: Record<string, string[]> = {
    'a': ['href', 'rel', 'title', 'aria-label'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'picture': ['src', 'alt'],
    'source': ['src', 'srcset', 'type', 'media'],
    'video': ['src', 'poster', 'width', 'height'],
    'audio': ['src', 'controls'],
    'time': ['datetime'],
    'ol': ['type', 'start'],
    'li': ['value'],
    'table': [],
    'tr': [],
    'td': [],
    'th': [],
    'col': ['span'],
    'colgroup': ['span'],
    'blockquote': ['cite'],
    'q': ['cite'],
    'abbr': ['title'],
    'dfn': ['title'],
    'code': [],
    'pre': [],
    'kbd': [],
    'var': [],
    'samp': [],
    'del': ['datetime', 'cite'],
    'ins': ['datetime', 'cite'],
    // Global attributes available on all elements
    '_global': ['id', 'itemprop', 'itemscope', 'itemtype', 'aria-label', 'aria-current', 'aria-hidden', 'role']
  };

  // Process node recursively
  const processNode = (node: Node): string => {
    // Text node
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    // Comment node - remove all comments
    if (node.nodeType === Node.COMMENT_NODE) {
      return '';
    }

    // Element node
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();

      // Skip dangerous elements
      if (dangerousElements.includes(tagName)) {
        console.log(`[SANITIZE] Removed dangerous tag: <${tagName}>`);
        return '';
      }

      // Process children first
      let childContent = '';
      element.childNodes.forEach(child => {
        childContent += processNode(child);
      });

      // If tag is allowed, wrap with tag
      if (allowedTags.has(tagName)) {
        // Build attributes string with strict filtering
        let attrStr = '';

        // Get allowed attributes for this tag
        const tagAttrs = allowedAttributes[tagName] || [];
        const globalAttrs = allowedAttributes['_global'] || [];
        const allAttrs = [...tagAttrs, ...globalAttrs];

        // Special handling for img
        if (tagName === 'img') {
          let src = element.getAttribute('src') ||
                    element.getAttribute('data-src') ||
                    element.getAttribute('data-lazy-src') ||
                    element.getAttribute('data-original') || '';

          // Convert relative URL to absolute
          if (src && !src.startsWith('http') && !src.startsWith('data:')) {
            try {
              src = new URL(src, baseUrl).href;
            } catch (e) {
              console.log(`[SANITIZE] Failed to resolve image URL: ${src}`);
              return childContent;
            }
          }

          if (!src) return childContent;

          const alt = element.getAttribute('alt') || '';
          const title = element.getAttribute('title') || '';
          const width = element.getAttribute('width') || '';
          const height = element.getAttribute('height') || '';

          attrStr = ` src="${sanitizeAttribute(src)}"`;
          if (alt) attrStr += ` alt="${sanitizeAttribute(alt)}"`;
          if (title) attrStr += ` title="${sanitizeAttribute(title)}"`;
          if (width) attrStr += ` width="${sanitizeAttribute(width)}"`;
          if (height) attrStr += ` height="${sanitizeAttribute(height)}"`;

          return `<img${attrStr}>`;
        }

        // Special handling for anchor tags
        if (tagName === 'a') {
          let href = element.getAttribute('href') || '';

          // Skip javascript: and dangerous links
          if (href.toLowerCase().startsWith('javascript:')) {
            return childContent;
          }

          // Convert relative URLs to absolute
          if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
            try {
              href = new URL(href, baseUrl).href;
            } catch (e) {
              console.log(`[SANITIZE] Failed to resolve href: ${href}`);
              href = '';
            }
          }

          if (href && !href.toLowerCase().startsWith('javascript:')) {
            attrStr += ` href="${sanitizeAttribute(href)}"`;
          }

          const rel = element.getAttribute('rel');
          if (rel) attrStr += ` rel="${sanitizeAttribute(rel)}"`;

          const ariaLabel = element.getAttribute('aria-label');
          if (ariaLabel) attrStr += ` aria-label="${sanitizeAttribute(ariaLabel)}"`;

          const title = element.getAttribute('title');
          if (title) attrStr += ` title="${sanitizeAttribute(title)}"`;

          return `<a${attrStr}>${childContent}</a>`;
        }

        // For other allowed elements, preserve only allowed attributes
        allAttrs.forEach(attr => {
          const value = element.getAttribute(attr);
          if (value !== null && value.trim() !== '') {
            // Skip event handlers and dangerous attributes
            if (attr.toLowerCase().startsWith('on')) return;
            if (attr.toLowerCase().startsWith('data-')) return;
            if (attr === 'style') return;
            if (attr === 'class') return;

            attrStr += ` ${attr}="${sanitizeAttribute(value)}"`;
          }
        });

        // Self-closing tags
        if (['br', 'hr', 'img', 'meta', 'source', 'col', 'wbr'].includes(tagName)) {
          return `<${tagName}${attrStr}>`;
        }

        return `<${tagName}${attrStr}>${childContent}</${tagName}>`;
      }

      // Non-allowed tag - unwrap it, keep children
      return childContent;
    }

    return '';
  };

  // Extract content from main
  let result = '';
  mainElement.childNodes.forEach(child => {
    result += processNode(child);
  });

  // Post-processing: Final sanitization pass to remove any remaining dangerous content
  result = finalSanitizationPass(result);

  // Format the HTML
  const formatted = formatHtml(result);

  console.log(`[EXTRACTION] Extracted ${result.length} chars before formatting, ${formatted.length} after`);

  return formatted;
}

// Sanitize attribute values
function sanitizeAttribute(value: string): string {
  return value
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&/g, '&amp;');
}

// Final sanitization pass to ensure no dangerous content remains
function finalSanitizationPass(html: string): string {
  let sanitized = html;

  // Remove any remaining script tags (encoded or not)
  sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  sanitized = sanitized.replace(/<\s*script[^>]*>/gi, '');

  // Remove style tags
  sanitized = sanitized.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  sanitized = sanitized.replace(/<\s*style[^>]*>/gi, '');

  // Remove noscript, iframe, svg, canvas, embed, object
  sanitized = sanitized.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
  sanitized = sanitized.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '');
  sanitized = sanitized.replace(/<canvas[^>]*>[\s\S]*?<\/canvas>/gi, '');
  sanitized = sanitized.replace(/<embed[^>]*>/gi, '');
  sanitized = sanitized.replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '');
  sanitized = sanitized.replace(/<form[^>]*>[\s\S]*?<\/form>/gi, '');
  sanitized = sanitized.replace(/<input[^>]*>/gi, '');
  sanitized = sanitized.replace(/<button[^>]*>[\s\S]*?<\/button>/gi, '');
  sanitized = sanitized.replace(/<textarea[^>]*>[\s\S]*?<\/textarea>/gi, '');
  sanitized = sanitized.replace(/<select[^>]*>[\s\S]*?<\/select>/gi, '');

  // Remove any remaining onclick, onload, onerror, etc. attributes
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove style attributes
  sanitized = sanitized.replace(/\s+style\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s+style\s*=\s*[^\s>]*/gi, '');

  // Remove class attributes (keep the structure, remove styling classes)
  sanitized = sanitized.replace(/\s+class\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s+class\s*=\s*[^\s>]*/gi, '');

  // Remove data-* attributes
  sanitized = sanitized.replace(/\s+data-[^\s=]*\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s+data-[^\s=]*\s*=\s*[^\s>]*/gi, '');

  return sanitized;
}

// Format HTML with proper indentation
function formatHtml(html: string): string {
  // Block level tags that should be on their own line
  const blockTags = ['main', 'header', 'section', 'article', 'aside', 'footer', 'nav', 'div',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 
    'tfoot', 'tr', 'th', 'td', 'figure', 'figcaption', 'blockquote', 'pre', 'hr', 'br',
    'details', 'summary', 'menu', 'address', 'form', 'fieldset', 'legend'];
  
  // Tags that increase indentation
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
    
    // Check for closing tag first
    let hasClosingTag = false;
    indentTags.forEach(tag => {
      if (trimmedLine.toLowerCase().startsWith(`</${tag}>`)) {
        hasClosingTag = true;
      }
    });
    
    if (hasClosingTag && indentLevel > 0) {
      indentLevel--;
    }
    
    const indent = '  '.repeat(indentLevel);
    formattedLines.push(indent + trimmedLine);
    
    // Check for opening tag (increase indent for next line)
    if (!hasClosingTag) {
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

  // Clean HTML - use robust sanitization pipeline
  let cleanContent = finalSanitizationPass(extracted.mainContent);

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
    dynamicServing: '0',
  };
}

// Sanitize content for debug preview
export function sanitizeForDebug(html: string, maxLength: number = 500): string {
  let sanitized = finalSanitizationPass(html);

  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...';
  }

  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  return sanitized;
}
