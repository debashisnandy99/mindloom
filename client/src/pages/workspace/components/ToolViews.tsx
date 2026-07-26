import { useRef, useState, type PointerEvent } from 'react'
import type {
  ConceptTable,
  FlashcardDeck,
  MindMap,
  Quiz,
  Summary,
  Timeline,
} from '../../../api/types'
import { useSources } from '../../../hooks/queries/useSources'
import { useAppDispatch, useAppSelector } from '../../../store/reduxStore'
import { flip, nextFc, prevFc } from '../../../store/slices/flashcardsSlice'
import { nextQuestion, pickOption, restartQuiz } from '../../../store/slices/quizSlice'
import { togglePlay } from '../../../store/thunks'
import type { ToolId } from '../../../types'
import { useNotebookId } from '../WorkspaceContext'
import { ToolShell } from './ToolShell'
import './ToolViews.scss'

/** Routes the active tool to its view. `chat` is handled separately. */
export function ToolView({ view }: { view: Exclude<ToolId, never> }) {
  switch (view) {
    case 'mindmap':
      return <ToolShell tool="mindmap" render={(a) => <MindMap key={a.id} data={a} />} />
    case 'quiz':
      return <ToolShell tool="quiz" render={(a) => <QuizView data={a} />} />
    case 'table':
      return <ToolShell tool="conceptTable" render={(a) => <ConceptTableView data={a} />} />
    case 'flash':
      return <ToolShell tool="flashcards" render={(a) => <Flashcards data={a} />} />
    case 'summary':
      return <ToolShell tool="summary" render={(a) => <SummaryView data={a} />} />
    case 'audio':
      return <AudioOverview />
    case 'timeline':
      return <ToolShell tool="timeline" render={(a) => <TimelineView data={a} />} />
  }
}

// ── Mind map ──────────────────────────────────────────────────────────────
function MindMap({ data }: { data: MindMap }) {
  const nodes = [...data.nodes].sort((a, b) => a.order - b.order)
  // Seeded once from the artifact; the parent passes key={artifact.id} so a
  // regenerated map remounts with fresh positions.
  const [pos, setPos] = useState(() => nodes.map((n) => ({ x: n.x, y: n.y })))
  const containerRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ i: number } | null>(null)

  const mainIdx = Math.max(0, nodes.findIndex((n) => n.isMain))

  const onDown = (i: number) => (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { i }
  }
  const onMove = (i: number) => (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.i !== i) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = Math.min(95, Math.max(5, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.min(92, Math.max(8, ((e.clientY - rect.top) / rect.height) * 100))
    setPos((prev) => prev.map((p, idx) => (idx === i ? { x, y } : p)))
  }
  const onUp = () => {
    drag.current = null
  }

  const main = pos[mainIdx] ?? { x: 50, y: 50 }

  return (
    <div ref={containerRef} className="tool-view-panel mind-map">
      <svg className="mind-map__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        {pos.map((p, i) =>
          i === mainIdx ? null : (
            <line key={i} x1={main.x} y1={main.y} x2={p.x} y2={p.y} stroke="var(--tx2)" strokeWidth={0.35} opacity={0.45} />
          ),
        )}
      </svg>
      {pos.map((p, i) => {
        const n = nodes[i]
        return (
          <div
            key={n.id}
            onPointerDown={onDown(i)}
            onPointerMove={onMove(i)}
            onPointerUp={onUp}
            className={`mind-map__node ${n.isMain ? 'mind-map__node--main' : ''}`}
            style={{ left: `${p.x.toFixed(2)}%`, top: `${p.y.toFixed(2)}%` }}
          >
            {n.label}
          </div>
        )
      })}
      <div className="mind-map__footer-label">drag nodes to rearrange</div>
    </div>
  )
}

