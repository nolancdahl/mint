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
          position: 'relative',
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
          width: '100%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img
            src={item.image}
            alt=""
            style={{
              width: '100%', maxHeight: '55vh', objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ padding: '14px 16px' }}>
            {item.analysis && (
              <div style={{ marginBottom: '14px' }}>
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
            )}

            {confirming ? (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirming(false) }}
                  style={{
                    padding: '13px 20px',
                    background: 'transparent',
                    border: `1px solid ${COLORS.greenLine}`,
                    borderRadius: '8px',
                    fontFamily: FONTS.sub,
                    fontSize: '12px',
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
                    padding: '13px 20px',
                    background: COLORS.danger,
                    color: COLORS.cream,
                    border: 'none',
                    borderRadius: '8px',
                    fontFamily: FONTS.sub,
                    fontSize: '12px',
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
              <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch', justifyContent: 'flex-end' }}>
                {!item.analysis && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAnalyze() }}
                    disabled={analyzing}
                    style={{
                      flex: 1,
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
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirming(true) }}
                  aria-label="Remove"
                  style={{
                    flexShrink: 0,
                    width: '52px',
                    minHeight: '47px',
                    padding: '13px 0',
                    background: COLORS.cream,
                    border: `1px solid ${COLORS.greenLine}`,
                    borderRadius: '8px',
                    color: COLORS.danger,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
