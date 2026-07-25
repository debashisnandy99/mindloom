import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { INITIAL_NOTEBOOKS } from '../../data'
import type { Notebook } from '../../types'

type NbModal = 'new' | 'edit' | null

export interface NotebooksState {
  notebooks: Notebook[]
  activeNbId: number | null
  nbMenuId: number | null
  nbConfirmId: number | null
  nbModal: NbModal
  nbEditId: number | null
  nbDraft: string
  nbDescDraft: string
}

const initialState: NotebooksState = {
  notebooks: INITIAL_NOTEBOOKS,
  activeNbId: 1,
  nbMenuId: null,
  nbConfirmId: null,
  nbModal: null,
  nbEditId: null,
  nbDraft: '',
  nbDescDraft: '',
}

export const notebooksSlice = createSlice({
  name: 'notebooks',
  initialState,
  reducers: {
    openNewNb(state) {
      state.nbModal = 'new'
      state.nbEditId = null
      state.nbDraft = ''
      state.nbDescDraft = ''
      state.nbMenuId = null
    },
    openEditNb(state, action: PayloadAction<Notebook>) {
      const nb = action.payload
      state.nbModal = 'edit'
      state.nbEditId = nb.id
      state.nbDraft = nb.title
      state.nbDescDraft = nb.desc
      state.nbMenuId = null
    },
    cancelNb(state) {
      state.nbModal = null
    },
    setNbDraft(state, action: PayloadAction<string>) {
      state.nbDraft = action.payload
    },
    setNbDescDraft(state, action: PayloadAction<string>) {
      state.nbDescDraft = action.payload
    },
    createNotebook(state, action: PayloadAction<Notebook>) {
      state.notebooks.unshift(action.payload)
      state.nbModal = null
    },
    updateNotebook(
      state,
      action: PayloadAction<{ id: number; title: string; desc: string }>,
    ) {
      const { id, title, desc } = action.payload
      const nb = state.notebooks.find((n) => n.id === id)
      if (nb) {
        if (title) nb.title = title
        if (desc) nb.desc = desc
        nb.updated = 'just now'
      }
      state.nbModal = null
    },
    openNb(state, action: PayloadAction<number>) {
      state.activeNbId = action.payload
      state.nbMenuId = null
      state.nbConfirmId = null
    },
    toggleNbMenu(state, action: PayloadAction<number>) {
      state.nbMenuId = state.nbMenuId === action.payload ? null : action.payload
      state.nbConfirmId = null
    },
    closeNbMenu(state) {
      state.nbMenuId = null
      state.nbConfirmId = null
    },
    setNbConfirmId(state, action: PayloadAction<number>) {
      state.nbConfirmId = action.payload
    },
    deleteNotebook(state, action: PayloadAction<number>) {
      const id = action.payload
      state.notebooks = state.notebooks.filter((n) => n.id !== id)
      state.nbMenuId = null
      state.nbConfirmId = null
      if (state.activeNbId === id) {
        state.activeNbId = state.notebooks[0]?.id ?? null
      }
    },
    resetNbUi(state) {
      state.nbMenuId = null
      state.nbConfirmId = null
    },
  },
})

export const {
  openNewNb,
  openEditNb,
  cancelNb,
  setNbDraft,
  setNbDescDraft,
  createNotebook,
  updateNotebook,
  openNb,
  toggleNbMenu,
  closeNbMenu,
  setNbConfirmId,
  deleteNotebook,
  resetNbUi,
} = notebooksSlice.actions

export default notebooksSlice.reducer
