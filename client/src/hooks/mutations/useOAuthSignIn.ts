import { useCallback } from 'react'
import { startOAuth, type OAuthProvider } from '../../api/auth.api'

/** Returns a stable handler that kicks off the provider redirect. */
export function useOAuthSignIn() {
  return useCallback((provider: OAuthProvider) => {
    startOAuth(provider)
  }, [])
}
