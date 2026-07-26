import type { QueryClient } from '@tanstack/react-query'
import type {
  IndexingProgressEvent,
  IndexingSnapshotEvent,
  Source,
} from '../../api/types'
import { notebookKeys, sourceKeys } from '../../constants/queryKeys'

/**
 * Pure cache-sync helpers for notebook SSE events. Kept separate from the React
 * hook so the reconciliation logic is trivially testable and has no dependency
 * on component lifecycle — the hook simply forwards events here.
 */

const TERMINAL: ReadonlyArray<Source['status']> = ['INDEXED', 'FAILED']

/** Patch a single source in the cached list, leaving other fields untouched. */
function patchSource(
  queryClient: QueryClient,
  notebookId: string,
  sourceId: string,
  patch: Partial<Source>,
): boolean {
  let matched = false
  queryClient.setQueryData<Source[]>(sourceKeys.list(notebookId), (current) => {
    if (!current) return current
    return current.map((source) => {
      if (source.id !== sourceId) return source
      matched = true
      return { ...source, ...patch }
    })
  })
  return matched
}

/**
 * Refetch the full source record and dependent notebook detail. Used when a
 * source reaches a terminal state, since the SSE payload carries only a subset
 * of fields (no keyPoints/excerpts/indexedAt).
 */
function invalidateForTerminal(
  queryClient: QueryClient,
  notebookId: string,
  sourceId: string,
): void {
  void queryClient.invalidateQueries({ queryKey: sourceKeys.list(notebookId) })
  void queryClient.invalidateQueries({ queryKey: sourceKeys.detail(sourceId) })
  void queryClient.invalidateQueries({ queryKey: notebookKeys.detail(notebookId) })
}

export function applyIndexingSnapshot(
  queryClient: QueryClient,
  snapshot: IndexingSnapshotEvent,
): void {
  for (const entry of snapshot.sources) {
    patchSource(queryClient, snapshot.notebookId, entry.sourceId, {
      status: entry.status,
      chunkCount: entry.chunkCount,
      errorMessage: entry.error,
    })
  }
}

export function applyIndexingEvent(
  queryClient: QueryClient,
  event: IndexingProgressEvent,
): void {
  const patch: Partial<Source> = { status: event.status }
  if (event.chunkCount !== undefined) patch.chunkCount = event.chunkCount
  if (event.error !== undefined) patch.errorMessage = event.error

  const matched = patchSource(queryClient, event.notebookId, event.sourceId, patch)

  // A brand-new source may not be in the list cache yet, or a finished job
  // needs its full record; either way, refetch to stay consistent.
  if (TERMINAL.includes(event.status) || !matched) {
    invalidateForTerminal(queryClient, event.notebookId, event.sourceId)
  }
}
