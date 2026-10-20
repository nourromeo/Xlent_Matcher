const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export type ApiErrorKind = "network" | "validation" | "server" | "not-found" | "unknown";

export class ApiError extends Error {
  constructor(message: string, public readonly kind: ApiErrorKind, public readonly status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

export function normalizeApiError(status?: number, hasValidationErrors = false): ApiError {
  if (hasValidationErrors || status === 400) return new ApiError("The request could not be completed. Please check the entered values.", "validation", status);
  if (status === 404) return new ApiError("The requested item could not be found.", "not-found", status);
  if (status !== undefined && status >= 500) return new ApiError("The server could not complete the request. Please try again.", "server", status);
  return new ApiError("The request could not be completed. Please try again.", "unknown", status);
}

// Share only concurrent identical GETs (e.g. React StrictMode remounts).
// No response caching: later navigations always request fresh data.
const pendingGets = new Map<string, Promise<unknown>>();

export function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const canDeduplicate = method === "GET" && !init?.signal && !init?.headers && !init?.body;
  if (canDeduplicate) {
    const pending = pendingGets.get(path);
    if (pending) return pending as Promise<T>;
    const request = executeApiRequest<T>(path, init);
    pendingGets.set(path, request);
    void request.then(
      () => { if (pendingGets.get(path) === request) pendingGets.delete(path); },
      () => { if (pendingGets.get(path) === request) pendingGets.delete(path); },
    );
    return request;
  }
  return executeApiRequest<T>(path, init);
}

async function executeApiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);

  if (
    init?.body &&
    !(init.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new ApiError("The backend could not be reached. Please try again.", "network");
  }

  if (!response.ok) {
    const raw = await response.text();
    let hasValidationErrors = false;
    let validationField: string | null = null;
    try {
      const parsed = JSON.parse(raw) as {
        errors?: Record<string, string[]>;
      };
      hasValidationErrors = Boolean(parsed.errors && Object.keys(parsed.errors).length > 0);
      if (hasValidationErrors && parsed.errors) validationField = Object.keys(parsed.errors)[0];
    } catch {
      // Internal/plain-text server responses are intentionally not exposed.
    }

    if (validationField) throw new ApiError(`Invalid field: ${validationField}. Please review this value.`, "validation", response.status);
    throw normalizeApiError(response.status, hasValidationErrors);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
