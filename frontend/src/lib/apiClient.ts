const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' ? '/api' : 'http://localhost:3000/api');

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        ...(options?.headers || {}),
      },
      ...options,
    });
  } catch (error) {
    const message =
      error instanceof TypeError && error.message.includes('fetch')
        ? `Unable to reach API at ${API_BASE_URL}. Is the backend dev server running?`
        : 'Network request failed';
    throw new Error(message);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with ${res.status}`);
  }
  return res.json();
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: BodyInit, headers?: Record<string, string>) =>
    request<T>(path, { method: 'POST', body, headers }),
};
