import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface FlashcardsState {
  fcIndex: number
  flipped: boolean
}

const initialState: FlashcardsState = {
  fcIndex: 0,
  flipped: false,
}

/** Navigation clamps against the real deck length, passed in by the view. */
export const flashcardsSlice = createSlice({
  name: 'flashcards',
  initialState,
  reducers: {
    flip(state) {
      state.flipped = !state.flipped
    },
    prevFc(state, action: PayloadAction<number>) {
      const total = action.payload
      if (total <= 0) return
      state.fcIndex = (state.fcIndex - 1 + total) % total
      state.flipped = false
    },
    nextFc(state, action: PayloadAction<number>) {
      const total = action.payload
      if (total <= 0) return
      state.fcIndex = (state.fcIndex + 1) % total
      state.flipped = false
    },
    resetFc(state) {
      state.fcIndex = 0
      state.flipped = false
    },
  },
})

export const { flip, prevFc, nextFc, resetFc } = flashcardsSlice.actions

export default flashcardsSlice.reducer
