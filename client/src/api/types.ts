/**
 * DTOs that mirror the server's response shapes (Prisma models + controller
 * envelopes). These are intentionally separate from the mock domain types in
 * `src/types/index.ts`, which model the prototype UI and use numeric ids.
 * Server ids are UUID strings and timestamps are ISO strings.
 */

// ── Notebooks ───────────────────────────────────────────────────────────────

export interface Notebook {
  id: string
  name: string
  description: string
  ownerId: string
  createdAt: string
  updatedAt: string
  /** Present on list/create/update responses. */
  _count?: { sources: number; queries?: number }
}

/** `GET /notebooks/:id` additionally embeds the source list and full counts. */
export interface NotebookDetail extends Notebook {
  _count: { sources: number; queries: number }
  sources: Source[]
}

// ── Sources ─────────────────────────────────────────────────────────────────

export type ServerSourceType = 'PDF' | 'URL' | 'YT' | 'GDOC' | 'TEXT'
export type ServerSourceStatus = 'PENDING' | 'PROCESSING' | 'INDEXED' | 'FAILED'

export interface Source {
  id: string
  name: string
  type: ServerSourceType
  content: string
  meta: string
  status: ServerSourceStatus
  keyPoints: string[]
  excerpts: string[]
  s3Key: string | null
  mimeType: string | null
  fileSize: number | null
  chunkCount: number | null
  errorMessage: string | null
  indexedAt: string | null
  notebookId: string
  createdAt: string
  updatedAt: string
}

/** `GET /sources/:id` pairs the source with a short-lived presigned download URL. */
export interface SourceWithDownload {
  source: Source
  downloadUrl: string | null
}

/** JSON body for a link/text source. PDFs go through the multipart path instead. */
export type CreateSourceInput =
  | { type: 'URL'; content: string; name?: string }
  | { type: 'YT'; content: string; name?: string }
  | { type: 'GDOC'; content: string; name?: string }
  | { type: 'TEXT'; content: string; name?: string }

// ── Tools ───────────────────────────────────────────────────────────────────

export interface MindMapNode {
  id: string
  label: string
  isMain: boolean
  x: number
  y: number
  order: number
  mindMapId: string
}
export interface MindMap {
  id: string
  title: string
  generatedMs: number
  notebookId: string
  createdAt: string
  updatedAt: string
  nodes: MindMapNode[]
}

export interface QuizQuestion {
  id: string
  question: string
  sourceLabel: string
  correctIndex: number
  options: string[]
  order: number
  quizId: string
}
export interface Quiz {
  id: string
  title: string
  notebookId: string
  createdAt: string
  updatedAt: string
  questions: QuizQuestion[]
}

export interface ConceptRow {
  id: string
  concept: string
  bestSource: string
  mentions: number
  confidence: number
  order: number
  conceptTableId: string
}
export interface ConceptTable {
  id: string
  title: string
  notebookId: string
  createdAt: string
  updatedAt: string
  rows: ConceptRow[]
}

export interface Flashcard {
  id: string
  front: string
  back: string
  order: number
  deckId: string
}
export interface FlashcardDeck {
  id: string
  title: string
  notebookId: string
  createdAt: string
  updatedAt: string
  cards: Flashcard[]
}

export interface SummaryPoint {
  id: string
  number: string
  heading: string
  body: string
  order: number
  summaryId: string
}
export interface Summary {
  id: string
  title: string
  intro: string
  readMinutes: number
  sourceCount: number
  notebookId: string
  createdAt: string
  updatedAt: string
  points: SummaryPoint[]
}

export type AudioStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED'
export interface AudioOverview {
  id: string
  tag: string
  title: string
  subtitle: string
  durationSeconds: number
  audioUrl: string | null
  s3Key: string | null
  status: AudioStatus
  notebookId: string
  createdAt: string
  updatedAt: string
}

export interface TimelineEvent {
  id: string
  year: string
  title: string
  description: string
  order: number
  timelineId: string
}
export interface Timeline {
  id: string
  title: string
  notebookId: string
  createdAt: string
  updatedAt: string
  events: TimelineEvent[]
}

/** Maps a tool name to the artifact type it returns. */
export interface ToolArtifactMap {
  mindmap: MindMap
  quiz: Quiz
  conceptTable: ConceptTable
  flashcards: FlashcardDeck
  summary: Summary
  audioOverview: AudioOverview
  timeline: Timeline
}
export type ToolName = keyof ToolArtifactMap

