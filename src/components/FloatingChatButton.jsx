import React from 'react'
import { COLORS } from '../lib/theme'
import { SparklesIcon, XIcon } from './Icons'

export const FloatingChatButton = ({ onClick, active }) => (
  <button
    onClick={onClick}
    style={{
      position: 'fixed',
      bottom: 'calc(82px + env(safe-area-inset-bottom, 0px))',
      right: '18px',
      width: '54px',
      height: '54px',
      borderRadius: '50%',
      background: COLORS.green,
      color: COLORS.cream,
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: active
        ? '0 10px 28px rgba(31, 61, 46, 0.42)'
        : '0 6px 20px rgba(31, 61, 46, 0.28)',
      zIndex: 102,
      transition: 'transform 0.22s ease, box-shadow 0.22s ease',
      transform: active ? 'scale(1.05)' : 'scale(1)',
    }}
    aria-label="Ask the stylist"
  >
    <span style={{
      position: 'absolute',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'opacity 0.25s ease, transform 0.25s ease',
      opacity: active ? 0 : 1,
      transform: active ? 'rotate(90deg) scale(0.4)' : 'rotate(0) scale(1)',
    }}>
      <SparklesIcon size={22} strokeWidth={1.5} />
    </span>
    <span style={{
      position: 'absolute',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'opacity 0.25s ease, transform 0.25s ease',
      opacity: active ? 1 : 0,
      transform: active ? 'rotate(0) scale(1)' : 'rotate(-90deg) scale(0.4)',
    }}>
      <XIcon size={20} />
    </span>
  </button>
)
