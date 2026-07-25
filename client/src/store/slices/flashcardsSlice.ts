import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { FLASH } from '../../data'

export interface FlashcardsState {
  fcIndex: number
  flipped: boolean
}

const initialState: FlashcardsState = {
  fcIndex: 0,
  flipped: false,
}

export const flashcardsSlice = createSlice({
  name: 'flashcards',
  initialState,
  reducers: {
    flip(state) {
      state.flipped = !state.flipped
    },
    prevFc(state) {
      state.fcIndex = (state.fcIndex - 1 + FLASH.length) % FLASH.length
      state.flipped = false
    },
    nextFc(state) {
      state.fcIndex = (state.fcIndex + 1) % FLASH.length
      state.flipped = false
    },
    goToFc(state, action: PayloadAction<number>) {
      state.fcIndex = action.payload
      state.flipped = false
    },
  },
})

export const { flip, prevFc, nextFc, goToFc } = flashcardsSlice.actions

export default flashcardsSlice.reducer
