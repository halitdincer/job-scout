import { getCsrfToken } from "./csrf";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * fetch wrapper for the Django API:
 *  - always sends cookies (same-origin)
 *  - injects X-CSRFToken on unsafe methods when the cookie is present
 *  - defaults Content-Type to application/json when a body is provided
 *    (callers can override for form-encoded auth posts)
 *  - parses JSON and throws ApiError on non-2xx
 */
export async function apiFetch<T = unknown>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);

  if (UNSAFE_METHODS.has(method)) {
    const token = getCsrfToken();
    if (token) {
      headers.set("X-CSRFToken", token);
    }
  }

  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    method,
    headers,
    credentials: init.credentials ?? "same-origin",
  });

  if (!response.ok) {
    throw new ApiError(response.status, `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
