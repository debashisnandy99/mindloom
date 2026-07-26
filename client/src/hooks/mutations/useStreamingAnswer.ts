import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { streamAsk } from '../../api/queries.api'
import type { AskInput, RetrievedChunk } from '../../api/types'
import { chatKeys } from '../../constants/queryKeys'
import { ApiError } from '../../lib/apiClient'

export interface StreamingAnswerState {
  query: string | null
  /** The answer so far, growing as deltas arrive. */
  answer: string
  citations: RetrievedChunk[]
  /** False once `meta` reports retrieval found nothing in the sources. */
  grounded: boolean | null
  isStreaming: boolean
  error: string | null
  completedQueryId: string | null
}

const IDLE: StreamingAnswerState = {
  query: null,
  answer: '',
  citations: [],
  grounded: null,
  isStreaming: false,
  error: null,
  completedQueryId: null,
}

/**
 * Drives one streaming answer for a notebook.
 *
 * Deliberately not a `useMutation`: the value here is the partial text arriving
 * over time, which TanStack Query's single-result model does not express. The
 * persisted history *is* query-cached, so `chatKeys` is invalidated on `done`
 * and the finished turn shows up through `useChatHistory` like any other read.
 */
export function useStreamingAnswer(notebookId: string | undefined) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<StreamingAnswerState>(IDLE)
  const abortRef = useRef<AbortController | null>(null)

  // Abort any in-flight generation when the consumer unmounts.
  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setState((prev) => ({ ...prev, isStreaming: false }))
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setState(IDLE)
  }, [])

  const ask = useCallback(
    async (input: AskInput | string) => {
      if (!notebookId) return

      // Only one generation at a time; a new question supersedes the old.
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const payload: AskInput = typeof input === 'string' ? { query: input } : input
      setState({ ...IDLE, query: payload.query, isStreaming: true })

      try {
        await streamAsk(
          notebookId,
          payload,
          {
            onMeta: ({ found, citations }) =>
              setState((prev) => ({ ...prev, grounded: found, citations })),
            onDelta: ({ text }) =>
              setState((prev) => ({ ...prev, answer: prev.answer + text })),
            onDone: ({ queryId, answer, grounded }) => {
              setState((prev) => ({ ...prev, answer, grounded, isStreaming: false, completedQueryId: queryId }))
              void queryClient.invalidateQueries({ queryKey: chatKeys.list(notebookId) })
            },
            onError: ({ message }) =>
              setState((prev) => ({ ...prev, error: message, isStreaming: false })),
          },
          controller.signal,
        )
      } catch (err) {
        // An abort is a deliberate stop, not a failure to report.
        if (controller.signal.aborted) return
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          error: err instanceof ApiError ? err.message : 'Failed to generate an answer',
        }))
      } finally {
        if (abortRef.current === controller) abortRef.current = null
      }
    },
    [notebookId, queryClient],
  )

  return { ...state, ask, stop, reset }
}
