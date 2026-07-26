import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

/**
 * Chat messages now come from the server (`useChatHistory`) and the live
 * streaming answer hook, so the slice only holds transient composer UI state.
 */
export interface ChatState {
  draft: string
  sugIdx: number
}

const initialState: ChatState = {
  draft: '',
  sugIdx: 0,
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
    incrementSugIdx(state) {
      state.sugIdx += 1
    },
  },
})

export const { setDraft, clearDraft, incrementSugIdx } = chatSlice.actions

export default chatSlice.reducer
