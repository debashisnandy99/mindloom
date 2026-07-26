import { api } from '../lib/apiClient'
import { API_ENDPOINTS } from './endpoints'
import type { Notebook, NotebookDetail } from './types'

export interface CreateNotebookInput {
  name: string
  description?: string
}

export interface UpdateNotebookInput {
  name?: string
  description?: string
}

export function listNotebooks() {
  return api
    .get<{ notebooks: Notebook[] }>(API_ENDPOINTS.notebooks.list)
    .then((data) => data.notebooks)
}

export function getNotebook(id: string) {
  return api
    .get<{ notebook: NotebookDetail }>(API_ENDPOINTS.notebooks.detail(id))
    .then((data) => data.notebook)
}

export function createNotebook(input: CreateNotebookInput) {
  return api
    .post<{ notebook: Notebook }>(API_ENDPOINTS.notebooks.create, input)
    .then((data) => data.notebook)
}

export function updateNotebook(id: string, input: UpdateNotebookInput) {
  return api
    .patch<{ notebook: Notebook }>(API_ENDPOINTS.notebooks.detail(id), input)
    .then((data) => data.notebook)
}

export function deleteNotebook(id: string) {
  return api.delete<void>(API_ENDPOINTS.notebooks.detail(id))
}
