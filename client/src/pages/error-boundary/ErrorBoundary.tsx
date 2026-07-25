import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import './ErrorBoundary.scss'

/** Top-level error boundary for the router. Rendered via the root route's
 *  `errorElement` when any descendant route throws or fails to load. */
export function ErrorBoundary() {
  const error = useRouteError()

  const title = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText || ''}`.trim()
    : 'Something went wrong'
  const message = isRouteErrorResponse(error)
    ? typeof error.data === 'string'
      ? error.data
      : (error.data as { message?: string } | null)?.message || 'This route could not be loaded.'
    : error instanceof Error
      ? error.message
      : 'An unexpected error occurred while rendering this page.'

  return (
    <div className="error-boundary">
      <div className="error-boundary__card">
        <div className="error-boundary__code">
          {title || 'ERROR'}
        </div>
        <h1 className="error-boundary__title">
          A thread snapped.
        </h1>
        <p className="error-boundary__message">{message}</p>
        <button
          type="button"
          onClick={() => window.location.assign('/')}
          className="error-boundary__button ml-press"
        >
          Back to Mindloom
        </button>
      </div>
    </div>
  )
}
