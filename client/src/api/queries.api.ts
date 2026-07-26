import { api } from '../lib/apiClient'
import { streamSse } from '../lib/streamClient'
import { API_ENDPOINTS } from './endpoints'
import type {
  AnswerDeltaEvent,
  AnswerDoneEvent,
  AnswerErrorEvent,
  AnswerMetaEvent,
  AnswerStreamHandlers,
  AskInput,
  AskResult,
  ChatQuery,
  RetrievedChunk,
} from './types'

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

/**
 * Ask a question and receive the answer as it is generated.
 *
 * Frames arrive as `meta` (citations, whether anything was retrieved) → many
 * `delta` (text) → `done`. Resolves when the stream closes; pass a `signal` to
 * stop generation early.
 */
export function streamAsk(
  notebookId: string,
  input: AskInput,
  handlers: AnswerStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  return streamSse(API_ENDPOINTS.queries.askStream(notebookId), {
    body: input,
    signal,
    onFrame: ({ event, data }) => {
      switch (event) {
        case 'meta':
          handlers.onMeta?.(data as AnswerMetaEvent)
          break
        case 'delta':
          handlers.onDelta?.(data as AnswerDeltaEvent)
          break
        case 'done':
          handlers.onDone?.(data as AnswerDoneEvent)
          break
        case 'error':
          handlers.onError?.(data as AnswerErrorEvent)
          break
      }
    },
  })
}

/** Fetch AI-generated suggestions for the notebook's sources. */
export function fetchSuggestions(notebookId: string) {
  return api
    .get<{ suggestions: string[] }>(API_ENDPOINTS.queries.suggestions(notebookId))
    .then((data) => data.suggestions)
}
