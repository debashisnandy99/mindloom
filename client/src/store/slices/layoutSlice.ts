import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { CenterView, Point } from '../../types'

export interface LayoutState {
  centerView: CenterView
  rightW: number
  srcPct: number
  par: Point
  playing: boolean
  progress: number
}

const initialState: LayoutState = {
  centerView: 'chat',
  rightW: 356,
  srcPct: 53,
  par: { x: 0, y: 0 },
  playing: false,
  progress: 0,
}

export const layoutSlice = createSlice({
  name: 'layout',
  initialState,
  reducers: {
    setCenterView(state, action: PayloadAction<CenterView>) {
      state.centerView = state.centerView === action.payload ? 'chat' : action.payload
    },
    backToChat(state) {
      state.centerView = 'chat'
    },
    setRightW(state, action: PayloadAction<number>) {
      state.rightW = action.payload
    },
    setSrcPct(state, action: PayloadAction<number>) {
      state.srcPct = action.payload
    },
    setPar(state, action: PayloadAction<Point>) {
      state.par = action.payload
    },
    setPlaying(state, action: PayloadAction<boolean>) {
      state.playing = action.payload
    },
    setProgress(state, action: PayloadAction<number>) {
      state.progress = action.payload
    },
    resetAudio(state) {
      state.playing = false
      state.progress = 0
    },
  },
})

export const {
  setCenterView,
  backToChat,
  setRightW,
  setSrcPct,
  setPar,
  setPlaying,
  setProgress,
  resetAudio,
} = layoutSlice.actions

export default layoutSlice.reducer
