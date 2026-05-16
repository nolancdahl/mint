import React, { useState, useRef, useEffect } from 'react'
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

export const InspirationPage = ({ items, onSave, onDelete, onUpdate }) => {
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

      {/* Full-width grid — bleeds into page padding */}
      <div style={{
        margin: '0 -18px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '2px',
      }}>
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelected(item)}
            style={{
              aspectRatio: '1',
              cursor: 'pointer',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <img
              src={item.image}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {item.analysis && (
              <div style={{
                position: 'absolute',
                bottom: '6px',
                right: '6px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: COLORS.green,
                border: `1.5px solid ${COLORS.cream}`,
              }} />
            )}
          </div>
        ))}
      </div>

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
