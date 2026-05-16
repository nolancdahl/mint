import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { COLORS, FONTS } from '../lib/theme'
import { SHOPPING_CATEGORIES } from '../lib/constants'
import { FieldLabel } from '../components/Primitives'
import { LinkIcon, PlusIcon, XIcon, ClipboardIcon, ChevronDown, GridIcon } from '../components/Icons'
import { fileToResizedDataUrl, loadJson, saveJson } from '../lib/storage'
import { createPortal } from 'react-dom'
import { CropOverlay } from '../components/CropOverlay'

const TAGS_KEY = 'garmint_wishlist_tags_v1'
const DEFAULT_TAGS = ['Accessories', 'Chinos', 'Hats', 'Jackets', 'Jeans', 'Shoes', 'Shorts', 'Soccer Shorts', 'Sweaters', 'T-Shirts']

const loadTags = () => {
  const saved = loadJson(TAGS_KEY)
  return saved.length > 0 ? saved : DEFAULT_TAGS
}

const WishlistTile = ({ item, onClick, cols = 3, onUpdate }) => {
  // Scale factor: fewer columns = bigger tiles = bigger text
  const s = Math.max(0.6, Math.min(2, 3 / cols))
  const titleSize = 11.5 * s
  const publisherSize = 9 * s
  const priceSize = 9 * s
  const tagSize = 8 * s
  const padding = `${Math.round(22 * s)}px ${Math.round(10 * s)}px ${Math.round(8 * s)}px`
  const pillPad = `${Math.round(2 * s)}px ${Math.round(7 * s)}px`
  const tagPad = `${Math.round(2 * s)}px ${Math.round(6 * s)}px`

  const overlay = (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      padding,
      background: 'linear-gradient(to top, rgba(19,37,27,0.78), transparent)',
      color: COLORS.cream, zIndex: 1,
    }}>
      {item.publisher && (
        <div style={{ fontFamily: FONTS.sub, fontSize: `${publisherSize}px`, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 600 }}>
          {item.publisher}
        </div>
      )}
      <div style={{
        fontFamily: FONTS.sub, fontSize: `${titleSize}px`, fontWeight: 600, lineHeight: 1.2,
        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginTop: '2px',
      }}>
        {item.title}
      </div>
      <div style={{ display: 'flex', gap: `${Math.round(4 * s)}px`, marginTop: `${Math.round(4 * s)}px`, flexWrap: 'wrap' }}>
        {item.price && (
          <span style={{
            fontFamily: FONTS.sub, fontSize: `${priceSize}px`, padding: pillPad,
            background: 'rgba(46,204,113,0.35)', borderRadius: '999px',
            fontWeight: 700, letterSpacing: '0.02em',
          }}>${item.price}</span>
        )}
        {item.tags && item.tags.map((t) => (
          <span key={t} style={{
            fontFamily: FONTS.sub, fontSize: `${tagSize}px`, padding: tagPad,
            background: 'rgba(244,238,224,0.25)', borderRadius: '999px',
            letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
          }}>{t}</span>
        ))}
      </div>
    </div>
  )

  return (
    <div
      onClick={onClick}
      className="tile"
      style={{
        aspectRatio: '3/4', overflow: 'hidden', cursor: 'pointer',
        padding: 0, display: 'flex', flexDirection: 'column', position: 'relative',
      }}
    >
      {item.image ? (
        <CropOverlay
          src={item.image}
          cropX={item.cropX}
          cropY={item.cropY}
          onSave={(cx, cy) => onUpdate && onUpdate({ ...item, cropX: cx, cropY: cy })}
        >
          {overlay}
        </CropOverlay>
      ) : (
        <>
          <div style={{
            width: '100%', height: '100%', background: COLORS.creamDeep,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textFaint,
          }}>
            <LinkIcon size={Math.round(28 * s)} strokeWidth={1.2} />
          </div>
          {overlay}
        </>
      )}
    </div>
  )
}

const CircleButton = ({ onClick, children }) => (
  <button onClick={onClick} style={{
    width: '36px', height: '36px', borderRadius: '50%',
    border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep,
    color: COLORS.green, display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
  }}>
    {children}
  </button>
)

