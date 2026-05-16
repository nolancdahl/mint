import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { COLORS, FONTS } from '../lib/theme'
import { TrashIcon, ExternalIcon } from './Icons'

export const WishlistItemDetail = ({ item, onClose, onDelete }) => {
  const [confirming, setConfirming] = useState(false)
  const [closing, setClosing] = useState(false)

  const startClose = () => {
    if (closing) return
    setClosing(true)
    setTimeout(onClose, 250)
  }

  return createPortal(
    <div
      className={closing ? 'backdrop-exit' : 'backdrop-enter'}
      onClick={startClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(19, 37, 27, 0.65)', backdropFilter: 'blur(4px)',
        zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        className={closing ? 'modal-exit' : 'modal-enter'}
        onClick={startClose}
        style={{
          width: 'calc(100% - 32px)', maxWidth: '400px', maxHeight: '85%',
          background: COLORS.cream, borderRadius: '12px',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(19, 37, 27, 0.35)',
        }}
      >
        {/* Full image */}
        {item.image ? (
          <div style={{
            width: '100%', flexShrink: 0, background: '#1a2f23',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '12px',
          }}>
            <img
              src={item.image}
              alt={item.title}
              style={{
                maxWidth: '100%', maxHeight: '50vh', objectFit: 'contain',
                display: 'block', borderRadius: '4px',
              }}
            />
          </div>
        ) : (
          <div style={{
            width: '100%', height: '180px', background: COLORS.creamDeep,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: COLORS.textFaint, flexShrink: 0,
          }}>
            <ExternalIcon size={36} strokeWidth={1} />
          </div>
        )}

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
          {item.publisher && (
            <div style={{
              fontFamily: FONTS.sub, fontSize: '10px', color: COLORS.textMuted,
              textTransform: 'uppercase', letterSpacing: '0.16em',
              fontWeight: 600, marginBottom: '6px',
            }}>
              {item.publisher}
            </div>
          )}
          <div className="title-bold" style={{ fontSize: '20px', color: COLORS.text, lineHeight: 1.15 }}>
            {item.title}
          </div>

          {/* Category + tags */}
          <div style={{ marginTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: FONTS.sub, fontSize: '10px', padding: '4px 10px',
              background: COLORS.green, color: COLORS.cream, borderRadius: '999px',
              textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600,
            }}>
              {item.category}
            </span>
            {item.tags && item.tags.map((t) => (
              <span key={t} style={{
                fontFamily: FONTS.sub, fontSize: '10px', padding: '4px 10px',
                background: 'transparent', color: COLORS.green,
                border: `1px solid ${COLORS.greenLine}`, borderRadius: '999px',
                textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500,
              }}>{t}</span>
            ))}
          </div>

          {/* Visit link */}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                marginTop: '16px', padding: '10px 18px',
                background: COLORS.green, color: COLORS.cream,
                borderRadius: '999px', textDecoration: 'none',
                fontFamily: FONTS.sub, fontSize: '11px', fontWeight: 600,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                transition: 'opacity 0.15s',
              }}
            >
              <ExternalIcon size={13} /> View product
            </a>
          )}
        </div>

        {/* Delete — small circle bottom right */}
        <div style={{ padding: '0 20px 16px', display: 'flex', justifyContent: 'flex-end' }}>
          {confirming ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirming(false) }}
                style={{
                  padding: '6px 14px', background: 'transparent',
                  border: `1px solid ${COLORS.greenLine}`, borderRadius: '999px',
                  fontFamily: FONTS.sub, fontSize: '10px', letterSpacing: '0.1em',
                  textTransform: 'uppercase', fontWeight: 600,
                  color: COLORS.green, cursor: 'pointer',
                }}
              >Keep</button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(item.id) }}
                style={{
                  padding: '6px 14px', background: COLORS.danger,
                  border: 'none', borderRadius: '999px',
                  fontFamily: FONTS.sub, fontSize: '10px', letterSpacing: '0.1em',
                  textTransform: 'uppercase', fontWeight: 600,
                  color: COLORS.cream, cursor: 'pointer',
                }}
              >Delete</button>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirming(true) }}
              style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: 'transparent', border: `1px solid ${COLORS.greenLine}`,
                color: COLORS.danger, display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <TrashIcon size={14} />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
