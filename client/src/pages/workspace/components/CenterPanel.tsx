import { Icon } from '../../../components/Icon'
import { TOOL_TITLES } from '../../../data'
import { useNotebook } from '../../../hooks/queries/useNotebooks'
import { useSources } from '../../../hooks/queries/useSources'
import { useAppDispatch, useAppSelector } from '../../../store/reduxStore'
import { backToChat } from '../../../store/slices/layoutSlice'
import { useNotebookId } from '../WorkspaceContext'
import { ChatView } from './ChatView'
import { ToolView } from './ToolViews'
import './CenterPanel.scss'

export function CenterPanel() {
  const notebookId = useNotebookId()
  const dispatch = useAppDispatch()
  const centerView = useAppSelector((s) => s.layout.centerView)
  const { data: notebook } = useNotebook(notebookId)
  const { data: sources = [] } = useSources(notebookId)

  const isChat = centerView === 'chat'
  const ready = sources.filter((s) => s.status === 'INDEXED')
  const nbTitle = notebook?.name ?? 'Notebook'

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
            <div className="center-panel__meta center-panel__meta--tool">
              generated from {ready.length} {ready.length === 1 ? 'source' : 'sources'}
            </div>
          </>
        )}
      </div>
      {isChat ? <ChatView /> : <ToolView view={centerView} />}
    </div>
  )
}
