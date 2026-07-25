import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { INITIAL_MESSAGE } from '../../data'
import type { ChatMessage } from '../../types'

export interface ChatState {
  draft: string
  typing: boolean
  sugIdx: number
  messages: ChatMessage[]
}

const initialState: ChatState = {
  draft: '',
  typing: false,
  sugIdx: 0,
  messages: [INITIAL_MESSAGE],
}

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setDraft(state, action: PayloadAction<string>) {
      state.draft = action.payload
    },
    setTyping(state, action: PayloadAction<boolean>) {
      state.typing = action.payload
    },
    addUserMessage(state, action: PayloadAction<string>) {
      state.messages.push({ role: 'user', text: action.payload })
      state.draft = ''
      state.typing = true
    },
    addBotMessage(state, action: PayloadAction<{ text: string; cites?: number[] }>) {
      state.messages.push({ role: 'bot', text: action.payload.text, cites: action.payload.cites })
      state.typing = false
      state.sugIdx += 1
    },
    incrementSugIdx(state) {
      state.sugIdx += 1
    },
  },
})

export const { setDraft, setTyping, addUserMessage, addBotMessage, incrementSugIdx } = chatSlice.actions

export default chatSlice.reducer
