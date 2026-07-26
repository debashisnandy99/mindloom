import { api } from '../lib/apiClient'
import { API_ENDPOINTS } from './endpoints'
import type { ToolGeneration } from './types'

/** Current generation status for every tool in the notebook. */
export function getToolStatus(notebookId: string) {
  return api
    .get<{ generations: ToolGeneration[] }>(API_ENDPOINTS.tools.status(notebookId))
    .then((data) => data.generations)
}

/** Manually (re)queue generation of all study tools for the notebook. */
export function regenerateTools(notebookId: string) {
  return api.post<{ notebookId: string }>(API_ENDPOINTS.tools.generate(notebookId))
}
