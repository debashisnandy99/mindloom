import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

/**
 * The notebook list is server data (`useNotebooks`). This slice only holds the
 * transient UI for the notebooks page: the create/edit modal and the per-card
 * options menu / delete confirmation.
 */
type NbModal = 'new' | 'edit' | null

export interface EditingNotebook {
  id: string
  name: string
  description: string
}

export interface NotebooksState {
  nbMenuId: string | null
  nbConfirmId: string | null
  nbModal: NbModal
  nbEditId: string | null
  nbDraft: string
  nbDescDraft: string
}

const initialState: NotebooksState = {
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
    openEditNb(state, action: PayloadAction<EditingNotebook>) {
      const nb = action.payload
      state.nbModal = 'edit'
      state.nbEditId = nb.id
      state.nbDraft = nb.name
      state.nbDescDraft = nb.description
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
    closeNbModal(state) {
      state.nbModal = null
    },
    toggleNbMenu(state, action: PayloadAction<string>) {
      state.nbMenuId = state.nbMenuId === action.payload ? null : action.payload
      state.nbConfirmId = null
    },
    closeNbMenu(state) {
      state.nbMenuId = null
      state.nbConfirmId = null
    },
    setNbConfirmId(state, action: PayloadAction<string>) {
      state.nbConfirmId = action.payload
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
  closeNbModal,
  toggleNbMenu,
  closeNbMenu,
  setNbConfirmId,
  resetNbUi,
} = notebooksSlice.actions

export default notebooksSlice.reducer
