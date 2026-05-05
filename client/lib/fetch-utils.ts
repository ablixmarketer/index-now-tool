// Get API base URL from environment or use relative URLs
const getApiBaseUrl = (): string => {
  // In production (Netlify), use the Render backend
  // In development, use relative paths (Vite proxy)
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_BASE_URL || 'https://index-now-tool.onrender.com';
  }
  return ''; // Relative URLs for dev (Vite proxy)
};

// Utility function for robust API calls with proper error handling
export async function apiCall<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const apiUrl = getApiBaseUrl() + url;
    const response = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

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
      throw new Error(
        data?.message ||
        data?.error ||
        `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return data;
  } catch (error) {
    // Network or other errors
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
