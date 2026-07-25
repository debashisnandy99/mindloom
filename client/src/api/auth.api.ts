import { api } from '../lib/apiClient'
import { API_ENDPOINTS } from './endpoints'

export type OAuthProvider = 'google' | 'github'

export interface AuthUser {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  createdAt: string
}

export interface LinkedAccount {
  id: string
  provider: 'GOOGLE' | 'GITHUB'
  createdAt: string
}

export interface SessionResponse {
  user: AuthUser
  accounts: LinkedAccount[]
}

export function fetchSession() {
  return api.get<SessionResponse>(API_ENDPOINTS.auth.me)
}

export function logout() {
  return api.post<{ loggedOut: boolean }>(API_ENDPOINTS.auth.logout)
}

/**
 * OAuth must be a top-level navigation, not a fetch: the provider redirects
 * the browser back to our callback, which is what sets the session cookie.
 */
export function startOAuth(provider: OAuthProvider): void {
  window.location.href = API_ENDPOINTS.auth[provider]
}
