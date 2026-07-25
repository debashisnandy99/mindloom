import type { ChangeEvent, CSSProperties, KeyboardEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { useLogout } from '../hooks/mutations/useLogout'
import { useSession } from '../hooks/queries/useSession'
import { useMindloomNavigation } from '../hooks/useMindloomNavigation'
import { ADD_META, ICONS } from '../data'
import { useAppDispatch, useAppSelector } from '../store/reduxStore'
import { closeProfile } from '../store/slices/appSlice'
import { cancelNb, closeNbMenu, setNbDescDraft, setNbDraft } from '../store/slices/notebooksSlice'
import { cancelAdd, setAddVal } from '../store/slices/sourcesSlice'
import { confirmAdd, confirmNb } from '../store/thunks'
import { Icon } from './Icon'

/** All screen-level overlays: toast, profile popover, add-source modal,
 *  notebook create/edit modal, and the notebook-menu dismiss layer. */
export function Overlays() {
  return (
    <>
      <NotebookMenuScrim />
      <Toast />
      <ProfilePopover />
      <AddSourceModal />
      <NotebookModal />
    </>
  )
}

function NotebookMenuScrim() {
  const dispatch = useAppDispatch()
  const nbMenuId = useAppSelector((s) => s.notebooks.nbMenuId)
  if (!nbMenuId) return null
  return <div onClick={() => dispatch(closeNbMenu())} style={{ position: 'fixed', inset: 0, zIndex: 4 }} />
}

function Toast() {
  const toast = useAppSelector((s) => s.app.toast)
  if (!toast) return null
  return (
    <div style={{ position: 'fixed', bottom: 26, left: '50%', transform: 'translateX(-50%)', background: 'var(--grad)', boxShadow: 'var(--out)', borderRadius: 999, padding: '12px 24px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, zIndex: 50 }}>
      <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--amber)', animation: 'mlPulse 1.3s ease-in-out infinite' }} />
      {toast}
    </div>
  )
}

function ProfilePopover() {
  const dispatch = useAppDispatch()
  const profileOpen = useAppSelector((s) => s.app.profileOpen)
  const { goNotebooks, signOutAndReturnHome } = useMindloomNavigation()
  const { session } = useSession()
  const logout = useLogout()
  const { pathname } = useLocation()
  if (!profileOpen) return null

  const user = session?.user
  const displayName = user?.name ?? 'Signed in'
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const handleSignOut = () => {
    // Reset local UI state first, then destroy the server session.
    signOutAndReturnHome()
    logout.mutate()
  }
  const cardStyle: CSSProperties = {
    position: 'fixed',
    zIndex: 61,
    width: 236,
    borderRadius: 20,
    background: 'var(--grad)',
    boxShadow: 'var(--out)',
    padding: 16,
    ...(pathname === '/workspace' ? { left: 24, bottom: 24 } : { right: 32, top: 76 }),
  }
  const rowBtn = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    border: 'none',
    background: 'var(--bg)',
    boxShadow: 'var(--outSm)',
    borderRadius: 13,
    padding: 11,
    fontFamily: 'Nunito',
    fontWeight: 800,
    fontSize: 13.5,
    cursor: 'pointer',
  } as const

  return (
    <>
      <div onClick={() => dispatch(closeProfile())} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" style={{ width: 40, height: 40, borderRadius: 999, boxShadow: 'var(--inSm)', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: 999, boxShadow: 'var(--inSm)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13, color: 'var(--acc)' }}>{initials}</div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{displayName}</div>
            <div style={{ fontSize: 11.5, color: 'var(--tx2)', fontFamily: "'DM Mono',monospace", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email ?? ''}</div>
          </div>
        </div>
        <div style={{ height: 2, borderRadius: 2, boxShadow: 'var(--inSm)', marginBottom: 12 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--tx2)', marginBottom: 12, padding: '0 2px' }}>
          <span>Plan</span>
          <span style={{ fontFamily: "'DM Mono',monospace", color: 'var(--acc)' }}>Student · free</span>
        </div>
        <button onClick={goNotebooks} className="ml-hov-acc ml-press" style={{ ...rowBtn, color: 'var(--tx)', marginBottom: 10 }}>
          <Icon d="M4 5h7v7H4zM13 5h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" size={14} />
          All notebooks
        </button>
        <button onClick={handleSignOut} disabled={logout.isPending} className="ml-press" style={{ ...rowBtn, color: 'var(--red)' }}>
          <Icon d="M9 4H5v16h4M14 8l4 4-4 4M18 12H9" size={14} sw={2.2} />
          {logout.isPending ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </>
  )
}

const modalInput = {
  width: '100%',
  boxSizing: 'border-box',
  border: 'none',
  outline: 'none',
  background: 'var(--bg)',
  boxShadow: 'var(--in)',
  borderRadius: 14,
  padding: '14px 16px',
  fontFamily: 'Nunito',
  fontSize: 13.5,
  color: 'var(--tx)',
} as const

const scrim = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(28,30,40,0.38)',
  backdropFilter: 'blur(3px)',
  zIndex: 70,
} as const

const modalCard = {
  position: 'fixed',
  left: '50%',
  top: '50%',
  transform: 'translate(-50%,-50%)',
  zIndex: 71,
  maxWidth: '92vw',
  borderRadius: 24,
  background: 'var(--grad)',
  boxShadow: 'var(--out)',
  padding: '24px 26px',
} as const

function AddSourceModal() {
  const dispatch = useAppDispatch()
  const addOpen = useAppSelector((s) => s.sources.addOpen)
  const addVal = useAppSelector((s) => s.sources.addVal)
  if (!addOpen) return null
  const meta = ADD_META[addOpen]
  const ic = ICONS[addOpen]

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) dispatch(setAddVal(f.name))
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') dispatch(confirmAdd())
  }

  return (
    <>
      <div onClick={() => dispatch(cancelAdd())} style={scrim} />
      <div style={{ ...modalCard, width: 440 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 12, boxShadow: 'var(--inSm)', display: 'grid', placeItems: 'center', color: 'var(--acc)' }}>
            <Icon d={ic.d} d2={ic.d2} size={17} sw={1.9} />
          </div>
          <div style={{ flex: 1, fontWeight: 800, fontSize: 17 }}>{meta.title}</div>
          <CloseButton onClick={() => dispatch(cancelAdd())} />
        </div>
        <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 18 }}>{meta.sub}</div>

        {meta.file ? (
          <>
            <label
              htmlFor="ml-file"
              className="ml-press"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '24px 16px', borderRadius: 16, boxShadow: 'var(--in)', border: '1.5px dashed var(--sd)', cursor: 'pointer', textAlign: 'center', color: addVal ? 'var(--acc)' : 'var(--tx)' }}
            >
              <span style={{ width: 40, height: 40, borderRadius: 13, boxShadow: 'var(--outSm)', display: 'grid', placeItems: 'center' }}>
                <Icon d="M12 16V5M7 9l5-5 5 5M5 19h14" size={18} />
              </span>
              <span style={{ fontWeight: 800, fontSize: 13.5 }}>{addVal || 'Choose a PDF'}</span>
              <span style={{ fontSize: 11, color: 'var(--tx2)', fontFamily: "'DM Mono',monospace" }}>
                {addVal ? 'ready to add — indexing starts right after' : 'click to browse · up to 50 MB'}
              </span>
            </label>
            <input id="ml-file" type="file" accept="application/pdf,.pdf" onChange={onFile} style={{ display: 'none' }} />
          </>
        ) : meta.textarea ? (
          <textarea
            value={addVal}
            onChange={(e) => dispatch(setAddVal(e.target.value))}
            placeholder={meta.ph}
            autoFocus
            style={{ ...modalInput, minHeight: 120, resize: 'vertical' }}
          />
        ) : (
          <input value={addVal} onChange={(e) => dispatch(setAddVal(e.target.value))} onKeyDown={onKey} placeholder={meta.ph} autoFocus style={modalInput} />
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 18 }}>
          <button onClick={() => dispatch(cancelAdd())} className="ml-press" style={cancelBtn}>
            Cancel
          </button>
          <button onClick={() => dispatch(confirmAdd())} className="ml-press" style={confirmBtn}>
            Add source
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--tx2)', fontFamily: "'DM Mono',monospace", marginTop: 14, textAlign: 'center' }}>
          indexing starts immediately — watch the source list
        </div>
      </div>
    </>
  )
}

