import { z } from 'zod';

// ===== URL SUBMISSION SCHEMAS =====

export const SingleBingUrlSubmissionSchema = z.object({
  url: z.string().url('Invalid URL'),
  engines: z.array(z.enum(['bing-url', 'bing-content'])).min(1),
  debug: z.boolean().optional().default(false),
});

export const BulkBingUrlSubmissionSchema = z.object({
  urls: z.array(z.string().url('Invalid URL')).min(1).max(10000),
  engines: z.array(z.enum(['bing-url', 'bing-content'])).min(1),
  mode: z.enum(['update', 'delete']).default('update'),
  debug: z.boolean().optional().default(false),
});

// ===== TYPE DEFINITIONS =====

export interface BingMetadata {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  publishDate: string | null;
  lastModified: string | null;
}

export interface ExtractedContent {
  mainContent: string;
  metadata: BingMetadata;
  schemas: Record<string, unknown>[];
  pageUrl: string;
}

export interface BingContentPayload {
  siteUrl: string;
  url: string;
  httpMessage: string;
  structuredData?: string;
  dynamicServing?: '0' | '1';
}

export interface BingSubmissionResult {
  url: string;
  engine: 'bing-url' | 'bing-content';
  status: number;
  meaning: string;
  latency: number;
  response?: string;
  error?: string;
  attempts: number;
  final: boolean;
  debug?: Record<string, unknown>;
}

export interface BingUrlSubmissionResponse {
  results: BingSubmissionResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    rateLimited: number;
  };
}

// ===== UTILITY FUNCTIONS =====

export function getBingStatusMeaning(status: number): string {
  const meanings: Record<number, string> = {
    200: 'Success - Processed',
    202: 'Accepted - Queued',
    204: 'No Content - Accepted',
    400: 'Invalid - Bad Request/Params',
    401: 'Unauthorized - Invalid API key',
    403: 'Forbidden - Domain not verified',
    404: 'Not Found - Endpoint Missing',
    429: 'Rate Limited - Too Many Requests',
    500: 'Server Error',
    502: 'Bad Gateway - Retry Later',
    503: 'Service Unavailable - Retry Later',
  };

  return (
    meanings[status] ||
    (status >= 500 ? 'Server Error' : status >= 400 ? 'Client Error' : 'Unknown Status')
  );
}

export function getBingStatusBadgeVariant(
  status: number
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 200 || status === 202 || status === 204) return 'default';
  if (status === 429) return 'secondary';
  if (status >= 400) return 'destructive';
  return 'outline';
}

// ===== VALIDATION HELPERS =====

export type SingleBingUrlSubmissionInput = z.infer<typeof SingleBingUrlSubmissionSchema>;
export type BulkBingUrlSubmissionInput = z.infer<typeof BulkBingUrlSubmissionSchema>;
