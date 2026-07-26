import { Fragment, useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { ChatQuery, QueryToSource, RetrievedChunk, ServerSourceType } from '../../../api/types'
import { Icon } from '../../../components/Icon'
import { chatKeys } from '../../../constants/queryKeys'
import { useChatHistory } from '../../../hooks/queries/useChatHistory'
import { useSources } from '../../../hooks/queries/useSources'
import { useSuggestions } from '../../../hooks/queries/useSuggestions'
import { useStreamingAnswer } from '../../../hooks/mutations/useStreamingAnswer'
import { useAppDispatch, useAppSelector } from '../../../store/reduxStore'
import { clearDraft, incrementSugIdx, setDraft } from '../../../store/slices/chatSlice'
import { openCitation, type CitationLocator } from '../../../store/slices/sourcesSlice'
import { useNotebookId } from '../WorkspaceContext'
import './ChatView.scss'

interface CiteChip {
  key: string
  label: string
  locator: CitationLocator
}

export function ChatView() {
  const notebookId = useNotebookId()
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()
  const draft = useAppSelector((s) => s.chat.draft)
  const sugIdx = useAppSelector((s) => s.chat.sugIdx)

  const { data: history = [] } = useChatHistory(notebookId)
  const { data: sources = [] } = useSources(notebookId)
  const { data: allSuggestions = [], isLoading: sugLoading } = useSuggestions(notebookId)
  const { query, answer, citations, grounded, isStreaming, error, ask, completedQueryId } = useStreamingAnswer(notebookId)

  const readyCount = sources.filter((s) => s.status === 'INDEXED').length
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [history, answer, isStreaming])

  const suggestions =
    allSuggestions.length > 0
      ? [0, 1, 2].map((i) => allSuggestions[(sugIdx * 3 + i) % allSuggestions.length])
      : []

  const send = (text: string) => {
    const t = text.trim()
    if (!t || isStreaming) return
    dispatch(clearDraft())
    dispatch(incrementSugIdx())
    void ask(t)
  }

  const shuffle = () => {
    const nextIdx = sugIdx + 1
    // When all suggestions have been cycled through, fetch a fresh batch.
    if (allSuggestions.length > 0 && nextIdx * 3 >= allSuggestions.length) {
      void queryClient.invalidateQueries({ queryKey: chatKeys.suggestions(notebookId ?? '') })
    }
    dispatch(incrementSugIdx())
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') send(draft)
  }

  const openCite = (locator: CitationLocator) => {
    dispatch(openCitation(locator))
  }

  // showLive stays true until the completed query actually appears in the history array
  const showLive = isStreaming || (Boolean(query) && (!completedQueryId || !history.some(t => t.id === completedQueryId)))
  const empty = history.length === 0 && !showLive
  const liveCites = grounded === false ? [] : chunksToChips(citations)

  return (
    <>
      <div ref={logRef} className="chat-view__log">
        {empty && (
          <div className="chat-view__empty" style={emptyStyle}>
            {readyCount === 0
              ? 'Add and index a source, then ask anything — every answer cites the passage it came from.'
              : `${readyCount} ${readyCount === 1 ? 'source is' : 'sources are'} ready. Ask anything — answers cite the exact passage.`}
          </div>
        )}

        {history.map((turn) => (
          <HistoryTurn key={turn.id} turn={turn} onOpenCite={openCite} />
        ))}

        {showLive && query && (
          <div className="chat-view__bubble--user">{query}</div>
        )}

        {showLive && (isStreaming || answer) && (
          <BotBubble
            text={answer}
            streaming={isStreaming}
            cites={liveCites}
            indexedCitations={citations}
            onOpenCite={openCite}
          />
        )}

        {showLive && error && (
          <div className="chat-view__empty" style={{ ...emptyStyle, color: 'var(--red)' }}>
            {error}
          </div>
        )}
      </div>

      <div className="chat-view__suggestions">
        <span title="Suggested for you" className="chat-view__suggestions--icon">
          <Icon d="M12 4l1.6 5.2L19 11l-5.4 1.8L12 18l-1.6-5.2L5 11l5.4-1.8z" size={15} fill="var(--acc)" stroke="none" />
        </span>
        {sugLoading
          ? [100, 140, 120].map((w, i) => (
              <span key={i} className="chat-view__suggestions--skeleton" style={{ width: w }} />
            ))
          : suggestions.map((text, i) => (
              <button key={i} onClick={() => send(text)} className="chat-view__suggestions--btn ml-sug">
                {text}
              </button>
            ))}
        <button
          onClick={shuffle}
          title="More suggestions"
          disabled={sugLoading}
          className="chat-view__suggestions--shuffle ml-hov-acc ml-press"
        >
          <Icon d="M4 12a8 8 0 0 1 14-5.2M20 12a8 8 0 0 1-14 5.2M18 3v4h-4M6 21v-4h4" size={13} sw={2.2} />
        </button>
      </div>

      <div className="chat-view__composer">
        <input
          value={draft}
          onChange={(e) => dispatch(setDraft(e.target.value))}
          onKeyDown={onKey}
          placeholder={isStreaming ? 'Answering…' : 'Ask across all ready sources…'}
          disabled={isStreaming}
          className={`chat-view__composer--input ${isStreaming ? 'chat-view__composer--input-streaming' : ''}`}
        />
        <button
          onClick={() => send(draft)}
          title="Send"
          disabled={isStreaming || !draft.trim()}
          className={`chat-view__composer--send ml-lift ml-press-flat ${isStreaming ? 'chat-view__composer--send-streaming' : ''}`}
        >
          {isStreaming ? (
            <div className="chat-view__composer--spinner" />
          ) : (
            <Icon d="M5 12h13M13 6l6 6-6 6" size={19} sw={2.4} />
          )}
        </button>
      </div>
    </>
  )
}

