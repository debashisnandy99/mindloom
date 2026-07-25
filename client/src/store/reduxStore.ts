import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import appReducer from './slices/appSlice'
import chatReducer from './slices/chatSlice'
import sourcesReducer from './slices/sourcesSlice'
import notebooksReducer from './slices/notebooksSlice'
import quizReducer from './slices/quizSlice'
import flashcardsReducer from './slices/flashcardsSlice'
import layoutReducer from './slices/layoutSlice'

export const reduxStore = configureStore({
  reducer: {
    app: appReducer,
    chat: chatReducer,
    sources: sourcesReducer,
    notebooks: notebooksReducer,
    quiz: quizReducer,
    flashcards: flashcardsReducer,
    layout: layoutReducer,
  },
})

export type RootState = ReturnType<typeof reduxStore.getState>
export type AppDispatch = typeof reduxStore.dispatch

/** Typed version of `useDispatch` — use this throughout the app instead of plain `useDispatch`. */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()

/** Typed version of `useSelector` — use this throughout the app instead of plain `useSelector`. */
export const useAppSelector = useSelector.withTypes<RootState>()
