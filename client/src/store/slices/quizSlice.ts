import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface QuizState {
  qIndex: number
  picked: number
  revealed: boolean
  score: number
  quizDone: boolean
}

const initialState: QuizState = {
  qIndex: 0,
  picked: -1,
  revealed: false,
  score: 0,
  quizDone: false,
}

export const quizSlice = createSlice({
  name: 'quiz',
  initialState,
  reducers: {
    pickOption(state, action: PayloadAction<{ optionIdx: number; correct: number }>) {
      if (state.revealed) return
      const { optionIdx, correct } = action.payload
      state.picked = optionIdx
      state.revealed = true
      if (optionIdx === correct) state.score += 1
    },
    nextQuestion(state, action: PayloadAction<number>) {
      const totalQuestions = action.payload
      if (state.qIndex + 1 >= totalQuestions) {
        state.quizDone = true
      } else {
        state.qIndex += 1
        state.picked = -1
        state.revealed = false
      }
    },
    restartQuiz(state) {
      state.qIndex = 0
      state.picked = -1
      state.revealed = false
      state.score = 0
      state.quizDone = false
    },
  },
})

export const { pickOption, nextQuestion, restartQuiz } = quizSlice.actions

export default quizSlice.reducer
