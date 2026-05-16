import React from 'react'
import { COLORS } from '../lib/theme'
import { MintLeavesLogo } from './MintLeavesLogo'
import { UserIcon } from './Icons'

export const Header = ({ onProfileClick, onLogoClick, profileActive }) => (
  <header style={{ background: COLORS.green, padding: '12px 18px 14px', borderRadius: '0 0 14px 14px' }}>
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div onClick={onLogoClick} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
        <MintLeavesLogo size={30} />
        <span className="garmint-logo" style={{ fontSize: '23px', lineHeight: 1, color: COLORS.cream }}>
          GARMINT
        </span>
      </div>
      <button
        onClick={onProfileClick}
        aria-label="Profile"
        style={{
          background: profileActive ? 'rgba(244, 238, 224, 0.12)' : 'transparent',
          border: `1px solid ${profileActive ? 'rgba(244, 238, 224, 0.3)' : 'rgba(244, 238, 224, 0.18)'}`,
          cursor: 'pointer',
          padding: '7px',
          color: COLORS.cream,
          borderRadius: '999px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        <UserIcon size={16} strokeWidth={1.6} />
      </button>
    </div>
  </header>
)
