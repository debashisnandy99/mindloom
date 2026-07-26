import { useQuery } from '@tanstack/react-query'
import { listQueries } from '../../api/queries.api'
import { chatKeys } from '../../constants/queryKeys'

/** The notebook's persisted question/answer history, oldest first. */
export function useChatHistory(notebookId: string | undefined) {
  return useQuery({
    queryKey: chatKeys.list(notebookId ?? ''),
    queryFn: () => listQueries(notebookId as string),
    enabled: Boolean(notebookId),
  })
}
