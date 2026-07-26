import { useQuery } from '@tanstack/react-query'
import { getToolStatus } from '../../api/generation.api'
import {
  GENERATED_TOOLS,
  type GeneratedToolName,
  type ToolGeneration,
} from '../../api/types'
import { toolKeys } from '../../constants/queryKeys'

/**
 * Reads the per-tool generation status for a notebook. The initial values come
 * from the status endpoint; after that the `useNotebookEvents` SSE stream keeps
 * this same cache entry live, so a mounted component sees progress in realtime.
 */
export function useToolStatus(notebookId: string | undefined) {
  return useQuery<ToolGeneration[]>({
    queryKey: toolKeys.status(notebookId ?? ''),
    queryFn: () => getToolStatus(notebookId as string),
    enabled: Boolean(notebookId),
    // SSE mutates this cache directly; don't clobber live progress with refetches.
    staleTime: 60_000,
  })
}

/** Convenience selector: the generation row for one tool, if any. */
export function useToolGeneration(
  notebookId: string | undefined,
  tool: GeneratedToolName,
): ToolGeneration | undefined {
  const { data } = useToolStatus(notebookId)
  return data?.find((g) => g.kind === GENERATED_TOOLS[tool])
}
