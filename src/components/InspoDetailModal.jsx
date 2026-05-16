import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { COLORS, FONTS } from '../lib/theme'
import { TrashIcon, SparklesIcon } from './Icons'

const ClothingTag = ({ item }) => (
  <div style={{
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 14px',
    background: COLORS.creamDeep,
    borderRadius: '8px',
  }}>
    <div style={{
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      background: COLORS.green,
      marginTop: '6px',
      flexShrink: 0,
    }} />
    <div style={{ flex: 1 }}>
      <div style={{
        fontFamily: FONTS.sub,
        fontSize: '13px',
        fontWeight: 600,
        color: COLORS.text,
      }}>
        {item.type}
      </div>
      {item.style && (
        <div style={{
          fontFamily: FONTS.sub,
          fontSize: '11.5px',
          color: COLORS.textMuted,
          marginTop: '2px',
        }}>
          {item.style}
        </div>
      )}
      {item.details && (
        <div style={{
          fontFamily: FONTS.sub,
          fontSize: '11px',
          color: COLORS.textFaint,
          marginTop: '2px',
        }}>
          {item.details}
        </div>
      )}
    </div>
  </div>
)

export const InspoDetailModal = ({ item, onClose, onDelete, onUpdate }) => {
  const [confirming, setConfirming] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [closing, setClosing] = useState(false)

  const handleAnalyze = async () => {
    setAnalyzing(true)
    await new Promise((r) => setTimeout(r, 1500))
    const mockAnalysis = {
      items: [
        { type: 'Outerwear', style: 'Overcoat / topcoat', details: 'Appears to be a wool or wool-blend, mid-length' },
        { type: 'Top', style: 'Crewneck sweater', details: 'Knit, neutral tone' },
        { type: 'Bottoms', style: 'Straight-leg trousers', details: 'Tailored fit, likely cotton or wool blend' },
        { type: 'Shoes', style: 'Leather boots', details: 'Chelsea or lace-up style, brown' },
      ],
    }
    onUpdate({ ...item, analysis: mockAnalysis })
    setAnalyzing(false)
  }

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
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(19, 37, 27, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9998,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className={closing ? 'modal-exit' : 'modal-enter'}
        onClick={startClose}
        style={{
          width: 'calc(100% - 40px)',
          maxWidth: '400px',
          maxHeight: '80%',
          background: COLORS.cream,
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(19, 37, 27, 0.35)',
        }}
      >
        <div style={{
          width: '100%', flexShrink: 0, background: '#1a2f23',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '12px',
        }}>
          <img
            src={item.image}
            alt=""
            style={{
              maxWidth: '100%', maxHeight: '55vh', objectFit: 'contain',
              display: 'block', borderRadius: '4px',
            }}
          />
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ padding: '14px 16px' }}>
            {item.analysis ? (
              <div>
                <div style={{
                  fontFamily: FONTS.sub,
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.22em',
                  color: COLORS.textMuted,
                  fontWeight: 600,
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <SparklesIcon size={12} />
                  Detected clothing
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {item.analysis.items.map((ci, i) => (
                    <ClothingTag key={i} item={ci} />
                  ))}
                </div>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); handleAnalyze() }}
                disabled={analyzing}
                style={{
                  width: '100%',
                  padding: '13px',
                  background: analyzing ? COLORS.creamDeep : COLORS.green,
                  color: analyzing ? COLORS.textMuted : COLORS.cream,
                  border: 'none',
                  borderRadius: '8px',
                  fontFamily: FONTS.sub,
                  fontSize: '12px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  cursor: analyzing ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.15s',
                }}
              >
                <SparklesIcon size={15} />
                {analyzing ? 'Analyzing outfit...' : 'Analyze outfit'}
              </button>
            )}
          </div>

          <div style={{ padding: '0 16px 14px' }}>
            {confirming ? (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirming(false) }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'transparent',
                    border: `1px solid ${COLORS.greenLine}`,
                    borderRadius: '6px',
                    fontFamily: FONTS.sub,
                    fontSize: '11px',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    color: COLORS.green,
                    cursor: 'pointer',
                  }}
                >
                  Keep
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(item.id) }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: COLORS.danger,
                    color: COLORS.cream,
                    border: 'none',
                    borderRadius: '6px',
                    fontFamily: FONTS.sub,
                    fontSize: '11px',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setConfirming(true) }}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'transparent',
                  border: `1px solid ${COLORS.greenLine}`,
                  borderRadius: '6px',
                  fontFamily: FONTS.sub,
                  fontSize: '11px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  color: COLORS.danger,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <TrashIcon size={13} />
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
