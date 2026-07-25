import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { logout } from '../../api/auth.api'
import { authKeys } from '../../constants/queryKeys'

export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      // Clear every cache entry so a different user cannot see stale data.
      queryClient.removeQueries()
      queryClient.setQueryData(authKeys.session(), null)
      navigate('/')
    },
  })
}
