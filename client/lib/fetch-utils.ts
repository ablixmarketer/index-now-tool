// Utility function for robust API calls with proper error handling
export async function apiCall<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(url, {
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
