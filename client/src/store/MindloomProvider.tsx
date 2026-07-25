import { useEffect, type ReactNode } from 'react'
import { Provider } from 'react-redux'
import { reduxStore, useAppDispatch } from './reduxStore'
import { bootstrapIndexing, clearStoreTimers } from './thunks'

/** Mount-time side effects that used to live in the Context facade. */
function StoreBootstrap({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(bootstrapIndexing())
    return () => clearStoreTimers()
  }, [dispatch])

  return children
}

/** Thin Redux provider — components subscribe to slices directly. */
export function MindloomProvider({ children }: { children: ReactNode }) {
  return (
    <Provider store={reduxStore}>
      <StoreBootstrap>{children}</StoreBootstrap>
    </Provider>
  )
}
