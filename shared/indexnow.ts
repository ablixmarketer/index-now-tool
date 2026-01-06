import { z } from 'zod';

// Engine definitions
export const engines = {
  indexnow: {
    id: 'indexnow',
    name: 'IndexNow Hub',
    url: 'https://api.indexnow.org/indexnow',
    type: 'bulk' as const,
    description: 'Official IndexNow hub that distributes to all participants'
  },
  bing: {
    id: 'bing',
    name: 'Bing',
    url: 'https://www.bing.com/indexnow',
    type: 'single' as const,
    description: 'Microsoft Bing search engine'
  },
  'bing-url': {
    id: 'bing-url',
    name: 'Bing URL Submission',
    url: 'https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlbatch',
    type: 'bulk' as const,
    description: 'Submit URLs to Bing Webmaster via URL Submission API'
  },
  'bing-content': {
    id: 'bing-content',
    name: 'Bing Content Submission',
    url: 'https://ssl.bing.com/webmaster/api.svc/json/SubmitContent',
    type: 'bulk' as const,
    description: 'Submit full page content to Bing for indexing'
  }
} as const;

export type EngineId = keyof typeof engines;

// Zod schemas for API validation
export const SitemapScanRequestSchema = z.object({
  sitemapUrl: z.string().url(),
  days: z.number().int().min(1).max(365),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional()
});

export const BulkPingRequestSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(10000),
  engines: z.array(z.enum(['indexnow', 'bing', 'bing-url', 'bing-content'])),
  mode: z.enum(['update', 'delete']).default('update')
});

export const SinglePingRequestSchema = z.object({
  url: z.string().url(),
  engines: z.array(z.enum(['indexnow', 'bing', 'bing-url', 'bing-content']))
});

// Response types
export interface SitemapUrl {
  url: string;
  lastmod?: string;
  reason: 'included' | 'excluded' | 'old' | 'no-lastmod';
  checked: boolean;
}

export interface SitemapScanResponse {
  urls: SitemapUrl[];
  totalUrls: number;
  filteredUrls: number;
  sitemapType: 'standard' | 'index' | 'gzipped';
}

export interface PingResult {
  url: string;
  engine: EngineId | 'bing-url' | 'bing-content';
  status: number;
  meaning: string;
  latency: number;
  attempts: number;
  final: boolean;
  response?: string;
  error?: string;
}

export interface BulkPingResponse {
  results: PingResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    rateLimited: number;
  };
}

// Utility functions
export function statusToMeaning(status: number): string {
  switch (status) {
    case 200:
      return 'Success - Accepted/Processed';
    case 202:
      return 'Accepted - Pending Validation';
    case 400:
      return 'Invalid - Bad Request/Params';
    case 403:
      return 'Forbidden - Key Mismatch';
    case 404:
      return 'Not Found - Endpoint Missing';
    case 410:
      return 'Gone - URL Removed';
    case 422:
      return 'Unprocessable - Host Mismatch';
    case 429:
      return 'Rate Limited - Too Many Requests';
    default:
      if (status >= 500) return 'Server Error';
      if (status >= 400) return 'Client Error';
      return 'Unknown Status';
  }
}

export function getStatusBadgeVariant(status: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 200 || status === 202) return 'default';
  if (status === 429) return 'secondary';
  if (status >= 400) return 'destructive';
  return 'outline';
}

// Environment validation
export const EnvSchema = z.object({
  INDEXNOW_KEY: z.string().min(1),
  INDEXNOW_KEY_LOCATION: z.string().optional(),
  INDEXNOW_ENDPOINT: z.string().url().default('https://api.indexnow.org/indexnow')
});

export type IndexNowEnv = z.infer<typeof EnvSchema>;
