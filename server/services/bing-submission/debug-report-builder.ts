// Build comprehensive debug reports for each URL during bulk submissions
import { PingResult } from '@shared/indexnow';

export interface BulkDebugReport {
  url: string;
  engine: string;
  status: number;
  latency: number;
  timestamp: string;
  verdict: {
    url: 'PASS' | 'FAIL' | 'SKIPPED';
    content: 'PASS' | 'FAIL' | 'SKIPPED';
    schema: 'PASS' | 'FAIL' | 'SKIPPED';
    bing: 'CONFIRMED' | 'UNKNOWN' | 'FAILED';
    overall: 'WORKING' | 'PARTIAL' | 'NEEDS_FIX';
  };
  metadata: {
    title: string;
    description: string;
    canonical: string;
    robots: string;
    publishDate: string | null;
    lastModified: string | null;
  };
  schema: {
    found: boolean;
    count: number;
    types: string[];
    isValid: boolean;
    validationErrors: string[];
    schemas: Record<string, unknown>[];
  };
  content: {
    sourceTag: 'main' | 'article' | 'body' | 'none';
    characterCount: number;
    sanitizedPreview: string;
    isValid: boolean;
    isEmpty: boolean;
    isHeaderFooterOnly: boolean;
    warnings: string[];
  };
  htmlSnapshot?: {
    head: string;
    bodyPreview: string;
    fullSize: number;
    charset: string;
  };
  apiResponse: {
    endpoint: string;
    method: string;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
  };
  timing: {
    fetchTime: number;
    parseTime: number;
    extractionTime: number;
    submissionTime: number;
    totalTime: number;
  };
  validations: Array<{
    check: string;
    status: 'PASS' | 'WARN' | 'FAIL';
    message: string;
    severity: 'info' | 'warning' | 'error';
  }>;
  requestPayload: Record<string, unknown>;
}

export class DebugReportBuilder {
  static buildFromPingResult(
    result: PingResult & { debug?: any },
    engine: string
  ): BulkDebugReport {
    const startTime = Date.now();
    const debugInfo = result.debug || {};

    // Parse timing if available
    const timing = {
      fetchTime: debugInfo.fetchTime || 0,
      parseTime: debugInfo.parseTime || 0,
      extractionTime: debugInfo.extractionTime || 0,
      submissionTime: debugInfo.submissionTime || 0,
      totalTime: result.latency || 0,
    };

    // Extract metadata
    const metadata = {
      title: debugInfo.metadata?.title || '',
      description: debugInfo.metadata?.description || '',
      canonical: debugInfo.metadata?.canonical || '',
      robots: debugInfo.metadata?.robots || '',
      publishDate: debugInfo.metadata?.publishDate || null,
      lastModified: debugInfo.metadata?.lastModified || null,
    };

    // Extract schema info
    const schema = {
      found: debugInfo.schema?.found || false,
      count: debugInfo.schema?.count || 0,
      types: debugInfo.schema?.types || [],
      isValid: debugInfo.schema?.isValid || false,
      validationErrors: debugInfo.schema?.validationErrors || [],
      schemas: debugInfo.schema?.schemas || [],
    };

    // Extract content info
    const content = {
      sourceTag: debugInfo.contentExtraction?.sourceTag || 'none' as const,
      characterCount: debugInfo.contentExtraction?.characterCount || 0,
      sanitizedPreview: debugInfo.contentExtraction?.sanitizedPreview || '',
      isValid: debugInfo.contentExtraction?.isValid || false,
      isEmpty: debugInfo.contentExtraction?.isEmpty || false,
      isHeaderFooterOnly: debugInfo.contentExtraction?.isHeaderFooterOnly || false,
      warnings: debugInfo.contentExtraction?.warnings || [],
    };

    // Determine verdict status
    const urlStatus = engine === 'bing-url' 
      ? (result.status === 200 || result.status === 202 ? 'PASS' : 'FAIL')
      : 'SKIPPED';

    const contentStatus = engine === 'bing-content'
      ? (result.status === 200 || result.status === 202 ? 'PASS' : result.status === 304 ? 'SKIPPED' : 'FAIL')
      : 'SKIPPED';

    const schemaStatus = schema.found
      ? (schema.isValid ? 'PASS' : 'FAIL')
      : 'SKIPPED';

    const overallStatus =
      (urlStatus === 'PASS' || contentStatus === 'PASS')
        ? 'WORKING'
        : (urlStatus === 'FAIL' || contentStatus === 'FAIL')
          ? 'NEEDS_FIX'
          : 'PARTIAL';

    // Build validation checks
    const validations = this.buildValidationChecks(metadata, content, schema);

    // Build report
    const report: BulkDebugReport = {
      url: result.url,
      engine,
      status: result.status,
      latency: result.latency || 0,
      timestamp: new Date().toISOString(),
      verdict: {
        url: urlStatus,
        content: contentStatus,
        schema: schemaStatus,
        bing: result.status === 200 || result.status === 202 ? 'CONFIRMED' : 'UNKNOWN',
        overall: overallStatus,
      },
      metadata,
      schema,
      content,
      apiResponse: {
        endpoint: engine === 'bing-content' ? '/api/bing/submit-content' : '/api/bing/submit-urls',
        method: 'POST',
        status: result.status,
        statusText: result.meaning || 'Unknown',
        headers: {},
        body: result.response || '',
      },
      timing,
      validations,
      requestPayload: debugInfo.requestPayload || { url: result.url },
    };

    return report;
  }

