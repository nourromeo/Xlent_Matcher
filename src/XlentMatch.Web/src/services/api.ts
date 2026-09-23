const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);

  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new Error("Cannot reach the backend API. Make sure the API is running and try again.");
  }

  if (!response.ok) {
    const raw = await response.text();
    let message = raw;

    try {
      const parsed = JSON.parse(raw) as { detail?: string; title?: string };
      message = parsed.detail || parsed.title || raw;
    } catch {
      // Keep plain-text API errors as-is.
    }

    throw new Error(message || `API request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
