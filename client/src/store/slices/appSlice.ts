import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AuthMode, Theme } from '../../types'

export interface AppState {
  theme: Theme
  authMode: AuthMode
  profileOpen: boolean
  toast: string
}

const initialState: AppState = {
  theme: 'light',
  authMode: 'signin',
  profileOpen: false,
  toast: '',
}

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    toggleTheme(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark'
    },
    setAuthMode(state, action: PayloadAction<AuthMode>) {
      state.authMode = action.payload
    },
    toggleAuthMode(state) {
      state.authMode = state.authMode === 'signin' ? 'signup' : 'signin'
    },
    toggleProfile(state) {
      state.profileOpen = !state.profileOpen
    },
    closeProfile(state) {
      state.profileOpen = false
    },
    setToast(state, action: PayloadAction<string>) {
      state.toast = action.payload
    },
    clearToast(state) {
      state.toast = ''
    },
  },
})

export const {
  toggleTheme,
  setAuthMode,
  toggleAuthMode,
  toggleProfile,
  closeProfile,
  setToast,
  clearToast,
} = appSlice.actions

export default appSlice.reducer
