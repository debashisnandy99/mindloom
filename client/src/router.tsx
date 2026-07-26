import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute.tsx'
import { RootLayout } from './pages/root-layout/RootLayout.tsx'
import { ErrorBoundary } from './pages/error-boundary/ErrorBoundary.tsx'

/** Application route tree.
 *
 *  The shell (`RootLayout`) is eager so the chrome (theme wrapper + overlays)
 *  renders immediately; each page is a lazy route module so its code is split
 *  out and only fetched when the route is visited. The root `errorElement`
 *  catches render errors from any descendant route. */
export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        lazy: () => import('./pages/landing/LandingPage.tsx'),
      },
      {
        path: 'auth',
        lazy: () => import('./pages/auth/AuthPage.tsx'),
      },
      {
        Component: ProtectedRoute,
        children: [
          {
            path: 'notebooks',
            lazy: () => import('./pages/notebooks/NotebooksPage.tsx'),
          },
          {
            path: 'workspace/:notebookId',
            lazy: () => import('./pages/workspace/WorkspacePage.tsx'),
          },
        ],
      },
      {
        path: '*',
        lazy: () => import('./pages/not-found/NotFound.tsx'),
      },
    ] satisfies RouteObject[],
  },
])

