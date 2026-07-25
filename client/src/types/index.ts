export type Theme = 'light' | 'dark'
export type AuthMode = 'signin' | 'signup'

export type SourceType = 'pdf' | 'url' | 'yt' | 'doc' | 'txt'
export type SourceStatus = 'indexing' | 'indexed'

/** The seven generator tools that live in the workspace rail. `chat` is the
 *  default center view; the rest are reached by selecting a tool. */
export type ToolId =
  | 'mindmap'
  | 'quiz'
  | 'table'
  | 'flash'
  | 'summary'
  | 'audio'
  | 'timeline'
export type CenterView = 'chat' | ToolId

export interface Source {
  id: number
  type: SourceType
  name: string
  meta: string
  status: SourceStatus
  points: string[]
  paras: string[]
}

export interface ChatMessage {
  role: 'user' | 'bot'
  text: string
  /** Source ids this answer cites (bot messages only). */
  cites?: number[]
}

export interface Notebook {
  id: number
  title: string
  desc: string
  srcs: number
  updated: string
}

export interface Point {
  x: number
  y: number
}

/** Vector icon expressed as one or two SVG path `d` strings. */
export interface IconPaths {
  d: string
  d2: string
}
