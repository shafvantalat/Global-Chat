/**
 * Safe fetch helper that handles JSON parsing errors gracefully.
 * Always throws an error with a meaningful message if anything goes wrong.
 */
// Determine backend URL at runtime so mobile browsers can reach the backend
// Priority: VITE_BACKEND_URL (if provided) -> same host as frontend on port 3001 -> localhost:3001
const BACKEND_URL: string = (() => {
  try {
    // Allow explicit override via Vite env variable VITE_BACKEND_URL
    // (e.g. VITE_BACKEND_URL=https://example.com)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const envUrl = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_URL;
    if (envUrl) return envUrl;
  } catch (e) {
    // ignore
  }

  if (typeof window !== 'undefined' && window.location) {
    const protocol = window.location.protocol || 'http:';
    const hostname = window.location.hostname || 'localhost';
    return `${protocol}//${hostname}:3001`;
  }

  return 'http://localhost:3001';
})();

function getBackendUrl(path: string): string {
  if (path.startsWith('http')) return path; // already absolute
  return `${BACKEND_URL}${path}`;
}

export async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  const absoluteUrl = getBackendUrl(url);
  try {
    const response = await fetch(absoluteUrl, options);
    
    // If response is not ok and body is empty, throw early
    if (!response.ok && response.status !== 204) {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        } catch (e) {
          // If error response is not JSON, throw a generic error
          if (e instanceof SyntaxError) {
            throw new Error(`HTTP ${response.status}: ${response.statusText} - Invalid JSON response`);
          }
          throw e;
        }
      } else {
        // Non-JSON error response
        const text = await response.text().catch(() => 'No response body');
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${text.substring(0, 100)}`);
      }
    }
    
    return response;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Network error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Safe JSON fetch that parses response and handles errors.
 */
export async function safeJsonFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await safeFetch(url, options);
  
  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }
  
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error(`Expected JSON response, got ${contentType || 'no content-type'}`);
  }
  
  try {
    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON response: ${error.message}`);
    }
    throw error;
  }
}
