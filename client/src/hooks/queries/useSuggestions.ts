import { useQuery } from '@tanstack/react-query'
import { fetchSuggestions } from '../../api/queries.api'
import { chatKeys } from '../../constants/queryKeys'

/** AI-generated suggestions tailored to the notebook's indexed sources. */
export function useSuggestions(notebookId: string | undefined) {
  return useQuery({
    queryKey: chatKeys.suggestions(notebookId ?? ''),
    queryFn: () => fetchSuggestions(notebookId as string),
    enabled: Boolean(notebookId),
    staleTime: 5 * 60 * 1000,
  })
}
