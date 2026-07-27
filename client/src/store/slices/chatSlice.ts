import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

/**
 * Chat messages now come from the server (`useChatHistory`) and the live
 * streaming answer hook, so the slice only holds transient composer UI state.
 */
export interface ChatState {
  draft: string
}

const initialState: ChatState = {
  draft: '',
}

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setDraft(state, action: PayloadAction<string>) {
      state.draft = action.payload
    },
    clearDraft(state) {
      state.draft = ''
    },
  },
})

export const { setDraft, clearDraft } = chatSlice.actions

export default chatSlice.reducer
