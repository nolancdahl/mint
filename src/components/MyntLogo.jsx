import React from 'react'

// Mint leaf icon: pointed-oval blade with center vein, four side veins angled outward like a real
// mint leaf, and a short stem at the base. Outline-only line art at consistent stroke width so it
// reads cleanly at both header (~26px) and splash (~40px) sizes.
export const MyntLogo = ({ color = 'currentColor', height = 28 }) => {
  const w = height * 3.4
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 100" height={height} width={w} fill="none">
      {/* Whole leaf tilted slightly to the left (counter-clockwise) about its visual center. */}
      <g transform="translate(6, 4) rotate(-12 44 50)">
        {/* Leaf blade — oval, pointed at top, slightly rounded at base */}
        <path
          d="M44 6
             C 70 22, 78 50, 56 80
             Q 50 86, 44 88
             Q 38 86, 32 80
             C 10 50, 18 22, 44 6 Z"
          stroke={color}
          strokeWidth="4"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Center vein */}
        <path
          d="M44 14 L44 84"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Side veins — angled out and down, mint-leaf style */}
        <path d="M44 30 L24 36" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M44 30 L64 36" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M44 52 L20 60" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M44 52 L68 60" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        {/* Stem */}
        <path
          d="M44 88 Q 40 94, 32 96"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      </g>
      {/* "mint" text — bold clean sans-serif */}
      <text
        x="100"
        y="78"
        fill={color}
        fontFamily="'Manrope', 'DM Sans', sans-serif"
        fontWeight="700"
        fontSize="68"
        letterSpacing="-0.02em"
      >
        mint
      </text>
    </svg>
  )
}
