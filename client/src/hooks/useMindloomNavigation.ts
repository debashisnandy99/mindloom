import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '../store/reduxStore'
import { closeProfile, setAuthMode } from '../store/slices/appSlice'
import { resetNbUi } from '../store/slices/notebooksSlice'
import { openNb, signOut } from '../store/thunks'

/** URL navigation with the UI-state cleanup required by each route transition. */
export function useMindloomNavigation() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const goLanding = useCallback(() => navigate('/'), [navigate])

  const goSignIn = useCallback(() => {
    dispatch(setAuthMode('signin'))
    navigate('/auth')
  }, [dispatch, navigate])

  const goSignUp = useCallback(() => {
    dispatch(setAuthMode('signup'))
    navigate('/auth')
  }, [dispatch, navigate])

  const enterApp = useCallback(() => navigate('/notebooks'), [navigate])

  const goNotebooks = useCallback(() => {
    dispatch(closeProfile())
    dispatch(resetNbUi())
    navigate('/notebooks')
  }, [dispatch, navigate])

  const openNotebook = useCallback(
    (id: number) => {
      dispatch(openNb(id))
      navigate('/workspace')
    },
    [dispatch, navigate],
  )

  const signOutAndReturnHome = useCallback(() => {
    dispatch(signOut())
    navigate('/')
  }, [dispatch, navigate])

  return { goLanding, goSignIn, goSignUp, enterApp, goNotebooks, openNotebook, signOutAndReturnHome }
}
