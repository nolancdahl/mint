import React, { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { COLORS, FONTS } from '../lib/theme'
import { SHOPPING_CATEGORIES } from '../lib/constants'
import { TrashIcon, ArrowRightIcon, PenIcon, XIcon, PlusIcon, ClipboardIcon, LinkIcon, TagIcon, TypeIcon, ChevronLeft, ChevronRight, ChevronDown } from './Icons'
import { FieldLabel } from './Primitives'
import { fileToResizedDataUrl, loadJson, saveJson } from '../lib/storage'
import { uploadImageToStorage } from '../lib/sync'
import { useAuth } from './AuthGate'
import { useSyncedJson } from '../lib/useSyncedJson'

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

const loadSizes = () => {
  const saved = loadJson(SIZES_KEY)
  return saved.length > 0 ? saved : DEFAULT_SIZES
}

const AddItemPopup = ({ label, placeholder, onAdd, onClose }) => {
  const [value, setValue] = useState('')
  const handleAdd = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onAdd(trimmed)
    onClose()
  }
  return (
    <div
      className="backdrop-enter"
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(19, 37, 27, 0.45)', zIndex: 10002,
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
    </div>
  )
}

const EditWishlistModal = ({ item, onClose, onSave }) => {
  const user = useAuth()
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)
  const pasteRef = useRef(null)
  const [url, setUrl] = useState(item.url || '')
  const [brand, setBrand] = useState(item.brand || '')
  const [title, setTitle] = useState(item.title || '')
  const [price, setPrice] = useState(item.price || '')
  const [notes, setNotes] = useState(item.notes || '')
  const initImages = item.images && item.images.length > 0 ? item.images : (item.image ? [item.image] : [])
  const [images, setImages] = useState(initImages)
  const [previewIdx, setPreviewIdx] = useState(0)
  const [selectedCategories, setSelectedCategories] = useState(item.categories || (item.category ? [item.category] : []))
  // Synced across List + Closet (and across devices) via Firestore.
  const [tags, setTags] = useSyncedJson(TAGS_KEY, DEFAULT_TAGS)
  const [selectedTags, setSelectedTags] = useState(item.tags || [])
  const [colors, setColors] = useSyncedJson(COLORS_KEY, DEFAULT_COLORS)
  const [selectedColors, setSelectedColors] = useState(item.colors || [])
  const [sizes, setSizes] = useSyncedJson(SIZES_KEY, DEFAULT_SIZES)
  const [selectedSizes, setSelectedSizes] = useState(item.sizes || [])
  const [pasteZoneOpen, setPasteZoneOpen] = useState(false)
  const [addTagOpen, setAddTagOpen] = useState(false)
  const [addColorOpen, setAddColorOpen] = useState(false)
  const [addSizeOpen, setAddSizeOpen] = useState(false)

  const toggleCategory = (c) => setSelectedCategories((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])
  const toggleTag = (tag) => setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  const toggleColor = (c) => setSelectedColors((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])
  const toggleSize = (s) => setSelectedSizes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])

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
    for (const it of items) {
      if (it.type.startsWith('image/')) {
        e.preventDefault()
        const file = it.getAsFile()
        if (file) await handleFile(file)
      }
    }
    setPasteZoneOpen(false)
  }

  const canSave = !!(title || url || brand || images.length > 0)

  const handleSave = async () => {
    if (!canSave || saving) return
    setSaving(true)
    try {
      const finalImages = await uploadImageList(images, user)
      onSave({
        ...item,
        url: url || null,
        title: title || brand || url || 'Untitled',
        brand: brand || null,
        image: finalImages[0] || null,
        images: finalImages.length > 0 ? finalImages : null,
        price: price || null,
        category: selectedCategories[0] || null,
        categories: selectedCategories,
        tags: selectedTags,
        colors: selectedColors,
        sizes: selectedSizes,
        notes: notes || null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="backdrop-enter"
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(19, 37, 27, 0.55)', backdropFilter: 'blur(3px)',
        zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center',
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
          <div className="title-bold" style={{ fontSize: '17px', color: COLORS.cream }}>Edit Item</div>
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
              <button onClick={() => { setPasteZoneOpen(true); setTimeout(() => pasteRef.current?.focus(), 100) }} style={{
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
            <input value={brand} onChange={(e) => setBrand(e.target.value)} style={{
              width: '100%', padding: '12px 14px 12px 38px', borderRadius: '6px',
              border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep,
              fontFamily: FONTS.sub, fontSize: '13px', color: COLORS.text, outline: 'none',
            }} />
            <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: COLORS.textFaint }}>
              <TagIcon size={15} />
            </div>
          </div>

          <FieldLabel>Name</FieldLabel>
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={{
              width: '100%', padding: '12px 14px 12px 38px', borderRadius: '6px',
              border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep,
              fontFamily: FONTS.sub, fontSize: '13px', color: COLORS.text, outline: 'none',
            }} />
            <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: COLORS.textFaint }}>
              <TypeIcon size={15} />
            </div>
          </div>

          <FieldLabel>Product URL</FieldLabel>
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <input value={url} onChange={(e) => setUrl(e.target.value)} style={{
              width: '100%', padding: '12px 14px 12px 38px', borderRadius: '6px',
              border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep,
              fontFamily: FONTS.sub, fontSize: '13px', color: COLORS.text, outline: 'none',
            }} />
            <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: COLORS.textFaint }}>
              <LinkIcon size={15} />
            </div>
          </div>

          <FieldLabel>Price</FieldLabel>
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" style={{
              width: '100%', padding: '12px 14px 12px 30px', borderRadius: '6px',
              border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep,
              fontFamily: FONTS.sub, fontSize: '13px', color: COLORS.text, outline: 'none',
            }} />
            <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: COLORS.textFaint, fontFamily: FONTS.sub, fontSize: '14px', fontWeight: 600 }}>$</div>
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
      {addTagOpen && createPortal(
        <AddItemPopup
          label="New type"
          placeholder="e.g. Linen, Workwear..."
          onAdd={handleAddTag}
          onClose={() => setAddTagOpen(false)}
        />,
        document.body
      )}
      {addColorOpen && createPortal(
        <AddItemPopup
          label="New color"
          placeholder="e.g. Coral, Sage..."
          onAdd={handleAddColor}
          onClose={() => setAddColorOpen(false)}
        />,
        document.body
      )}
      {addSizeOpen && createPortal(
        <AddItemPopup
          label="New size"
          placeholder="e.g. 34x30 slim, 10.5..."
          onAdd={handleAddSize}
          onClose={() => setAddSizeOpen(false)}
        />,
        document.body
      )}
    </div>
  )
}

