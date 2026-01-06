// Debug logger for tracking URL & content submission processes
import crypto from 'crypto';

export interface ContentDebugInfo {
  sourceTag: 'main' | 'article' | 'body' | 'none';
  rawHTML: string;
  sanitizedPreview: string;
  characterCount: number;
  isValid: boolean;
  isEmpty: boolean;
  isHeaderFooterOnly: boolean;
  warnings: string[];
}

export interface MetadataDebugInfo {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  publishDate: string | null;
  lastModified: string | null;
}

export interface SchemaDebugInfo {
  found: boolean;
  count: number;
  types: string[];
  schemas: Record<string, unknown>[];
  isValid: boolean;
  validationErrors: string[];
  sentToBing: boolean;
}

export interface UrlSubmissionDebugInfo {
  url: string;
  siteUrl: string;
  requestPayload: Record<string, unknown>;
  httpStatus: number;
  bingResponse: string;
  bingResponseParsed: Record<string, unknown> | null;
  success: boolean;
  retryAttempts: number;
  retryReasons: string[];
  rateLimitHeaders: Record<string, string>;
  latency: number;
}

export interface ContentSubmissionDebugInfo {
  url: string;
  contentExtraction: ContentDebugInfo;
  metadata: MetadataDebugInfo;
  schema: SchemaDebugInfo;
  contentHash: string;
  previousHash: string | null;
  contentChanged: boolean;
  requestPayload: Record<string, unknown>;
  httpStatus: number;
  bingResponse: string;
  bingResponseParsed: Record<string, unknown> | null;
  success: boolean;
  retryAttempts: number;
  rateLimitHeaders: Record<string, string>;
  latency: number;
}

export interface FinalDebugVerdict {
  url: string;
  urlSubmissionStatus: 'PASS' | 'FAIL' | 'SKIPPED';
  contentSubmissionStatus: 'PASS' | 'FAIL' | 'SKIPPED';
  schemaSubmissionStatus: 'PASS' | 'FAIL' | 'SKIPPED';
  bingAwarenessStatus: 'CONFIRMED' | 'NOT_CONFIRMED' | 'UNKNOWN';
  overallStatus: 'WORKING' | 'NEEDS_FIX' | 'PARTIAL';
  issues: string[];
  recommendations: string[];
}

export class DebugLogger {
  private isEnabled: boolean = false;
  private logs: Map<string, unknown> = new Map();
  private contentHashes: Map<string, string> = new Map();

  constructor() {
    this.loadState();
  }

