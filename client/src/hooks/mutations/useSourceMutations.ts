import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createSource,
  deleteSource,
  reindexSource,
  uploadPdfSource,
} from '../../api/sources.api'
import type { CreateSourceInput } from '../../api/types'
import { notebookKeys, sourceKeys } from '../../constants/queryKeys'

/** Invalidate the caches affected by a source appearing/leaving a notebook. */
function useSourceListInvalidation() {
  const queryClient = useQueryClient()
  return (notebookId: string) => {
    void queryClient.invalidateQueries({ queryKey: sourceKeys.list(notebookId) })
    void queryClient.invalidateQueries({ queryKey: notebookKeys.detail(notebookId) })
    void queryClient.invalidateQueries({ queryKey: notebookKeys.lists() })
  }
}

/** Create a link/text source. Live indexing status then arrives over SSE. */
export function useCreateSource() {
  const invalidate = useSourceListInvalidation()
  return useMutation({
    mutationFn: ({ notebookId, input }: { notebookId: string; input: CreateSourceInput }) =>
      createSource(notebookId, input),
    onSuccess: (source) => invalidate(source.notebookId),
  })
}

/** Upload a PDF source (multipart). */
export function useUploadPdfSource() {
  const invalidate = useSourceListInvalidation()
  return useMutation({
    mutationFn: ({
      notebookId,
      file,
      name,
    }: {
      notebookId: string
      file: File
      name?: string
    }) => uploadPdfSource(notebookId, file, name),
    onSuccess: (source) => invalidate(source.notebookId),
  })
}

export function useReindexSource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sourceId }: { sourceId: string; notebookId: string }) =>
      reindexSource(sourceId),
    onSuccess: (_data, { notebookId, sourceId }) => {
      void queryClient.invalidateQueries({ queryKey: sourceKeys.list(notebookId) })
      void queryClient.invalidateQueries({ queryKey: sourceKeys.detail(sourceId) })
    },
  })
}

export function useDeleteSource() {
  const queryClient = useQueryClient()
  const invalidate = useSourceListInvalidation()
  return useMutation({
    mutationFn: ({ sourceId }: { sourceId: string; notebookId: string }) =>
      deleteSource(sourceId),
    onSuccess: (_data, { notebookId, sourceId }) => {
      queryClient.removeQueries({ queryKey: sourceKeys.detail(sourceId) })
      invalidate(notebookId)
    },
  })
}
