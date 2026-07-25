import type { PointerEvent } from 'react'
import { Icon } from '../../components/Icon'
import { LogoMark } from '../../components/LogoMark'
import { ThemeToggle } from '../../components/ThemeToggle'
import { useMindloomNavigation } from '../../hooks/useMindloomNavigation'
import { FEATURES, FLOATS, ICONS } from '../../data'
import { useAppDispatch, useAppSelector } from '../../store/reduxStore'
import { setPar } from '../../store/slices/layoutSlice'
import './LandingPage.scss'

export function LandingPage() {
  const dispatch = useAppDispatch()
  const par = useAppSelector((s) => s.layout.par)
  const { enterApp, goSignIn, goSignUp } = useMindloomNavigation()

  const onHeroMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    dispatch(
      setPar({
        x: ((e.clientX - r.left) / r.width - 0.5) * 2,
        y: ((e.clientY - r.top) / r.height - 0.5) * 2,
      }),
    )
  }

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-page__header">
        <div className="landing-page__header--brand">
          <LogoMark />
          <div className="landing-page__header--title">Mindloom</div>
        </div>
        <div className="landing-page__header--spacer" />
        <ThemeToggle />
        <button
          onClick={goSignIn}
          className="landing-page__header--btn-signin ml-hov-acc ml-press"
        >
          Sign in
        </button>
        <button
          onClick={goSignUp}
          className="landing-page__header--btn-getstarted ml-press"
        >
          Get started
        </button>
      </header>

      {/* Hero */}
      <div onPointerMove={onHeroMove} className="landing-page__hero">
        {FLOATS.map((f, i) => {
          const ic = ICONS[f.t]
          return (
            <div
              key={i}
              className="landing-page__hero--float"
              style={{
                left: f.x,
                top: f.y,
                width: f.size,
                height: f.size,
                borderRadius: Math.round(f.size * 0.32),
                transform: `translate(${(-par.x * f.depth).toFixed(1)}px,${(-par.y * f.depth).toFixed(1)}px)`,
              }}
            >
              <Icon d={ic.d} d2={ic.d2} size={20} sw={1.9} />
            </div>
          )
        })}

        <div className="landing-page__hero--badge">
          <span className="landing-page__hero--badge-dot" /> AI NOTEBOOK FOR DEEP WORK
        </div>
        <h1 className="landing-page__hero--title">
          Your sources,{' '}
          <span className="landing-page__hero--title-accent">
            woven into understanding.
          </span>
        </h1>
        <p className="landing-page__hero--subtitle">
          Drop in papers, lectures, and links. Mindloom reads everything, answers with citations, and spins your material
          into mind maps, quizzes, and study briefs.
        </p>
        <div className="landing-page__hero--actions">
          <button
            onClick={goSignUp}
            className="landing-page__hero--btn-primary ml-lift ml-press-flat"
          >
            Start weaving — it's free
          </button>
          <button
            onClick={enterApp}
            className="landing-page__hero--btn-secondary ml-hov-acc ml-press"
          >
            Try the live demo
          </button>
        </div>
      </div>

      <PreviewPanel />

      {/* Feature cards */}
      <div className="landing-page__features">
        {FEATURES.map((f, i) => (
          <div key={i} className="landing-page__features--card">
            <div className="landing-page__features--icon">
              <Icon d={f.d} d2={f.d2} size={20} />
            </div>
            <div className="landing-page__features--title">{f.title}</div>
            <div className="landing-page__features--copy">{f.copy}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="landing-page__footer">
        <div className="landing-page__footer--copyright">© 2026 Mindloom</div>
        <div className="landing-page__footer--links">
          <a href="#">
            Privacy
          </a>
          <a href="#">
            Terms
          </a>
          <a href="#">
            Contact
          </a>
        </div>
      </footer>
    </div>
  )
}

/** The static "product shot" between the hero and the feature grid. */
function PreviewPanel() {
  return (
    <div className="preview-panel">
      {/* Sources */}
      <div className="preview-panel__column">
        <div className="preview-panel__label">SOURCES</div>
        <div className="preview-panel__sources-list">
          <div className="preview-panel__source-item">
            <span className="preview-panel__source-item--dot-green" />
            attention.pdf
          </div>
          <div className="preview-panel__source-item">
            <span className="preview-panel__source-item--dot-amber" />
            lecture-12.mp4
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="preview-panel__column preview-panel__column--chat">
        <div className="preview-panel__label">CHAT</div>
        <div className="preview-panel__chat-user">
          What is self-attention?
        </div>
        <div className="preview-panel__chat-bot">
          A soft lookup over every token — each word decides what to read.{' '}
          <span className="preview-panel__chat-bot--cite">[1]</span>
        </div>
      </div>

      {/* Mind map */}
      <div className="preview-panel__column preview-panel__column--mindmap">
        <div className="preview-panel__label">MIND MAP</div>
        <div className="preview-panel__mindmap-root">
          Attention
        </div>
        <div className="preview-panel__mindmap-node1">
          Queries
        </div>
        <div className="preview-panel__mindmap-node2">
          Softmax
        </div>
      </div>
    </div>
  )
}

export { LandingPage as Component }