  private static buildValidationChecks(
    metadata: any,
    content: any,
    schema: any
  ): BulkDebugReport['validations'] {
    const checks: BulkDebugReport['validations'] = [];

    // Title validation
    checks.push({
      check: 'Page Title',
      status: metadata.title && metadata.title.length > 0 ? 'PASS' : 'FAIL',
      message: metadata.title 
        ? `"${metadata.title}" (${metadata.title.length} chars)`
        : 'Missing page title',
      severity: metadata.title ? 'info' : 'error',
    });

    // Description validation
    checks.push({
      check: 'Meta Description',
      status: metadata.description && metadata.description.length > 0 ? 'PASS' : 'WARN',
      message: metadata.description
        ? `"${metadata.description.substring(0, 50)}..." (${metadata.description.length} chars)`
        : 'No meta description',
      severity: metadata.description ? 'info' : 'warning',
    });

    // Canonical validation
    checks.push({
      check: 'Canonical URL',
      status: metadata.canonical ? 'PASS' : 'WARN',
      message: metadata.canonical || 'No canonical tag',
      severity: metadata.canonical ? 'info' : 'warning',
    });

    // Content validation
    checks.push({
      check: 'Main Content',
      status: !content.isEmpty ? 'PASS' : 'FAIL',
      message: content.isEmpty 
        ? 'No content extracted from <main>, <article>, or <body>'
        : `${content.characterCount} characters extracted`,
      severity: content.isEmpty ? 'error' : 'info',
    });

    // Schema validation
    checks.push({
      check: 'Schema Markup',
      status: schema.found ? (schema.isValid ? 'PASS' : 'WARN') : 'WARN',
      message: schema.found
        ? schema.isValid
          ? `${schema.count} valid schema(s) found: ${schema.types.join(', ')}`
          : `${schema.count} schema(s) found but invalid JSON`
        : 'No schema markup detected',
      severity: schema.found && !schema.isValid ? 'warning' : 'info',
    });

    // Robots validation
    checks.push({
      check: 'Robots Meta',
      status: !metadata.robots?.includes('noindex') ? 'PASS' : 'WARN',
      message: metadata.robots || 'Not specified (default: indexable)',
      severity: metadata.robots?.includes('noindex') ? 'warning' : 'info',
    });

    // Publish date
    checks.push({
      check: 'Publish Date',
      status: metadata.publishDate ? 'PASS' : 'WARN',
      message: metadata.publishDate || 'Not specified',
      severity: metadata.publishDate ? 'info' : 'warning',
    });

    // Header footer only check
    if (content.isHeaderFooterOnly) {
      checks.push({
        check: 'Content Quality',
        status: 'WARN',
        message: 'Content appears to be only headers/footers, no main content',
        severity: 'warning',
      });
    }

    return checks;
  }
}
