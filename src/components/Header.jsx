import React from 'react'
import { COLORS } from '../lib/theme'

// Green banner. The bottom-center arch is masked transparent so the page content
// (which is pulled up to overlap it) scrolls UP through the arch — visible over the
// cream page — before the solid green above clips it. A thin dark-cream line traces
// the arch curve.
export const Header = ({ onLogoClick }) => (
  <header
    onClick={onLogoClick}
    style={{ position: 'relative', zIndex: 20, flexShrink: 0, height: '96px' }}
  >
    <div style={{
      position: 'absolute', inset: 0,
      backgroundColor: COLORS.green,
      // Floral wallpaper, tiled at a fixed square size (matches the image's 1:1
      // aspect, so it's repeated rather than stretched).
      backgroundImage: 'url(/banner.png)',
      backgroundRepeat: 'repeat',
      backgroundSize: '200px 200px',
      backgroundPosition: 'center',
      // Hard arch edge: a hard gradient stop (transparent inside the arch, solid
      // outside) gives a crisp, finite cutoff that the browser still anti-aliases
      // smoothly along the curve — no bleed, no jaggies.
      WebkitMaskImage: 'radial-gradient(ellipse 56% 66px at 50% 100%, transparent 99.5%, #000 99.5%)',
      maskImage: 'radial-gradient(ellipse 56% 66px at 50% 100%, transparent 99.5%, #000 99.5%)',
    }} />
    {/* thin dark-cream line tracing the arch */}
    <div style={{
      position: 'absolute', bottom: 0, left: '-2px', right: '-2px',
      height: '66px', overflow: 'hidden', pointerEvents: 'none',
    }}>
      <svg viewBox="0 0 100 66" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
        <ellipse cx="50" cy="66" rx="56" ry="66" fill="none" stroke={COLORS.creamDeep} strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  </header>
)
