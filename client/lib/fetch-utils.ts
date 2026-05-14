// Get API base URL from environment or use relative URLs
const getApiBaseUrl = (): string => {
  // Check if we have an explicit API URL
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }

  // In production (Netlify), use the Render backend
  if (import.meta.env.PROD) {
    return 'https://index-now-tool.onrender.com';
  }

  // In development, try localhost first, but fall back to Render if unavailable
  // We'll detect this dynamically
  return '';
};

// Retry logic for failed requests with fallback to Render backend
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries: number = 3,
  isFallback: boolean = false
): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[API] Attempt ${attempt}/${retries} to fetch ${url}`);
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      return response;
    } catch (error) {
      console.warn(`[API] Attempt ${attempt} failed:`, error);

      // If localhost failed and we haven't tried Render yet, retry with Render
      if (!isFallback && url.includes('http://localhost:3001')) {
        console.log(`[API] Localhost unavailable, falling back to Render backend`);
        const renderUrl = url.replace('http://localhost:3001', 'https://index-now-tool.onrender.com');
        return fetchWithRetry(renderUrl, options, retries, true);
      }

      if (attempt === retries) {
        throw error;
      }
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
    }
  }
  throw new Error('Failed after all retry attempts');
}

// Utility function for robust API calls with proper error handling
export async function apiCall<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    let apiUrl = getApiBaseUrl() + url;

    // In development, try localhost first
    if (!import.meta.env.PROD && !apiUrl.startsWith('http')) {
      apiUrl = 'http://localhost:3001' + url;
    }

    console.log(`[API] Making request to: ${apiUrl}`);

    const response = await fetchWithRetry(apiUrl, options);

    let data: any;
    const contentType = response.headers.get('content-type');

    // Check if response is JSON
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (parseError) {
        data = { error: 'Failed to parse JSON response' };
      }
    } else {
      // For non-JSON responses, read as text
      try {
        const text = await response.text();
        data = text ? { error: text } : { error: 'Empty response' };
      } catch (textError) {
        data = { error: 'Failed to read response' };
      }
    }

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
      console.error(`[API] Request failed:`, errorMsg, data);
      throw new Error(errorMsg);
    }

    console.log(`[API] Request successful to ${url}`);
    return data;
  } catch (error) {
    // Network or other errors
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[API] Error:`, errorMsg);

    // More helpful error messages
    if (errorMsg.includes('Failed to fetch')) {
      throw new Error(
        'Network error: Cannot reach the API server. Check your internet connection and that the backend is running.'
      );
    }

    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error occurred');
  }
}

// Specific API endpoints
export const sitemapApi = {
  scan: (data: any) => apiCall('/api/sitemap/scan', {
    method: 'POST',
    body: JSON.stringify(data)
  })
};

export const indexnowApi = {
  bulk: (data: any) => apiCall('/api/indexnow/bulk', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  single: (data: any) => apiCall('/api/indexnow/single', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  verifyKey: (data: any) => apiCall('/api/indexnow/verify-key', {
    method: 'POST',
    body: JSON.stringify(data)
  })
};

export const bingApi = {
  submitUrlBulk: (data: any) => apiCall('/api/bing/submit-urls/bulk', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  submitUrlSingle: (data: any) => apiCall('/api/bing/submit-urls/single', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  submitUrlBulkWithDebug: (data: any, debugMode: boolean) => apiCall('/api/bing/submit-urls/bulk', {
    method: 'POST',
    body: JSON.stringify({ ...data, debug: debugMode })
  }),
  submitUrlSingleWithDebug: (data: any, debugMode: boolean) => apiCall('/api/bing/submit-urls/single', {
    method: 'POST',
    body: JSON.stringify({ ...data, debug: debugMode })
  }),
  submitContentBulk: (data: any) => apiCall('/api/bing/submit-content/bulk', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  submitContentSingle: (data: any) => apiCall('/api/bing/submit-content/single', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  submitContentBulkWithDebug: (data: any, debugMode: boolean) => apiCall('/api/bing/submit-content/bulk', {
    method: 'POST',
    body: JSON.stringify({ ...data, debug: debugMode })
  }),
  submitContentSingleWithDebug: (data: any, debugMode: boolean) => apiCall('/api/bing/submit-content/single', {
    method: 'POST',
    body: JSON.stringify({ ...data, debug: debugMode })
  })
};
