import { Icon } from '../../../components/Icon'
import { useSession } from '../../../hooks/queries/useSession'
import { useMindloomNavigation } from '../../../hooks/useMindloomNavigation'
import { TOOLS } from '../../../data'
import { useAppDispatch, useAppSelector } from '../../../store/reduxStore'
import { toggleProfile, toggleTheme } from '../../../store/slices/appSlice'
import { setCenterView } from '../../../store/slices/layoutSlice'
import './ToolRail.scss'

export function ToolRail() {
  const dispatch = useAppDispatch()
  const theme = useAppSelector((s) => s.app.theme)
  const view = useAppSelector((s) => s.layout.centerView)
  const { goNotebooks } = useMindloomNavigation()
  const { session } = useSession()
  const dark = theme === 'dark'
  const displayName = session?.user.name ?? ''
  const initials =
    displayName
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '—'
  const themeIconD = dark
    ? 'M12 2v3M12 19v3M2 12h3M19 12h3M4.6 4.6l2 2M17.4 17.4l2 2M19.4 4.6l-2 2M6.6 17.4l-2 2M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8'
    : 'M20 13.2A8 8 0 1 1 10.8 4a6.4 6.4 0 0 0 9.2 9.2z'

  return (
    <div className="tool-rail">
      <div
        onClick={goNotebooks}
        title="All notebooks"
        className="tool-rail__logo"
      >
        <Icon d="M4 9h16M4 15h16M9 4v16M15 4v16" size={21} sw={2.2} />
      </div>
      <div className="tool-rail__section-label">TOOLS</div>

      <div className="tool-rail__list">
        {TOOLS.map((t) => {
          const active = view === t.id
          return (
            <button
              key={t.id}
              onClick={() => dispatch(setCenterView(t.id))}
              title={t.label}
              className={`tool-rail__item ${active ? 'tool-rail__item--active' : ''} ml-press`}
            >
              <Icon d={t.d} d2={t.d2} size={19} />
              <span className="tool-rail__item-label">{t.label}</span>
            </button>
          )
        })}
      </div>

      <button
        onClick={() => dispatch(toggleTheme())}
        title="Toggle theme"
        className="tool-rail__theme-toggle ml-hov-acc ml-press"
      >
        <Icon d={themeIconD} size={17} sw={2.2} />
      </button>
      <div
        onClick={() => dispatch(toggleProfile())}
        title={displayName ? `${displayName} — signed in` : 'Account'}
        className="tool-rail__profile ml-hov-out"
      >
        {initials}
      </div>
    </div>
  )
}
