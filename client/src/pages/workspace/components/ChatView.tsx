import { useEffect, useRef, type KeyboardEvent } from 'react'
import type { ChatQuery, RetrievedChunk } from '../../../api/types'
import { Icon } from '../../../components/Icon'
import { useChatHistory } from '../../../hooks/queries/useChatHistory'
import { useSources } from '../../../hooks/queries/useSources'
import { useStreamingAnswer } from '../../../hooks/mutations/useStreamingAnswer'
import { SUGGESTIONS } from '../../../data'
import { useAppDispatch, useAppSelector } from '../../../store/reduxStore'
import { clearDraft, incrementSugIdx, setDraft } from '../../../store/slices/chatSlice'
import { selectSource } from '../../../store/slices/sourcesSlice'
import { useNotebookId } from '../WorkspaceContext'
import './ChatView.scss'

interface Cite {
  id: string
  name: string
}

export function ChatView() {
  const notebookId = useNotebookId()
  const dispatch = useAppDispatch()
  const draft = useAppSelector((s) => s.chat.draft)
  const sugIdx = useAppSelector((s) => s.chat.sugIdx)

  const { data: history = [] } = useChatHistory(notebookId)
  const { data: sources = [] } = useSources(notebookId)
  const { answer, citations, grounded, isStreaming, error, ask } = useStreamingAnswer(notebookId)

  const readyCount = sources.filter((s) => s.status === 'INDEXED').length
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [history, answer, isStreaming])

  const suggestions = [0, 1, 2].map((i) => SUGGESTIONS[(sugIdx * 3 + i) % SUGGESTIONS.length])

  const send = (text: string) => {
    const t = text.trim()
    if (!t || isStreaming) return
    dispatch(clearDraft())
    dispatch(incrementSugIdx())
    void ask(t)
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') send(draft)
  }

  const showLive = isStreaming || Boolean(answer)
  const empty = history.length === 0 && !showLive

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
          <HistoryTurn key={turn.id} turn={turn} onOpenCite={(id) => dispatch(selectSource(id))} />
        ))}

        {showLive && (
          <BotBubble
            text={answer}
            streaming={isStreaming}
            cites={grounded === false ? [] : dedupeChunks(citations)}
            onOpenCite={(id) => dispatch(selectSource(id))}
          />
        )}

        {error && (
          <div className="chat-view__empty" style={{ ...emptyStyle, color: 'var(--red)' }}>
            {error}
          </div>
        )}
      </div>

      <div className="chat-view__suggestions">
        <span title="Suggested for you" className="chat-view__suggestions--icon">
          <Icon d="M12 4l1.6 5.2L19 11l-5.4 1.8L12 18l-1.6-5.2L5 11l5.4-1.8z" size={15} fill="var(--acc)" stroke="none" />
        </span>
        {suggestions.map((text, i) => (
          <button key={i} onClick={() => send(text)} className="chat-view__suggestions--btn ml-sug">
            {text}
          </button>
        ))}
        <button
          onClick={() => dispatch(incrementSugIdx())}
          title="More suggestions"
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
          className="chat-view__composer--input"
        />
        <button
          onClick={() => send(draft)}
          title="Send"
          disabled={isStreaming || !draft.trim()}
          className="chat-view__composer--send ml-lift ml-press-flat"
        >
          <Icon d="M5 12h13M13 6l6 6-6 6" size={19} sw={2.4} />
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

function dedupeChunks(citations: RetrievedChunk[]): Cite[] {
  const seen = new Map<string, string>()
  for (const c of citations) if (c.sourceId && !seen.has(c.sourceId)) seen.set(c.sourceId, c.sourceName)
  return [...seen.entries()].map(([id, name]) => ({ id, name }))
}

function HistoryTurn({ turn, onOpenCite }: { turn: ChatQuery; onOpenCite: (id: string) => void }) {
  const cites: Cite[] = turn.queryToSources
    .filter((qs) => qs.source)
    .map((qs) => ({ id: qs.source!.id, name: qs.source!.name }))
  return (
    <>
      <div className="chat-view__bubble--user">{turn.query}</div>
      {turn.answer && <BotBubble text={turn.answer} streaming={false} cites={cites} onOpenCite={onOpenCite} />}
    </>
  )
}

function BotBubble({
  text,
  streaming,
  cites,
  onOpenCite,
}: {
  text: string
  streaming: boolean
  cites: Cite[]
  onOpenCite: (id: string) => void
}) {
  return (
    <div className="chat-view__bubble--bot">
      <div className="chat-view__bubble--bot-avatar">
        <Icon d="M4 9h16M4 15h16M9 4v16M15 4v16" size={14} sw={2.2} />
      </div>
      <div className="chat-view__bubble--bot-body">
        {text}
        {streaming && <span style={{ opacity: 0.6 }}>▌</span>}
        {cites.length > 0 && (
          <span className="chat-view__bubble--bot-cites">
            {cites.map((c) => (
              <button
                key={c.id}
                onClick={() => onOpenCite(c.id)}
                title={c.name}
                className="chat-view__bubble--bot-cite-btn ml-cite"
              >
                {c.name}
              </button>
            ))}
          </span>
        )}
      </div>
    </div>
  )
}
