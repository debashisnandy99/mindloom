import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ServerSourceType } from '../../api/types'
import type { SourceType } from '../../types'

/**
 * Locator carried when the viewer was opened from a chat citation. List clicks
 * leave this null so the viewer shows a generic (non-seek) preview.
 */
export interface CitationLocator {
  sourceId: string
  sourceType: ServerSourceType
  contentUrl?: string | null
  timestamp?: string
  startSeconds?: number
  pageNumber?: number
  chunkText?: string
  label?: string
}

/**
 * The source list itself is server data (`useSources`); this slice only tracks
 * transient UI: which source is open in the viewer and the add-source form.
 */
export interface SourcesState {
  /** Id of the source open in the viewer, or null. */
  selectedId: string | null
  /** Present when the viewer was opened from a citation chip. */
  citation: CitationLocator | null
  addOpen: SourceType | null
  /** Notebook the add-source modal will create the source in. */
  addNotebookId: string | null
  addVal: string
}

const initialState: SourcesState = {
  selectedId: null,
  citation: null,
  addOpen: null,
  addNotebookId: null,
  addVal: '',
}

export const sourcesSlice = createSlice({
  name: 'sources',
  initialState,
  reducers: {
    selectSource(state, action: PayloadAction<string>) {
      state.selectedId = action.payload
      state.citation = null
    },
    openCitation(state, action: PayloadAction<CitationLocator>) {
      state.selectedId = action.payload.sourceId
      state.citation = action.payload
    },
    closeViewer(state) {
      state.selectedId = null
      state.citation = null
    },
    openAdd(state, action: PayloadAction<{ type: SourceType; notebookId: string }>) {
      state.addOpen = action.payload.type
      state.addNotebookId = action.payload.notebookId
      state.addVal = ''
    },
    setAddVal(state, action: PayloadAction<string>) {
      state.addVal = action.payload
    },
    cancelAdd(state) {
      state.addOpen = null
      state.addNotebookId = null
      state.addVal = ''
    },
  },
})

export const { selectSource, openCitation, closeViewer, openAdd, setAddVal, cancelAdd } =
  sourcesSlice.actions

export default sourcesSlice.reducer
