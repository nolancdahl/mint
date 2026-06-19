import React from 'react'
import { COLORS } from '../lib/theme'

export const BottomNav = ({ pages, current, onChange }) => (
  <nav
    style={{
      // Static flex child of the app shell's fixed-height column, so it stays locked
      // at the bottom while only the <main> content area scrolls. flexShrink:0 keeps it
      // from collapsing when the content is tall.
      flexShrink: 0,
      background: COLORS.creamLight,
      borderTop: `1px solid ${COLORS.greenLine}`,
      padding: '6px 4px 8px',
      paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
      zIndex: 100,
      backdropFilter: 'blur(8px)',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', maxWidth: '640px', margin: '0 auto' }}>
      {pages.map((p) => {
        const Icon = p.icon
        const isActive = current === p.id
        return (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            aria-label={p.label}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 2px',
              color: isActive ? COLORS.green : COLORS.textFaint,
              transition: 'color 0.18s',
            }}
          >
            <Icon size={22} strokeWidth={isActive ? 2 : 1.4} />
          </button>
        )
      })}
    </div>
  </nav>
)
