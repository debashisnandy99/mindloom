import type { IconPaths, SourceType, ToolId } from '../types'

/** Design controls, baked in as constants. */
export const ACCENT_HUE = 295

// ── Icons ───────────────────────────────────────────────────────────────────
export const ICONS: Record<SourceType, IconPaths> = {
  pdf: { d: 'M6 3h9l4 4v14H6z', d2: 'M15 3v4h4M9 12h6M9 16h6' },
  url: {
    d: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18',
    d2: 'M3 12h18M12 3c3.2 2.8 3.2 15.2 0 18c-3.2-2.8-3.2-15.2 0-18',
  },
  yt: { d: 'M3 8c0-2.2 1-3 3-3h12c2 0 3 0.8 3 3v8c0 2.2-1 3-3 3H6c-2 0-3-0.8-3-3z', d2: 'M10 9l6 3-6 3z' },
  doc: { d: 'M6 3h12v18H6z', d2: 'M9 8h6M9 12h6M9 16h4' },
  txt: { d: 'M5 5h14M5 10h14M5 15h9', d2: '' },
}

export const LOGO_PATH = 'M4 9h16M4 15h16M9 4v16M15 4v16'

// ── Workspace tools ─────────────────────────────────────────────────────────
export interface Tool {
  id: ToolId
  label: string
  d: string
  d2: string
}

export const TOOLS: Tool[] = [
  {
    id: 'mindmap',
    label: 'Mind map',
    d: 'M12 12L5 6.5M12 12l7-5.5M12 12v7.5',
    d2: 'M12 10a2 2 0 1 0 0 4a2 2 0 1 0 0-4M5 4.5a2 2 0 1 0 0 4M19 4.5a2 2 0 1 1 0 4M12 19.5a2 2 0 1 0 0 0.01',
  },
  { id: 'quiz', label: 'Quiz', d: 'M9 9a3 3 0 1 1 4.2 2.75c-.9.4-1.2.95-1.2 1.85', d2: 'M12 17.3v.2' },
  { id: 'table', label: 'Table', d: 'M4 5h16v14H4z', d2: 'M4 10h16M10 5v14' },
  { id: 'flash', label: 'Cards', d: 'M8 7h12v13H8z', d2: 'M4 16V4h12' },
  { id: 'summary', label: 'Brief', d: 'M5 5h14M5 9h14M5 13h10M5 17h7', d2: '' },
  { id: 'audio', label: 'Audio', d: 'M5 10v4M9 6v12M13 9v6M17 4v16M21 10v4', d2: '' },
  { id: 'timeline', label: 'Timeline', d: 'M6 4v16', d2: 'M6 6h5M6 12h7M6 18h4' },
]

export const TOOL_TITLES: Record<ToolId, string> = {
  mindmap: 'Mind map',
  quiz: 'Quiz',
  table: 'Concept table',
  flash: 'Flashcards',
  summary: 'Study brief',
  audio: 'Audio overview',
  timeline: 'Timeline',
}

// ── Add-source options ──────────────────────────────────────────────────────
export interface AddType {
  t: SourceType
  label: string
  name: string
  meta: string
}

export const ADD_TYPES: AddType[] = [
  { t: 'pdf', label: 'Upload PDF', name: '', meta: 'PDF' },
  { t: 'url', label: 'Add web link', name: '', meta: 'Web page' },
  { t: 'yt', label: 'Add YouTube video', name: '', meta: 'YouTube video' },
  { t: 'doc', label: 'Import Google Doc', name: '', meta: 'Google Doc' },
  { t: 'txt', label: 'Paste text', name: '', meta: 'Pasted text' },
]

export interface AddMeta {
  title: string
  sub: string
  ph: string
  file?: boolean
  textarea?: boolean
}

export const ADD_META: Record<SourceType, AddMeta> = {
  pdf: {
    title: 'Upload a PDF',
    sub: 'Pick a file from your computer — it is uploaded and indexed.',
    ph: '',
    file: true,
  },
  url: { title: 'Add a web link', sub: 'Mindloom will fetch, clean and index the page.', ph: 'https://…' },
  yt: {
    title: 'Add a YouTube video',
    sub: 'The transcript is fetched and indexed with timestamps.',
    ph: 'https://youtube.com/watch?v=…',
  },
  doc: { title: 'Import a Google Doc', sub: 'Paste a share link — view access is enough.', ph: 'https://docs.google.com/document/…' },
  txt: { title: 'Paste text', sub: 'Notes, a transcript, an email thread — anything.', ph: 'Paste your text here…', textarea: true },
}

// ── Landing feature cards ───────────────────────────────────────────────────
export interface Feature {
  d: string
  d2: string
  title: string
  copy: string
}

export const FEATURES: Feature[] = [
  {
    d: 'M9 11l2.5 2.5L16 9M12 3l7 3v6c0 4.4-3 7.5-7 9c-4-1.5-7-4.6-7-9V6z',
    d2: '',
    title: 'Grounded, cited answers',
    copy: 'Every reply points to the page, timestamp, or paragraph it came from. No hallucinated confidence.',
  },
  {
    d: 'M12 12L5 6.5M12 12l7-5.5M12 12v7.5',
    d2: 'M12 10a2 2 0 1 0 0 4a2 2 0 1 0 0-4',
    title: 'One-click mind maps',
    copy: 'See how concepts across five PDFs actually connect — then quiz yourself on the weak spots.',
  },
  {
    d: 'M6 3h9l4 4v14H6z',
    d2: 'M15 3v4h4',
    title: 'Every format welcome',
    copy: 'PDFs, web pages, YouTube lectures, Google Docs, pasted notes. Indexed in seconds, queryable forever.',
  },
  {
    d: 'M5 10v4M9 6v12M13 9v6M17 4v16M21 10v4',
    d2: '',
    title: 'Audio overviews',
    copy: 'Turn a week of readings into a two-host deep dive you can play on the walk to class.',
  },
]

// ── Landing floating icons (parallax) ───────────────────────────────────────
export interface Float {
  x: string
  y: string
  size: number
  depth: number
  t: SourceType
}

export const FLOATS: Float[] = [
  { x: '4%', y: '14%', size: 52, depth: 22, t: 'pdf' },
  { x: '89%', y: '9%', size: 46, depth: 30, t: 'yt' },
  { x: '1.5%', y: '60%', size: 44, depth: 28, t: 'url' },
  { x: '92%', y: '54%', size: 54, depth: 16, t: 'doc' },
  { x: '10%', y: '84%', size: 42, depth: 24, t: 'txt' },
]
