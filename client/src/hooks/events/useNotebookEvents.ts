import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { API_ENDPOINTS } from '../../api/endpoints'
import type {
  IndexingProgressEvent,
  IndexingSnapshotEvent,
  ToolGenerationEvent,
} from '../../api/types'
import { subscribeToSse } from '../../lib/sseClient'
import {
  applyIndexingEvent,
  applyIndexingSnapshot,
  applyToolEvent,
  applyToolSnapshot,
} from './notebookEventsCache'

export interface UseNotebookEventsOptions {
  /** Skip the subscription (e.g. before a notebook is selected). */
  enabled?: boolean
  /** Called for every `indexing` progress event, after the cache is synced. */
  onProgress?: (event: IndexingProgressEvent) => void
}

export interface UseNotebookEventsResult {
  connected: boolean
  /** Latest progress event per source id, for driving progress bars. */
  progress: Record<string, IndexingProgressEvent>
}

/**
 * Subscribes to a notebook's indexing SSE stream and keeps the TanStack Query
 * source caches in sync. Reconciliation lives in `notebookEventsCache`; this
 * hook only owns the connection lifecycle and exposes live progress for the UI.
 *
 * The `onProgress` callback is read through a ref so passing an inline function
 * does not tear down and rebuild the stream on every render.
 */
export function useNotebookEvents(
  notebookId: string | undefined,
  options: UseNotebookEventsOptions = {},
): UseNotebookEventsResult {
  const { enabled = true, onProgress } = options
  const queryClient = useQueryClient()

  const [connected, setConnected] = useState(false)
  const [progress, setProgress] = useState<Record<string, IndexingProgressEvent>>({})

  // Keep the callback current without re-subscribing when its identity changes.
  const onProgressRef = useRef(onProgress)
  useEffect(() => {
    onProgressRef.current = onProgress
  }, [onProgress])

  useEffect(() => {
    if (!enabled || !notebookId) return

    const unsubscribe = subscribeToSse(
      API_ENDPOINTS.notebooks.events(notebookId),
      {
        onOpen: () => setConnected(true),
        onError: () => setConnected(false),
        events: {
          connected: () => setConnected(true),
          snapshot: (data) => {
            applyIndexingSnapshot(queryClient, data as IndexingSnapshotEvent)
            applyToolSnapshot(queryClient, data as IndexingSnapshotEvent)
          },
          indexing: (data) => {
            const event = data as IndexingProgressEvent
            applyIndexingEvent(queryClient, event)
            setProgress((prev) => ({ ...prev, [event.sourceId]: event }))
            onProgressRef.current?.(event)
          },
          tool: (data) => {
            applyToolEvent(queryClient, data as ToolGenerationEvent)
          },
        },
      },
      { withCredentials: true },
    )

    // Reset connection/progress state in cleanup so switching notebooks starts
    // from a clean slate (cleanup runs before the next subscription is opened).
    return () => {
      unsubscribe()
      setConnected(false)
      setProgress({})
    }
  }, [enabled, notebookId, queryClient])

  return { connected, progress }
}
