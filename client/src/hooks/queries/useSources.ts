import { useQuery } from '@tanstack/react-query'
import { getSource, listSources } from '../../api/sources.api'
import { sourceKeys } from '../../constants/queryKeys'

/** List a notebook's sources. This cache is also kept live by the SSE stream. */
export function useSources(notebookId: string | undefined) {
  return useQuery({
    queryKey: sourceKeys.list(notebookId ?? ''),
    queryFn: () => listSources(notebookId as string),
    enabled: Boolean(notebookId),
  })
}

/** A single source with its short-lived presigned download URL. */
export function useSource(sourceId: string | undefined) {
  return useQuery({
    queryKey: sourceKeys.detail(sourceId ?? ''),
    queryFn: () => getSource(sourceId as string),
    enabled: Boolean(sourceId),
  })
}
