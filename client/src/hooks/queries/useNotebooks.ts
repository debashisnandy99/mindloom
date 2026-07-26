import { useQuery } from '@tanstack/react-query'
import { getNotebook, listNotebooks } from '../../api/notebooks.api'
import { notebookKeys } from '../../constants/queryKeys'

/** List the signed-in user's notebooks. */
export function useNotebooks() {
  return useQuery({
    queryKey: notebookKeys.lists(),
    queryFn: listNotebooks,
  })
}

/** A single notebook with its sources and counts. */
export function useNotebook(id: string | undefined) {
  return useQuery({
    queryKey: notebookKeys.detail(id ?? ''),
    queryFn: () => getNotebook(id as string),
    enabled: Boolean(id),
  })
}