function NotebookModal() {
  const dispatch = useAppDispatch()
  const nbModal = useAppSelector((s) => s.notebooks.nbModal)
  const nbDraft = useAppSelector((s) => s.notebooks.nbDraft)
  const nbDescDraft = useAppSelector((s) => s.notebooks.nbDescDraft)
  if (!nbModal) return null
  const editing = nbModal === 'edit'
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') dispatch(confirmNb())
  }
  const fieldLabel = { fontFamily: "'DM Mono',monospace", fontSize: 10.5, letterSpacing: '1px', color: 'var(--tx2)', marginBottom: 7 } as const

  return (
    <>
      <div onClick={() => dispatch(cancelNb())} style={scrim} />
      <div style={{ ...modalCard, width: 420 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 12, boxShadow: 'var(--inSm)', display: 'grid', placeItems: 'center', color: 'var(--acc)' }}>
            <Icon d="M6 3h12v18H6z" d2="M9 3v18" size={16} sw={1.9} />
          </div>
          <div style={{ flex: 1, fontWeight: 800, fontSize: 17 }}>{editing ? 'Edit notebook' : 'Create a notebook'}</div>
          <CloseButton onClick={() => dispatch(cancelNb())} />
        </div>
        <div style={fieldLabel}>TITLE</div>
        <input
          value={nbDraft}
          onChange={(e) => dispatch(setNbDraft(e.target.value))}
          onKeyDown={onKey}
          placeholder="e.g. Cognitive Science 101"
          autoFocus
          style={{ ...modalInput, fontSize: 14, fontWeight: 700, marginBottom: 16 }}
        />
        <div style={fieldLabel}>DESCRIPTION</div>
        <input value={nbDescDraft} onChange={(e) => dispatch(setNbDescDraft(e.target.value))} onKeyDown={onKey} placeholder="What is this notebook about?" style={modalInput} />
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={() => dispatch(cancelNb())} className="ml-press" style={cancelBtn}>
            Cancel
          </button>
          <button onClick={() => dispatch(confirmNb())} className="ml-press" style={confirmBtn}>
            {editing ? 'Save changes' : 'Create notebook'}
          </button>
        </div>
      </div>
    </>
  )
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Close"
      className="ml-hov-red ml-press"
      style={{ flexShrink: 0, width: 30, height: 30, border: 'none', borderRadius: 999, background: 'var(--bg)', boxShadow: 'var(--outSm)', color: 'var(--tx2)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
    >
      <Icon d="M6 6l12 12M18 6L6 18" size={12} sw={2.4} />
    </button>
  )
}

const cancelBtn = {
  border: 'none',
  background: 'var(--bg)',
  boxShadow: 'var(--outSm)',
  borderRadius: 999,
  padding: '11px 20px',
  fontFamily: 'Nunito',
  fontWeight: 700,
  fontSize: 13.5,
  color: 'var(--tx2)',
  cursor: 'pointer',
} as const

const confirmBtn = {
  border: 'none',
  background: 'var(--accGrad)',
  color: 'var(--accTx)',
  boxShadow: 'var(--outSm)',
  borderRadius: 999,
  padding: '11px 24px',
  fontFamily: 'Nunito',
  fontWeight: 800,
  fontSize: 13.5,
  cursor: 'pointer',
} as const
