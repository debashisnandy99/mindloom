import { api } from '../lib/apiClient'
import { API_ENDPOINTS } from './endpoints'
import type { ToolArtifactMap, ToolName } from './types'

/**
 * Every tool exposes the same REST surface (artifact upsert/delete + an
 * optional ordered child collection), so one set of functions serves all
 * seven. This registry captures the two per-tool differences: the response
 * envelope key and the child collection's path/param naming.
 */
interface ToolMeta {
  /** Response key wrapping the artifact, e.g. `mindMap`. */
  key: string
  /** Child collection path segment, e.g. `nodes`. `null` when the tool has none. */
  itemsPath: string | null
  /** Response key wrapping a single child, e.g. `node`. */
  itemKey: string | null
}

const TOOL_META: Record<ToolName, ToolMeta> = {
  mindmap: { key: 'mindMap', itemsPath: 'nodes', itemKey: 'node' },
  quiz: { key: 'quiz', itemsPath: 'questions', itemKey: 'question' },
  conceptTable: { key: 'conceptTable', itemsPath: 'rows', itemKey: 'row' },
  flashcards: { key: 'flashcardDeck', itemsPath: 'cards', itemKey: 'card' },
  summary: { key: 'summary', itemsPath: 'points', itemKey: 'point' },
  audioOverview: { key: 'audioOverview', itemsPath: null, itemKey: null },
  timeline: { key: 'timeline', itemsPath: 'events', itemKey: 'event' },
}

function toolBase(tool: ToolName, notebookId: string): string {
  return API_ENDPOINTS.tools[tool](notebookId)
}

function itemsBase(tool: ToolName, notebookId: string): string {
  const { itemsPath } = TOOL_META[tool]
  if (!itemsPath) throw new Error(`Tool "${tool}" has no child collection`)
  return `${toolBase(tool, notebookId)}/${itemsPath}`
}

// ── Artifact-level ──────────────────────────────────────────────────────────

/** Read the notebook's tool artifact. Resolves to `null` when none exists yet. */
export function getTool<T extends ToolName>(
  tool: T,
  notebookId: string,
): Promise<ToolArtifactMap[T] | null> {
  const { key } = TOOL_META[tool]
  return api
    .get<Record<string, ToolArtifactMap[T] | null>>(toolBase(tool, notebookId))
    .then((data) => data[key] ?? null)
}

/** Create or replace the whole artifact (server accepts POST and PUT alike). */
export function upsertTool<T extends ToolName>(
  tool: T,
  notebookId: string,
  body: unknown,
): Promise<ToolArtifactMap[T]> {
  const { key } = TOOL_META[tool]
  return api
    .put<Record<string, ToolArtifactMap[T]>>(toolBase(tool, notebookId), body)
    .then((data) => data[key])
}

export function deleteTool(tool: ToolName, notebookId: string) {
  return api.delete<void>(toolBase(tool, notebookId))
}

// ── Item-level (append / update / remove one child) ─────────────────────────

export function addToolItem<TItem = unknown>(
  tool: ToolName,
  notebookId: string,
  body: unknown,
): Promise<TItem> {
  const { itemKey } = TOOL_META[tool]
  return api
    .post<Record<string, TItem>>(itemsBase(tool, notebookId), body)
    .then((data) => data[itemKey as string])
}

export function updateToolItem<TItem = unknown>(
  tool: ToolName,
  notebookId: string,
  itemId: string,
  body: unknown,
): Promise<TItem> {
  const { itemKey } = TOOL_META[tool]
  return api
    .patch<Record<string, TItem>>(`${itemsBase(tool, notebookId)}/${itemId}`, body)
    .then((data) => data[itemKey as string])
}

export function removeToolItem(tool: ToolName, notebookId: string, itemId: string) {
  return api.delete<void>(`${itemsBase(tool, notebookId)}/${itemId}`)
}
