import type { MouseEvent } from 'react'
import { Icon } from '../../components/Icon'
import { ThemeToggle } from '../../components/ThemeToggle'
import { useNotebooks } from '../../hooks/queries/useNotebooks'
import { useDeleteNotebook } from '../../hooks/mutations/useNotebookMutations'
import { useSession } from '../../hooks/queries/useSession'
import { useMindloomNavigation } from '../../hooks/useMindloomNavigation'
import { useAppDispatch, useAppSelector } from '../../store/reduxStore'
import { toggleProfile } from '../../store/slices/appSlice'
import { openEditNb, openNewNb, setNbConfirmId, toggleNbMenu } from '../../store/slices/notebooksSlice'
import { showToast } from '../../store/thunks'
import './NotebooksPage.scss'

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export function NotebooksPage() {
  const dispatch = useAppDispatch()
  const { data: notebooks = [], isLoading } = useNotebooks()
  const { session } = useSession()
  const nbMenuId = useAppSelector((s) => s.notebooks.nbMenuId)
  const nbConfirmId = useAppSelector((s) => s.notebooks.nbConfirmId)
  const { goLanding, openNotebook } = useMindloomNavigation()
  const deleteNotebook = useDeleteNotebook()

  const email = session?.user.email ?? ''
  const initials =
    (session?.user.name ?? '')
      .split(' ')
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '—'
  const countLabel =
    notebooks.length + (notebooks.length === 1 ? ' notebook' : ' notebooks') + (email ? ` · ${email}` : '')

  const stop = (fn: () => void) => (e: MouseEvent) => {
    e.stopPropagation()
    fn()
  }

  const onDelete = (id: string) => {
    if (nbConfirmId === id) {
      deleteNotebook.mutate(id, { onSuccess: () => dispatch(showToast('Notebook deleted')) })
    } else {
      dispatch(setNbConfirmId(id))
    }
  }

  return (
    <div className="notebooks-page">
      <header className="notebooks-page__header">
        <div onClick={goLanding} className="notebooks-page__header--brand">
          <div className="notebooks-page__header--logo">
            <Icon d="M4 9h16M4 15h16M9 4v16M15 4v16" size={22} sw={2.2} />
          </div>
          <div className="notebooks-page__header--title">Mindloom</div>
        </div>
        <div className="notebooks-page__header--spacer" />
        <ThemeToggle knobBg="var(--grad)" />
        <div
          onClick={() => dispatch(toggleProfile())}
          title={session?.user.name ? `${session.user.name} — signed in` : 'Account'}
          className="notebooks-page__header--profile ml-hov-out"
        >
          {initials}
        </div>
      </header>

      <div className="notebooks-page__title-row">
        <div>
          <h2 className="notebooks-page__title-row--title">Your notebooks</h2>
          <div className="notebooks-page__title-row--count">{countLabel}</div>
        </div>
        <div className="notebooks-page__title-row--spacer" />
        <button
          onClick={() => dispatch(openNewNb())}
          className="notebooks-page__title-row--btn-new ml-lift ml-press-flat"
        >
          + New notebook
        </button>
      </div>

      <div className="notebooks-page__grid">
        <div onClick={() => dispatch(openNewNb())} className="notebooks-page__card-new ml-hov-acc">
          <span className="notebooks-page__card-new--plus">+</span>
          <span className="notebooks-page__card-new--label">New notebook</span>
          <span className="notebooks-page__card-new--sub">start from empty</span>
        </div>

        {isLoading && <div className="notebooks-page__card" style={{ opacity: 0.6 }}>Loading…</div>}

        {notebooks.map((nb) => {
          const menuOpen = nbMenuId === nb.id
          const srcCount = nb._count?.sources ?? 0
          return (
            <div
              key={nb.id}
              onClick={() => openNotebook(nb.id)}
              className={`notebooks-page__card ${menuOpen ? 'notebooks-page__card--active-menu' : ''}`}
            >
              <div className="notebooks-page__card--top">
                <div className="notebooks-page__card--icon">
                  <Icon d="M6 3h12v18H6z" d2="M9 3v18" size={17} sw={1.9} />
                </div>
                <div className="notebooks-page__card--spacer" />
                <button
                  onClick={stop(() => dispatch(toggleNbMenu(nb.id)))}
                  title="Notebook options"
                  className="notebooks-page__card--menu-btn ml-hov-acc ml-press"
                >
                  ⋯
                </button>
              </div>
              <div className="notebooks-page__card--title">{nb.name}</div>
              <div className="notebooks-page__card--desc">
                {nb.description || 'No description yet — add sources to get started.'}
              </div>
              <div className="notebooks-page__card--meta">
                {srcCount} {srcCount === 1 ? 'source' : 'sources'} · updated {relativeTime(nb.updatedAt)}
              </div>

              {menuOpen && (
                <div className="notebooks-page__menu">
                  <button
                    onClick={stop(() =>
                      dispatch(openEditNb({ id: nb.id, name: nb.name, description: nb.description })),
                    )}
                    className="notebooks-page__menu--item ml-menu-item"
                  >
                    <Icon d="M4 20l1-4L16 5l3 3L8 19zM14 7l3 3" size={13} />
                    Rename
                  </button>
                  <button
                    onClick={stop(() => onDelete(nb.id))}
                    className="notebooks-page__menu--item notebooks-page__menu--item-danger ml-menu-item-danger"
                  >
                    <Icon d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13" size={13} />
                    {nbConfirmId === nb.id ? 'Confirm delete' : 'Delete'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { NotebooksPage as Component }
