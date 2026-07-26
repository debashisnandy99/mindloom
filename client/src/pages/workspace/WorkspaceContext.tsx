import { createContext, useContext } from 'react'

/** The notebook id the whole workspace subtree operates on. */
export const WorkspaceContext = createContext<string | null>(null)

/** Read the active notebook id. Throws if used outside the workspace tree. */
export function useNotebookId(): string {
  const id = useContext(WorkspaceContext)
  if (!id) throw new Error('useNotebookId must be used within a WorkspacePage')
  return id
}
