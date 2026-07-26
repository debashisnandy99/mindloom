import { api } from '../lib/apiClient'
import { API_ENDPOINTS } from './endpoints'
import type { AskInput, AskResult, ChatQuery, RetrievedChunk } from './types'

export function listQueries(notebookId: string) {
  return api
    .get<{ queries: ChatQuery[] }>(API_ENDPOINTS.queries.list(notebookId))
    .then((data) => data.queries)
}

/** Ask a question: the server persists it and returns the (RAG) answer. */
export function askQuery(notebookId: string, input: AskInput) {
  return api.post<AskResult>(API_ENDPOINTS.queries.ask(notebookId), input)
}

/** Raw chunk retrieval without persisting a query. */
export function searchChunks(notebookId: string, input: AskInput) {
  return api
    .post<{ chunks: RetrievedChunk[] }>(API_ENDPOINTS.queries.search(notebookId), input)
    .then((data) => data.chunks)
}

export function deleteQuery(notebookId: string, queryId: string) {
  return api.delete<void>(API_ENDPOINTS.queries.detail(notebookId, queryId))
}
