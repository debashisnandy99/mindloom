import { API_BASE } from './apiClient'

/**
 * Lazily fetches and caches the double-submit CSRF token from `/auth/csrf`.
 *
 * The server returns `null` here when `ENABLE_CSRF=false`, in which case there
 * is nothing to attach and every mutation proceeds unguarded. Kept as a raw
 * `fetch` (not the `api` wrapper) so this module has a one-way dependency on
 * `apiClient` and cannot create an import cycle.
 */
let cached: string | null | undefined

async function requestToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/csrf`, { credentials: 'include' })
    if (!res.ok) return null
    const payload = (await res.json()) as { data?: { csrfToken: string | null } }
    return payload.data?.csrfToken ?? null
  } catch {
    return null
  }
}

export async function getCsrfToken(): Promise<string | null> {
  if (cached === undefined) cached = await requestToken()
  return cached
}

/** Drop the cached token so the next write re-fetches (e.g. after a 403). */
export function resetCsrfToken(): void {
  cached = undefined
}
