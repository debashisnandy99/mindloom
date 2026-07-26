import type { GeneratedToolName, ServerSourceType } from '../api/types'
import type { SourceType, ToolId } from '../types'

/**
 * The app uses three vocabularies for the same concepts — the UI ids
 * (`ToolId`, `SourceType`), the API names, and the server enums. These maps are
 * the single source of truth for translating between them.
 */

/** UI source kind → server SourceType (used when creating a source). */
export const UI_TO_SERVER_SOURCE: Record<SourceType, ServerSourceType> = {
  pdf: 'PDF',
  url: 'URL',
  yt: 'YT',
  doc: 'GDOC',
  txt: 'TEXT',
}

/** Server SourceType → UI kind (used to pick an icon for a fetched source). */
export const SERVER_TO_UI_SOURCE: Record<ServerSourceType, SourceType> = {
  PDF: 'pdf',
  URL: 'url',
  YT: 'yt',
  GDOC: 'doc',
  TEXT: 'txt',
}

/** Workspace tool id → generated tool API name. `audio` is not LLM-generated. */
export const TOOL_ID_TO_NAME: Record<Exclude<ToolId, 'audio'>, GeneratedToolName> = {
  mindmap: 'mindmap',
  quiz: 'quiz',
  table: 'conceptTable',
  flash: 'flashcards',
  summary: 'summary',
  timeline: 'timeline',
}
