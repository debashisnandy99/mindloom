import { ADD_TYPES, INDEXING_SECONDS, QUIZ, REPLIES } from '../data'
import type { Notebook, Source } from '../types'
import type { AppDispatch, RootState } from './reduxStore'
import { clearToast, closeProfile, setToast } from './slices/appSlice'
import { addBotMessage, addUserMessage } from './slices/chatSlice'
import { backToChat, resetAudio, setPlaying, setProgress } from './slices/layoutSlice'
import {
  createNotebook,
  deleteNotebook,
  openNb as openNbAction,
  setNbConfirmId,
  updateNotebook,
} from './slices/notebooksSlice'
import { pickOption } from './slices/quizSlice'
import {
  addSource,
  closeViewer,
  markSourceIndexed,
  selectSource,
} from './slices/sourcesSlice'

export type AppThunk<ReturnType = void> = (
  dispatch: AppDispatch,
  getState: () => RootState,
) => ReturnType

// Module-level timers — must not live in React state.
let toastTimer: ReturnType<typeof setTimeout> | null = null
let audioTimer: ReturnType<typeof setInterval> | null = null
let replyIdx = 0
let addIdx = 0
const pendingTimers: ReturnType<typeof setTimeout>[] = []

function after(ms: number, fn: () => void) {
  pendingTimers.push(setTimeout(fn, ms))
}

/** Clear every scheduled timer (used on provider unmount). */
export function clearStoreTimers() {
  pendingTimers.splice(0).forEach(clearTimeout)
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

export const scheduleIndex =
  (id: number, name: string): AppThunk =>
  (dispatch) => {
    after(INDEXING_SECONDS * 1000, () => {
      dispatch(markSourceIndexed(id))
      dispatch(showToast('"' + name + '" is indexed and ready'))
    })
  }

/** Kick off indexing timers for sources that mount already mid-index. */
export const bootstrapIndexing = (): AppThunk => (dispatch, getState) => {
  getState()
    .sources.sources.filter((s) => s.status === 'indexing')
    .forEach((s) => dispatch(scheduleIndex(s.id, s.name)))
}

export const sendMessage =
  (text: string): AppThunk =>
  (dispatch, getState) => {
    const t = (text || '').trim()
    if (!t || getState().chat.typing) return
    dispatch(addUserMessage(t))
    after(1300, () => {
      const r = REPLIES[replyIdx++ % REPLIES.length]
      dispatch(addBotMessage({ text: r.text, cites: r.cites }))
    })
  }

export const confirmAdd = (): AppThunk => (dispatch, getState) => {
  const { addOpen, addVal } = getState().sources
  if (!addOpen) return
  const def = ADD_TYPES.find((a) => a.t === addOpen)!
  const val = addVal.trim()
  let name = def.name
  if (val) {
    name =
      addOpen === 'txt'
        ? 'Pasted text — ' + val.slice(0, 26) + (val.length > 26 ? '…' : '')
        : val.replace(/^https?:\/\/(www\.)?/, '').slice(0, 46)
  }
  const id = Date.now() + addIdx++
  const src: Source = {
    id,
    type: addOpen,
    name,
    meta: def.meta,
    status: 'indexing',
    points: [
      'Key claims extracted once indexing completes',
      'Cross-references against your existing sources',
      'Available to chat, quiz and mind map when ready',
    ],
    paras: [
      'This source was just added. Mindloom is chunking, embedding and cross-linking it against your notebook\u2026',
    ],
  }
  dispatch(addSource(src))
  dispatch(scheduleIndex(id, name))
}

export const confirmNb = (): AppThunk => (dispatch, getState) => {
  const { nbModal, nbEditId, nbDraft, nbDescDraft } = getState().notebooks
  const t = nbDraft.trim()
  const d = nbDescDraft.trim()

  if (nbModal === 'edit' && nbEditId != null) {
    dispatch(updateNotebook({ id: nbEditId, title: t, desc: d }))
    dispatch(showToast('Notebook updated'))
    return
  }

  const nb: Notebook = {
    id: Date.now(),
    title: t || 'Untitled notebook',
    desc: d || 'No description yet \u2014 add sources to get started.',
    srcs: 0,
    updated: 'just now',
  }
  dispatch(createNotebook(nb))
  dispatch(showToast('Notebook created'))
}

export const deleteOrConfirmNb =
  (id: number): AppThunk =>
  (dispatch, getState) => {
    if (getState().notebooks.nbConfirmId === id) {
      dispatch(deleteNotebook(id))
      dispatch(showToast('Notebook deleted'))
    } else {
      dispatch(setNbConfirmId(id))
    }
  }

export const selectSourceOrToast =
  (s: Source): AppThunk =>
  (dispatch) => {
    if (s.status === 'indexing') dispatch(showToast('Still indexing \u2014 this source isn\u2019t ready yet'))
    else dispatch(selectSource(s.id))
  }

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

export const answerQuiz =
  (optionIdx: number): AppThunk =>
  (dispatch, getState) => {
    const { qIndex, revealed } = getState().quiz
    if (!revealed) dispatch(pickOption({ optionIdx, correct: QUIZ[qIndex].correct }))
  }

export const signOut = (): AppThunk => (dispatch) => {
  dispatch(closeProfile())
  dispatch(closeViewer())
  dispatch(backToChat())
}

export const openNb =
  (id: number): AppThunk =>
  (dispatch) => {
    dispatch(openNbAction(id))
    dispatch(closeViewer())
    dispatch(backToChat())
  }
