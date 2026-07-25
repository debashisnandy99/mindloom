import { useEffect, type MouseEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { OAuthProvider } from '../../api/auth.api'
import { Icon } from '../../components/Icon'
import { useMindloomNavigation } from '../../hooks/useMindloomNavigation'
import { useOAuthSignIn } from '../../hooks/mutations/useOAuthSignIn'
import { useSession } from '../../hooks/queries/useSession'
import { useAppDispatch, useAppSelector } from '../../store/reduxStore'
import { toggleAuthMode } from '../../store/slices/appSlice'
import './AuthPage.scss'

const OAUTH_ERRORS: Record<string, string> = {
  oauth_failed: 'We could not complete that sign-in. Please try again.',
}

export function AuthPage() {
  const dispatch = useAppDispatch()
  const authMode = useAppSelector((s) => s.app.authMode)
  const { enterApp, goLanding } = useMindloomNavigation()
  const { isAuthenticated, isLoading } = useSession()
  const signInWith = useOAuthSignIn()
  const [searchParams] = useSearchParams()

  const signin = authMode === 'signin'
  const errorMessage = OAUTH_ERRORS[searchParams.get('error') ?? '']

  // Landing here with a live session (e.g. via the back button) should not
  // strand the user on the sign-in screen.
  useEffect(() => {
    if (isAuthenticated) enterApp()
  }, [isAuthenticated, enterApp])

  const onSwitch = (e: MouseEvent) => {
    e.preventDefault()
    dispatch(toggleAuthMode())
  }

  return (
    <div className="auth-page">
      <div className="auth-page__card">
        <div className="auth-page__header">
          <div className="auth-page__icon">
            <Icon d="M4 9h16M4 15h16M9 4v16M15 4v16" size={26} sw={2.2} />
          </div>
          <div className="auth-page__title-group">
            <div className="auth-page__title">
              {signin ? 'Sign in to Mindloom' : 'Create your Mindloom account'}
            </div>
            <div className="auth-page__subtitle">
              {signin ? 'Welcome back — your notebooks are waiting.' : 'Free for students and researchers. No card needed.'}
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="auth-page__error" role="alert">
            {errorMessage}
          </div>
        )}

        <div className="auth-page__social-group">
          <OAuthButton
            badge="G"
            badgeSize={12}
            provider="google"
            disabled={isLoading}
            onClick={signInWith}
          >
            Continue with Google
          </OAuthButton>
          <OAuthButton
            badge="gh"
            badgeSize={11}
            provider="github"
            disabled={isLoading}
            onClick={signInWith}
          >
            Continue with GitHub
          </OAuthButton>
        </div>

        <div className="auth-page__divider">
          <div className="auth-page__divider-line" />
          or
          <div className="auth-page__divider-line" />
        </div>

        <div className="auth-page__form">
          <input placeholder="Email address" className="auth-page__input" disabled />
          <input placeholder="Password" type="password" className="auth-page__input" disabled />
          <button type="button" className="auth-page__submit" disabled>
            {signin ? 'Continue' : 'Sign up'}
          </button>
          <div className="auth-page__form-note">
            Email sign-in is coming soon — use Google or GitHub for now.
          </div>
        </div>

        <div className="auth-page__switch">
          {signin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <a href="#" onClick={onSwitch}>
            {signin ? 'Sign up' : 'Sign in'}
          </a>
        </div>
      </div>

      <a href="#" onClick={(e) => { e.preventDefault(); goLanding() }} className="auth-page__back-link">
        ← Back to mindloom.app
      </a>
    </div>
  )
}

function OAuthButton({
  badge,
  badgeSize,
  provider,
  disabled,
  onClick,
  children,
}: {
  badge: string
  badgeSize: number
  provider: OAuthProvider
  disabled?: boolean
  onClick: (provider: OAuthProvider) => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(provider)}
      disabled={disabled}
      className="auth-page__oauth-button ml-press"
    >
      <span
        className="auth-page__oauth-button--badge"
        style={{ fontSize: badgeSize }}
      >
        {badge}
      </span>
      {children}
    </button>
  )
}

export { AuthPage as Component }
