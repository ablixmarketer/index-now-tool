// Shared debug types used by both client and server

export interface DebugInfo {
  enabled: boolean;
  contentExtraction?: {
    sourceTag: 'main' | 'article' | 'body' | 'none';
    characterCount: number;
    sanitizedPreview: string;
    isValid: boolean;
    isEmpty: boolean;
    isHeaderFooterOnly: boolean;
    warnings: string[];
  };
  metadata?: {
    title: string;
    description: string;
    canonical: string;
    robots: string;
    publishDate: string | null;
    lastModified: string | null;
    extracted: {
      hasTitle: boolean;
      hasDescription: boolean;
      hasCanonical: boolean;
    };
  };
  schema?: {
    found: boolean;
    count: number;
    types: string[];
    isValid: boolean;
    validationErrors: string[];
    schemas: Record<string, unknown>[];
  };
  submission?: {
    apiType: 'url' | 'content';
    httpStatus: number;
    latency: number;
    responsePreview: string;
    success: boolean;
    retryAttempts: number;
    rateLimitHeaders?: Record<string, string>;
  };
}

export interface DebugResponse {
  debug?: DebugInfo;
}

// Helper function (stub for server-side use)
export const debugLogger = {
  info: (message: string, data?: unknown) => {
    console.log(`[DEBUG] ${message}`, data || '');
  },
  warn: (message: string, data?: unknown) => {
    console.warn(`[DEBUG] ${message}`, data || '');
  },
  error: (message: string, data?: unknown) => {
    console.error(`[DEBUG] ${message}`, data || '');
  },
};
