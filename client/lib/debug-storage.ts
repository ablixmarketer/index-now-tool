// Advanced debug storage utility for bulk submissions
// Uses localStorage for small data + IndexedDB for large HTML snapshots

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

class DebugStorage {
  private dbName = 'IndexNowDebugDB';
  private storeName = 'debugReports';
  private db: IDBDatabase | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        console.warn('[DEBUG STORAGE] IndexedDB not available, using localStorage only');
        this.initialized = true;
        resolve();
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'url' });
        }
      };
    });
  }

  // Save debug report for a URL
  async saveReport(report: BulkDebugReport): Promise<void> {
    await this.init();

    // Always store in localStorage for quick access (exclude large HTML)
    const summary = { ...report };
    delete (summary as any).htmlSnapshot;

    const key = `debug_${report.url}`;
    try {
      localStorage.setItem(key, JSON.stringify(summary));
    } catch (e) {
      console.warn('[DEBUG STORAGE] localStorage quota exceeded');
    }

    // Store in IndexedDB for large HTML snapshot
    if (this.db && report.htmlSnapshot) {
      return new Promise((resolve) => {
        try {
          const transaction = this.db!.transaction([this.storeName], 'readwrite');
          const store = transaction.objectStore(this.storeName);
          const request = store.put(report);

          request.onsuccess = () => resolve();
          request.onerror = () => {
            console.warn('[DEBUG STORAGE] IndexedDB write failed');
            resolve();
          };
        } catch (e) {
          console.warn('[DEBUG STORAGE] IndexedDB not available');
          resolve();
        }
      });
    }
  }

  // Get debug report for a URL
  async getReport(url: string): Promise<BulkDebugReport | null> {
    await this.init();

    // Try IndexedDB first (has full data with HTML)
    if (this.db) {
      const idbReport = await this.getFromIndexedDB(url);
      if (idbReport) return idbReport;
    }

    // Fall back to localStorage
    const key = `debug_${url}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('[DEBUG STORAGE] Failed to parse stored report');
        return null;
      }
    }

    return null;
  }

  // Internal: Get from IndexedDB
  private getFromIndexedDB(url: string): Promise<BulkDebugReport | null> {
    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(url);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          resolve(null);
        };
      } catch (e) {
        resolve(null);
      }
    });
  }

  // Get all stored report URLs
  async getAllReportUrls(): Promise<string[]> {
    await this.init();
    const keys: string[] = [];

    // Get from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('debug_')) {
        const url = key.replace('debug_', '');
        keys.push(url);
      }
    }

    return Array.from(new Set(keys)); // Remove duplicates
  }

  // Clear old reports (older than 7 days)
  async clearOldReports(daysOld: number = 7): Promise<void> {
    await this.init();
    const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;

    const urls = await this.getAllReportUrls();
    for (const url of urls) {
      const report = await this.getReport(url);
      if (report && new Date(report.timestamp).getTime() < cutoff) {
        localStorage.removeItem(`debug_${url}`);
        if (this.db) {
          try {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            store.delete(url);
          } catch (e) {
            // Ignore
          }
        }
      }
    }
  }

  // Export report as JSON
  exportAsJSON(report: BulkDebugReport): string {
    return JSON.stringify(report, null, 2);
  }

  // Export report as CSV (metadata + validation only)
  exportAsCSV(report: BulkDebugReport): string {
    const rows: string[] = [];
    rows.push('Property,Value');
    rows.push(`URL,"${report.url}"`);
    rows.push(`Status,${report.status}`);
    rows.push(`Overall Verdict,${report.verdict.overall}`);
    rows.push(`URL Submission,${report.verdict.url}`);
    rows.push(`Content Submission,${report.verdict.content}`);
    rows.push(`Schema,${report.verdict.schema}`);
    rows.push(`Title,"${report.metadata.title}"`);
    rows.push(`Description,"${report.metadata.description}"`);
    rows.push(`Canonical,"${report.metadata.canonical}"`);
    rows.push(`Content Length,${report.content.characterCount}`);

    rows.push('');
    rows.push('Validation Checks');
    rows.push('Check,Status,Message,Severity');
    for (const check of report.validations) {
      rows.push(
        `"${check.check}","${check.status}","${check.message}","${check.severity}"`
      );
    }

    return rows.join('\n');
  }
}

// Singleton instance
export const debugStorage = new DebugStorage();
