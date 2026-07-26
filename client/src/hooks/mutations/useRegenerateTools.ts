import { useMutation, useQueryClient } from '@tanstack/react-query'
import { regenerateTools } from '../../api/generation.api'
import { toolKeys } from '../../constants/queryKeys'

/** Manually (re)queue generation of every study tool for a notebook. */
export function useRegenerateTools(notebookId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => regenerateTools(notebookId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: toolKeys.status(notebookId) })
    },
  })
}
