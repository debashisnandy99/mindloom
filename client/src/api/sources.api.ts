import { api } from '../lib/apiClient'
import { API_ENDPOINTS } from './endpoints'
import type { CreateSourceInput, Source, SourceWithDownload } from './types'

export function listSources(notebookId: string) {
  return api
    .get<{ sources: Source[] }>(API_ENDPOINTS.sources.list(notebookId))
    .then((data) => data.sources)
}

export function getSource(sourceId: string) {
  return api.get<SourceWithDownload>(API_ENDPOINTS.sources.detail(sourceId))
}

/** Create a link/text source from a JSON body. */
export function createSource(notebookId: string, input: CreateSourceInput) {
  return api
    .post<{ source: Source }>(API_ENDPOINTS.sources.create(notebookId), input)
    .then((data) => data.source)
}

/**
 * Upload a PDF source. The browser must own the multipart `Content-Type`
 * boundary, so `isFormData` is set and no JSON header is sent.
 */
export function uploadPdfSource(notebookId: string, file: File, name?: string) {
  const form = new FormData()
  form.append('file', file)
  if (name) form.append('name', name)

  return api
    .post<{ source: Source }>(API_ENDPOINTS.sources.create(notebookId), form, {
      isFormData: true,
    })
    .then((data) => data.source)
}

export function reindexSource(sourceId: string) {
  return api.post<{ sourceId: string }>(API_ENDPOINTS.sources.reindex(sourceId))
}

export function deleteSource(sourceId: string) {
  return api.delete<void>(API_ENDPOINTS.sources.detail(sourceId))
}
