import type { QueryClient } from '@tanstack/react-query'
import {
  TOOL_KIND_TO_NAME,
  type IndexingProgressEvent,
  type IndexingSnapshotEvent,
  type Source,
  type ToolGeneration,
  type ToolGenerationEvent,
} from '../../api/types'
import { notebookKeys, sourceKeys, toolKeys } from '../../constants/queryKeys'

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

// ── Tool generation ─────────────────────────────────────────────────────────

/** Merge one generation row into the cached status list. */
function patchToolStatus(
  queryClient: QueryClient,
  notebookId: string,
  row: ToolGeneration,
): void {
  queryClient.setQueryData<ToolGeneration[]>(toolKeys.status(notebookId), (current) => {
    const next = (current ?? []).filter((g) => g.kind !== row.kind)
    next.push(row)
    return next
  })
}

export function applyToolSnapshot(
  queryClient: QueryClient,
  snapshot: IndexingSnapshotEvent,
): void {
  if (!snapshot.tools?.length) return
  for (const tool of snapshot.tools) {
    patchToolStatus(queryClient, snapshot.notebookId, {
      kind: tool.kind,
      status: tool.status,
      progress: tool.progress,
      message: tool.message,
      error: tool.error,
    })
  }
}

export function applyToolEvent(
  queryClient: QueryClient,
  event: ToolGenerationEvent,
): void {
  patchToolStatus(queryClient, event.notebookId, {
    kind: event.kind,
    status: event.status,
    progress: event.progress,
    message: event.message,
    error: event.error,
  })

  // Once a tool finishes, refetch its artifact so the view shows fresh content.
  if (event.status === 'READY') {
    const toolName = TOOL_KIND_TO_NAME[event.kind]
    void queryClient.invalidateQueries({
      queryKey: toolKeys.tool(event.notebookId, toolName),
    })
  }
}
