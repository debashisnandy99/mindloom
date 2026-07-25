import { useRef, type PointerEvent } from 'react'
import { EVENTS, FLASH, MM_NODES, QUIZ, SUMMARY_POINTS, TABLE } from '../../../data'
import { useAppDispatch, useAppSelector } from '../../../store/reduxStore'
import { flip, nextFc, prevFc } from '../../../store/slices/flashcardsSlice'
import { moveNode } from '../../../store/slices/layoutSlice'
import { nextQuestion, restartQuiz } from '../../../store/slices/quizSlice'
import { answerQuiz, togglePlay } from '../../../store/thunks'
import type { ToolId } from '../../../types'
import './ToolViews.scss'

/** Routes the active tool to its view. `chat` is handled separately. */
export function ToolView({ view }: { view: Exclude<ToolId, never> }) {
  switch (view) {
    case 'mindmap':
      return <MindMap />
    case 'quiz':
      return <Quiz />
    case 'table':
      return <ConceptTable />
    case 'flash':
      return <Flashcards />
    case 'summary':
      return <Summary />
    case 'audio':
      return <AudioOverview />
    case 'timeline':
      return <Timeline />
  }
}

// ── Mind map ──────────────────────────────────────────────────────────────
function MindMap() {
  const dispatch = useAppDispatch()
  const mmPos = useAppSelector((s) => s.layout.mmPos)
  const containerRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ i: number } | null>(null)

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
    dispatch(moveNode({ index: i, x, y }))
  }
  const onUp = () => {
    drag.current = null
  }

  return (
    <div ref={containerRef} className="tool-view-panel mind-map">
      <svg className="mind-map__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        {mmPos.slice(1).map((p, i) => (
          <line key={i} x1={mmPos[0].x} y1={mmPos[0].y} x2={p.x} y2={p.y} stroke="var(--tx2)" strokeWidth={0.35} opacity={0.45} />
        ))}
      </svg>
      {mmPos.map((p, i) => {
        const n = MM_NODES[i]
        return (
          <div
            key={i}
            onPointerDown={onDown(i)}
            onPointerMove={onMove(i)}
            onPointerUp={onUp}
            className={`mind-map__node ${n.main ? 'mind-map__node--main' : ''}`}
            style={{
              left: `${p.x.toFixed(2)}%`,
              top: `${p.y.toFixed(2)}%`,
            }}
          >
            {n.label}
          </div>
        )
      })}
      <div className="mind-map__footer-label">
        drag nodes to rearrange · generated in 1.8s
      </div>
    </div>
  )
}

