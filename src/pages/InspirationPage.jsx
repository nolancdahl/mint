import React, { useState, useRef, useEffect, useCallback } from 'react'
import { COLORS, FONTS } from '../lib/theme'
import { PlusIcon, ClipboardIcon, XIcon } from '../components/Icons'
import { fileToResizedDataUrl } from '../lib/storage'
import { uploadImageToStorage } from '../lib/sync'
import { useAuth } from '../components/AuthGate'
import { InspoDetailModal } from '../components/InspoDetailModal'

const CircleButton = ({ onClick, children, buttonRef }) => (
  <button
    ref={buttonRef}
    onClick={onClick}
    style={{
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      border: `1px solid ${COLORS.greenLine}`,
      background: COLORS.creamDeep,
      color: COLORS.green,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      flexShrink: 0,
      transition: 'background 0.15s',
      position: 'relative',
      zIndex: 1,
    }}
  >
    {children}
  </button>
)

const DraggableGrid = ({ items, onSelect, onReorder }) => {
  const gridRef = useRef(null)
  const dragState = useRef(null)
  const [dragIdx, setDragIdx] = useState(null)
  const [hoverIdx, setHoverIdx] = useState(null)
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 })
  const longPressTimer = useRef(null)

  const getCellSize = useCallback(() => {
    if (!gridRef.current) return { w: 0, h: 0, cols: 3, left: 0, top: 0 }
    const rect = gridRef.current.getBoundingClientRect()
    const cols = 3
    const gap = 2
    const w = (rect.width - gap * (cols - 1)) / cols
    const h = w // aspect-ratio: 1
    return { w, h, cols, gap, left: rect.left, top: rect.top }
  }, [])

  const getIndexFromPos = useCallback((clientX, clientY) => {
    const { w, h, cols, gap, left, top } = getCellSize()
    const col = Math.floor((clientX - left) / (w + gap))
    const row = Math.floor((clientY - top + gridRef.current.parentElement.scrollTop) / (h + gap))
    const idx = row * cols + Math.min(Math.max(col, 0), cols - 1)
    return Math.min(Math.max(idx, 0), items.length - 1)
  }, [items.length, getCellSize])

  const startDrag = useCallback((idx, clientX, clientY) => {
    const { w, h, cols, gap, left, top } = getCellSize()
    const col = idx % cols
    const row = Math.floor(idx / cols)
    const cellX = left + col * (w + gap)
    const cellY = top + row * (h + gap) - (gridRef.current?.parentElement?.scrollTop || 0)
    const offsetX = clientX - cellX
    const offsetY = clientY - cellY
    dragState.current = { offsetX, offsetY }
    setDragIdx(idx)
    setHoverIdx(idx)
    setDragPos({ x: clientX - offsetX, y: clientY - offsetY })
  }, [getCellSize])

  const moveDrag = useCallback((clientX, clientY) => {
    if (dragState.current === null || dragIdx === null) return
    const { offsetX, offsetY } = dragState.current
    setDragPos({ x: clientX - offsetX, y: clientY - offsetY })
    setHoverIdx(getIndexFromPos(clientX, clientY))
  }, [dragIdx, getIndexFromPos])

  const endDrag = useCallback(() => {
    clearTimeout(longPressTimer.current)
    if (dragIdx !== null && hoverIdx !== null && dragIdx !== hoverIdx) {
      const newItems = [...items]
      const [moved] = newItems.splice(dragIdx, 1)
      newItems.splice(hoverIdx, 0, moved)
      onReorder(newItems)
    }
    dragState.current = null
    setDragIdx(null)
    setHoverIdx(null)
  }, [dragIdx, hoverIdx, items, onReorder])

  // Mouse events
  const handleMouseDown = useCallback((e, idx) => {
    e.preventDefault()
    longPressTimer.current = setTimeout(() => {
      startDrag(idx, e.clientX, e.clientY)
    }, 200)
  }, [startDrag])

  useEffect(() => {
    if (dragIdx === null) return
    const onMove = (e) => moveDrag(e.clientX, e.clientY)
    const onUp = () => endDrag()
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragIdx, moveDrag, endDrag])

  // Touch events — need {passive: false} to prevent scrolling
  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return

    let touchIdx = null

    const onTouchStart = (e) => {
      const cell = e.target.closest('[data-idx]')
      if (!cell) return
      touchIdx = Number(cell.dataset.idx)
      const touch = e.touches[0]
      longPressTimer.current = setTimeout(() => {
        startDrag(touchIdx, touch.clientX, touch.clientY)
      }, 300)
    }

    const onTouchMove = (e) => {
      if (dragIdx !== null || dragState.current) {
        e.preventDefault()
        const touch = e.touches[0]
        moveDrag(touch.clientX, touch.clientY)
      } else {
        // User is scrolling, cancel long press
        clearTimeout(longPressTimer.current)
      }
    }

    const onTouchEnd = () => {
      clearTimeout(longPressTimer.current)
      if (dragIdx !== null) {
        endDrag()
      } else {
        // It was a tap — open detail
        if (touchIdx !== null && items[touchIdx]) {
          onSelect(items[touchIdx])
        }
      }
      touchIdx = null
    }

    grid.addEventListener('touchstart', onTouchStart, { passive: true })
    grid.addEventListener('touchmove', onTouchMove, { passive: false })
    grid.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      grid.removeEventListener('touchstart', onTouchStart)
      grid.removeEventListener('touchmove', onTouchMove)
      grid.removeEventListener('touchend', onTouchEnd)
    }
  }, [dragIdx, items, startDrag, moveDrag, endDrag, onSelect])

  // Compute display order for shifting animation
  const getDisplayIndex = (originalIdx) => {
    if (dragIdx === null || hoverIdx === null) return originalIdx
    if (originalIdx === dragIdx) return hoverIdx
    if (dragIdx < hoverIdx) {
      if (originalIdx > dragIdx && originalIdx <= hoverIdx) return originalIdx - 1
    } else {
      if (originalIdx >= hoverIdx && originalIdx < dragIdx) return originalIdx + 1
    }
    return originalIdx
  }

  const { w, h, cols, gap } = getCellSize()

  return (
    <div style={{ margin: '0 -18px', position: 'relative' }}>
      <div
        ref={gridRef}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '2px',
        }}
      >
        {items.map((item, idx) => {
          const isDragging = dragIdx === idx
          return (
            <div
              key={item.id}
              data-idx={idx}
              onMouseDown={(e) => handleMouseDown(e, idx)}
              onMouseUp={() => {
                clearTimeout(longPressTimer.current)
                if (dragIdx === null) onSelect(item)
              }}
              style={{
                aspectRatio: '1',
                cursor: dragIdx !== null ? 'grabbing' : 'pointer',
                overflow: 'hidden',
                position: 'relative',
                opacity: isDragging ? 0.3 : 1,
                transform: dragIdx !== null && !isDragging
                  ? (() => {
                      const displayIdx = getDisplayIndex(idx)
                      if (displayIdx === idx) return 'none'
                      const fromCol = idx % 3
                      const fromRow = Math.floor(idx / 3)
                      const toCol = displayIdx % 3
                      const toRow = Math.floor(displayIdx / 3)
                      const cellW = gridRef.current ? (gridRef.current.offsetWidth - 2 * 2) / 3 + 2 : 0
                      const dx = (toCol - fromCol) * cellW
                      const dy = (toRow - fromRow) * cellW
                      return `translate(${dx}px, ${dy}px)`
                    })()
                  : 'none',
                transition: dragIdx !== null ? 'transform 0.2s ease, opacity 0.15s' : 'none',
                zIndex: isDragging ? 0 : 1,
                WebkitUserSelect: 'none',
                userSelect: 'none',
              }}
            >
              <img
                src={item.image}
                alt=""
                draggable={false}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
              />
              {item.analysis && (
                <div style={{
                  position: 'absolute',
                  bottom: '6px', right: '6px',
                  width: '8px', height: '8px',
                  borderRadius: '50%',
                  background: COLORS.green,
                  border: `1.5px solid ${COLORS.cream}`,
                }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Floating drag preview */}
      {dragIdx !== null && items[dragIdx] && (
        <div style={{
          position: 'fixed',
          left: dragPos.x,
          top: dragPos.y,
          width: gridRef.current ? (gridRef.current.offsetWidth - 2 * 2) / 3 : 100,
          height: gridRef.current ? (gridRef.current.offsetWidth - 2 * 2) / 3 : 100,
          zIndex: 9999,
          pointerEvents: 'none',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 12px 32px rgba(19, 37, 27, 0.35)',
          transform: 'scale(1.08)',
          opacity: 0.92,
        }}>
          <img
            src={items[dragIdx].image}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}
    </div>
  )
}

export const InspirationPage = ({ items, onSave, onDelete, onUpdate, onReorder }) => {
  const user = useAuth()
  const fileRef = useRef(null)
  const pasteRef = useRef(null)
  const [selected, setSelected] = useState(null)
  const [pasteStatus, setPasteStatus] = useState(null)
  const [pasteZoneOpen, setPasteZoneOpen] = useState(false)
  const [uploading, setUploading] = useState(false)

  const addImage = async (file) => {
    if (!file.type.startsWith('image/')) return
    setUploading(true)
    try {
      const dataUrl = await fileToResizedDataUrl(file, 800, 0.85)
      let image = dataUrl
      // Upload to Firebase Storage if logged in — stores URL instead of base64
      if (user) {
        image = await uploadImageToStorage(user.uid, dataUrl)
      }
      onSave({ id: Date.now().toString() + Math.random().toString(36).slice(2), image, addedAt: Date.now(), analysis: null })
    } finally {
      setUploading(false)
    }
  }

  const handleFiles = async (files) => {
    for (const file of files) await addImage(file)
  }

  const showStatus = (status) => {
    setPasteStatus(status)
    setTimeout(() => setPasteStatus(null), 3000)
  }

  const handlePasteEvent = async (e) => {
    const items_list = e.clipboardData?.items
    if (!items_list) return
    let found = false
    for (const item of items_list) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          await addImage(file)
          found = true
        }
      }
    }
    if (found) {
      setPasteZoneOpen(false)
      showStatus('success')
    }
    if (pasteRef.current) pasteRef.current.innerHTML = ''
  }

  const openPasteZone = () => {
    setPasteZoneOpen(true)
    setTimeout(() => {
      if (pasteRef.current) pasteRef.current.focus()
    }, 100)
  }

  useEffect(() => {
    const onPaste = async (e) => {
      if (pasteZoneOpen) return
      const items_list = e.clipboardData?.items
      if (!items_list) return
      for (const item of items_list) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) await addImage(file)
        }
      }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [pasteZoneOpen])

  return (
    <div>
      {/* Title row with action buttons */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 className="title-bold" style={{ fontSize: '34px', margin: 0, color: COLORS.text, lineHeight: 1.0 }}>
            Inspiration
          </h2>
          <p style={{
            fontFamily: FONTS.sub,
            fontSize: '11px',
            color: COLORS.textMuted,
            margin: '8px 0 0',
            textTransform: 'uppercase',
            letterSpacing: '0.22em',
            fontWeight: 500,
          }}>
            What you're chasing
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px', position: 'relative' }}>
          <CircleButton onClick={openPasteZone}>
            <ClipboardIcon size={16} strokeWidth={1.6} />
          </CircleButton>
          <CircleButton onClick={() => fileRef.current?.click()}>
            <PlusIcon size={18} strokeWidth={1.8} />
          </CircleButton>

          {/* Paste popover */}
          {pasteZoneOpen && (
            <>
              <div
                className="backdrop-enter"
                onClick={() => setPasteZoneOpen(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(19, 37, 27, 0.4)',
                  zIndex: 100,
                  backdropFilter: 'blur(2px)',
                }}
              />
              <div
                className="modal-enter"
                style={{
                  position: 'absolute',
                  top: '44px',
                  right: 0,
                  width: '80vw',
                  maxWidth: '320px',
                  background: COLORS.cream,
                  borderRadius: '12px',
                  boxShadow: '0 12px 40px rgba(19, 37, 27, 0.25)',
                  zIndex: 101,
                  overflow: 'hidden',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px 0',
                }}>
                  <span style={{
                    fontFamily: FONTS.sub,
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.18em',
                    fontWeight: 600,
                    color: COLORS.textMuted,
                  }}>
                    Paste an image
                  </span>
                  <button
                    onClick={() => setPasteZoneOpen(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: COLORS.textMuted,
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                    }}
                  >
                    <XIcon size={16} />
                  </button>
                </div>
                <div style={{ padding: '12px 16px 16px' }}>
                  <div style={{
                    fontFamily: FONTS.sub,
                    fontSize: '12px',
                    color: COLORS.textFaint,
                    marginBottom: '10px',
                  }}>
                    Long-press the box below, then tap <strong style={{ color: COLORS.textMuted }}>Paste</strong>
                  </div>
                  <div
                    ref={pasteRef}
                    contentEditable
                    onPaste={handlePasteEvent}
                    style={{
                      minHeight: '80px',
                      padding: '16px',
                      background: COLORS.white,
                      border: `1.5px dashed ${COLORS.greenLine}`,
                      borderRadius: '8px',
                      fontFamily: FONTS.sub,
                      fontSize: '13px',
                      color: COLORS.textMuted,
                      outline: 'none',
                      WebkitUserSelect: 'text',
                      userSelect: 'text',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {uploading && (
        <div style={{
          marginBottom: '12px',
          padding: '10px 14px',
          borderRadius: '8px',
          textAlign: 'center',
          fontFamily: FONTS.sub,
          fontSize: '12px',
          fontWeight: 500,
          background: 'rgba(31, 61, 46, 0.08)',
          color: COLORS.textMuted,
        }}>
          Uploading...
        </div>
      )}

      {pasteStatus && (
        <div style={{
          marginBottom: '12px',
          padding: '10px 14px',
          borderRadius: '8px',
          textAlign: 'center',
          fontFamily: FONTS.sub,
          fontSize: '12px',
          fontWeight: 500,
          background: 'rgba(31, 61, 46, 0.1)',
          color: COLORS.green,
        }}>
          Image added!
        </div>
      )}

      {/* Full-width draggable grid — bleeds into page padding */}
      <DraggableGrid items={items} onSelect={setSelected} onReorder={onReorder} />

      {items.length === 0 && !pasteStatus && !pasteZoneOpen && (
        <div style={{
          marginTop: '40px',
          padding: '14px',
          textAlign: 'center',
          color: COLORS.textFaint,
          fontFamily: FONTS.sub,
          fontSize: '11.5px',
          fontStyle: 'italic',
        }}>
          Upload photos or copy an image and tap paste
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files.length) handleFiles([...e.target.files])
          e.target.value = ''
        }}
      />

      {selected && (
        <InspoDetailModal
          item={selected}
          onClose={() => setSelected(null)}
          onDelete={(id) => { onDelete(id); setSelected(null) }}
          onUpdate={(updated) => { onUpdate(updated); setSelected(updated) }}
        />
      )}
    </div>
  )
}
