import { useRef, type PointerEvent } from 'react'
import { useAppDispatch, useAppSelector } from '../../store/reduxStore'
import { setRightW } from '../../store/slices/layoutSlice'
import { CenterPanel } from './components/CenterPanel'
import { SidePanel } from './components/SidePanel'
import { ToolRail } from './components/ToolRail'
import './WorkspacePage.scss'

export function WorkspacePage() {
  const dispatch = useAppDispatch()
  const rightW = useAppSelector((s) => s.layout.rightW)

  const colDrag = useRef<{ x: number; w: number } | null>(null)
  const onColDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    colDrag.current = { x: e.clientX, w: rightW }
  }
  const onColMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = colDrag.current
    if (!d) return
    const w = Math.min(620, Math.max(280, d.w - (e.clientX - d.x)))
    dispatch(setRightW(Math.round(w)))
  }
  const onColUp = () => {
    colDrag.current = null
  }

  return (
    <div
      className="workspace-page"
      style={{
        gridTemplateColumns: `92px 1fr 10px ${rightW}px`,
      }}
    >
      <ToolRail />
      <CenterPanel />
      <div
        onPointerDown={onColDown}
        onPointerMove={onColMove}
        onPointerUp={onColUp}
        title="Drag to resize"
        className="workspace-page__resizer ml-hov-accsoft"
      >
        <span className="workspace-page__resizer-handle" />
      </div>
      <SidePanel />
    </div>
  )
}

export { WorkspacePage as Component }