// Dropdown filter button
const FilterDropdown = ({ label, options, selected, onChange }) => {
  const [open, setOpen] = useState(false)

  const displayLabel = selected.length === 0 ? label : selected.join(', ')

  const toggle = (opt) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt))
    } else {
      onChange([...selected, opt])
    }
  }

  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: '10px 12px',
          borderRadius: '8px',
          border: `1px solid ${open ? COLORS.green : COLORS.greenLine}`,
          background: selected.length > 0 ? COLORS.green : COLORS.creamDeep,
          color: selected.length > 0 ? COLORS.cream : COLORS.textMuted,
          fontFamily: FONTS.sub, fontSize: '11px', fontWeight: 600,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: '6px',
          transition: 'all 0.15s',
        }}
      >
        <span style={{
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{displayLabel}</span>
        <ChevronDown size={14} strokeWidth={2} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            marginTop: '4px', background: COLORS.cream, borderRadius: '8px',
            border: `1px solid ${COLORS.greenLine}`,
            boxShadow: '0 8px 24px rgba(19, 37, 27, 0.15)',
            zIndex: 51, maxHeight: '200px', overflowY: 'auto',
          }}>
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => toggle(opt)}
                style={{
                  width: '100%', padding: '11px 14px', border: 'none',
                  borderBottom: `1px solid ${COLORS.greenLineSoft}`,
                  background: selected.includes(opt) ? 'rgba(31, 61, 46, 0.08)' : 'transparent',
                  fontFamily: FONTS.sub, fontSize: '12px', fontWeight: selected.includes(opt) ? 600 : 500,
                  color: selected.includes(opt) ? COLORS.green : COLORS.text,
                  cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                {opt}
                {selected.includes(opt) && <span style={{ color: COLORS.green, fontWeight: 700 }}>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Add new tag mini-modal
const AddTagPopup = ({ onAdd, onClose, existingTags }) => {
  const [value, setValue] = useState('')
  const handleAdd = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onAdd(trimmed)
    onClose()
  }
  return createPortal(
    <div
      className="backdrop-enter"
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(19, 37, 27, 0.45)', zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        className="modal-enter"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'calc(100% - 60px)', maxWidth: '300px',
          background: COLORS.cream, borderRadius: '12px', padding: '20px',
          boxShadow: '0 16px 40px rgba(19, 37, 27, 0.25)',
        }}
      >
        <div style={{
          fontFamily: FONTS.sub, fontSize: '11px', textTransform: 'uppercase',
          letterSpacing: '0.18em', fontWeight: 600, color: COLORS.textMuted, marginBottom: '10px',
        }}>New tag</div>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
          placeholder="e.g. Linen, Workwear..."
          style={{
            width: '100%', padding: '12px 14px', borderRadius: '6px',
            border: `1px solid ${COLORS.greenLine}`, background: COLORS.white,
            fontFamily: FONTS.sub, fontSize: '13px', color: COLORS.text, outline: 'none',
            marginBottom: '12px',
          }}
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', background: 'transparent',
            border: `1px solid ${COLORS.greenLine}`, borderRadius: '6px',
            fontFamily: FONTS.sub, fontSize: '11px', letterSpacing: '0.1em',
            textTransform: 'uppercase', fontWeight: 600, color: COLORS.textMuted, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleAdd} style={{
            flex: 1, padding: '10px', background: COLORS.green,
            border: 'none', borderRadius: '6px', color: COLORS.cream,
            fontFamily: FONTS.sub, fontSize: '11px', letterSpacing: '0.1em',
            textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer',
          }}>Add</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

const DEFAULT_COLORS = ['Beige', 'Black', 'Blue', 'Brown', 'Burgundy', 'Charcoal', 'Cream', 'Gold', 'Gray', 'Green', 'Ivory', 'Khaki', 'Maroon', 'Navy', 'Olive', 'Orange', 'Pink', 'Purple', 'Red', 'Rust', 'Silver', 'Tan', 'Teal', 'White', 'Yellow']

const AddWishlistModal = ({ onClose, onSave }) => {
  const fileRef = useRef(null)
  const pasteRef = useRef(null)
  const [url, setUrl] = useState('')
  const [brand, setBrand] = useState('')
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [image, setImage] = useState(null)
  const [selectedCategories, setSelectedCategories] = useState([])
  const [tags, setTags] = useState(() => [...loadTags()].sort((a, b) => a.localeCompare(b)))
  const [selectedTags, setSelectedTags] = useState([])
  const [selectedColors, setSelectedColors] = useState([])
  const [pasteZoneOpen, setPasteZoneOpen] = useState(false)
  const [addTagOpen, setAddTagOpen] = useState(false)

  const toggleCategory = (c) => {
    setSelectedCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    )
  }

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const toggleColor = (c) => {
    setSelectedColors((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    )
  }

  const handleAddTag = (name) => {
    if (!tags.includes(name)) {
      const updated = [...tags, name].sort((a, b) => a.localeCompare(b))
      setTags(updated)
      saveJson(TAGS_KEY, updated)
    }
    if (!selectedTags.includes(name)) {
      setSelectedTags((prev) => [...prev, name])
    }
  }

  const handleFile = async (file) => {
    if (!file.type.startsWith('image/')) return
    const dataUrl = await fileToResizedDataUrl(file, 800, 0.85)
    setImage(dataUrl)
  }

  const handlePasteEvent = async (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) await handleFile(file)
        setPasteZoneOpen(false)
        return
      }
    }
  }

  const openPasteZone = () => {
    setPasteZoneOpen(true)
    setTimeout(() => { if (pasteRef.current) pasteRef.current.focus() }, 100)
  }

  const canSave = !!(title || url || brand || image)

  const handleSave = () => {
    if (!canSave) return
    onSave({
      id: Date.now().toString(),
      url: url || null,
      title: title || brand || url || 'Untitled',
      brand: brand || null,
      image,
      price: price || null,
      publisher: null,
      description: '',
      category: selectedCategories[0] || null,
      categories: selectedCategories,
      tags: selectedTags,
      colors: selectedColors,
      addedAt: new Date().toISOString(),
    })
  }

  return createPortal(
    <div
      className="backdrop-enter"
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(19, 37, 27, 0.55)', backdropFilter: 'blur(3px)',
        zIndex: 9998, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        className="modal-enter"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'calc(100% - 32px)', maxWidth: '400px', maxHeight: '85%',
          background: COLORS.cream, borderRadius: '12px',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(19, 37, 27, 0.35)',
        }}
      >
        <div style={{
          padding: '14px 16px', background: COLORS.green, color: COLORS.cream,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
        }}>
          <div className="title-bold" style={{ fontSize: '17px', color: COLORS.cream }}>Add to List</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: COLORS.cream, cursor: 'pointer', padding: '5px' }}>
            <XIcon size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <FieldLabel>Photo</FieldLabel>
          {image ? (
            <div style={{ position: 'relative', marginBottom: '14px' }}>
              <img src={image} alt="" style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '8px', display: 'block' }} />
              <button onClick={() => setImage(null)} style={{
                position: 'absolute', top: '8px', right: '8px',
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}><XIcon size={14} /></button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <button onClick={() => fileRef.current?.click()} style={{
                flex: 1, padding: '18px 12px', background: COLORS.creamDeep,
                border: `1px dashed ${COLORS.greenLine}`, borderRadius: '8px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                cursor: 'pointer', color: COLORS.textMuted,
              }}>
                <PlusIcon size={20} strokeWidth={1.5} />
                <span style={{ fontFamily: FONTS.sub, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>Upload</span>
              </button>
              <button onClick={openPasteZone} style={{
                flex: 1, padding: '18px 12px', background: COLORS.creamDeep,
                border: `1px dashed ${COLORS.greenLine}`, borderRadius: '8px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                cursor: 'pointer', color: COLORS.textMuted,
              }}>
                <ClipboardIcon size={18} strokeWidth={1.5} />
                <span style={{ fontFamily: FONTS.sub, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>Paste</span>
              </button>
            </div>
          )}

          {pasteZoneOpen && !image && (
            <div style={{
              marginBottom: '14px', padding: '12px', background: COLORS.creamDeep,
              border: `1px solid ${COLORS.greenLine}`, borderRadius: '8px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: FONTS.sub, fontSize: '12px', color: COLORS.textMuted, marginBottom: '8px' }}>
                Long-press below and tap <strong>Paste</strong>
              </div>
              <div
                ref={pasteRef} contentEditable onPaste={handlePasteEvent}
                style={{
                  minHeight: '48px', padding: '14px', background: COLORS.white,
                  border: `1.5px dashed ${COLORS.green}`, borderRadius: '6px',
                  fontFamily: FONTS.sub, fontSize: '13px', color: COLORS.textMuted,
                  outline: 'none', WebkitUserSelect: 'text', userSelect: 'text',
                }}
              />
              <button onClick={() => setPasteZoneOpen(false)} style={{
                marginTop: '8px', padding: '6px 16px', background: 'transparent',
                border: `1px solid ${COLORS.greenLine}`, borderRadius: '6px',
                fontFamily: FONTS.sub, fontSize: '10px', letterSpacing: '0.1em',
                textTransform: 'uppercase', fontWeight: 600, color: COLORS.textMuted, cursor: 'pointer',
              }}>Cancel</button>
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = '' }}
          />

          <FieldLabel>Brand</FieldLabel>
          <input
            value={brand} onChange={(e) => setBrand(e.target.value)}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '6px',
              border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep,
              fontFamily: FONTS.sub, fontSize: '13px', color: COLORS.text,
              outline: 'none', marginBottom: '12px',
            }}
          />

          <FieldLabel>Name</FieldLabel>
          <input
            value={title} onChange={(e) => setTitle(e.target.value)}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '6px',
              border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep,
              fontFamily: FONTS.sub, fontSize: '13px', color: COLORS.text,
              outline: 'none', marginBottom: '12px',
            }}
          />

          <FieldLabel>Product URL</FieldLabel>
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <input
              value={url} onChange={(e) => setUrl(e.target.value)}
              style={{
                width: '100%', padding: '12px 14px 12px 38px', borderRadius: '6px',
                border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep,
                fontFamily: FONTS.sub, fontSize: '13px', color: COLORS.text, outline: 'none',
              }}
            />
            <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: COLORS.textFaint }}>
              <LinkIcon size={15} />
            </div>
          </div>

          <FieldLabel>Price</FieldLabel>
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <input
              value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
              inputMode="decimal"
              style={{
                width: '100%', padding: '12px 14px 12px 30px', borderRadius: '6px',
                border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep,
                fontFamily: FONTS.sub, fontSize: '13px', color: COLORS.text, outline: 'none',
              }}
            />
            <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: COLORS.textFaint, fontFamily: FONTS.sub, fontSize: '14px', fontWeight: 600 }}>
              $
            </div>
          </div>

          <FieldLabel>Categories</FieldLabel>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {SHOPPING_CATEGORIES.map((c) => (
              <button key={c} onClick={() => toggleCategory(c)} style={{
                padding: '7px 14px', borderRadius: '999px',
                fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em',
                textTransform: 'uppercase', fontFamily: FONTS.sub,
                border: `1px solid ${selectedCategories.includes(c) ? COLORS.green : COLORS.greenLine}`,
                background: selectedCategories.includes(c) ? COLORS.green : COLORS.creamDeep,
                color: selectedCategories.includes(c) ? COLORS.cream : COLORS.green,
                cursor: 'pointer', transition: 'all 0.15s',
              }}>{c}</button>
            ))}
          </div>

          <FieldLabel>Type</FieldLabel>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <button onClick={() => setAddTagOpen(true)} style={{
              padding: '6px 12px', borderRadius: '999px',
              fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em',
              fontFamily: FONTS.sub, border: `1px dashed ${COLORS.greenLine}`,
              background: COLORS.creamDeep, color: COLORS.textMuted,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              <PlusIcon size={12} strokeWidth={2} /> New
            </button>
            {tags.map((t) => (
              <button key={t} onClick={() => toggleTag(t)} style={{
                padding: '6px 12px', borderRadius: '999px',
                fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em',
                fontFamily: FONTS.sub,
                border: `1px solid ${selectedTags.includes(t) ? COLORS.green : COLORS.greenLine}`,
                background: selectedTags.includes(t) ? COLORS.green : COLORS.creamDeep,
                color: selectedTags.includes(t) ? COLORS.cream : COLORS.textMuted,
                cursor: 'pointer', transition: 'all 0.15s',
              }}>{t}</button>
            ))}
          </div>

          <FieldLabel>Colors</FieldLabel>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
            {DEFAULT_COLORS.map((c) => (
              <button key={c} onClick={() => toggleColor(c)} style={{
                padding: '6px 12px', borderRadius: '999px',
                fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em',
                fontFamily: FONTS.sub,
                border: `1px solid ${selectedColors.includes(c) ? COLORS.green : COLORS.greenLine}`,
                background: selectedColors.includes(c) ? COLORS.green : COLORS.creamDeep,
                color: selectedColors.includes(c) ? COLORS.cream : COLORS.textMuted,
                cursor: 'pointer', transition: 'all 0.15s',
              }}>{c}</button>
            ))}
          </div>
        </div>

        <div style={{
          padding: '12px 16px', borderTop: `1px solid ${COLORS.greenLine}`,
          display: 'flex', gap: '8px', background: COLORS.cream, flexShrink: 0,
        }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '11px', background: 'transparent',
            border: `1px solid ${COLORS.greenLine}`, borderRadius: '6px',
            fontFamily: FONTS.sub, fontSize: '11.5px', letterSpacing: '0.14em',
            textTransform: 'uppercase', fontWeight: 600, color: COLORS.green, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleSave} disabled={!canSave} style={{
            flex: 1, padding: '11px',
            background: canSave ? COLORS.green : COLORS.greenLine,
            color: COLORS.cream, border: 'none', borderRadius: '6px',
            fontFamily: FONTS.sub, fontSize: '11.5px', letterSpacing: '0.14em',
            textTransform: 'uppercase', fontWeight: 600,
            cursor: canSave ? 'pointer' : 'not-allowed', opacity: canSave ? 1 : 0.6,
          }}>Save</button>
        </div>
      </div>
      {addTagOpen && (
        <AddTagPopup
          existingTags={tags}
          onAdd={handleAddTag}
          onClose={() => setAddTagOpen(false)}
        />
      )}
    </div>,
    document.body
  )
}

