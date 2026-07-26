import type { AppDispatch, RootState } from './reduxStore'
import { clearToast, closeProfile, setToast } from './slices/appSlice'
import { backToChat, resetAudio, setPlaying, setProgress } from './slices/layoutSlice'
import { closeViewer } from './slices/sourcesSlice'

export type AppThunk<ReturnType = void> = (
  dispatch: AppDispatch,
  getState: () => RootState,
) => ReturnType

// Module-level timers — must not live in React state.
let toastTimer: ReturnType<typeof setTimeout> | null = null
let audioTimer: ReturnType<typeof setInterval> | null = null

/** Clear every scheduled timer (used on provider unmount). */
export function clearStoreTimers() {
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = null
  if (audioTimer) clearInterval(audioTimer)
  audioTimer = null
}

export const showToast =
  (msg: string): AppThunk =>
  (dispatch) => {
    dispatch(setToast(msg))
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => dispatch(clearToast()), 2600)
  }

/** Reset transient workspace UI when the user signs out. */
export const signOut = (): AppThunk => (dispatch) => {
  dispatch(closeProfile())
  dispatch(closeViewer())
  dispatch(backToChat())
}

/** Audio overview is a local playback placeholder (no generated audio yet). */
export const togglePlay = (): AppThunk => (dispatch, getState) => {
  if (getState().layout.playing) {
    if (audioTimer) clearInterval(audioTimer)
    audioTimer = null
    dispatch(setPlaying(false))
    return
  }
  dispatch(setPlaying(true))
  audioTimer = setInterval(() => {
    const { progress } = getState().layout
    const next = progress + 0.18
    if (next >= 100) {
      if (audioTimer) clearInterval(audioTimer)
      audioTimer = null
      dispatch(resetAudio())
    } else {
      dispatch(setProgress(next))
    }
  }, 100)
}