const getImages = (item) => {
  if (item.images && item.images.length > 0) return item.images
  if (item.image) return [item.image]
  return []
}

export const WishlistItemDetail = ({ item, onClose, onDelete, onUpdate }) => {
  const [confirming, setConfirming] = useState(false)
  const [closing, setClosing] = useState(false)
  const [editing, setEditing] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const detailImages = getImages(item)
  const [detailImgIdx, setDetailImgIdx] = useState(item.displayImageIndex || 0)

  const startClose = () => {
    if (closing) return
    setClosing(true)
    setTimeout(onClose, 250)
  }

  const handleEditSave = (updated) => {
    onUpdate(updated)
    setEditing(false)
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
        {/* Full image — no border/padding */}
        {detailImages.length > 0 ? (
          <div style={{ width: '100%', flexShrink: 0, position: 'relative', background: COLORS.creamDeep, aspectRatio: '4/5' }}>
            <img
              src={detailImages[detailImgIdx] || detailImages[0]}
              alt={item.title}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                display: 'block',
              }}
            />
            {detailImages.length > 1 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); setDetailImgIdx((detailImgIdx - 1 + detailImages.length) % detailImages.length) }} style={{
                  position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)',
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}><ChevronLeft size={14} strokeWidth={2.5} /></button>
                <button onClick={(e) => { e.stopPropagation(); setDetailImgIdx((detailImgIdx + 1) % detailImages.length) }} style={{
                  position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}><ChevronRight size={14} strokeWidth={2.5} /></button>
                <div style={{
                  position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)',
                  display: 'flex', gap: '5px',
                }}>
                  {detailImages.map((_, i) => (
                    <div key={i} style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: i === detailImgIdx ? '#fff' : 'rgba(255,255,255,0.4)',
                    }} />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{
            width: '100%', height: '180px', background: COLORS.creamDeep,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: COLORS.textFaint, flexShrink: 0,
          }}>
            <LinkIcon size={36} strokeWidth={1} />
          </div>
        )}

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
          {/* Brand / Title / Price + edit/trash buttons */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              {item.brand && (
                <div style={{
                  fontFamily: FONTS.sub, fontSize: '10px', color: COLORS.textMuted,
                  textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 600,
                  marginBottom: '2px',
                }}>
                  {item.brand}
                </div>
              )}
              <div className="title-bold" style={{ fontSize: '20px', color: COLORS.text, lineHeight: 1.15 }}>
                {item.title}
              </div>
              {item.price && (
                <span style={{
                  fontFamily: FONTS.sub, fontSize: '11px', padding: '4px 12px',
                  background: '#1C5F39', borderRadius: '999px',
                  fontWeight: 700, letterSpacing: '0.02em', color: COLORS.cream,
                  display: 'inline-block', marginTop: '6px',
                }}>
                  ${Math.ceil(Number(item.price))}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginTop: '2px' }}>
              {confirming ? (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirming(false) }}
                    style={{
                      padding: '5px 12px', background: 'transparent',
                      border: `1px solid ${COLORS.greenLine}`, borderRadius: '999px',
                      fontFamily: FONTS.sub, fontSize: '9px', letterSpacing: '0.1em',
                      textTransform: 'uppercase', fontWeight: 600,
                      color: COLORS.green, cursor: 'pointer',
                    }}
                  >Keep</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(item.id) }}
                    style={{
                      padding: '5px 12px', background: COLORS.danger,
                      border: 'none', borderRadius: '999px',
                      fontFamily: FONTS.sub, fontSize: '9px', letterSpacing: '0.1em',
                      textTransform: 'uppercase', fontWeight: 600,
                      color: COLORS.cream, cursor: 'pointer',
                    }}
                  >Delete</button>
                </div>
              ) : (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditing(true) }}
                    style={{
                      width: '30px', height: '30px', borderRadius: '50%',
                      background: 'transparent', border: `1px solid ${COLORS.greenLine}`,
                      color: COLORS.green, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', cursor: 'pointer',
                    }}
                  >
                    <PenIcon size={12} strokeWidth={2} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirming(true) }}
                    style={{
                      width: '30px', height: '30px', borderRadius: '50%',
                      background: 'transparent', border: `1px solid ${COLORS.greenLine}`,
                      color: COLORS.danger, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', cursor: 'pointer',
                    }}
                  >
                    <TrashIcon size={12} />
                  </button>
                </>
              )}
            </div>
          </div>


          {/* Style / Category / Color / Size — 4-column layout */}
          {((item.categories && item.categories.length > 0) || (item.tags && item.tags.length > 0) || (item.colors && item.colors.length > 0) || (item.sizes && item.sizes.length > 0)) && (() => {
            const pill = {
              fontFamily: FONTS.sub, fontSize: '10px', padding: '3px 8px',
              background: COLORS.white, color: COLORS.textMuted,
              border: `1px solid ${COLORS.creamDeep}`, borderRadius: '999px',
              letterSpacing: '0.06em', fontWeight: 500,
              textAlign: 'center',
            }
            const header = {
              fontFamily: FONTS.sub, fontSize: '9px', textTransform: 'uppercase',
              letterSpacing: '0.16em', fontWeight: 600, color: COLORS.textMuted, marginBottom: '8px',
              textAlign: 'center',
            }
            const divider = {
              position: 'absolute', right: 0, top: '15%', bottom: '15%', width: '1px',
              background: `linear-gradient(to bottom, transparent, ${COLORS.greenLine} 30%, ${COLORS.greenLine} 70%, transparent)`,
            }
            return (
              <div style={{ display: 'flex', marginTop: '16px', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ flex: 1, padding: '10px 6px', position: 'relative' }}>
                  <div style={header}>Style</div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {(item.categories || []).map((c) => (<span key={c} style={pill}>{c}</span>))}
                  </div>
                  <div style={divider} />
                </div>
                <div style={{ flex: 1, padding: '10px 6px', position: 'relative' }}>
                  <div style={header}>Category</div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {(item.tags || []).map((t) => (<span key={t} style={pill}>{t}</span>))}
                  </div>
                  <div style={divider} />
                </div>
                <div style={{ flex: 1, padding: '10px 6px', position: 'relative' }}>
                  <div style={header}>Color</div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {(item.colors || []).map((c) => (<span key={c} style={pill}>{c}</span>))}
                  </div>
                  <div style={divider} />
                </div>
                <div style={{ flex: 1, padding: '10px 6px' }}>
                  <div style={header}>Size</div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {(item.sizes || []).map((s) => (<span key={s} style={{ ...pill, fontWeight: 600 }}>{s}</span>))}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Notes — collapsible */}
          {item.notes && (
            <div style={{ marginTop: '14px' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setNotesOpen((v) => !v) }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'transparent', border: 'none', padding: '4px 0',
                  fontFamily: FONTS.sub, fontSize: '9px', textTransform: 'uppercase',
                  letterSpacing: '0.16em', fontWeight: 600, color: COLORS.textMuted,
                  cursor: 'pointer',
                }}
              >
                <span>Notes</span>
                <span style={{ display: 'inline-flex', transition: 'transform 0.2s', transform: notesOpen ? 'rotate(180deg)' : 'none' }}>
                  <ChevronDown size={14} strokeWidth={2.2} />
                </span>
              </button>
              {notesOpen && (
                <div onClick={(e) => e.stopPropagation()} style={{
                  fontFamily: FONTS.sub, fontSize: '12.5px', color: COLORS.text,
                  lineHeight: 1.45, whiteSpace: 'pre-wrap',
                  background: COLORS.white, padding: '10px 12px',
                  border: `1px solid ${COLORS.creamDeep}`, borderRadius: '8px',
                  marginTop: '6px',
                }}>{item.notes}</div>
              )}
            </div>
          )}

          {/* View product */}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginTop: '18px', padding: '12px 16px',
                background: COLORS.green, color: COLORS.cream,
                borderRadius: '10px', textDecoration: 'none',
                fontFamily: FONTS.sub, fontSize: '12px', fontWeight: 600,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                transition: 'opacity 0.15s',
              }}
            >
              View product
              <ArrowRightIcon size={16} strokeWidth={2} />
            </a>
          )}
        </div>
      </div>

      {editing && (
        <EditWishlistModal
          item={item}
          onClose={() => setEditing(false)}
          onSave={handleEditSave}
        />
      )}
    </div>,
    document.body
  )
}
