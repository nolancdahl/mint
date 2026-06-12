import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { COLORS, FONTS } from '../lib/theme'
import { SHOPPING_CATEGORIES } from '../lib/constants'
import { FieldLabel } from '../components/Primitives'
import { LinkIcon, PlusIcon, XIcon, ClipboardIcon, ChevronDown, ChevronLeft, ChevronRight, GridIcon, TagIcon, TypeIcon, SparklesIcon, PaletteIcon } from '../components/Icons'
import { fileToResizedDataUrl, loadJson, saveJson } from '../lib/storage'
import { uploadImageToStorage } from '../lib/sync'
import { useSyncedJson } from '../lib/useSyncedJson'
import { useAuth } from '../components/AuthGate'
import { createPortal } from 'react-dom'
import { CropOverlay } from '../components/CropOverlay'
import { STYLE_OPTION_ICONS, CATEGORY_OPTION_ICONS, COLOR_SWATCHES } from './ClosetPage'
import { useScrollGuard } from '../lib/useScrollGuard'

// Same visual-per-option logic as Closet's FilterDropdown.
const optionVisual = (kind, opt) => {
  if (kind === 'colors') {
    const swatch = (COLOR_SWATCHES[opt] || opt || '').toString()
    return (
      <span style={{
        display: 'inline-block', width: '14px', height: '14px', borderRadius: '50%',
        background: swatch, border: `1px solid ${COLORS.greenLine}`, flexShrink: 0,
      }} />
    )
  }
  const IconComp = (kind === 'styles' ? STYLE_OPTION_ICONS : CATEGORY_OPTION_ICONS)[opt] || (kind === 'styles' ? SparklesIcon : TagIcon)
  return <IconComp size={14} strokeWidth={1.8} style={{ flexShrink: 0 }} />
}

// See ClosetPage.uploadImageList for the rationale — keeps the Firestore doc under 1MB.
const uploadImageList = async (images, user) => {
  if (!user || !images || images.length === 0) return images
  return Promise.all(images.map(async (img) => {
    if (typeof img === 'string' && img.startsWith('data:')) {
      try { return await uploadImageToStorage(user.uid, img) } catch (e) { console.warn('image upload failed, keeping data URL', e); return img }
    }
    return img
  }))
}

const TAGS_KEY = 'garmint_wishlist_tags_v1'
const COLORS_KEY = 'garmint_wishlist_colors_v1'
const CATEGORIES_KEY = 'garmint_wishlist_cats_v1'
const SIZES_KEY = 'garmint_sizes_v1'
const DEFAULT_TAGS = ['Chinos', 'Hats', 'Jackets', 'Jeans', 'Shoes', 'Shorts', 'Soccer Shorts', 'Sweaters', 'T-Shirts']
const DEFAULT_COLORS = ['Beige', 'Black', 'Blue', 'Brown', 'Burgundy', 'Charcoal', 'Cream', 'Gold', 'Gray', 'Green', 'Ivory', 'Khaki', 'Maroon', 'Navy', 'Olive', 'Orange', 'Pink', 'Purple', 'Red', 'Rust', 'Silver', 'Tan', 'Teal', 'White', 'Yellow']
const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL']

const loadTags = () => {
  const saved = loadJson(TAGS_KEY)
  return saved.length > 0 ? saved : DEFAULT_TAGS
}

const loadColors = () => {
  const saved = loadJson(COLORS_KEY)
  return saved.length > 0 ? saved : DEFAULT_COLORS
}

const loadCategories = () => {
  const saved = loadJson(CATEGORIES_KEY)
  return saved.length > 0 ? saved : SHOPPING_CATEGORIES
}

const loadSizes = () => {
  const saved = loadJson(SIZES_KEY)
  return saved.length > 0 ? saved : DEFAULT_SIZES
}

// Get all images for an item (handles both legacy `image` and new `images` array)
const getImages = (item) => {
  if (item.images && item.images.length > 0) return item.images
  if (item.image) return [item.image]
  return []
}

