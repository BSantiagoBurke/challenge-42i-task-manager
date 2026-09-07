const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Thin fetch wrapper: resolves the base URL once, throws ApiError with
 * the backend's message on non-2xx responses (the NestJS ValidationPipe
 * and HttpExceptions both return `{ message, error, statusCode }`, so we
 * surface `message` directly instead of a generic "request failed").
 */
export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : (body?.message ?? `Request failed with status ${response.status}`);
    throw new ApiError(message, response.status);
  }

  return body as T;
}