  // Enable/Disable debug mode
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('debugMode', JSON.stringify(enabled));
    }
  }

  isDebugModeEnabled(): boolean {
    return this.isEnabled;
  }

  // Load debug state from localStorage
  private loadState(): void {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('debugMode');
      this.isEnabled = stored ? JSON.parse(stored) : false;

      const hashes = localStorage.getItem('contentHashes');
      if (hashes) {
        try {
          this.contentHashes = new Map(JSON.parse(hashes));
        } catch {
          this.contentHashes = new Map();
        }
      }
    }
  }

  // Log content extraction debug info
  logContentExtraction(url: string, info: ContentDebugInfo): void {
    if (!this.isEnabled) return;
    this.logs.set(`content_extraction_${url}`, info);
  }

  // Log metadata extraction debug info
  logMetadataExtraction(url: string, info: MetadataDebugInfo): void {
    if (!this.isEnabled) return;
    this.logs.set(`metadata_${url}`, info);
  }

  // Log schema extraction debug info
  logSchemaExtraction(url: string, info: SchemaDebugInfo): void {
    if (!this.isEnabled) return;
    this.logs.set(`schema_${url}`, info);
  }

  // Log URL submission debug info
  logUrlSubmission(info: UrlSubmissionDebugInfo): void {
    if (!this.isEnabled) return;
    this.logs.set(`url_submission_${info.url}`, info);
  }

  // Log content submission debug info
  logContentSubmission(info: ContentSubmissionDebugInfo): void {
    if (!this.isEnabled) return;
    this.logs.set(`content_submission_${info.url}`, info);

    // Store content hash for change detection
    this.contentHashes.set(info.url, info.contentHash);
    this.persistContentHashes();
  }

  // Get previous content hash
  getPreviousHash(url: string): string | null {
    return this.contentHashes.get(url) || null;
  }

  // Persist hashes to localStorage
  private persistContentHashes(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'contentHashes',
        JSON.stringify(Array.from(this.contentHashes.entries()))
      );
    }
  }

  // Generate content hash
  static generateHash(content: string): string {
    // Browser-compatible hash using crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    // Use a simple hash for browser compatibility (not cryptographically secure but suitable for change detection)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  // Format debug verdict
  generateFinalVerdict(url: string): FinalDebugVerdict {
    const urlSubmission = this.logs.get(`url_submission_${url}`) as
      | UrlSubmissionDebugInfo
      | undefined;
    const contentSubmission = this.logs.get(`content_submission_${url}`) as
      | ContentSubmissionDebugInfo
      | undefined;

    const issues: string[] = [];
    const recommendations: string[] = [];

    const urlStatus = urlSubmission
      ? urlSubmission.success
        ? 'PASS'
        : 'FAIL'
      : 'SKIPPED';
    const contentStatus = contentSubmission
      ? contentSubmission.success
        ? 'PASS'
        : 'FAIL'
      : 'SKIPPED';
    const schemaStatus = contentSubmission?.schema?.found
      ? contentSubmission.schema.isValid
        ? 'PASS'
        : 'FAIL'
      : 'SKIPPED';

    // Collect issues
    if (urlStatus === 'FAIL') {
      issues.push('URL submission failed to Bing');
      recommendations.push('Check API key configuration');
      recommendations.push('Verify domain is registered in Bing Webmaster');
    }

    if (contentStatus === 'FAIL') {
      issues.push('Content submission failed');
      recommendations.push('Check content extraction validity');
    }

    if (contentSubmission?.contentExtraction?.isEmpty) {
      issues.push('Extracted content is empty');
      recommendations.push('Verify page has <main>, <article>, or <body> content');
    }

    if (contentSubmission?.schema?.found && !contentSubmission.schema.isValid) {
      issues.push('Schema markup is invalid JSON');
      recommendations.push('Validate JSON-LD structure');
    }

    const overallStatus =
      urlStatus === 'PASS' && contentStatus === 'PASS'
        ? 'WORKING'
        : urlStatus === 'FAIL' || contentStatus === 'FAIL'
          ? 'NEEDS_FIX'
          : 'PARTIAL';

    return {
      url,
      urlSubmissionStatus: urlStatus as 'PASS' | 'FAIL' | 'SKIPPED',
      contentSubmissionStatus: contentStatus as 'PASS' | 'FAIL' | 'SKIPPED',
      schemaSubmissionStatus: schemaStatus as 'PASS' | 'FAIL' | 'SKIPPED',
      bingAwarenessStatus: 'UNKNOWN', // Would require actual Bing API checks
      overallStatus: overallStatus as 'WORKING' | 'NEEDS_FIX' | 'PARTIAL',
      issues,
      recommendations,
    };
  }

  // Get all logs for a URL
  getUrlDebugLogs(url: string): Record<string, unknown> {
    const logs: Record<string, unknown> = {};
    for (const [key, value] of this.logs.entries()) {
      if (key.includes(url)) {
        logs[key] = value;
      }
    }
    return logs;
  }

  // Get all logs
  getAllLogs(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of this.logs.entries()) {
      result[key] = value;
    }
    return result;
  }

  // Clear logs
  clearLogs(): void {
    this.logs.clear();
  }

  // Export logs as JSON
  exportLogsAsJSON(): string {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        debugModeEnabled: this.isEnabled,
        logs: Object.fromEntries(this.logs),
        contentHashes: Object.fromEntries(this.contentHashes),
      },
      null,
      2
    );
  }
}

// Global debug logger instance
export const debugLogger = new DebugLogger();
