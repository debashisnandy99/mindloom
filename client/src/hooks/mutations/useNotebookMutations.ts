import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createNotebook,
  deleteNotebook,
  updateNotebook,
  type CreateNotebookInput,
  type UpdateNotebookInput,
} from '../../api/notebooks.api'
import { notebookKeys } from '../../constants/queryKeys'

export function useCreateNotebook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateNotebookInput) => createNotebook(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notebookKeys.lists() })
    },
  })
}

export function useUpdateNotebook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateNotebookInput }) =>
      updateNotebook(id, input),
    onSuccess: (notebook) => {
      void queryClient.invalidateQueries({ queryKey: notebookKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: notebookKeys.detail(notebook.id) })
    },
  })
}

export function useDeleteNotebook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteNotebook(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: notebookKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: notebookKeys.lists() })
    },
  })
}
