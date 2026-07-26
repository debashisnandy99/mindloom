/** Public hooks surface: queries, mutations, and the SSE listener. */

// Queries (reads)
export { useSession } from './queries/useSession'
export { useNotebooks, useNotebook } from './queries/useNotebooks'
export { useSources, useSource } from './queries/useSources'
export { useTool } from './queries/useTool'
export { useChatHistory } from './queries/useChatHistory'

// Mutations (writes)
export { useLogout } from './mutations/useLogout'
export { useOAuthSignIn } from './mutations/useOAuthSignIn'
export {
  useCreateNotebook,
  useUpdateNotebook,
  useDeleteNotebook,
} from './mutations/useNotebookMutations'
export {
  useCreateSource,
  useUploadPdfSource,
  useReindexSource,
  useDeleteSource,
} from './mutations/useSourceMutations'
export { useToolMutations } from './mutations/useToolMutations'
export {
  useAskQuery,
  useSearchChunks,
  useDeleteQuery,
} from './mutations/useQueryMutations'

// Server-Sent Events
export { useNotebookEvents } from './events/useNotebookEvents'
export type {
  UseNotebookEventsOptions,
  UseNotebookEventsResult,
} from './events/useNotebookEvents'
