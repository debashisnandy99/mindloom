import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSession } from '../hooks/queries/useSession'

/**
 * Blocks the app routes until the session resolves. Rendering nothing while
 * loading avoids a flash of the sign-in page for an already-authenticated user.
 */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useSession()
  const location = useLocation()

  if (isLoading) return null

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