const emptyStyle = {
  padding: '18px 20px',
  fontSize: 13,
  lineHeight: 1.55,
  color: 'var(--tx2)',
  textAlign: 'center' as const,
}

function chunkToLocator(c: RetrievedChunk): CitationLocator | null {
  if (!c.sourceId || !c.sourceType) return null
  return {
    sourceId: c.sourceId,
    sourceType: c.sourceType,
    contentUrl: c.contentUrl,
    timestamp: c.timestamp,
    startSeconds: c.startSeconds,
    pageNumber: c.pageNumber,
    chunkText: c.text,
    label: c.label ?? c.sourceName,
  }
}

/** One chip per source, keeping the best-scoring chunk's locator. */
function chunksToChips(citations: RetrievedChunk[]): CiteChip[] {
  const best = new Map<string, RetrievedChunk>()
  for (const c of citations) {
    if (!c.sourceId) continue
    const existing = best.get(c.sourceId)
    if (!existing || c.score > existing.score) best.set(c.sourceId, c)
  }

  return [...best.values()].flatMap((c, i) => {
    const locator = chunkToLocator(c)
    if (!locator) return []
    return [{
      key: `${c.sourceId}-${i}`,
      label: c.label || c.sourceName,
      locator,
    }]
  })
}

function historyToChips(links: QueryToSource[]): CiteChip[] {
  return links.flatMap((qs, i) => {
    const sourceType = (qs.sourceType ?? qs.source?.type) as ServerSourceType | undefined
    if (!qs.sourceId || !sourceType) return []
    const label = qs.label || qs.source?.name || 'Source'
    return [{
      key: qs.id || `${qs.sourceId}-${i}`,
      label,
      locator: {
        sourceId: qs.sourceId,
        sourceType,
        contentUrl: qs.contentUrl ?? qs.source?.content,
        timestamp: qs.timestamp ?? undefined,
        startSeconds: qs.startSeconds ?? undefined,
        pageNumber: qs.pageNumber ?? undefined,
        chunkText: qs.chunkText ?? undefined,
        label,
      },
    }]
  })
}

function HistoryTurn({
  turn,
  onOpenCite,
}: {
  turn: ChatQuery
  onOpenCite: (locator: CitationLocator) => void
}) {
  const cites = historyToChips(turn.queryToSources)
  // Indexed list matching [1]..[n] order for inline markers (best-effort from links).
  const indexed = turn.queryToSources.map((qs) => ({
    sourceId: qs.sourceId,
    sourceName: qs.source?.name ?? qs.label ?? 'Source',
    sourceType: (qs.sourceType ?? qs.source?.type) as ServerSourceType | undefined,
    contentUrl: qs.contentUrl ?? qs.source?.content ?? undefined,
    timestamp: qs.timestamp ?? undefined,
    startSeconds: qs.startSeconds ?? undefined,
    pageNumber: qs.pageNumber ?? undefined,
    text: qs.chunkText ?? '',
    label: qs.label ?? qs.source?.name,
    score: qs.score ?? 0,
    chunkIndex: qs.chunkIndex ?? 0,
    id: qs.id,
  })) satisfies RetrievedChunk[]

  return (
    <>
      <div className="chat-view__bubble--user">{turn.query}</div>
      {turn.answer && (
        <BotBubble
          text={turn.answer}
          streaming={false}
          cites={cites}
          indexedCitations={indexed}
          onOpenCite={onOpenCite}
        />
      )}
    </>
  )
}

function BotBubble({
  text,
  streaming,
  cites,
  indexedCitations,
  onOpenCite,
}: {
  text: string
  streaming: boolean
  cites: CiteChip[]
  indexedCitations: RetrievedChunk[]
  onOpenCite: (locator: CitationLocator) => void
}) {
  return (
    <div className="chat-view__bubble--bot">
      <div className="chat-view__bubble--bot-avatar">
        <Icon d="M4 9h16M4 15h16M9 4v16M15 4v16" size={14} sw={2.2} />
      </div>
      <div className="chat-view__bubble--bot-body">
        <span className="chat-view__bubble--bot-text">
          {renderAnswerWithCites(text, indexedCitations, onOpenCite)}
        </span>
        {streaming && <span style={{ opacity: 0.6 }}>▌</span>}
        {cites.length > 0 && (
          <span className="chat-view__bubble--bot-cites">
            {cites.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => onOpenCite(c.locator)}
                title={c.label}
                className="chat-view__bubble--bot-cite-btn ml-cite"
              >
                {c.label}
              </button>
            ))}
          </span>
        )}
      </div>
    </div>
  )
}

/** Turns `[1]` / `[2][3]` markers into clickable chips mapped to citation index. */
function renderAnswerWithCites(
  text: string,
  citations: RetrievedChunk[],
  onOpenCite: (locator: CitationLocator) => void,
): ReactNode {
  if (!text) return null

  const parts = text.split(/(\[\d+\])/g)
  return parts.map((part, i) => {
    const match = /^\[(\d+)\]$/.exec(part)
    if (!match) return <Fragment key={i}>{part}</Fragment>

    const index = Number(match[1]) - 1
    const chunk = citations[index]
    const locator = chunk ? chunkToLocator(chunk) : null
    if (!locator) {
      return (
        <span key={i} className="chat-view__bubble--bot-cite-inline chat-view__bubble--bot-cite-inline-dead">
          {part}
        </span>
      )
    }

    return (
      <button
        key={i}
        type="button"
        onClick={() => onOpenCite(locator)}
        title={locator.label ?? chunk.sourceName}
        className="chat-view__bubble--bot-cite-inline ml-cite"
      >
        {part}
      </button>
    )
  })
}
