/**
 * Query key factories. Keeping keys in one place makes invalidation
 * predictable: invalidating a parent key also matches its children.
 */
export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
}

export const notebookKeys = {
  all: ['notebooks'] as const,
  lists: () => [...notebookKeys.all, 'list'] as const,
  detail: (id: string) => [...notebookKeys.all, 'detail', id] as const,
}

export const sourceKeys = {
  all: ['sources'] as const,
  list: (notebookId: string) => [...sourceKeys.all, 'list', notebookId] as const,
  detail: (sourceId: string) => [...sourceKeys.all, 'detail', sourceId] as const,
}

export const toolKeys = {
  all: ['tools'] as const,
  tool: (notebookId: string, tool: string) => [...toolKeys.all, notebookId, tool] as const,
}
