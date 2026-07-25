import { useQuery } from '@tanstack/react-query'
import { fetchSession, type SessionResponse } from '../../api/auth.api'
import { authKeys } from '../../constants/queryKeys'
import { ApiError } from '../../lib/apiClient'

export interface UseSessionResult {
  session: SessionResponse | undefined
  isAuthenticated: boolean
  isLoading: boolean
  isError: boolean
}

/**
 * Reads the current session. A 401 is a normal signed-out state rather than a
 * failure, so it resolves to `null` instead of throwing.
 */
export function useSession(): UseSessionResult {
  const query = useQuery({
    queryKey: authKeys.session(),
    queryFn: async () => {
      try {
        return await fetchSession()
      } catch (error) {
        if (error instanceof ApiError && error.isUnauthorized) return null
        throw error
      }
    },
    staleTime: 5 * 60_000,
  })

  return {
    session: query.data ?? undefined,
    isAuthenticated: Boolean(query.data?.user),
    isLoading: query.isPending,
    isError: query.isError,
  }
}