const GRID_COLS_KEY = 'garmint_wishlist_cols'

const GridSizeControl = ({ cols, onChange }) => {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <CircleButton onClick={() => setOpen(!open)}>
        <GridIcon size={16} strokeWidth={1.6} />
      </CircleButton>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
          <div style={{
            position: 'absolute', top: '44px', right: 0, zIndex: 51,
            background: COLORS.cream, borderRadius: '10px',
            border: `1px solid ${COLORS.greenLine}`,
            boxShadow: '0 8px 24px rgba(19, 37, 27, 0.15)',
            padding: '14px 16px', width: '180px',
          }}>
            <div style={{
              fontFamily: FONTS.sub, fontSize: '10px', textTransform: 'uppercase',
              letterSpacing: '0.16em', fontWeight: 600, color: COLORS.textMuted, marginBottom: '10px',
            }}>
              Columns: {cols}
            </div>
            <input
              type="range"
              min={1}
              max={8}
              value={cols}
              onChange={(e) => onChange(Number(e.target.value))}
              style={{
                width: '100%', accentColor: COLORS.green, cursor: 'pointer',
              }}
            />
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontFamily: FONTS.sub, fontSize: '9px', color: COLORS.textFaint, marginTop: '2px',
            }}>
              <span>1</span><span>8</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const DraggableWishlistGrid = ({ items, cols, onSelect, onReorder, onUpdate }) => {
  const gridRef = useRef(null)
  const dragState = useRef(null)
  const dragging = useRef(false)
  const [dragIdx, setDragIdx] = useState(null)
  const [hoverIdx, setHoverIdx] = useState(null)
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 })
  const longPressTimer = useRef(null)

  const getCellSize = useCallback(() => {
    if (!gridRef.current) return { w: 0, h: 0, left: 0, top: 0 }
    const rect = gridRef.current.getBoundingClientRect()
    const gap = 10
    const w = (rect.width - gap * (cols - 1)) / cols
    const h = w * (4 / 3) // aspect-ratio 3:4
    return { w, h, cols, gap, left: rect.left, top: rect.top }
  }, [cols])

  const getIndexFromPos = useCallback((clientX, clientY) => {
    const { w, h, gap, left, top } = getCellSize()
    const scrollTop = gridRef.current?.parentElement?.scrollTop || 0
    const col = Math.floor((clientX - left) / (w + gap))
    const row = Math.floor((clientY - top + scrollTop) / (h + gap))
    const idx = row * cols + Math.min(Math.max(col, 0), cols - 1)
    return Math.min(Math.max(idx, 0), items.length - 1)
  }, [items.length, cols, getCellSize])

  const startDrag = useCallback((idx, clientX, clientY) => {
    const { w, h, gap, left, top } = getCellSize()
    const col = idx % cols
    const row = Math.floor(idx / cols)
    const cellX = left + col * (w + gap)
    const cellY = top + row * (h + gap)
    dragState.current = { offsetX: clientX - cellX, offsetY: clientY - cellY }
    dragging.current = true
    setDragIdx(idx)
    setHoverIdx(idx)
    setDragPos({ x: cellX, y: cellY })
  }, [cols, getCellSize])

  const moveDrag = useCallback((clientX, clientY) => {
    if (!dragState.current || dragIdx === null) return
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
    setTimeout(() => { dragging.current = false }, 50)
    setDragIdx(null)
    setHoverIdx(null)
  }, [dragIdx, hoverIdx, items, onReorder])

  const handleMouseDown = useCallback((e, idx) => {
    e.preventDefault()
    longPressTimer.current = setTimeout(() => startDrag(idx, e.clientX, e.clientY), 200)
  }, [startDrag])

  useEffect(() => {
    const onMove = (e) => {
      if (dragIdx !== null) {
        moveDrag(e.clientX, e.clientY)
      } else if (longPressTimer.current) {
        // Cancel long press if mouse moves before drag starts
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }
    const onUp = () => { if (dragIdx !== null) endDrag() }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [dragIdx, moveDrag, endDrag])

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    let touchIdx = null
    const onTouchStart = (e) => {
      const cell = e.target.closest('[data-idx]')
      if (!cell) return
      touchIdx = Number(cell.dataset.idx)
      const touch = e.touches[0]
      longPressTimer.current = setTimeout(() => startDrag(touchIdx, touch.clientX, touch.clientY), 300)
    }
    const onTouchMove = (e) => {
      if (dragIdx !== null || dragState.current) {
        e.preventDefault()
        moveDrag(e.touches[0].clientX, e.touches[0].clientY)
      } else {
        clearTimeout(longPressTimer.current)
      }
    }
    const onTouchEnd = () => {
      clearTimeout(longPressTimer.current)
      if (dragIdx !== null) { endDrag() }
      else if (touchIdx !== null && items[touchIdx]) { onSelect(items[touchIdx]) }
      touchIdx = null
    }
    grid.addEventListener('touchstart', onTouchStart, { passive: true })
    grid.addEventListener('touchmove', onTouchMove, { passive: false })
    grid.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => { grid.removeEventListener('touchstart', onTouchStart); grid.removeEventListener('touchmove', onTouchMove); grid.removeEventListener('touchend', onTouchEnd) }
  }, [dragIdx, items, startDrag, moveDrag, endDrag, onSelect])

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

  return (
    <div style={{ position: 'relative' }}>
      <div ref={gridRef} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '10px' }}>
        {items.map((item, idx) => {
          const isDragging = dragIdx === idx
          const cellW = gridRef.current ? (gridRef.current.offsetWidth - 10 * (cols - 1)) / cols : 0
          const cellH = cellW * (4 / 3)
          return (
            <div
              key={item.id}
              data-idx={idx}
              onMouseDown={(e) => handleMouseDown(e, idx)}
              onMouseUp={() => { clearTimeout(longPressTimer.current); if (!dragging.current) onSelect(item) }}
              style={{
                opacity: isDragging ? 0.3 : 1,
                transform: dragIdx !== null && !isDragging
                  ? (() => {
                      const displayIdx = getDisplayIndex(idx)
                      if (displayIdx === idx) return 'none'
                      const fromCol = idx % cols
                      const fromRow = Math.floor(idx / cols)
                      const toCol = displayIdx % cols
                      const toRow = Math.floor(displayIdx / cols)
                      const dx = (toCol - fromCol) * (cellW + 10)
                      const dy = (toRow - fromRow) * (cellH + 10)
                      return `translate(${dx}px, ${dy}px)`
                    })()
                  : 'none',
                transition: dragIdx !== null ? 'transform 0.2s ease, opacity 0.15s' : 'none',
                WebkitUserSelect: 'none', userSelect: 'none',
              }}
            >
              <WishlistTile item={item} onClick={() => {}} cols={cols} onUpdate={onUpdate} />
            </div>
          )
        })}
      </div>
      {dragIdx !== null && items[dragIdx] && (() => {
        const cellW = gridRef.current ? (gridRef.current.offsetWidth - 10 * (cols - 1)) / cols : 120
        const cellH = cellW * (4 / 3)
        return (
          <div style={{
            position: 'fixed', left: dragPos.x, top: dragPos.y,
            width: cellW, height: cellH, zIndex: 9999, pointerEvents: 'none',
            borderRadius: '8px', overflow: 'hidden',
            boxShadow: '0 12px 32px rgba(19, 37, 27, 0.35)',
            transform: 'scale(1.05)', opacity: 0.92,
          }}>
            <WishlistTile item={items[dragIdx]} onClick={() => {}} cols={cols} onUpdate={null} />
          </div>
        )
      })()}
    </div>
  )
}

