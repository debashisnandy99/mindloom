import { useRef, type PointerEvent } from 'react'
import { Icon } from '../../../components/Icon'
import { ADD_TYPES, ICONS } from '../../../data'
import { useAppDispatch, useAppSelector } from '../../../store/reduxStore'
import { setSrcPct } from '../../../store/slices/layoutSlice'
import { closeViewer, openAdd } from '../../../store/slices/sourcesSlice'
import { selectSourceOrToast } from '../../../store/thunks'
import './SidePanel.scss'

export function SidePanel() {
  const dispatch = useAppDispatch()
  const sources = useAppSelector((s) => s.sources.sources)
  const selectedId = useAppSelector((s) => s.sources.selectedId)
  const srcPct = useAppSelector((s) => s.layout.srcPct)
  const ready = sources.filter((s) => s.status === 'indexed')
  const sel = sources.find((s) => s.id === selectedId) ?? null
  const hasViewer = !!sel && sel.status === 'indexed'

  const rowDrag = useRef<{ y: number; pct: number; h: number } | null>(null)
  const onRowDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const h = e.currentTarget.parentElement?.getBoundingClientRect().height ?? 1
    rowDrag.current = { y: e.clientY, pct: srcPct, h }
  }
  const onRowMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = rowDrag.current
    if (!d) return
    const pct = Math.min(72, Math.max(22, d.pct + ((e.clientY - d.y) / d.h) * 100))
    dispatch(setSrcPct(Math.round(pct * 10) / 10))
  }
  const onRowUp = () => {
    rowDrag.current = null
  }

  return (
    <div className="side-panel">
      {/* Sources card */}
      <div
        className="side-panel__card"
        style={{ flex: hasViewer ? `0 0 ${srcPct}%` : '1 1 auto' }}
      >
        <div className="side-panel__header">
          <div className="side-panel__title">Sources</div>
          <span className="side-panel__badge">
            {ready.length}/{sources.length} ready
          </span>
          <div className="side-panel__spacer" />
        </div>

        <div className="side-panel__add-row">
          <span className="side-panel__add-row-label">ADD</span>
          {ADD_TYPES.map((a) => {
            const ic = ICONS[a.t]
            return (
              <button
                key={a.t}
                onClick={() => dispatch(openAdd(a.t))}
                title={a.label}
                className="side-panel__add-btn ml-add-btn"
              >
                <Icon d={ic.d} d2={ic.d2} size={15} sw={1.9} />
              </button>
            )
          })}
        </div>

        <div className="side-panel__list">
          {sources.map((s) => {
            const ic = ICONS[s.type]
            const indexing = s.status === 'indexing'
            const selected = s.id === selectedId
            return (
              <div
                key={s.id}
                onClick={() => dispatch(selectSourceOrToast(s))}
                title={indexing ? 'Still indexing — not ready to query yet' : 'Open source details'}
                className={`side-panel__item ${selected ? 'side-panel__item--selected' : 'side-panel__item--unselected'} ${indexing ? 'side-panel__item--indexing' : 'side-panel__item--ready'}`}
              >
                <div className={`side-panel__item-icon ${indexing ? 'side-panel__item-icon--indexing' : ''}`}>
                  <Icon d={ic.d} d2={ic.d2} size={16} sw={1.9} />
                </div>
                <div className="side-panel__item-details">
                  <div className="side-panel__item-name">{s.name}</div>
                  <div className="side-panel__item-meta">{s.meta}</div>
                </div>
                {indexing ? (
                  <span className="side-panel__item-status-indexing">
                    <span className="side-panel__item-status-indexing-pulse" />
                    Indexing…
                  </span>
                ) : (
                  <span title="Indexed — ready to query" className="side-panel__item-status-ready">
                    <Icon d="M5 13l4 4L19 7" size={11} sw={3} />
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Source viewer */}
      {hasViewer && sel && (
        <>
          <div
            onPointerDown={onRowDown}
            onPointerMove={onRowMove}
            onPointerUp={onRowUp}
            title="Drag to resize"
            className="side-panel__resizer ml-hov-accsoft"
          >
            <span className="side-panel__resizer-handle" />
          </div>
          <div className="side-panel__card side-panel__card--viewer">
            <div className="side-panel__header">
              <div className="side-panel__viewer-icon">
                <Icon d={ICONS[sel.type].d} d2={ICONS[sel.type].d2} size={15} sw={1.9} />
              </div>
              <div className="side-panel__spacer">
                <div className="side-panel__title side-panel__title--viewer">{sel.name}</div>
                <div className="side-panel__viewer-meta">● indexed · {sel.meta}</div>
              </div>
              <button
                onClick={() => dispatch(closeViewer())}
                title="Close"
                className="side-panel__viewer-close ml-hov-red ml-press"
              >
                <Icon d="M6 6l12 12M18 6L6 18" size={13} sw={2.4} />
              </button>
            </div>
            <div className="side-panel__viewer-content">
              <div className="side-panel__viewer-section-title">KEY POINTS</div>
              {sel.points.map((p, i) => (
                <div key={i} className="side-panel__viewer-point">
                  <span className="side-panel__viewer-point-bullet">·</span>
                  <span>{p}</span>
                </div>
              ))}
              <div className="side-panel__viewer-section-title side-panel__viewer-section-title--excerpt">EXCERPT</div>
              {sel.paras.map((p, i) => (
                <p key={i} className="side-panel__viewer-paragraph">
                  {p}
                </p>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
