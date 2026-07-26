import type { ReactNode } from 'react'
import type { GeneratedToolName, ToolArtifactMap, ToolGeneration } from '../../../api/types'
import { useTool } from '../../../hooks/queries/useTool'
import { useToolGeneration } from '../../../hooks/queries/useToolGeneration'
import { useRegenerateTools } from '../../../hooks/mutations/useRegenerateTools'
import { useNotebookId } from '../WorkspaceContext'
import './ToolShell.scss'

/** Live progress bar shown while an artifact is being generated. */
function ToolProgress({ gen }: { gen: ToolGeneration }) {
  return (
    <div className="tool-view-panel tool-shell tool-shell--center">
      <div className="tool-shell__spinner" />
      <div className="tool-shell__title">Generating…</div>
      <div className="tool-shell__message">{gen.message || 'Working through your sources'}</div>
      <div className="tool-shell__bar">
        <div className="tool-shell__bar-fill" style={{ width: `${Math.max(5, gen.progress)}%` }} />
      </div>
      <div className="tool-shell__pct">{gen.progress}%</div>
    </div>
  )
}

function ToolEmpty({
  onGenerate,
  pending,
}: {
  onGenerate: () => void
  pending: boolean
}) {
  return (
    <div className="tool-view-panel tool-shell tool-shell--center">
      <div className="tool-shell__title">Not generated yet</div>
      <div className="tool-shell__message">
        Add sources and this is built automatically — or generate it now from your
        indexed sources.
      </div>
      <button className="tool-shell__btn ml-press" onClick={onGenerate} disabled={pending}>
        {pending ? 'Queuing…' : 'Generate now'}
      </button>
    </div>
  )
}

function ToolError({
  message,
  onRetry,
  pending,
}: {
  message?: string | null
  onRetry: () => void
  pending: boolean
}) {
  return (
    <div className="tool-view-panel tool-shell tool-shell--center">
      <div className="tool-shell__title tool-shell__title--error">Generation failed</div>
      <div className="tool-shell__message">{message || 'Something went wrong while generating.'}</div>
      <button className="tool-shell__btn ml-press" onClick={onRetry} disabled={pending}>
        {pending ? 'Retrying…' : 'Try again'}
      </button>
    </div>
  )
}

/**
 * Wraps a tool view with its data + generation lifecycle. Renders a progress
 * bar while the LLM is working, an empty/error state otherwise, and hands the
 * finished artifact to `render` once it exists. One shell serves all six tools.
 */
export function ToolShell<T extends GeneratedToolName>({
  tool,
  render,
}: {
  tool: T
  render: (artifact: ToolArtifactMap[T]) => ReactNode
}) {
  const notebookId = useNotebookId()
  const { data: artifact, isLoading } = useTool(tool, notebookId)
  const gen = useToolGeneration(notebookId, tool)
  const regenerate = useRegenerateTools(notebookId)

  const generating = gen?.status === 'QUEUED' || gen?.status === 'PROCESSING'

  // Show progress whenever generation is active, even if a stale artifact
  // exists — the user asked for a fresh one.
  if (generating) return <ToolProgress gen={gen} />
  if (artifact) return <>{render(artifact)}</>
  if (isLoading) {
    return (
      <div className="tool-view-panel tool-shell tool-shell--center">
        <div className="tool-shell__spinner" />
      </div>
    )
  }
  if (gen?.status === 'FAILED') {
    return (
      <ToolError
        message={gen.error}
        onRetry={() => regenerate.mutate()}
        pending={regenerate.isPending}
      />
    )
  }
  return <ToolEmpty onGenerate={() => regenerate.mutate()} pending={regenerate.isPending} />
}
