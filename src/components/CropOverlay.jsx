import React, { useState, useRef, useEffect, useCallback } from 'react'
import { COLORS } from '../lib/theme'
import { EditIcon, CheckIcon, XIcon } from './Icons'

export const CropOverlay = ({ src, cropX = 50, cropY = 50, onSave, children }) => {
  const [editing, setEditing] = useState(false)
  const [pos, setPos] = useState({ x: cropX, y: cropY })
  const [hovered, setHovered] = useState(false)
  const dragRef = useRef(null)
  const containerRef = useRef(null)

  const startEdit = (e) => {
    e.stopPropagation()
    e.preventDefault()
    setEditing(true)
    setPos({ x: cropX, y: cropY })
  }

  const accept = (e) => {
    e.stopPropagation()
    e.preventDefault()
    onSave(pos.x, pos.y)
    setEditing(false)
  }

  const discard = (e) => {
    e.stopPropagation()
    e.preventDefault()
    setPos({ x: cropX, y: cropY })
    setEditing(false)
  }

  // Mouse drag
  const onMouseDown = useCallback((e) => {
    if (!editing) return
    e.stopPropagation()
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: pos.x, startPosY: pos.y }
  }, [editing, pos])

  useEffect(() => {
    if (!editing) return
    const onMove = (e) => {
      if (!dragRef.current) return
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      const rect = containerRef.current?.getBoundingClientRect()
      const sensitivity = rect ? 100 / Math.max(rect.width, 1) : 0.5
      setPos({
        x: Math.min(100, Math.max(0, dragRef.current.startPosX - dx * sensitivity)),
        y: Math.min(100, Math.max(0, dragRef.current.startPosY - dy * sensitivity)),
      })
    }
    const onUp = () => { dragRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [editing])

  // Touch drag
  useEffect(() => {
    if (!editing) return
    const el = containerRef.current
    if (!el) return

    const onTouchStart = (e) => {
      e.stopPropagation()
      e.preventDefault()
      const t = e.touches[0]
      dragRef.current = { startX: t.clientX, startY: t.clientY, startPosX: pos.x, startPosY: pos.y }
    }
    const onTouchMove = (e) => {
      if (!dragRef.current) return
      e.preventDefault()
      const t = e.touches[0]
      const dx = t.clientX - dragRef.current.startX
      const dy = t.clientY - dragRef.current.startY
      const rect = el.getBoundingClientRect()
      const sensitivity = rect ? 100 / Math.max(rect.width, 1) : 0.5
      setPos({
        x: Math.min(100, Math.max(0, dragRef.current.startPosX - dx * sensitivity)),
        y: Math.min(100, Math.max(0, dragRef.current.startPosY - dy * sensitivity)),
      })
    }
    const onTouchEnd = () => { dragRef.current = null }

    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [editing, pos.x, pos.y])

  const objPos = `${editing ? pos.x : cropX}% ${editing ? pos.y : cropY}%`

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={editing ? onMouseDown : undefined}
      style={{
        width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
        cursor: editing ? 'grab' : undefined,
      }}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        style={{
          width: '100%', height: '100%', objectFit: 'cover', display: 'block',
          objectPosition: objPos,
          pointerEvents: 'none',
          transition: editing ? 'none' : 'object-position 0.15s ease',
        }}
      />

      {/* Edit icon — subtle, top right */}
      {!editing && (hovered || false) && (
        <button
          onClick={startEdit}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', top: '6px', right: '6px',
            width: '24px', height: '24px', borderRadius: '50%',
            background: 'rgba(0,0,0,0.35)', border: 'none',
            color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'opacity 0.15s',
            zIndex: 3,
          }}
        >
          <EditIcon size={12} strokeWidth={2} />
        </button>
      )}

      {/* Always show on mobile via a small tap target */}
      {!editing && !hovered && (
        <button
          onClick={startEdit}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', top: '4px', right: '4px',
            width: '20px', height: '20px', borderRadius: '50%',
            background: 'rgba(0,0,0,0.2)', border: 'none',
            color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 3,
          }}
        >
          <EditIcon size={10} strokeWidth={2} />
        </button>
      )}

      {/* Crop mode controls */}
      {editing && (
        <>
          <div style={{
            position: 'absolute', inset: 0,
            border: '2px solid rgba(255,255,255,0.6)',
            borderRadius: 'inherit',
            pointerEvents: 'none',
            zIndex: 2,
          }} />
          <div style={{
            position: 'absolute', top: '6px', right: '6px',
            display: 'flex', gap: '4px', zIndex: 4,
          }}>
            <button
              onClick={accept}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: '#2ecc71', border: 'none', color: '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              <CheckIcon size={14} strokeWidth={2.5} />
            </button>
            <button
              onClick={discard}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              <XIcon size={14} strokeWidth={2.5} />
            </button>
          </div>
        </>
      )}

      {/* Pass-through children (like analysis dot, gradient overlay, etc.) */}
      {!editing && children}
    </div>
  )
}