// ── Quiz ──────────────────────────────────────────────────────────────────
function QuizView({ data }: { data: Quiz }) {
  const dispatch = useAppDispatch()
  const { qIndex, picked, revealed, score, quizDone } = useAppSelector((s) => s.quiz)
  const questions = [...data.questions].sort((a, b) => a.order - b.order)
  const total = questions.length
  const q = questions[Math.min(qIndex, total - 1)]

  if (!q) return <div className="tool-view-panel tool-view-panel--centered">This quiz has no questions.</div>

  return (
    <div className="tool-view-panel tool-view-panel--scrollable tool-view-panel--centered">
      {quizDone ? (
        <div className="quiz-view__card-complete">
          <div className="quiz-view__complete-header">QUIZ COMPLETE</div>
          <div className="quiz-view__score-display">
            {score}/{total}
          </div>
          <div className="quiz-view__complete-desc">
            {score === total ? 'Perfect score.' : 'Review the cited sources and retake.'}
          </div>
          <button onClick={() => dispatch(restartQuiz())} className="quiz-view__retake-btn ml-press">
            Retake quiz
          </button>
        </div>
      ) : (
        <div className="quiz-view">
          <div className="quiz-view__header">
            <span>QUESTION {qIndex + 1} / {total}</span>
            <span>score {score}</span>
          </div>
          <div className="quiz-view__question">{q.question}</div>
          <div className="quiz-view__options">
            {q.options.map((o, i) => {
              let modifier = ''
              let tag = ''
              if (revealed) {
                if (i === q.correctIndex) {
                  modifier = 'quiz-view__option-btn--correct'
                  tag = 'correct'
                } else if (i === picked) {
                  modifier = 'quiz-view__option-btn--picked'
                  tag = 'your pick'
                } else {
                  modifier = 'quiz-view__option-btn--dimmed'
                }
              }
              return (
                <button
                  key={i}
                  onClick={() => !revealed && dispatch(pickOption({ optionIdx: i, correct: q.correctIndex }))}
                  className={`quiz-view__option-btn ${modifier}`}
                >
                  <span className="quiz-view__option-btn-text">{o}</span>
                  <span className="quiz-view__option-btn-tag">{tag}</span>
                </button>
              )
            })}
          </div>
          {revealed && (
            <div className="quiz-view__footer">
              {q.sourceLabel && <div className="quiz-view__footer-source">source: {q.sourceLabel}</div>}
              <button onClick={() => dispatch(nextQuestion(total))} className="quiz-view__footer-next-btn ml-press">
                {qIndex + 1 >= total ? 'See results' : 'Next question'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Concept table ─────────────────────────────────────────────────────────
function ConceptTableView({ data }: { data: ConceptTable }) {
  const rows = [...data.rows].sort((a, b) => a.order - b.order)
  return (
    <div className="tool-view-panel tool-view-panel--scrollable concept-table">
      <div className="concept-table__header">
        <div>CONCEPT</div>
        <div>BEST SOURCE</div>
        <div>MENTIONS</div>
        <div>CONFIDENCE</div>
      </div>
      <div className="concept-table__list">
        {rows.map((r) => (
          <div key={r.id} className="concept-table__row">
            <div className="concept-table__row-concept">{r.concept}</div>
            <div className="concept-table__row-source">{r.bestSource}</div>
            <div className="concept-table__row-mentions">{r.mentions}</div>
            <div className="concept-table__row-bar-wrap">
              <div className="concept-table__row-bar-bg">
                <div className="concept-table__row-bar-fill" style={{ width: `${r.confidence}%` }} />
              </div>
              <span className="concept-table__row-pct">{r.confidence}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Flashcards ────────────────────────────────────────────────────────────
function Flashcards({ data }: { data: FlashcardDeck }) {
  const dispatch = useAppDispatch()
  const { fcIndex, flipped } = useAppSelector((s) => s.flashcards)
  const cards = [...data.cards].sort((a, b) => a.order - b.order)
  const total = cards.length
  const fc = cards[Math.min(fcIndex, total - 1)]

  if (!fc) return <div className="tool-view-panel tool-view-panel--centered">This deck is empty.</div>

  return (
    <div className="tool-view-panel flashcards-view">
      <div onClick={() => dispatch(flip())} className="flashcards-view__card ml-press">
        <div className={`flashcards-view__card-type ${flipped ? 'flashcards-view__card-type--flipped' : ''}`}>
          {flipped ? 'DEFINITION' : 'TERM'}
        </div>
        <div className={`flashcards-view__card-text ${flipped ? 'flashcards-view__card-text--flipped' : ''}`}>
          {flipped ? fc.back : fc.front}
        </div>
        <div className="flashcards-view__card-hint">click to flip</div>
      </div>
      <div className="flashcards-view__nav">
        <button onClick={() => dispatch(prevFc(total))} className="flashcards-view__nav-btn ml-press">
          ←
        </button>
        <div className="flashcards-view__nav-indicator">
          {Math.min(fcIndex, total - 1) + 1} / {total}
        </div>
        <button onClick={() => dispatch(nextFc(total))} className="flashcards-view__nav-btn ml-press">
          →
        </button>
      </div>
    </div>
  )
}

// ── Study brief ───────────────────────────────────────────────────────────
function SummaryView({ data }: { data: Summary }) {
  const points = [...data.points].sort((a, b) => a.order - b.order)
  return (
    <div className="tool-view-panel tool-view-panel--scrollable summary-view">
      <div className="summary-view__container">
        <div className="summary-view__title">{data.title}</div>
        <div className="summary-view__meta">
          auto-generated · {data.sourceCount || points.length} points · {data.readMinutes} min read
        </div>
        {data.intro && <p className="summary-view__intro">{data.intro}</p>}
        {points.map((p) => (
          <div key={p.id} className="summary-view__point">
            <span className="summary-view__point-num">{p.number}</span>
            <span className="summary-view__point-content">
              <b>{p.heading}</b> — {p.body}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Audio overview (playback placeholder — not LLM-generated) ──────────────
function AudioOverview() {
  const notebookId = useNotebookId()
  const dispatch = useAppDispatch()
  const playing = useAppSelector((s) => s.layout.playing)
  const progress = useAppSelector((s) => s.layout.progress)
  const { data: sources = [] } = useSources(notebookId)
  const readyCount = sources.filter((s) => s.status === 'INDEXED').length
  const totalS = 754
  const curS = Math.round((totalS * progress) / 100)
  const audioTime = `${Math.floor(curS / 60)}:${String(curS % 60).padStart(2, '0')}`

  return (
    <div className="tool-view-panel audio-view">
      <div className="audio-view__card">
        <div className="audio-view__tag">DEEP DIVE · TWO HOSTS</div>
        <div className="audio-view__title">Audio overview</div>
        <div className="audio-view__subtitle">A conversational walkthrough of your {readyCount} ready {readyCount === 1 ? 'source' : 'sources'}.</div>
        <div className="audio-view__controls">
          <button onClick={() => dispatch(togglePlay())} className="audio-view__play-btn ml-press">
            {playing ? '❚❚' : '▶'}
          </button>
          <div className="audio-view__waveform">
            {Array.from({ length: 26 }, (_, i) => {
              const h = 12 + Math.round(16 * Math.abs(Math.sin(i * 1.7) + Math.sin(i * 0.6)))
              const played = (i / 26) * 100 < progress
              return (
                <span
                  key={i}
                  className={`audio-view__waveform-bar ${played ? 'audio-view__waveform-bar--played' : 'audio-view__waveform-bar--unplayed'}`}
                  style={{
                    height: h,
                    animation: `mlEq 0.9s ease-in-out ${(i * 0.07).toFixed(2)}s infinite`,
                    animationPlayState: playing ? 'running' : 'paused',
                  }}
                />
              )
            })}
          </div>
        </div>
        <div className="audio-view__timer">
          <span>{audioTime}</span>
          <span>12:34</span>
        </div>
      </div>
    </div>
  )
}

// ── Timeline ──────────────────────────────────────────────────────────────
function TimelineView({ data }: { data: Timeline }) {
  const events = [...data.events].sort((a, b) => a.order - b.order)
  return (
    <div className="tool-view-panel tool-view-panel--scrollable timeline-view">
      <div className="timeline-view__container">
        {events.map((e) => (
          <div key={e.id} className="timeline-view__item">
            <div className="timeline-view__axis">
              <span className="timeline-view__axis-node" />
              <span className="timeline-view__axis-line" />
            </div>
            <div className="timeline-view__content">
              <div className="timeline-view__content-year">{e.year}</div>
              <div className="timeline-view__content-title">{e.title}</div>
              <div className="timeline-view__content-desc">{e.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
