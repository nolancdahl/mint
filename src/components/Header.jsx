import React from 'react'
import { COLORS } from '../lib/theme'
import { UserIcon } from './Icons'

export const Header = ({ onProfileClick, onLogoClick, profileActive, profilePhoto }) => (
  <header style={{ background: COLORS.green, padding: '12px 12px 14px', position: 'relative', paddingBottom: '42px' }}>
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
      <div onClick={onLogoClick} style={{ cursor: 'pointer', userSelect: 'none' }}>
        <span className="garmint-logo" style={{ fontSize: '23px', lineHeight: 1, color: COLORS.cream }}>
          GARMINT
        </span>
      </div>
      <button
        onClick={onProfileClick}
        aria-label="Profile"
        style={{
          position: 'absolute', right: 0,
          background: profileActive ? 'rgba(244, 238, 224, 0.12)' : 'transparent',
          border: `1px solid ${profileActive ? 'rgba(244, 238, 224, 0.3)' : 'rgba(244, 238, 224, 0.18)'}`,
          cursor: 'pointer',
          padding: profilePhoto ? '0px' : '7px',
          color: COLORS.cream,
          overflow: 'hidden',
          borderRadius: '999px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        {profilePhoto ? (
          <img src={profilePhoto} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <UserIcon size={16} strokeWidth={1.6} />
        )}
      </button>
    </div>
    {/* Tan arch dome cutting up into the green banner */}
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '44px',
      background: COLORS.cream,
      borderRadius: '55% 55% 0 0 / 100% 100% 0 0',
    }} />
  </header>
)
