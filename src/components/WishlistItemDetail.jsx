import React, { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { COLORS, FONTS } from '../lib/theme'
import { SHOPPING_CATEGORIES } from '../lib/constants'
import { TrashIcon, ArrowRightIcon, EditIcon, XIcon, PlusIcon, ClipboardIcon, LinkIcon, TagIcon, TypeIcon } from './Icons'
import { FieldLabel } from './Primitives'
import { fileToResizedDataUrl, loadJson, saveJson } from '../lib/storage'

const TAGS_KEY = 'garmint_wishlist_tags_v1'
const COLORS_KEY = 'garmint_wishlist_colors_v1'
const DEFAULT_TAGS = ['Chinos', 'Hats', 'Jackets', 'Jeans', 'Shoes', 'Shorts', 'Soccer Shorts', 'Sweaters', 'T-Shirts']
const DEFAULT_COLORS = ['Beige', 'Black', 'Blue', 'Brown', 'Burgundy', 'Charcoal', 'Cream', 'Gold', 'Gray', 'Green', 'Ivory', 'Khaki', 'Maroon', 'Navy', 'Olive', 'Orange', 'Pink', 'Purple', 'Red', 'Rust', 'Silver', 'Tan', 'Teal', 'White', 'Yellow']

const loadTags = () => {
  const saved = loadJson(TAGS_KEY)
  return saved.length > 0 ? saved : DEFAULT_TAGS
}

const loadColors = () => {
  const saved = loadJson(COLORS_KEY)
  return saved.length > 0 ? saved : DEFAULT_COLORS
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
  const fileRef = useRef(null)
  const pasteRef = useRef(null)
  const [url, setUrl] = useState(item.url || '')
  const [brand, setBrand] = useState(item.brand || '')
  const [title, setTitle] = useState(item.title || '')
  const [price, setPrice] = useState(item.price || '')
  const [image, setImage] = useState(item.image || null)
  const [selectedCategories, setSelectedCategories] = useState(item.categories || (item.category ? [item.category] : []))
  const [tags, setTags] = useState(() => [...loadTags()].sort((a, b) => a.localeCompare(b)))
  const [selectedTags, setSelectedTags] = useState(item.tags || [])
  const [colors, setColors] = useState(() => [...loadColors()].sort((a, b) => a.localeCompare(b)))
  const [selectedColors, setSelectedColors] = useState(item.colors || [])
  const [pasteZoneOpen, setPasteZoneOpen] = useState(false)
  const [addTagOpen, setAddTagOpen] = useState(false)
  const [addColorOpen, setAddColorOpen] = useState(false)

  const toggleCategory = (c) => setSelectedCategories((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])
  const toggleTag = (tag) => setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  const toggleColor = (c) => setSelectedColors((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])

  const handleAddTag = (name) => {
    if (!tags.includes(name)) {
      const updated = [...tags, name].sort((a, b) => a.localeCompare(b))
      setTags(updated)
      saveJson(TAGS_KEY, updated)
    }
    if (!selectedTags.includes(name)) setSelectedTags((prev) => [...prev, name])
  }

  const handleAddColor = (name) => {
    if (!colors.includes(name)) {
      const updated = [...colors, name].sort((a, b) => a.localeCompare(b))
      setColors(updated)
      saveJson(COLORS_KEY, updated)
    }
    if (!selectedColors.includes(name)) setSelectedColors((prev) => [...prev, name])
  }

  const handleFile = async (file) => {
    if (!file.type.startsWith('image/')) return
    const dataUrl = await fileToResizedDataUrl(file, 800, 0.85)
    setImage(dataUrl)
  }

  const handlePasteEvent = async (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const it of items) {
      if (it.type.startsWith('image/')) {
        e.preventDefault()
        const file = it.getAsFile()
        if (file) await handleFile(file)
        setPasteZoneOpen(false)
        return
      }
    }
  }

  const canSave = !!(title || url || brand || image)

  const handleSave = () => {
    if (!canSave) return
    onSave({
      ...item,
      url: url || null,
      title: title || brand || url || 'Untitled',
      brand: brand || null,
      image,
      price: price || null,
      category: selectedCategories[0] || null,
      categories: selectedCategories,
      tags: selectedTags,
      colors: selectedColors,
    })
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
              {!pasteZoneOpen ? (
                <button onClick={() => { setPasteZoneOpen(true); setTimeout(() => pasteRef.current?.focus(), 100) }} style={{
                  flex: 1, padding: '18px 12px', background: COLORS.creamDeep,
                  border: `1px dashed ${COLORS.greenLine}`, borderRadius: '8px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  cursor: 'pointer', color: COLORS.textMuted,
                }}>
                  <ClipboardIcon size={18} strokeWidth={1.5} />
                  <span style={{ fontFamily: FONTS.sub, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>Paste</span>
                </button>
              ) : (
                <div
                  ref={pasteRef} contentEditable onPaste={handlePasteEvent}
                  style={{
                    flex: 1, padding: '10px', background: COLORS.white,
                    border: `1.5px dashed ${COLORS.greenLine}`, borderRadius: '8px',
                    fontFamily: FONTS.sub, fontSize: '11px', color: COLORS.textFaint,
                    outline: 'none', WebkitUserSelect: 'text', userSelect: 'text',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    textAlign: 'center', minHeight: 0,
                  }}
                />
              )}
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = '' }}
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
              padding: '6px 10px', borderRadius: '999px',
              fontSize: '11px', fontWeight: 600,
              fontFamily: FONTS.sub, border: `1px dashed ${COLORS.greenLine}`,
              background: COLORS.creamDeep, color: COLORS.textMuted,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
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
              padding: '6px 10px', borderRadius: '999px',
              fontSize: '11px', fontWeight: 600,
              fontFamily: FONTS.sub, border: `1px dashed ${COLORS.greenLine}`,
              background: COLORS.creamDeep, color: COLORS.textMuted,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
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
    </div>
  )
}