// ── Quiz ──────────────────────────────────────────────────────────────────
function Quiz() {
  const dispatch = useAppDispatch()
  const { qIndex, picked, revealed, score, quizDone } = useAppSelector((s) => s.quiz)
  const q = QUIZ[qIndex] ?? QUIZ[0]

  return (
    <div className="tool-view-panel tool-view-panel--scrollable tool-view-panel--centered">
      {quizDone ? (
        <div className="quiz-view__card-complete">
          <div className="quiz-view__complete-header">QUIZ COMPLETE</div>
          <div className="quiz-view__score-display">
            {score}/{QUIZ.length}
          </div>
          <div className="quiz-view__complete-desc">
            {score === QUIZ.length ? 'Perfect — Week 4 is yours.' : 'Review the cited sources and retake — the exam derivation is Q2.'}
          </div>
          <button
            onClick={() => dispatch(restartQuiz())}
            className="quiz-view__retake-btn ml-press"
          >
            Retake quiz
          </button>
        </div>
      ) : (
        <div className="quiz-view">
          <div className="quiz-view__header">
            <span>
              QUESTION {qIndex + 1} / {QUIZ.length}
            </span>
            <span>score {score}</span>
          </div>
          <div className="quiz-view__question">{q.q}</div>
          <div className="quiz-view__options">
            {q.opts.map((o, i) => {
              let modifier = ''
              let tag = ''
              if (revealed) {
                if (i === q.correct) {
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
                  onClick={() => dispatch(answerQuiz(i))}
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
              <div className="quiz-view__footer-source">source: {q.src}</div>
              <button
                onClick={() => dispatch(nextQuestion(QUIZ.length))}
                className="quiz-view__footer-next-btn ml-press"
              >
                {qIndex + 1 >= QUIZ.length ? 'See results' : 'Next question'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Concept table ─────────────────────────────────────────────────────────
function ConceptTable() {
  return (
    <div className="tool-view-panel tool-view-panel--scrollable concept-table">
      <div className="concept-table__header">
        <div>CONCEPT</div>
        <div>BEST SOURCE</div>
        <div>MENTIONS</div>
        <div>CONFIDENCE</div>
      </div>
      <div className="concept-table__list">
        {TABLE.map((r, i) => (
          <div key={i} className="concept-table__row">
            <div className="concept-table__row-concept">{r.concept}</div>
            <div className="concept-table__row-source">{r.source}</div>
            <div className="concept-table__row-mentions">{r.mentions}</div>
            <div className="concept-table__row-bar-wrap">
              <div className="concept-table__row-bar-bg">
                <div className="concept-table__row-bar-fill" style={{ width: `${r.pct}%` }} />
              </div>
              <span className="concept-table__row-pct">{r.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Flashcards ────────────────────────────────────────────────────────────
function Flashcards() {
  const dispatch = useAppDispatch()
  const { fcIndex, flipped } = useAppSelector((s) => s.flashcards)
  const fc = FLASH[fcIndex]

  return (
    <div className="tool-view-panel flashcards-view">
      <div
        onClick={() => dispatch(flip())}
        className="flashcards-view__card ml-press"
      >
        <div className={`flashcards-view__card-type ${flipped ? 'flashcards-view__card-type--flipped' : ''}`}>
          {flipped ? 'DEFINITION' : 'TERM'}
        </div>
        <div className={`flashcards-view__card-text ${flipped ? 'flashcards-view__card-text--flipped' : ''}`}>{flipped ? fc.b : fc.f}</div>
        <div className="flashcards-view__card-hint">click to flip</div>
      </div>
      <div className="flashcards-view__nav">
        <button onClick={() => dispatch(prevFc())} className="flashcards-view__nav-btn ml-press">
          ←
        </button>
        <div className="flashcards-view__nav-indicator">
          {fcIndex + 1} / {FLASH.length}
        </div>
        <button onClick={() => dispatch(nextFc())} className="flashcards-view__nav-btn ml-press">
          →
        </button>
      </div>
    </div>
  )
}

// ── Study brief ───────────────────────────────────────────────────────────
function Summary() {
  const sources = useAppSelector((s) => s.sources.sources)
  const readyCount = sources.filter((s) => s.status === 'indexed').length
  return (
    <div className="tool-view-panel tool-view-panel--scrollable summary-view">
      <div className="summary-view__container">
        <div className="summary-view__title">Week 4 study brief</div>
        <div className="summary-view__meta">
          auto-generated · {readyCount} sources · 3 min read
        </div>
        <p className="summary-view__intro">
          This week's material converges on one idea: <b>learning is search through weight space, guided by gradients</b>.
          Chapter 6 gives the formal machinery, the lecture video builds visual intuition for backpropagation, and the
          arXiv paper shows where the field took it — replacing recurrence entirely with attention.
        </p>
        {SUMMARY_POINTS.map((p) => (
          <div key={p.n} className="summary-view__point">
            <span className="summary-view__point-num">
              {p.n}
            </span>
            <span className="summary-view__point-content">
              <b>{p.head}</b> — {p.body}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Audio overview ────────────────────────────────────────────────────────
function AudioOverview() {
  const dispatch = useAppDispatch()
  const playing = useAppSelector((s) => s.layout.playing)
  const progress = useAppSelector((s) => s.layout.progress)
  const sources = useAppSelector((s) => s.sources.sources)
  const readyCount = sources.filter((s) => s.status === 'indexed').length
  const totalS = 754
  const curS = Math.round((totalS * progress) / 100)
  const audioTime = `${Math.floor(curS / 60)}:${String(curS % 60).padStart(2, '0')}`

  return (
    <div className="tool-view-panel audio-view">
      <div className="audio-view__card">
        <div className="audio-view__tag">
          DEEP DIVE · TWO HOSTS
        </div>
        <div className="audio-view__title">Attention &amp; Backprop, explained over coffee</div>
        <div className="audio-view__subtitle">A conversational walkthrough of your {readyCount} ready sources.</div>
        <div className="audio-view__controls">
          <button
            onClick={() => dispatch(togglePlay())}
            className="audio-view__play-btn ml-press"
          >
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
function Timeline() {
  return (
    <div className="tool-view-panel tool-view-panel--scrollable timeline-view">
      <div className="timeline-view__container">
        {EVENTS.map((e, i) => (
          <div key={i} className="timeline-view__item">
            <div className="timeline-view__axis">
              <span className="timeline-view__axis-node" />
              <span className="timeline-view__axis-line" />
            </div>
            <div className="timeline-view__content">
              <div className="timeline-view__content-year">{e.year}</div>
              <div className="timeline-view__content-title">{e.title}</div>
              <div className="timeline-view__content-desc">{e.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
