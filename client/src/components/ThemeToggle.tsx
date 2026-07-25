import { useAppDispatch, useAppSelector } from '../store/reduxStore'
import { toggleTheme } from '../store/slices/appSlice'
import { Icon } from './Icon'

/** Sun/moon pill toggle. `knobBg` differs subtly between screens in the design. */
export function ThemeToggle({ knobBg = 'var(--bg)' }: { knobBg?: string }) {
  const dispatch = useAppDispatch()
  const theme = useAppSelector((s) => s.app.theme)
  const dark = theme === 'dark'
  const themeIconD = dark
    ? 'M12 2v3M12 19v3M2 12h3M19 12h3M4.6 4.6l2 2M17.4 17.4l2 2M19.4 4.6l-2 2M6.6 17.4l-2 2M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8'
    : 'M20 13.2A8 8 0 1 1 10.8 4a6.4 6.4 0 0 0 9.2 9.2z'
  return (
    <button
      onClick={() => dispatch(toggleTheme())}
      title="Toggle theme"
      style={{
        width: 58,
        height: 30,
        border: 'none',
        borderRadius: 999,
        background: 'var(--bg)',
        boxShadow: 'var(--inSm)',
        cursor: 'pointer',
        position: 'relative',
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: dark ? 31 : 3,
          width: 24,
          height: 24,
          borderRadius: 999,
          background: knobBg,
          boxShadow: 'var(--outSm)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--acc)',
          transition: 'left 0.25s ease',
        }}
      >
        <Icon d={themeIconD} size={13} sw={2.4} />
      </span>
    </button>
  )
}
