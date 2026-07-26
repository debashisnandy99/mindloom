export type Theme = 'light' | 'dark'
export type AuthMode = 'signin' | 'signup'

/** UI source-kind used by the add-source menu and icon set. */
export type SourceType = 'pdf' | 'url' | 'yt' | 'doc' | 'txt'

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

export interface Point {
  x: number
  y: number
}

/** Vector icon expressed as one or two SVG path `d` strings. */
export interface IconPaths {
  d: string
  d2: string
}