const WishlistTile = ({ item, onClick, cols = 3, onUpdate }) => {
  const images = getImages(item)
  const displayIdx = item.displayImageIndex || 0
  const currentImg = images[displayIdx] || images[0]
  const hasMultiple = images.length > 1
  const [hovered, setHovered] = useState(false)
  const guard = useScrollGuard(onClick)

  const goLeft = (e) => {
    e.stopPropagation()
    const newIdx = (displayIdx - 1 + images.length) % images.length
    onUpdate && onUpdate({ ...item, displayImageIndex: newIdx })
  }
  const goRight = (e) => {
    e.stopPropagation()
    const newIdx = (displayIdx + 1) % images.length
    onUpdate && onUpdate({ ...item, displayImageIndex: newIdx })
  }

  const overlay = (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      padding: '33px 15px 12px',
      background: 'linear-gradient(to top, rgba(19,37,27,0.78), transparent)',
      color: COLORS.cream, zIndex: 1,
    }}>
      {item.brand && (
        <div style={{
          fontFamily: FONTS.sub, fontSize: '10px', opacity: 0.7,
          textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 600,
        }}>
          {item.brand}
        </div>
      )}
      <div style={{
        fontFamily: FONTS.sub, fontSize: '13.5px', fontWeight: 600, lineHeight: 1.2,
        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        marginTop: item.brand ? '2px' : 0,
      }}>
        {item.title}
      </div>
      <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
        {item.price && (
          <span style={{
            fontFamily: FONTS.sub, fontSize: '10px', padding: '3px 10px',
            background: 'rgba(46,204,113,0.35)', borderRadius: '999px',
            fontWeight: 700, letterSpacing: '0.02em',
          }}>${Math.ceil(Number(item.price))}</span>
        )}
        {item.tags && item.tags.map((t) => (
          <span key={t} style={{
            fontFamily: FONTS.sub, fontSize: '9px', padding: '3px 9px',
            background: 'rgba(244,238,224,0.25)', borderRadius: '999px',
            letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
          }}>{t}</span>
        ))}
      </div>
    </div>
  )

  const arrowBtn = {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    width: '24px', height: '24px', borderRadius: '50%',
    background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', zIndex: 3, padding: 0,
    transition: 'opacity 0.15s',
  }

  return (
    <div
      onPointerDown={guard.onPointerDown}
      onClick={guard.onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="tile"
      style={{
        aspectRatio: '3/4', overflow: 'hidden', cursor: 'pointer',
        padding: 0, display: 'flex', flexDirection: 'column', position: 'relative',
      }}
    >
      {currentImg ? (
        <CropOverlay
          src={currentImg}
          cropX={item.cropX}
          cropY={item.cropY}
          cropZoom={item.cropZoom}
          onSave={(cx, cy, cz) => onUpdate && onUpdate({ ...item, cropX: cx, cropY: cy, cropZoom: cz })}
        >
          {overlay}
          {/* Multi-image arrows on hover */}
          {hasMultiple && hovered && (
            <>
              <button onClick={goLeft} onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()} style={{ ...arrowBtn, left: '6px' }}>
                <ChevronLeft size={14} strokeWidth={2.5} />
              </button>
              <button onClick={goRight} onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()} style={{ ...arrowBtn, right: '6px' }}>
                <ChevronRight size={14} strokeWidth={2.5} />
              </button>
              {/* Dot indicators */}
              <div style={{
                position: 'absolute', bottom: '6px', left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: '4px', zIndex: 3,
              }}>
                {images.map((_, i) => (
                  <div key={i} style={{
                    width: '5px', height: '5px', borderRadius: '50%',
                    background: i === displayIdx ? '#fff' : 'rgba(255,255,255,0.4)',
                    transition: 'background 0.15s',
                  }} />
                ))}
              </div>
            </>
          )}
        </CropOverlay>
      ) : (
        <>
          <div style={{
            width: '100%', height: '100%', background: COLORS.creamDeep,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textFaint,
          }}>
            <LinkIcon size={28} strokeWidth={1.2} />
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
const FilterDropdown = ({ label, options, selected, onChange, icon: IconComp, optionKind }) => {
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
    <div style={{ flex: 1, position: 'relative', zIndex: open ? 52 : 'auto' }}>
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
          transition: 'background 0.3s ease, color 0.3s ease, border-color 0.3s ease',
          position: 'relative', zIndex: 3,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', minWidth: 0, justifyContent: 'center' }}>
          {IconComp && <IconComp size={13} strokeWidth={1.8} style={{ flexShrink: 0 }} />}
          <span className="mint-filter-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayLabel}</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
          {selected.length > 0 && (
            <span
              onClick={(e) => { e.stopPropagation(); onChange([]); setOpen(false) }}
              style={{
                width: '16px', height: '16px', borderRadius: '50%',
                background: 'rgba(244,238,224,0.3)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            ><XIcon size={10} strokeWidth={2.5} /></span>
          )}
          <ChevronDown size={14} strokeWidth={2} />
        </div>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1 }} />
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            marginTop: 0, background: COLORS.cream, borderRadius: '0 0 8px 8px',
            border: `1px solid ${COLORS.greenLine}`,
            boxShadow: '0 8px 24px rgba(19, 37, 27, 0.15)',
            zIndex: 2, maxHeight: '200px', overflowY: 'auto',
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
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                  {optionKind && optionVisual(optionKind, opt)}
                  {opt}
                </span>
                {selected.includes(opt) && <span style={{ color: COLORS.green, fontWeight: 700 }}>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Add new item mini-modal (used for tags and colors)
const AddItemPopup = ({ label, placeholder, onAdd, onClose }) => {
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
        }}>{label}</div>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
          placeholder={placeholder}
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

const AddWishlistModal = ({ onClose, onSave }) => {
  const user = useAuth()
  const fileRef = useRef(null)
  const pasteRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const [url, setUrl] = useState('')
  const [brand, setBrand] = useState('')
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [images, setImages] = useState([])
  const [previewIdx, setPreviewIdx] = useState(0)
  // Synced across List + Closet (and across devices) via Firestore.
  const [categories, setCategories] = useSyncedJson(CATEGORIES_KEY, SHOPPING_CATEGORIES)
  const [selectedCategories, setSelectedCategories] = useState([])
  const [tags, setTags] = useSyncedJson(TAGS_KEY, DEFAULT_TAGS)
  const [selectedTags, setSelectedTags] = useState([])
  const [colors, setColors] = useSyncedJson(COLORS_KEY, DEFAULT_COLORS)
  const [selectedColors, setSelectedColors] = useState([])
  const [sizes, setSizes] = useSyncedJson(SIZES_KEY, DEFAULT_SIZES)
  const [selectedSizes, setSelectedSizes] = useState([])
  const [pasteZoneOpen, setPasteZoneOpen] = useState(false)
  const [addTagOpen, setAddTagOpen] = useState(false)
  const [addColorOpen, setAddColorOpen] = useState(false)
  const [addCatOpen, setAddCatOpen] = useState(false)
  const [addSizeOpen, setAddSizeOpen] = useState(false)

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

  const toggleSize = (s) => {
    setSelectedSizes((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }

  const handleAddSize = (name) => {
    setSizes((prev) => (prev || []).includes(name) ? prev : [...(prev || []), name])
    if (!selectedSizes.includes(name)) setSelectedSizes((p) => [...p, name])
  }
  const handleAddTag = (name) => {
    setTags((prev) => (prev || []).includes(name) ? prev : [...(prev || []), name].sort((a, b) => a.localeCompare(b)))
    if (!selectedTags.includes(name)) setSelectedTags((p) => [...p, name])
  }
  const handleAddColor = (name) => {
    setColors((prev) => (prev || []).includes(name) ? prev : [...(prev || []), name].sort((a, b) => a.localeCompare(b)))
    if (!selectedColors.includes(name)) setSelectedColors((p) => [...p, name])
  }
  const handleAddCategory = (name) => {
    setCategories((prev) => (prev || []).includes(name) ? prev : [...(prev || []), name].sort((a, b) => a.localeCompare(b)))
    if (!selectedCategories.includes(name)) setSelectedCategories((p) => [...p, name])
  }

  const handleFile = async (file) => {
    if (!file.type.startsWith('image/')) return
    const dataUrl = await fileToResizedDataUrl(file, 800, 0.85)
    setImages((prev) => { const next = [...prev, dataUrl]; setPreviewIdx(next.length - 1); return next })
  }

  const handleFiles = async (files) => {
    for (const file of files) await handleFile(file)
  }

  const handlePasteEvent = async (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) await handleFile(file)
      }
    }
    if (pasteRef.current) pasteRef.current.innerHTML = ''
  }

  const openPasteZone = () => {
    setPasteZoneOpen(true)
    setTimeout(() => { if (pasteRef.current) pasteRef.current.focus() }, 100)
  }

  const canSave = !!(title || url || brand || images.length > 0)

  const handleSave = async () => {
    if (!canSave || saving) return
    setSaving(true)
    try {
      const finalImages = await uploadImageList(images, user)
      onSave({
        id: Date.now().toString(),
        url: url || null,
        title: title || brand || url || 'Untitled',
        brand: brand || null,
        image: finalImages[0] || null,
        images: finalImages.length > 0 ? finalImages : null,
        displayImageIndex: 0,
        price: price || null,
        publisher: null,
        description: '',
        category: selectedCategories[0] || null,
        categories: selectedCategories,
        tags: selectedTags,
        colors: selectedColors,
        sizes: selectedSizes,
        notes: notes || null,
        addedAt: new Date().toISOString(),
      })
    } finally {
      setSaving(false)
    }
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
          <FieldLabel>Photos</FieldLabel>
          {images.length > 0 && (
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <img src={images[previewIdx]} alt="" style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', borderRadius: '8px', display: 'block', background: COLORS.creamDeep }} />
              <button onClick={() => {
                setImages((prev) => { const next = prev.filter((_, i) => i !== previewIdx); setPreviewIdx(Math.min(previewIdx, next.length - 1)); return next })
              }} style={{
                position: 'absolute', top: '8px', right: '8px',
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}><XIcon size={14} /></button>
              {images.length > 1 && (
                <>
                  <button onClick={() => setPreviewIdx((previewIdx - 1 + images.length) % images.length)} style={{
                    position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)',
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}><ChevronLeft size={14} strokeWidth={2.5} /></button>
                  <button onClick={() => setPreviewIdx((previewIdx + 1) % images.length)} style={{
                    position: 'absolute', right: '40px', top: '50%', transform: 'translateY(-50%)',
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}><ChevronRight size={14} strokeWidth={2.5} /></button>
                  <div style={{
                    position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)',
                    display: 'flex', gap: '4px',
                  }}>
                    {images.map((_, i) => (
                      <div key={i} style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: i === previewIdx ? '#fff' : 'rgba(255,255,255,0.4)',
                      }} />
                    ))}
                  </div>
                </>
              )}
              <div style={{
                fontFamily: FONTS.sub, fontSize: '10px', color: COLORS.textFaint,
                textAlign: 'center', marginTop: '4px',
              }}>{previewIdx + 1} / {images.length}</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            <button onClick={() => fileRef.current?.click()} style={{
              flex: 1, padding: images.length > 0 ? '10px 12px' : '18px 12px', background: COLORS.creamDeep,
              border: `1px solid ${COLORS.greenLine}`, borderRadius: '8px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
              cursor: 'pointer', color: COLORS.textMuted,
            }}>
              <PlusIcon size={images.length > 0 ? 16 : 20} strokeWidth={1.5} />
              <span style={{ fontFamily: FONTS.sub, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>Upload</span>
            </button>
            {!pasteZoneOpen ? (
              <button onClick={openPasteZone} style={{
                flex: 1, padding: images.length > 0 ? '10px 12px' : '18px 12px', background: COLORS.creamDeep,
                border: `1px solid ${COLORS.greenLine}`, borderRadius: '8px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                cursor: 'pointer', color: COLORS.textMuted,
              }}>
                <ClipboardIcon size={images.length > 0 ? 14 : 18} strokeWidth={1.5} />
                <span style={{ fontFamily: FONTS.sub, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>Paste</span>
              </button>
            ) : (
              <div
                ref={pasteRef} contentEditable onPaste={handlePasteEvent}
                style={{
                  flex: 1, padding: '10px', background: COLORS.white,
                  border: `1.5px solid ${COLORS.greenLine}`, borderRadius: '8px',
                  fontFamily: FONTS.sub, fontSize: '11px', color: COLORS.textFaint,
                  outline: 'none', WebkitUserSelect: 'text', userSelect: 'text',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  textAlign: 'center', minHeight: 0,
                }}
              />
            )}
          </div>

          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files.length) handleFiles([...e.target.files]); e.target.value = '' }}
          />

          <FieldLabel>Brand</FieldLabel>
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <input
              value={brand} onChange={(e) => setBrand(e.target.value)}
              style={{
                width: '100%', padding: '12px 14px 12px 38px', borderRadius: '6px',
                border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep,
                fontFamily: FONTS.sub, fontSize: '13px', color: COLORS.text, outline: 'none',
              }}
            />
            <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: COLORS.textFaint }}>
              <TagIcon size={15} />
            </div>
          </div>

          <FieldLabel>Name</FieldLabel>
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <input
              value={title} onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%', padding: '12px 14px 12px 38px', borderRadius: '6px',
                border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep,
                fontFamily: FONTS.sub, fontSize: '13px', color: COLORS.text, outline: 'none',
              }}
            />
            <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: COLORS.textFaint }}>
              <TypeIcon size={15} />
            </div>
          </div>

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

          <FieldLabel>Sizes</FieldLabel>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <button onClick={() => setAddSizeOpen(true)} style={{
              width: '28px', height: '28px', borderRadius: '50%', padding: 0,
              fontSize: '11px', fontWeight: 600,
              fontFamily: FONTS.sub, border: `1px solid ${COLORS.greenLine}`,
              background: COLORS.creamDeep, color: COLORS.textMuted,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <PlusIcon size={12} strokeWidth={2} />
            </button>
            {sizes.map((s) => (
              <button key={s} onClick={() => toggleSize(s)} style={{
                padding: '6px 12px', borderRadius: '999px',
                fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em',
                fontFamily: FONTS.sub,
                border: `1px solid ${selectedSizes.includes(s) ? COLORS.green : COLORS.greenLine}`,
                background: selectedSizes.includes(s) ? COLORS.green : COLORS.creamDeep,
                color: selectedSizes.includes(s) ? COLORS.cream : COLORS.textMuted,
                cursor: 'pointer', transition: 'all 0.15s',
              }}>{s}</button>
            ))}
          </div>

          <FieldLabel>Notes</FieldLabel>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Fit, material, occasion, anything to remember..."
            rows={3}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '6px',
              border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep,
              fontFamily: FONTS.sub, fontSize: '13px', color: COLORS.text, outline: 'none',
              resize: 'vertical', marginBottom: '14px', boxSizing: 'border-box',
            }}
          />

          <FieldLabel>Categories</FieldLabel>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <button onClick={() => setAddCatOpen(true)} style={{
              width: '28px', height: '28px', borderRadius: '50%', padding: 0,
              fontSize: '11px', fontWeight: 600,
              fontFamily: FONTS.sub, border: `1px solid ${COLORS.greenLine}`,
              background: COLORS.creamDeep, color: COLORS.textMuted,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <PlusIcon size={12} strokeWidth={2} />
            </button>
            {categories.map((c) => (
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
              width: '28px', height: '28px', borderRadius: '50%', padding: 0,
              fontSize: '11px', fontWeight: 600,
              fontFamily: FONTS.sub, border: `1px solid ${COLORS.greenLine}`,
              background: COLORS.creamDeep, color: COLORS.textMuted,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <PlusIcon size={12} strokeWidth={2} />
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
            <button onClick={() => setAddColorOpen(true)} style={{
              width: '28px', height: '28px', borderRadius: '50%', padding: 0,
              fontSize: '11px', fontWeight: 600,
              fontFamily: FONTS.sub, border: `1px solid ${COLORS.greenLine}`,
              background: COLORS.creamDeep, color: COLORS.textMuted,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <PlusIcon size={12} strokeWidth={2} />
            </button>
            {colors.map((c) => (
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
          <button onClick={onClose} disabled={saving} style={{
            flex: 1, padding: '11px', background: 'transparent',
            border: `1px solid ${COLORS.greenLine}`, borderRadius: '6px',
            fontFamily: FONTS.sub, fontSize: '11.5px', letterSpacing: '0.14em',
            textTransform: 'uppercase', fontWeight: 600, color: COLORS.green,
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
          }}>Cancel</button>
          <button onClick={handleSave} disabled={!canSave || saving} style={{
            flex: 1, padding: '11px',
            background: (canSave && !saving) ? COLORS.green : COLORS.greenLine,
            color: COLORS.cream, border: 'none', borderRadius: '6px',
            fontFamily: FONTS.sub, fontSize: '11.5px', letterSpacing: '0.14em',
            textTransform: 'uppercase', fontWeight: 600,
            cursor: (canSave && !saving) ? 'pointer' : 'not-allowed', opacity: (canSave && !saving) ? 1 : 0.6,
          }}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
      {addTagOpen && (
        <AddItemPopup
          label="New type"
          placeholder="e.g. Linen, Workwear..."
          onAdd={handleAddTag}
          onClose={() => setAddTagOpen(false)}
        />
      )}
      {addColorOpen && (
        <AddItemPopup
          label="New color"
          placeholder="e.g. Coral, Sage..."
          onAdd={handleAddColor}
          onClose={() => setAddColorOpen(false)}
        />
      )}
      {addCatOpen && (
        <AddItemPopup
          label="New category"
          placeholder="e.g. Formal, Streetwear..."
          onAdd={handleAddCategory}
          onClose={() => setAddCatOpen(false)}
        />
      )}
      {addSizeOpen && (
        <AddItemPopup
          label="New size"
          placeholder="e.g. 34x30 slim, 10.5..."
          onAdd={handleAddSize}
          onClose={() => setAddSizeOpen(false)}
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
          <div className="dropdown-enter" style={{
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
  const dragIdxRef = useRef(null)
  const hoverIdxRef = useRef(null)

  const getCellSize = useCallback(() => {
    if (!gridRef.current) return { w: 0, h: 0, left: 0, top: 0 }
    const rect = gridRef.current.getBoundingClientRect()
    const gap = 10
    const w = (rect.width - gap * (cols - 1)) / cols
    const h = w * (4 / 3)
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
    dragIdxRef.current = idx
    hoverIdxRef.current = idx
    setDragIdx(idx)
    setHoverIdx(idx)
    setDragPos({ x: cellX, y: cellY })
  }, [cols, getCellSize])

  const moveDrag = useCallback((clientX, clientY) => {
    if (!dragState.current || dragIdxRef.current === null) return
    const { offsetX, offsetY } = dragState.current
    setDragPos({ x: clientX - offsetX, y: clientY - offsetY })
    const newHover = getIndexFromPos(clientX, clientY)
    hoverIdxRef.current = newHover
    setHoverIdx(newHover)
  }, [getIndexFromPos])

  const endDrag = useCallback(() => {
    clearTimeout(longPressTimer.current)
    const dIdx = dragIdxRef.current
    const hIdx = hoverIdxRef.current
    if (dIdx !== null && hIdx !== null && dIdx !== hIdx) {
      const newItems = [...items]
      const [moved] = newItems.splice(dIdx, 1)
      newItems.splice(hIdx, 0, moved)
      onReorder(newItems)
    }
    dragState.current = null
    dragIdxRef.current = null
    hoverIdxRef.current = null
    setTimeout(() => { dragging.current = false }, 50)
    setDragIdx(null)
    setHoverIdx(null)
  }, [items, onReorder])

  const mouseStart = useRef(null)
  const handleMouseDown = useCallback((e, idx) => {
    e.preventDefault()
    const cx = e.clientX, cy = e.clientY
    mouseStart.current = { x: cx, y: cy }
    longPressTimer.current = setTimeout(() => startDrag(idx, cx, cy), 200)
  }, [startDrag])

  useEffect(() => {
    const onMove = (e) => {
      if (dragIdxRef.current !== null) {
        moveDrag(e.clientX, e.clientY)
      } else if (longPressTimer.current && mouseStart.current) {
        const dx = e.clientX - mouseStart.current.x
        const dy = e.clientY - mouseStart.current.y
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
          clearTimeout(longPressTimer.current)
          longPressTimer.current = null
        }
      }
    }
    const onUp = () => { if (dragIdxRef.current !== null) endDrag() }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [moveDrag, endDrag])

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    let touchIdx = null
    let touchStart = null // { x, y } — to tell a tap from a scroll/drag
    const TAP_SLOP = 10 // px — finger may wander this much and still count as a tap
    const onTouchStart = (e) => {
      const cell = e.target.closest('[data-idx]')
      if (!cell) return
      touchIdx = Number(cell.dataset.idx)
      const touch = e.touches[0]
      touchStart = { x: touch.clientX, y: touch.clientY }
      longPressTimer.current = setTimeout(() => startDrag(touchIdx, touch.clientX, touch.clientY), 300)
    }
    const onTouchMove = (e) => {
      if (dragIdxRef.current !== null || dragState.current) {
        e.preventDefault()
        moveDrag(e.touches[0].clientX, e.touches[0].clientY)
      } else {
        // Moved before the long-press fired → scroll, not a tap. Cancel the pending drag
        // and mark the gesture so touchend won't open the item.
        if (touchStart) {
          const touch = e.touches[0]
          if (Math.abs(touch.clientX - touchStart.x) > TAP_SLOP || Math.abs(touch.clientY - touchStart.y) > TAP_SLOP) {
            touchStart = null
          }
        }
        clearTimeout(longPressTimer.current)
      }
    }
    const onTouchEnd = (e) => {
      clearTimeout(longPressTimer.current)
      if (dragIdxRef.current !== null) { endDrag() }
      // Only a genuine tap opens the item; touchStart is nulled once the finger scrolls.
      // preventDefault suppresses the synthesized ghost click that would close the modal.
      else if (touchStart && touchIdx !== null && items[touchIdx]) { e.preventDefault(); onSelect(items[touchIdx]) }
      touchIdx = null
      touchStart = null
    }
    grid.addEventListener('touchstart', onTouchStart, { passive: true })
    grid.addEventListener('touchmove', onTouchMove, { passive: false })
    grid.addEventListener('touchend', onTouchEnd, { passive: false })
    return () => { grid.removeEventListener('touchstart', onTouchStart); grid.removeEventListener('touchmove', onTouchMove); grid.removeEventListener('touchend', onTouchEnd) }
  }, [items, startDrag, moveDrag, endDrag, onSelect])

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
                animation: dragIdx === null ? `tileIn 0.4s cubic-bezier(0.25, 0.1, 0.25, 1) both` : 'none',
                animationDelay: dragIdx === null ? `${Math.min(idx * 0.04, 0.5)}s` : '0s',
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
  const [colorFilter, setColorFilter] = useState([])
  const [gridCols, setGridCols] = useState(() => {
    const saved = localStorage.getItem(GRID_COLS_KEY)
    return saved ? Number(saved) : 3
  })
  const allTags = loadTags()
  const allCategories = loadCategories()
  const allColors = loadColors()

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
    if (colorFilter.length > 0) {
      result = result.filter((i) => i.colors && i.colors.some((c) => colorFilter.includes(c)))
    }
    return result
  }, [catFilter, tagFilter, colorFilter, items])

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
            What I am eyeing
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
          label="All Styles"
          icon={SparklesIcon}
          optionKind="styles"
          options={allCategories}
          selected={catFilter}
          onChange={setCatFilter}
        />
        <FilterDropdown
          label="All Categories"
          icon={TagIcon}
          optionKind="categories"
          options={allTags}
          selected={tagFilter}
          onChange={setTagFilter}
        />
        <FilterDropdown
          label="All Colors"
          icon={PaletteIcon}
          optionKind="colors"
          options={allColors}
          selected={colorFilter}
          onChange={setColorFilter}
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
          key={`${catFilter.join(',')}-${tagFilter.join(',')}-${colorFilter.join(',')}`}
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
