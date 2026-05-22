import React from 'react'
import { COLORS } from '../lib/theme'
import { MyntLogo } from './MyntLogo'

export const Header = ({ onLogoClick }) => (
  <header style={{ background: COLORS.green, padding: '12px 18px 14px', position: 'relative', paddingBottom: '58px' }}>
    <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
      <div onClick={onLogoClick} style={{ cursor: 'pointer', userSelect: 'none', marginLeft: '44px' }}>
        <MyntLogo color={COLORS.cream} height={26} />
      </div>
    </div>
    {/* Smooth arch using SVG ellipse */}
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: '-2px',
      right: '-2px',
      height: '66px',
      overflow: 'hidden',
    }}>
      <svg
        viewBox="0 0 100 66"
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <ellipse cx="50" cy="66" rx="56" ry="66" fill={COLORS.cream} />
      </svg>
    </div>
  </header>
)
