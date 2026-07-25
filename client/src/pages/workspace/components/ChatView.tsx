import { useEffect, useRef, type KeyboardEvent } from 'react'
import { Icon } from '../../../components/Icon'
import { SUGGESTIONS } from '../../../data'
import { useAppDispatch, useAppSelector } from '../../../store/reduxStore'
import { incrementSugIdx, setDraft } from '../../../store/slices/chatSlice'
import { selectSource as selectSourceAction } from '../../../store/slices/sourcesSlice'
import { sendMessage } from '../../../store/thunks'
import type { ChatMessage } from '../../../types'
import './ChatView.scss'

export function ChatView() {
  const dispatch = useAppDispatch()
  const { messages, typing, sugIdx, draft } = useAppSelector((s) => s.chat)
  const sources = useAppSelector((s) => s.sources.sources)
  const logRef = useRef<HTMLDivElement>(null)

  // Keep the log pinned to the newest message / typing indicator.
  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, typing])

  const suggestions = [0, 1, 2].map((i) => SUGGESTIONS[(sugIdx * 3 + i) % SUGGESTIONS.length])

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') dispatch(sendMessage(draft))
  }

  return (
    <>
      <div
        ref={logRef}
        className="chat-view__log"
      >
        {messages.map((m, i) => (
          <Bubble key={i} message={m} onOpenCite={(id) => dispatch(selectSourceAction(id))} sources={sources} />
        ))}
        {typing && (
          <div className="chat-view__typing">
            {[0, 0.2, 0.4].map((delay, i) => (
              <span key={i} className="chat-view__typing-dot" style={{ animation: `mlBlink 1.1s ${delay}s infinite` }} />
            ))}
          </div>
        )}
      </div>

      {/* Suggestions */}
      <div className="chat-view__suggestions">
        <span title="Suggested for you" className="chat-view__suggestions--icon">
          <Icon d="M12 4l1.6 5.2L19 11l-5.4 1.8L12 18l-1.6-5.2L5 11l5.4-1.8z" size={15} fill="var(--acc)" stroke="none" />
        </span>
        {suggestions.map((text, i) => (
          <button
            key={i}
            onClick={() => dispatch(sendMessage(text))}
            className="chat-view__suggestions--btn ml-sug"
          >
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

      {/* Composer */}
      <div className="chat-view__composer">
        <input
          value={draft}
          onChange={(e) => dispatch(setDraft(e.target.value))}
          onKeyDown={onKey}
          placeholder="Ask across all ready sources…"
          className="chat-view__composer--input"
        />
        <button
          onClick={() => dispatch(sendMessage(draft))}
          title="Send"
          className="chat-view__composer--send ml-lift ml-press-flat"
        >
          <Icon d="M5 12h13M13 6l6 6-6 6" size={19} sw={2.4} />
        </button>
      </div>
    </>
  )
}

function Bubble({
  message,
  onOpenCite,
  sources,
}: {
  message: ChatMessage
  onOpenCite: (id: number) => void
  sources: { id: number; name: string }[]
}) {
  if (message.role === 'user') {
    return (
      <div className="chat-view__bubble--user">
        {message.text}
      </div>
    )
  }

  const cites = message.cites ?? []
  return (
    <div className="chat-view__bubble--bot">
      <div className="chat-view__bubble--bot-avatar">
        <Icon d="M4 9h16M4 15h16M9 4v16M15 4v16" size={14} sw={2.2} />
      </div>
      <div className="chat-view__bubble--bot-body">
        {message.text}
        {cites.length > 0 && (
          <span className="chat-view__bubble--bot-cites">
            {cites.map((id) => {
              const src = sources.find((s) => s.id === id)
              return (
                <button
                  key={id}
                  onClick={() => onOpenCite(id)}
                  title={src ? src.name : ''}
                  className="chat-view__bubble--bot-cite-btn ml-cite"
                >
                  {id}
                </button>
              )
            })}
          </span>
        )}
      </div>
    </div>
  )
}
