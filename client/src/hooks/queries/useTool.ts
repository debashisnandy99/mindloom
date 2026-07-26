import { useQuery } from '@tanstack/react-query'
import { getTool } from '../../api/tools.api'
import type { ToolArtifactMap, ToolName } from '../../api/types'
import { toolKeys } from '../../constants/queryKeys'

/**
 * Read a notebook's tool artifact (mind map, quiz, …). Resolves to `null` when
 * the tool has not been generated yet — that is a valid empty state, not an
 * error. One generic hook serves all seven tools.
 */
export function useTool<T extends ToolName>(tool: T, notebookId: string | undefined) {
  return useQuery<ToolArtifactMap[T] | null>({
    queryKey: toolKeys.tool(notebookId ?? '', tool),
    queryFn: () => getTool(tool, notebookId as string),
    enabled: Boolean(notebookId),
  })
}
