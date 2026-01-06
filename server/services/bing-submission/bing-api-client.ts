import { BingContentPayload, BingSubmissionResult, getBingStatusMeaning } from '@shared/bing-submission';

const BING_URL_SUBMISSION_ENDPOINT = 'https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlbatch';
const BING_CONTENT_SUBMISSION_ENDPOINT = 'https://ssl.bing.com/webmaster/api.svc/json/SubmitContent';

// Sleep utility for retries
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface SubmitUrlsPayload {
  siteUrl: string;
  urlList: string[];
}

export async function submitUrlsToBingAPI(
  payload: SubmitUrlsPayload,
  apiKey: string,
  maxRetries: number = 3
): Promise<BingSubmissionResult[]> {
  const startTime = Date.now();
  const siteUrl = payload.siteUrl;
  const urlList = payload.urlList;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(
        `${BING_URL_SUBMISSION_ENDPOINT}?apikey=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'IndexNow-Extension/1.0',
          },
          body: JSON.stringify(payload),
        }
      );

      const latency = Date.now() - startTime;

      // Try to parse response
      let responseText = '';
      try {
        responseText = await response.text();
      } catch {
        responseText = '';
      }

      // Success responses
      if (response.status === 200 || response.status === 202 || response.status === 204) {
        // Map URLs to individual results
        return urlList.map((url) => ({
          url,
          engine: 'bing-url' as const,
          status: response.status,
          meaning: getBingStatusMeaning(response.status),
          latency,
          attempts: attempt,
          final: true,
          response: responseText.slice(0, 2048),
        }));
      }

      // Rate limit - retry with backoff
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        if (attempt < maxRetries) {
          console.warn(`Bing rate limit hit. Waiting ${retryAfter}s before retry...`);
          await sleep(retryAfter * 1000);
          continue;
        }
      }

      // Permanent errors - don't retry
      if (response.status >= 400) {
        console.error(`Bing URL submission error (${response.status}):`, responseText);
        return urlList.map((url) => ({
          url,
          engine: 'bing-url' as const,
          status: response.status,
          meaning: getBingStatusMeaning(response.status),
          latency,
          attempts: attempt,
          final: true,
          error: responseText.slice(0, 500),
        }));
      }
    } catch (error) {
      const latency = Date.now() - startTime;

      // Network error - retry
      if (attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.warn(`Bing URL submission network error. Retrying in ${backoffMs}ms...`, error);
        await sleep(backoffMs);
        continue;
      }

      // Final attempt failed
      console.error('Bing URL submission failed after retries:', error);
      return urlList.map((url) => ({
        url,
        engine: 'bing-url' as const,
        status: 0,
        meaning: 'Network Error',
        latency,
        attempts: maxRetries,
        final: true,
        error: error instanceof Error ? error.message : 'Unknown network error',
      }));
    }
  }

  // Fallback (shouldn't reach here)
  return urlList.map((url) => ({
    url,
    engine: 'bing-url' as const,
    status: 0,
    meaning: 'Unknown Error',
    latency: Date.now() - startTime,
    attempts: maxRetries,
    final: true,
    error: 'Failed after all retries',
  }));
}

export async function submitContentToBingAPI(
  payload: BingContentPayload,
  apiKey: string,
  maxRetries: number = 3
): Promise<BingSubmissionResult> {
  const startTime = Date.now();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(
        `${BING_CONTENT_SUBMISSION_ENDPOINT}?apikey=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'IndexNow-Extension/1.0',
          },
          body: JSON.stringify(payload),
        }
      );

      const latency = Date.now() - startTime;

      // Try to parse response
      let responseText = '';
      try {
        responseText = await response.text();
      } catch {
        responseText = '';
      }

      // Success responses
      if (response.status === 200 || response.status === 202 || response.status === 204) {
        return {
          url: payload.url,
          engine: 'bing-content' as const,
          status: response.status,
          meaning: getBingStatusMeaning(response.status),
          latency,
          attempts: attempt,
          final: true,
          response: responseText.slice(0, 2048),
        };
      }

      // Rate limit - retry with backoff
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        if (attempt < maxRetries) {
          console.warn(`Bing rate limit hit. Waiting ${retryAfter}s before retry...`);
          await sleep(retryAfter * 1000);
          continue;
        }
      }

      // Permanent errors - don't retry
      if (response.status >= 400) {
        console.error(`Bing content submission error (${response.status}):`, responseText);
        return {
          url: payload.url,
          engine: 'bing-content' as const,
          status: response.status,
          meaning: getBingStatusMeaning(response.status),
          latency,
          attempts: attempt,
          final: true,
          error: responseText.slice(0, 500),
        };
      }
    } catch (error) {
      const latency = Date.now() - startTime;

      // Network error - retry
      if (attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.warn(`Bing content submission network error. Retrying in ${backoffMs}ms...`, error);
        await sleep(backoffMs);
        continue;
      }

      // Final attempt failed
      console.error('Bing content submission failed after retries:', error);
      return {
        url: payload.url,
        engine: 'bing-content' as const,
        status: 0,
        meaning: 'Network Error',
        latency,
        attempts: maxRetries,
        final: true,
        error: error instanceof Error ? error.message : 'Unknown network error',
      };
    }
  }

  // Fallback (shouldn't reach here)
  return {
    url: payload.url,
    engine: 'bing-content' as const,
    status: 0,
    meaning: 'Unknown Error',
    latency: Date.now() - startTime,
    attempts: maxRetries,
    final: true,
    error: 'Failed after all retries',
  };
}
