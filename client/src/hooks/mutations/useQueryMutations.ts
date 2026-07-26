import { useMutation, useQueryClient } from '@tanstack/react-query'
import { askQuery, deleteQuery, searchChunks } from '../../api/queries.api'
import type { AskInput } from '../../api/types'
import { chatKeys } from '../../constants/queryKeys'

/** Ask a question; the persisted history is refreshed on success. */
export function useAskQuery(notebookId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AskInput) => askQuery(notebookId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.list(notebookId) })
    },
  })
}

/** Raw chunk retrieval — read-only, so it touches no cache. */
export function useSearchChunks(notebookId: string) {
  return useMutation({
    mutationFn: (input: AskInput) => searchChunks(notebookId, input),
  })
}

export function useDeleteQuery(notebookId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (queryId: string) => deleteQuery(notebookId, queryId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.list(notebookId) })
    },
  })
}
