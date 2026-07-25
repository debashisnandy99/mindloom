import { Icon } from '../../../components/Icon'
import { TOOL_TITLES } from '../../../data'
import { useAppDispatch, useAppSelector } from '../../../store/reduxStore'
import { backToChat } from '../../../store/slices/layoutSlice'
import { ChatView } from './ChatView'
import { ToolView } from './ToolViews'
import './CenterPanel.scss'

export function CenterPanel() {
  const dispatch = useAppDispatch()
  const centerView = useAppSelector((s) => s.layout.centerView)
  const notebooks = useAppSelector((s) => s.notebooks.notebooks)
  const activeNbId = useAppSelector((s) => s.notebooks.activeNbId)
  const sources = useAppSelector((s) => s.sources.sources)
  const isChat = centerView === 'chat'
  const ready = sources.filter((s) => s.status === 'indexed')
  const nbTitle = notebooks.find((n) => n.id === activeNbId)?.title ?? 'Untitled notebook'

  return (
    <div className="center-panel">
      <div className="center-panel__header">
        {isChat ? (
          <>
            <div className="center-panel__icon-box">
              <Icon d="M4 6c0-1.1 0.9-2 2-2h12c1.1 0 2 0.9 2 2v9c0 1.1-0.9 2-2 2H9l-5 4z" size={17} />
            </div>
            <div>
              <div className="center-panel__title">{nbTitle}</div>
              <div className="center-panel__meta">
                {ready.length} of {sources.length} sources ready · answers cite passages
              </div>
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => dispatch(backToChat())}
              className="center-panel__back-btn ml-press"
            >
              ← Chat
            </button>
            <div className="center-panel__title">{TOOL_TITLES[centerView]}</div>
            <div className="center-panel__meta center-panel__meta--tool">generated from {ready.length} sources</div>
          </>
        )}
      </div>
      {centerView === 'chat' ? <ChatView /> : <ToolView view={centerView} />}
    </div>
  )
}
