const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export const API_BASE = `${API_URL}/api/v1`

export interface ApiErrorIssue {
  path: string
  message: string
}

/** Mirrors the server's error envelope so callers can branch on status. */
export class ApiError extends Error {
  readonly status: number
  readonly issues?: ApiErrorIssue[]

  constructor(status: number, message: string, issues?: ApiErrorIssue[]) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.issues = issues
  }

  get isUnauthorized() {
    return this.status === 401
  }
}

interface ApiSuccess<T> {
  success: true
  data: T
}

interface ApiFailure {
  success: false
  message: string
  errors?: ApiErrorIssue[]
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  /** Set for multipart uploads, where the browser must own the Content-Type. */
  isFormData?: boolean
}

/**
 * Thin fetch wrapper. `credentials: 'include'` is what carries the session
 * cookie, and it is required on every call for the stateful API to work.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, isFormData, headers, ...rest } = options

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 204) return undefined as T

  const payload = (await response.json().catch(() => null)) as
    | ApiSuccess<T>
    | ApiFailure
    | null

  if (!response.ok || !payload || payload.success === false) {
    const failure = payload as ApiFailure | null
    throw new ApiError(
      response.status,
      failure?.message ?? `Request failed with status ${response.status}`,
      failure?.errors,
    )
  }

  return payload.data
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'DELETE' }),
}
