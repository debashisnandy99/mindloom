import { Link } from 'react-router-dom'
import './NotFound.scss'

/** Rendered for any path that doesn't match a defined route. */
export function NotFound() {
  return (
    <div className="not-found">
      <div>
        <div className="not-found__code">
          404
        </div>
        <h1 className="not-found__title">
          This page unraveled.
        </h1>
        <p className="not-found__description">
          The thread you followed doesn’t lead anywhere in the loom. Let’s get you back to something familiar.
        </p>
        <Link
          to="/"
          className="not-found__link ml-press"
        >
          Back to Mindloom
        </Link>
      </div>
    </div>
  )
}

export { NotFound as Component }