export const ShoppingPage = ({ items, pasteOpen, onPasteOpenChange, onSave, onSelectItem, onReorder, onUpdate }) => {
  const [catFilter, setCatFilter] = useState([])
  const [tagFilter, setTagFilter] = useState([])
  const [gridCols, setGridCols] = useState(() => {
    const saved = localStorage.getItem(GRID_COLS_KEY)
    return saved ? Number(saved) : 3
  })
  const allTags = loadTags()

  const handleGridColsChange = (n) => {
    setGridCols(n)
    localStorage.setItem(GRID_COLS_KEY, n)
  }

  const filtered = useMemo(() => {
    let result = items
    if (catFilter.length > 0) {
      result = result.filter((i) => {
        if (i.categories) return i.categories.some((c) => catFilter.includes(c))
        return catFilter.includes(i.category)
      })
    }
    if (tagFilter.length > 0) {
      result = result.filter((i) => i.tags && i.tags.some((t) => tagFilter.includes(t)))
    }
    return result
  }, [catFilter, tagFilter, items])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 className="title-bold" style={{ fontSize: '34px', margin: 0, color: COLORS.text, lineHeight: 1.0 }}>
            List
          </h2>
          <p style={{
            fontFamily: FONTS.sub, fontSize: '11px', color: COLORS.textMuted,
            margin: '8px 0 0', textTransform: 'uppercase',
            letterSpacing: '0.22em', fontWeight: 500,
          }}>
            What you're eyeing
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <GridSizeControl cols={gridCols} onChange={handleGridColsChange} />
          <CircleButton onClick={() => onPasteOpenChange(true)}>
            <PlusIcon size={18} strokeWidth={1.8} />
          </CircleButton>
        </div>
      </div>

      {/* Two filter dropdowns */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <FilterDropdown
          label="All categories"
          options={SHOPPING_CATEGORIES}
          selected={catFilter}
          onChange={setCatFilter}
        />
        <FilterDropdown
          label="Any tag"
          options={allTags}
          selected={tagFilter}
          onChange={setTagFilter}
        />
      </div>

      {filtered.length === 0 ? (
        <div
          className="tile"
          style={{ padding: '40px 20px', textAlign: 'center', color: COLORS.textMuted, fontStyle: 'italic', fontSize: '13.5px' }}
        >
          {items.length === 0 ? 'No items yet. Tap + to add something.' : 'No items match these filters.'}
        </div>
      ) : (
        <DraggableWishlistGrid
          items={filtered}
          cols={gridCols}
          onSelect={onSelectItem}
          onReorder={onReorder}
          onUpdate={onUpdate}
        />
      )}

      {pasteOpen && (
        <AddWishlistModal
          onClose={() => onPasteOpenChange(false)}
          onSave={(item) => { onSave(item); onPasteOpenChange(false) }}
        />
      )}
    </div>
  )
}