// ── Tool generation (LLM, async via BullMQ) ─────────────────────────────────

/** Server enum for the six LLM-generated tools (audio overview excluded). */
export type ToolKind =
  | 'MINDMAP'
  | 'QUIZ'
  | 'CONCEPT_TABLE'
  | 'FLASHCARDS'
  | 'SUMMARY'
  | 'TIMELINE'

export type GenerationStatus = 'IDLE' | 'QUEUED' | 'PROCESSING' | 'READY' | 'FAILED'

/** Which tool names are LLM-generated, and their server enum value. */
export const GENERATED_TOOLS = {
  mindmap: 'MINDMAP',
  quiz: 'QUIZ',
  conceptTable: 'CONCEPT_TABLE',
  flashcards: 'FLASHCARDS',
  summary: 'SUMMARY',
  timeline: 'TIMELINE',
} as const satisfies Partial<Record<ToolName, ToolKind>>

export type GeneratedToolName = keyof typeof GENERATED_TOOLS

/** Reverse map, server enum → tool name, for routing SSE events to the cache. */
export const TOOL_KIND_TO_NAME: Record<ToolKind, GeneratedToolName> = {
  MINDMAP: 'mindmap',
  QUIZ: 'quiz',
  CONCEPT_TABLE: 'conceptTable',
  FLASHCARDS: 'flashcards',
  SUMMARY: 'summary',
  TIMELINE: 'timeline',
}

export interface ToolGeneration {
  kind: ToolKind
  status: GenerationStatus
  progress: number
  message?: string
  error?: string | null
}

/** Payload of the `tool` SSE event. */
export interface ToolGenerationEvent {
  notebookId: string
  kind: ToolKind
  status: GenerationStatus
  progress: number
  message?: string
  error?: string
  at: string
}

// ── Chat / retrieval ────────────────────────────────────────────────────────

export interface QueryToSource {
  id: string
  sourceId: string
  queryId: string
  score: number | null
  chunkText: string | null
  source?: { id: string; name: string }
}

export interface ChatQuery {
  id: string
  query: string
  answer: string | null
  query_type: 'USER' | 'DEVELOPER'
  notebookId: string
  createdAt: string
  queryToSources: QueryToSource[]
}

export interface RetrievedChunk {
  id: string
  score: number
  text: string
  sourceId: string
  sourceName: string
  chunkIndex: number
}

export interface AskResult {
  query: ChatQuery
  answer: string
  citations: RetrievedChunk[]
  /** False when nothing relevant was retrieved, so no model was consulted. */
  grounded: boolean
}

export interface AskInput {
  query: string
  sourceIds?: string[]
  topK?: number
}

// ── Streaming answers ───────────────────────────────────────────────────────

/** Sent once, before any text: what the answer will be grounded in. */
export interface AnswerMetaEvent {
  found: boolean
  citations: RetrievedChunk[]
}

/** One text fragment of the answer. */
export interface AnswerDeltaEvent {
  text: string
}

/** Sent once the answer is complete and persisted. */
export interface AnswerDoneEvent {
  queryId: string
  answer: string
  grounded: boolean
}

export interface AnswerErrorEvent {
  message: string
}

export interface AnswerStreamHandlers {
  onMeta?: (event: AnswerMetaEvent) => void
  onDelta?: (event: AnswerDeltaEvent) => void
  onDone?: (event: AnswerDoneEvent) => void
  onError?: (event: AnswerErrorEvent) => void
}

// ── Server-Sent Events ──────────────────────────────────────────────────────

export type IndexingStage =
  | 'queued'
  | 'extracting'
  | 'chunking'
  | 'embedding'
  | 'storing'
  | 'completed'
  | 'failed'

/** Payload of the `indexing` SSE event. */
export interface IndexingProgressEvent {
  sourceId: string
  notebookId: string
  status: ServerSourceStatus
  stage: IndexingStage
  /** 0-100 */
  progress: number
  message?: string
  chunkCount?: number
  error?: string
  at: string
}

/** Payload of the `snapshot` SSE event sent once on connect. */
export interface IndexingSnapshotEvent {
  notebookId: string
  sources: Array<{
    sourceId: string
    status: ServerSourceStatus
    chunkCount: number | null
    error: string | null
  }>
  tools?: Array<{
    kind: ToolKind
    status: GenerationStatus
    progress: number
    message?: string
    error?: string | null
  }>
}

/** Payload of the `connected` SSE event. */
export interface SseConnectedEvent {
  notebookId: string
  at: string
}
