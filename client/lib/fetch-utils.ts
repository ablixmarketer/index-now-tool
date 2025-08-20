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

    // Clone the response so we can read it multiple times if needed
    const responseClone = response.clone();
    
    let data: any;
    try {
      // Try to parse as JSON
      data = await response.json();
    } catch (parseError) {
      // If JSON parsing fails, try to get text
      try {
        const text = await responseClone.text();
        data = { error: text || 'Unknown error' };
      } catch {
        data = { error: 'Failed to parse response' };
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
