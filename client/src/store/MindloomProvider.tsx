import { useEffect, type ReactNode } from 'react'
import { Provider } from 'react-redux'
import { reduxStore } from './reduxStore'
import { clearStoreTimers } from './thunks'

/** Tears down module-level timers when the app unmounts. */
function StoreBootstrap({ children }: { children: ReactNode }) {
  useEffect(() => () => clearStoreTimers(), [])
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
