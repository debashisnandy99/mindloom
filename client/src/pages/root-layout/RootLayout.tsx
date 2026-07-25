import { Outlet, useNavigation } from 'react-router-dom'
import { Overlays } from '../../components/Overlays'
import { ACCENT_HUE } from '../../data'
import { useAppSelector } from '../../store/reduxStore'
import './RootLayout.scss'

/** App shell shared by every route: the themed background, the active route
 *  outlet, the global overlays, and a thin progress bar shown while a lazy
 *  route module is being fetched. */
export function RootLayout() {
  const theme = useAppSelector((s) => s.app.theme)
  const navigation = useNavigation()
  const loading = navigation.state !== 'idle'

  return (
    <div
      id="mlroot"
      data-ml-theme={theme}
      className="root-layout"
      style={{
        // `--accH` drives every accent color in the token set.
        ['--accH' as string]: ACCENT_HUE,
      }}
    >
      {loading && (
        <div
          aria-hidden
          className="root-layout__progress-bar"
        />
      )}
      <Outlet />
      <Overlays />
    </div>
  )
}
