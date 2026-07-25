import type { CSSProperties } from 'react'
import { LOGO_PATH } from '../data'
import { Icon } from './Icon'

/** The Mindloom monogram — the four-line "loom" glyph in a neumorphic tile. */
export function LogoMark({ size = 44, iconSize = 22, style }: { size?: number; iconSize?: number; style?: CSSProperties }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        background: 'var(--bg)',
        boxShadow: 'var(--outSm)',
        display: 'grid',
        placeItems: 'center',
        color: 'var(--acc)',
        ...style,
      }}
    >
      <Icon d={LOGO_PATH} size={iconSize} sw={2.2} />
    </div>
  )
}
