import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  addToolItem,
  deleteTool,
  removeToolItem,
  updateToolItem,
  upsertTool,
} from '../../api/tools.api'
import type { ToolName } from '../../api/types'
import { toolKeys } from '../../constants/queryKeys'

/**
 * Mutations for a single tool, bound to one notebook. Every write invalidates
 * just that tool's cache entry so the `useTool` reader refetches the fresh
 * artifact. One factory serves all seven tools.
 */
export function useToolMutations(tool: ToolName, notebookId: string) {
  const queryClient = useQueryClient()

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: toolKeys.tool(notebookId, tool) })

  const upsert = useMutation({
    mutationFn: (body: unknown) => upsertTool(tool, notebookId, body),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: () => deleteTool(tool, notebookId),
    onSuccess: invalidate,
  })

  const addItem = useMutation({
    mutationFn: (body: unknown) => addToolItem(tool, notebookId, body),
    onSuccess: invalidate,
  })

  const updateItem = useMutation({
    mutationFn: ({ itemId, body }: { itemId: string; body: unknown }) =>
      updateToolItem(tool, notebookId, itemId, body),
    onSuccess: invalidate,
  })

  const removeItem = useMutation({
    mutationFn: (itemId: string) => removeToolItem(tool, notebookId, itemId),
    onSuccess: invalidate,
  })

  return { upsert, remove, addItem, updateItem, removeItem }
}
