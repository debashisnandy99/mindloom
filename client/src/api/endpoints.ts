import { API_BASE } from '../lib/apiClient'

/**
 * OAuth entry points are full-page redirects rather than fetch calls, so they
 * need the absolute URL; everything else is a path passed to `apiClient`.
 */
export const API_ENDPOINTS = {
  auth: {
    google: `${API_BASE}/auth/google`,
    github: `${API_BASE}/auth/github`,
    me: '/auth/me',
    logout: '/auth/logout',
    csrf: '/auth/csrf',
  },
  notebooks: {
    list: '/notebooks',
    create: '/notebooks',
    detail: (id: string) => `/notebooks/${id}`,
    events: (id: string) => `${API_BASE}/notebooks/${id}/events`,
  },
  sources: {
    list: (notebookId: string) => `/notebooks/${notebookId}/sources`,
    create: (notebookId: string) => `/notebooks/${notebookId}/sources`,
    detail: (sourceId: string) => `/sources/${sourceId}`,
    reindex: (sourceId: string) => `/sources/${sourceId}/reindex`,
  },
  tools: {
    mindmap: (notebookId: string) => `/notebooks/${notebookId}/mindmap`,
    quiz: (notebookId: string) => `/notebooks/${notebookId}/quiz`,
    conceptTable: (notebookId: string) => `/notebooks/${notebookId}/concept-table`,
    flashcards: (notebookId: string) => `/notebooks/${notebookId}/flashcards`,
    summary: (notebookId: string) => `/notebooks/${notebookId}/summary`,
    audioOverview: (notebookId: string) => `/notebooks/${notebookId}/audio-overview`,
    timeline: (notebookId: string) => `/notebooks/${notebookId}/timeline`,
  },
} as const
