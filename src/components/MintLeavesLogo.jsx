import React, { useId } from 'react'
import { COLORS } from '../lib/theme'

// A pointed mint leaf filled with an up-pointing chevron (herringbone) vein
// pattern, in the app's cream + green palette. Cream forms the light stripes,
// the two greens the dark ones, with a soft central vein.
export const MintLeavesLogo = ({ size = 38 }) => {
  const VB_W = 60
  const VB_H = 92
  const w = size
  const h = Math.round((size * VB_H) / VB_W)
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')

  // Almond leaf outline: pointed at top and bottom, widest in the middle.
  const leaf =
    'M30 3 C 15 21, 8 36, 8 47 C 8 59, 18 81, 30 89 C 42 81, 52 59, 52 47 C 52 36, 45 21, 30 3 Z'

  // Stacked up-pointing chevrons (apex on the central vein), alternating between
  // the two app greens. The cream base shows through as the light stripes.
  const chevrons = []
  let i = 0
  for (let y = 8; y <= 88; y += 10) {
    chevrons.push(
      <polyline
        key={y}
        points={`6,${y + 10} 30,${y} 54,${y + 10}`}
        fill="none"
        stroke={i % 2 === 0 ? COLORS.green : COLORS.greenSoft}
        strokeWidth="5.5"
        strokeLinecap="butt"
      />,
    )
    i += 1
  }

  return (
    <svg width={w} height={h} viewBox={`0 0 ${VB_W} ${VB_H}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id={`leafclip-${id}`}>
          <path d={leaf} />
        </clipPath>
      </defs>
      <g clipPath={`url(#leafclip-${id})`}>
        <rect x="0" y="0" width={VB_W} height={VB_H} fill={COLORS.creamLight} />
        {chevrons}
        {/* central vein */}
        <line x1="30" y1="5" x2="30" y2="87" stroke={COLORS.creamLight} strokeWidth="2.4" strokeLinecap="round" />
      </g>
      {/* crisp leaf edge */}
      <path d={leaf} fill="none" stroke={COLORS.green} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}
