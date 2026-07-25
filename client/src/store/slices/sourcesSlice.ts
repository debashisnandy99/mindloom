import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { INITIAL_SOURCES } from '../../data'
import type { Source, SourceType } from '../../types'

export interface SourcesState {
  sources: Source[]
  selectedId: number | null
  addOpen: SourceType | null
  addVal: string
}

const initialState: SourcesState = {
  sources: INITIAL_SOURCES,
  selectedId: null,
  addOpen: null,
  addVal: '',
}

export const sourcesSlice = createSlice({
  name: 'sources',
  initialState,
  reducers: {
    selectSource(state, action: PayloadAction<number>) {
      state.selectedId = action.payload
    },
    closeViewer(state) {
      state.selectedId = null
    },
    openAdd(state, action: PayloadAction<SourceType>) {
      state.addOpen = action.payload
      state.addVal = ''
    },
    setAddVal(state, action: PayloadAction<string>) {
      state.addVal = action.payload
    },
    cancelAdd(state) {
      state.addOpen = null
      state.addVal = ''
    },
    addSource(state, action: PayloadAction<Source>) {
      state.sources.push(action.payload)
      state.addOpen = null
      state.addVal = ''
    },
    markSourceIndexed(state, action: PayloadAction<number>) {
      const src = state.sources.find((s) => s.id === action.payload)
      if (src) src.status = 'indexed'
    },
  },
})

export const {
  selectSource,
  closeViewer,
  openAdd,
  setAddVal,
  cancelAdd,
  addSource,
  markSourceIndexed,
} = sourcesSlice.actions

export default sourcesSlice.reducer