export const WishlistItemDetail = ({ item, onClose, onDelete, onUpdate }) => {
  const [confirming, setConfirming] = useState(false)
  const [closing, setClosing] = useState(false)
  const [editing, setEditing] = useState(false)

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
        {item.image ? (
          <div style={{ width: '100%', flexShrink: 0 }}>
            <img
              src={item.image}
              alt={item.title}
              style={{
                width: '100%', maxHeight: '50vh', objectFit: 'cover',
                display: 'block',
              }}
            />
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
          {/* Title */}
          <div className="title-bold" style={{ fontSize: '20px', color: COLORS.text, lineHeight: 1.15 }}>
            {item.title}
          </div>

          {/* Brand */}
          {item.brand && (
            <div style={{
              fontFamily: FONTS.sub, fontSize: '12px', color: COLORS.textMuted,
              fontWeight: 500, marginTop: '4px',
            }}>
              {item.brand}
            </div>
          )}

          {/* Price */}
          {item.price && (
            <div style={{
              fontFamily: FONTS.sub, fontSize: '16px', color: COLORS.green,
              fontWeight: 700, marginTop: '10px',
            }}>
              ${item.price}
            </div>
          )}

          {/* Categories */}
          {item.categories && item.categories.length > 0 && (
            <div style={{ marginTop: '14px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {item.categories.map((c) => (
                <span key={c} style={{
                  fontFamily: FONTS.sub, fontSize: '10px', padding: '4px 10px',
                  background: COLORS.green, color: COLORS.cream, borderRadius: '999px',
                  textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600,
                }}>{c}</span>
              ))}
            </div>
          )}

          {/* Type (tags) */}
          {item.tags && item.tags.length > 0 && (
            <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {item.tags.map((t) => (
                <span key={t} style={{
                  fontFamily: FONTS.sub, fontSize: '10px', padding: '4px 10px',
                  background: 'transparent', color: COLORS.green,
                  border: `1px solid ${COLORS.greenLine}`, borderRadius: '999px',
                  textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500,
                }}>{t}</span>
              ))}
            </div>
          )}

          {/* Colors */}
          {item.colors && item.colors.length > 0 && (
            <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {item.colors.map((c) => (
                <span key={c} style={{
                  fontFamily: FONTS.sub, fontSize: '10px', padding: '4px 10px',
                  background: COLORS.creamDeep, color: COLORS.textMuted,
                  borderRadius: '999px', letterSpacing: '0.1em', fontWeight: 500,
                }}>{c}</span>
              ))}
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

        {/* Bottom actions: trash + edit */}
        <div style={{ padding: '0 20px 16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
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
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setEditing(true) }}
                style={{
                  width: '34px', height: '34px', borderRadius: '50%',
                  background: 'transparent', border: `1px solid ${COLORS.greenLine}`,
                  color: COLORS.green, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer',
                }}
              >
                <EditIcon size={14} />
              </button>
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
            </>
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
