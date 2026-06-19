import React, { useState, useRef, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { COLORS, FONTS } from '../lib/theme'
import { SHOPPING_CATEGORIES } from '../lib/constants'
import { FieldLabel } from '../components/Primitives'
import { PlusIcon, XIcon, ClipboardIcon, GridIcon, ChevronDown, ChevronLeft, ChevronRight, LinkIcon, TagIcon, TypeIcon, ShirtIcon, CalendarIcon, DiceIcon, MenuIcon, HatIcon, GlassesIcon, NecklaceIcon, JacketIcon, WatchIcon, BeltIcon, PantsIcon, SocksIcon, ShoesIcon, LayersIcon, ResizeIcon, PaletteIcon, SparklesIcon } from '../components/Icons'
import { fileToResizedDataUrl, loadJson, saveJson } from '../lib/storage'
import { uploadImageToStorage } from '../lib/sync'
import { useSyncedJson } from '../lib/useSyncedJson'
import { useAuth } from '../components/AuthGate'
import { CropOverlay } from '../components/CropOverlay'
import { useScrollGuard } from '../lib/useScrollGuard'

// Upload any data-URL images to Firebase Storage; return URLs. Pass through HTTPS URLs unchanged.
// Firestore docs cap at 1MB; multi-photo base64 blows past that, so the doc write is rejected
// and Firestore's offline cache rolls back the item — fixing the "deleted right after confirm" bug.
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
const CLOSET_COLS_KEY = 'garmint_closet_cols'
const DEFAULT_TAGS = ['Chinos', 'Hats', 'Jackets', 'Jeans', 'Shoes', 'Shorts', 'Soccer Shorts', 'Sweaters', 'T-Shirts']
const DEFAULT_COLORS = ['Beige', 'Black', 'Blue', 'Brown', 'Burgundy', 'Charcoal', 'Cream', 'Gold', 'Gray', 'Green', 'Ivory', 'Khaki', 'Maroon', 'Navy', 'Olive', 'Orange', 'Pink', 'Purple', 'Red', 'Rust', 'Silver', 'Tan', 'Teal', 'White', 'Yellow']
const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL']

const loadTags = () => { const s = loadJson(TAGS_KEY); return s.length > 0 ? s : DEFAULT_TAGS }
const loadColors = () => { const s = loadJson(COLORS_KEY); return s.length > 0 ? s : DEFAULT_COLORS }
const loadCategories = () => { const s = loadJson(CATEGORIES_KEY); return s.length > 0 ? s : SHOPPING_CATEGORIES }
const loadSizes = () => { const s = loadJson(SIZES_KEY); return s.length > 0 ? s : DEFAULT_SIZES }

const getImages = (item) => {
  if (item.images && item.images.length > 0) return item.images
  if (item.image) return [item.image]
  return []
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

// Maps each style/category option to a Lucide-style icon. Anything not in the map falls back to a generic icon.
// Exported so ShoppingPage's FilterDropdown can render the same visual language.
export const STYLE_OPTION_ICONS = {
  Athleisure: SocksIcon, Casual: ShirtIcon, Gym: SparklesIcon, Lounge: PantsIcon,
  Soccer: SocksIcon, Work: TagIcon, Formal: JacketIcon, Streetwear: ShirtIcon,
}
export const CATEGORY_OPTION_ICONS = {
  Hats: HatIcon, Beanies: HatIcon, Caps: HatIcon,
  Sunglasses: GlassesIcon, Glasses: GlassesIcon,
  Scarves: NecklaceIcon, Necklaces: NecklaceIcon, Chains: NecklaceIcon,
  'T-Shirts': ShirtIcon, Shirts: ShirtIcon, Sweaters: ShirtIcon,
  Polos: ShirtIcon, Henleys: ShirtIcon, 'Tank Tops': ShirtIcon,
  Jackets: JacketIcon, Coats: JacketIcon, 'Rain Jackets': JacketIcon,
  Blazers: JacketIcon, Vests: JacketIcon,
  Watch: WatchIcon, Watches: WatchIcon,
  Belt: BeltIcon, Belts: BeltIcon,
  Jeans: PantsIcon, Chinos: PantsIcon, Shorts: PantsIcon, 'Soccer Shorts': PantsIcon,
  Trousers: PantsIcon, Joggers: PantsIcon, Pants: PantsIcon,
  Socks: SocksIcon,
  Shoes: ShoesIcon, Sneakers: ShoesIcon, Boots: ShoesIcon, Loafers: ShoesIcon, Sandals: ShoesIcon,
}
// Color-name → CSS color for swatch rendering. Anything not here renders the name itself
// (lowercased) as a CSS color, which works for many common names too.
export const COLOR_SWATCHES = {
  Beige: '#E8DCC4', Black: '#1A1A1A', Blue: '#3B6E9E', Brown: '#8B5A2B',
  Burgundy: '#7A2229', Charcoal: '#36454F', Cream: '#F4EEE0', Gold: '#D4AF37',
  Gray: '#808080', Green: '#4F7A4A', Ivory: '#FFFFF0', Khaki: '#BDB76B',
  Maroon: '#800000', Navy: '#1A2A40', Olive: '#6B8E23', Orange: '#E07B39',
  Pink: '#E8A4B7', Purple: '#6E4D8C', Red: '#B23A48', Rust: '#B7410E',
  Silver: '#C0C0C0', Tan: '#D2B48C', Teal: '#1C6E70', White: '#FAFAFA',
  Yellow: '#E8C547',
}

// Each filter option may render a small leading visual (icon for styles/categories, color swatch for colors).
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

const FilterDropdown = ({ label, options, selected, onChange, icon: IconComp, optionKind }) => {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const isActive = selected.length > 0
  const showPill = expanded || isActive
  const displayLabel = isActive
    ? (selected.length === 1 ? selected[0] : `${selected.length} active`)
    : label

  const toggle = (opt) => {
    if (selected.includes(opt)) onChange(selected.filter((s) => s !== opt))
    else onChange([...selected, opt])
  }

  const handleClick = () => {
    if (!showPill) { setExpanded(true); setOpen(true) }
    else setOpen((v) => !v)
  }

  const handleBackdrop = () => {
    setOpen(false)
    if (!isActive) setExpanded(false)
  }

  const ease = '0.25s cubic-bezier(0.4, 0, 0.2, 1)'

  return (
    <div style={{ position: 'relative', zIndex: open ? 52 : 'auto' }}>
      <button
        onClick={handleClick}
        style={{
          height: '36px',
          padding: showPill ? '0 10px' : '0',
          minWidth: '36px',
          maxWidth: '240px',
          borderRadius: '999px',
          border: `1.5px solid ${isActive ? COLORS.green : (open ? COLORS.green : COLORS.greenLine)}`,
          background: isActive ? COLORS.green : COLORS.creamDeep,
          color: isActive ? COLORS.cream : COLORS.text,
          fontFamily: FONTS.sub, fontSize: '11px', fontWeight: 600,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
          justifyContent: 'center',
          transition: `padding ${ease}, background ${ease}, border-color ${ease}, color ${ease}`,
          overflow: 'hidden', whiteSpace: 'nowrap',
        }}
      >
        {IconComp && <IconComp size={13} strokeWidth={1.8} style={{ flexShrink: 0 }} />}
        {/* One width-reveal wrapper (grid fr): animates the pill's real content width
            with no max-width dead-zone/rebound, and keeps the icon centered when
            collapsed (it's then the only visible child). */}
        <span style={{ display: 'grid', gridTemplateColumns: showPill ? '1fr' : '0fr', minWidth: 0, transition: `grid-template-columns ${ease}` }}>
          <span style={{
            overflow: 'hidden', display: 'inline-flex', alignItems: 'center', gap: '5px',
            whiteSpace: 'nowrap', opacity: showPill ? 1 : 0, transition: `opacity ${ease}`,
          }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px', paddingLeft: '6px' }}>{displayLabel}</span>
            {isActive ? (
              <span
                onClick={(e) => { e.stopPropagation(); onChange([]); setExpanded(false); setOpen(false) }}
                style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(244,238,224,0.35)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
              ><XIcon size={9} strokeWidth={2.5} /></span>
            ) : (
              <ChevronDown size={12} strokeWidth={2} style={{ flexShrink: 0 }} />
            )}
          </span>
        </span>
      </button>
      {open && (
        <>
          <div onClick={handleBackdrop} style={{ position: 'fixed', inset: 0, zIndex: 1 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0,
            minWidth: '160px', background: COLORS.cream, borderRadius: '10px',
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
                {selected.includes(opt) && <span style={{ color: COLORS.green, fontWeight: 700 }}>&#10003;</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

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
            }}>Columns: {cols}</div>
            <input type="range" min={1} max={8} value={cols}
              onChange={(e) => onChange(Number(e.target.value))}
              style={{ width: '100%', accentColor: COLORS.green, cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONTS.sub, fontSize: '9px', color: COLORS.textFaint, marginTop: '2px' }}>
              <span>1</span><span>8</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Add item popup for tags/colors/categories
const AddItemPopup = ({ label, placeholder, onAdd, onClose }) => {
  const [value, setValue] = useState('')
  const handleAdd = () => { const t = value.trim(); if (!t) return; onAdd(t); onClose() }
  return createPortal(
    <div className="backdrop-enter" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(19, 37, 27, 0.45)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div className="modal-enter" onClick={(e) => e.stopPropagation()} style={{
        width: 'calc(100% - 60px)', maxWidth: '300px',
        background: COLORS.cream, borderRadius: '12px', padding: '20px',
        boxShadow: '0 16px 40px rgba(19, 37, 27, 0.25)',
      }}>
        <div style={{ fontFamily: FONTS.sub, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 600, color: COLORS.textMuted, marginBottom: '10px' }}>{label}</div>
        <input autoFocus value={value} onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
          placeholder={placeholder}
          style={{ width: '100%', padding: '12px 14px', borderRadius: '6px', border: `1px solid ${COLORS.greenLine}`, background: COLORS.white, fontFamily: FONTS.sub, fontSize: '13px', color: COLORS.text, outline: 'none', marginBottom: '12px' }}
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', background: 'transparent', border: `1px solid ${COLORS.greenLine}`, borderRadius: '6px', fontFamily: FONTS.sub, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, color: COLORS.textMuted, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleAdd} style={{ flex: 1, padding: '10px', background: COLORS.green, border: 'none', borderRadius: '6px', color: COLORS.cream, fontFamily: FONTS.sub, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer' }}>Add</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

const AddClosetModal = ({ onClose, onSave }) => {
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
  // Synced across List + Closet (and devices) via Firestore.
  const [categories, setCategories] = useSyncedJson(CATEGORIES_KEY, SHOPPING_CATEGORIES)
  const [selectedCategories, setSelectedCategories] = useState([])
  const [tags, setTags] = useSyncedJson(TAGS_KEY, DEFAULT_TAGS)
  const [selectedTags, setSelectedTags] = useState([])
  const [colors, setColors] = useSyncedJson(COLORS_KEY, DEFAULT_COLORS)
  const [selectedColors, setSelectedColors] = useState([])
  const [sizes, setSizes] = useSyncedJson(SIZES_KEY, DEFAULT_SIZES)
  const [selectedSize, setSelectedSize] = useState(null)
  const [pasteZoneOpen, setPasteZoneOpen] = useState(false)
  const [addTagOpen, setAddTagOpen] = useState(false)
  const [addColorOpen, setAddColorOpen] = useState(false)
  const [addCatOpen, setAddCatOpen] = useState(false)
  const [addSizeOpen, setAddSizeOpen] = useState(false)

  const toggleCategory = (c) => setSelectedCategories((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])
  const toggleTag = (tag) => setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  const toggleColor = (c) => setSelectedColors((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])
  const toggleSize = (s) => setSelectedSize((prev) => prev === s ? null : s)

  const handleAddSize = (name) => {
    setSizes((prev) => (prev || []).includes(name) ? prev : [...(prev || []), name])
    setSelectedSize(name)
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
  const handleFiles = async (files) => { for (const file of files) await handleFile(file) }
  const handlePasteEvent = async (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const it of items) {
      if (it.type.startsWith('image/')) { e.preventDefault(); const file = it.getAsFile(); if (file) await handleFile(file) }
    }
    if (pasteRef.current) pasteRef.current.innerHTML = ''
  }
  const openPasteZone = () => { setPasteZoneOpen(true); setTimeout(() => pasteRef.current?.focus(), 100) }

  const canSave = !!(title || url || brand || images.length > 0)
  const handleSave = async () => {
    if (!canSave || saving) return
    setSaving(true)
    try {
      const finalImages = await uploadImageList(images, user)
      onSave({
        id: Date.now().toString(),
        url: url || null,
        name: title || brand || 'Untitled',
        title: title || brand || 'Untitled',
        brand: brand || null,
        image: finalImages[0] || null,
        images: finalImages.length > 0 ? finalImages : null,
        displayImageIndex: 0,
        price: price || null,
        category: selectedCategories[0] || null,
        categories: selectedCategories,
        tags: selectedTags,
        colors: selectedColors,
        size: selectedSize,
        notes: notes || null,
        addedAt: new Date().toISOString(),
      })
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="backdrop-enter" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(19, 37, 27, 0.55)', backdropFilter: 'blur(3px)',
      zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div className="modal-enter" onClick={(e) => e.stopPropagation()} style={{
        width: 'calc(100% - 32px)', maxWidth: '400px', maxHeight: '85%',
        background: COLORS.cream, borderRadius: '12px',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(19, 37, 27, 0.35)',
      }}>
        <div style={{
          padding: '14px 16px', background: COLORS.green, color: COLORS.cream,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
        }}>
          <div className="title-bold" style={{ fontSize: '17px', color: COLORS.cream }}>Add to Closet</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: COLORS.cream, cursor: 'pointer', padding: '5px' }}>
            <XIcon size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <FieldLabel>Photos</FieldLabel>
          {images.length > 0 && (
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <img src={images[previewIdx]} alt="" style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', borderRadius: '8px', display: 'block', background: COLORS.creamDeep }} />
              <button onClick={() => { setImages((prev) => { const next = prev.filter((_, i) => i !== previewIdx); setPreviewIdx(Math.min(previewIdx, next.length - 1)); return next }) }} style={{
                position: 'absolute', top: '8px', right: '8px', width: '28px', height: '28px', borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}><XIcon size={14} /></button>
              {images.length > 1 && (
                <>
                  <button onClick={() => setPreviewIdx((previewIdx - 1 + images.length) % images.length)} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><ChevronLeft size={14} strokeWidth={2.5} /></button>
                  <button onClick={() => setPreviewIdx((previewIdx + 1) % images.length)} style={{ position: 'absolute', right: '40px', top: '50%', transform: 'translateY(-50%)', width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><ChevronRight size={14} strokeWidth={2.5} /></button>
                  <div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '4px' }}>
                    {images.map((_, i) => (<div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: i === previewIdx ? '#fff' : 'rgba(255,255,255,0.4)' }} />))}
                  </div>
                </>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            <button onClick={() => fileRef.current?.click()} style={{ flex: 1, padding: images.length > 0 ? '10px 12px' : '18px 12px', background: COLORS.creamDeep, border: `1px solid ${COLORS.greenLine}`, borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', color: COLORS.textMuted }}>
              <PlusIcon size={images.length > 0 ? 16 : 20} strokeWidth={1.5} />
              <span style={{ fontFamily: FONTS.sub, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>Upload</span>
            </button>
            {!pasteZoneOpen ? (
              <button onClick={openPasteZone} style={{ flex: 1, padding: images.length > 0 ? '10px 12px' : '18px 12px', background: COLORS.creamDeep, border: `1px solid ${COLORS.greenLine}`, borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', color: COLORS.textMuted }}>
                <ClipboardIcon size={images.length > 0 ? 14 : 18} strokeWidth={1.5} />
                <span style={{ fontFamily: FONTS.sub, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>Paste</span>
              </button>
            ) : (
              <div ref={pasteRef} contentEditable onPaste={handlePasteEvent} style={{ flex: 1, padding: '10px', background: COLORS.white, border: `1.5px solid ${COLORS.greenLine}`, borderRadius: '8px', fontFamily: FONTS.sub, fontSize: '11px', color: COLORS.textFaint, outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 0 }} />
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files.length) handleFiles([...e.target.files]); e.target.value = '' }}
          />

          <FieldLabel>Brand</FieldLabel>
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <input value={brand} onChange={(e) => setBrand(e.target.value)} style={{ width: '100%', padding: '12px 14px 12px 38px', borderRadius: '6px', border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep, fontFamily: FONTS.sub, fontSize: '13px', color: COLORS.text, outline: 'none' }} />
            <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: COLORS.textFaint }}><TagIcon size={15} /></div>
          </div>

          <FieldLabel>Name</FieldLabel>
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '12px 14px 12px 38px', borderRadius: '6px', border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep, fontFamily: FONTS.sub, fontSize: '13px', color: COLORS.text, outline: 'none' }} />
            <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: COLORS.textFaint }}><TypeIcon size={15} /></div>
          </div>

          <FieldLabel>Product URL</FieldLabel>
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <input value={url} onChange={(e) => setUrl(e.target.value)} style={{ width: '100%', padding: '12px 14px 12px 38px', borderRadius: '6px', border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep, fontFamily: FONTS.sub, fontSize: '13px', color: COLORS.text, outline: 'none' }} />
            <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: COLORS.textFaint }}><LinkIcon size={15} /></div>
          </div>

          <FieldLabel>Price</FieldLabel>
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" style={{ width: '100%', padding: '12px 14px 12px 30px', borderRadius: '6px', border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep, fontFamily: FONTS.sub, fontSize: '13px', color: COLORS.text, outline: 'none' }} />
            <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: COLORS.textFaint, fontFamily: FONTS.sub, fontSize: '14px', fontWeight: 600 }}>$</div>
          </div>

          <FieldLabel>Size</FieldLabel>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <button onClick={() => setAddSizeOpen(true)} style={{ width: '28px', height: '28px', borderRadius: '50%', padding: 0, fontFamily: FONTS.sub, border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep, color: COLORS.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><PlusIcon size={12} strokeWidth={2} /></button>
            {sizes.map((s) => (
              <button key={s} onClick={() => toggleSize(s)} style={{ padding: '6px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', fontFamily: FONTS.sub, border: `1px solid ${selectedSize === s ? COLORS.green : COLORS.greenLine}`, background: selectedSize === s ? COLORS.green : COLORS.creamDeep, color: selectedSize === s ? COLORS.cream : COLORS.textMuted, cursor: 'pointer', transition: 'all 0.15s' }}>{s}</button>
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

          <FieldLabel>Styles</FieldLabel>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <button onClick={() => setAddCatOpen(true)} style={{ width: '28px', height: '28px', borderRadius: '50%', padding: 0, fontFamily: FONTS.sub, border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep, color: COLORS.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><PlusIcon size={12} strokeWidth={2} /></button>
            {categories.map((c) => (
              <button key={c} onClick={() => toggleCategory(c)} style={{ padding: '7px 14px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: FONTS.sub, border: `1px solid ${selectedCategories.includes(c) ? COLORS.green : COLORS.greenLine}`, background: selectedCategories.includes(c) ? COLORS.green : COLORS.creamDeep, color: selectedCategories.includes(c) ? COLORS.cream : COLORS.green, cursor: 'pointer', transition: 'all 0.15s' }}>{c}</button>
            ))}
          </div>

          <FieldLabel>Categories</FieldLabel>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <button onClick={() => setAddTagOpen(true)} style={{ width: '28px', height: '28px', borderRadius: '50%', padding: 0, fontFamily: FONTS.sub, border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep, color: COLORS.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><PlusIcon size={12} strokeWidth={2} /></button>
            {tags.map((t) => (
              <button key={t} onClick={() => toggleTag(t)} style={{ padding: '6px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', fontFamily: FONTS.sub, border: `1px solid ${selectedTags.includes(t) ? COLORS.green : COLORS.greenLine}`, background: selectedTags.includes(t) ? COLORS.green : COLORS.creamDeep, color: selectedTags.includes(t) ? COLORS.cream : COLORS.textMuted, cursor: 'pointer', transition: 'all 0.15s' }}>{t}</button>
            ))}
          </div>

          <FieldLabel>Colors</FieldLabel>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <button onClick={() => setAddColorOpen(true)} style={{ width: '28px', height: '28px', borderRadius: '50%', padding: 0, fontFamily: FONTS.sub, border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep, color: COLORS.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><PlusIcon size={12} strokeWidth={2} /></button>
            {colors.map((c) => (
              <button key={c} onClick={() => toggleColor(c)} style={{ padding: '6px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', fontFamily: FONTS.sub, border: `1px solid ${selectedColors.includes(c) ? COLORS.green : COLORS.greenLine}`, background: selectedColors.includes(c) ? COLORS.green : COLORS.creamDeep, color: selectedColors.includes(c) ? COLORS.cream : COLORS.textMuted, cursor: 'pointer', transition: 'all 0.15s' }}>{c}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: '12px 16px', borderTop: `1px solid ${COLORS.greenLine}`, display: 'flex', gap: '8px', background: COLORS.cream, flexShrink: 0 }}>
          <button onClick={onClose} disabled={saving} style={{ flex: 1, padding: '11px', background: 'transparent', border: `1px solid ${COLORS.greenLine}`, borderRadius: '6px', fontFamily: FONTS.sub, fontSize: '11.5px', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600, color: COLORS.green, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>Cancel</button>
          <button onClick={handleSave} disabled={!canSave || saving} style={{ flex: 1, padding: '11px', background: (canSave && !saving) ? COLORS.green : COLORS.greenLine, color: COLORS.cream, border: 'none', borderRadius: '6px', fontFamily: FONTS.sub, fontSize: '11.5px', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600, cursor: (canSave && !saving) ? 'pointer' : 'not-allowed', opacity: (canSave && !saving) ? 1 : 0.6 }}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
      {addTagOpen && <AddItemPopup label="New category" placeholder="e.g. Chinos, Hats..." onAdd={handleAddTag} onClose={() => setAddTagOpen(false)} />}
      {addColorOpen && <AddItemPopup label="New color" placeholder="e.g. Coral, Sage..." onAdd={handleAddColor} onClose={() => setAddColorOpen(false)} />}
      {addCatOpen && <AddItemPopup label="New style" placeholder="e.g. Formal, Streetwear..." onAdd={handleAddCategory} onClose={() => setAddCatOpen(false)} />}
      {addSizeOpen && <AddItemPopup label="New size" placeholder="e.g. 34x30 slim, 10.5..." onAdd={handleAddSize} onClose={() => setAddSizeOpen(false)} />}
    </div>,
    document.body
  )
}

// Outfit categories — dropdown options. defaultPos values are canvas-percent and assume the
// silhouette SVG occupies the center ~45% of a square canvas (aspect 1/1) at its natural 1/2.2
// ratio — so x has been remapped from silhouette-local % to canvas-relative %.
const OUTFIT_CATEGORIES = [
  { id: 'all',     label: 'All Items', tags: null,                                                                    defaultPos: { x: 42, y: 30, w: 16, h: 16 }, icon: LayersIcon },
  { id: 'head',    label: 'Head',      tags: ['Hats', 'Beanies', 'Caps'],                                             defaultPos: { x: 44, y: 1,  w: 12, h: 12 }, icon: HatIcon },
  { id: 'eyes',    label: 'Eyes',      tags: ['Sunglasses', 'Glasses'],                                               defaultPos: { x: 44, y: 7,  w: 12, h: 6  }, icon: GlassesIcon },
  { id: 'neck',    label: 'Neck',      tags: ['Scarves', 'Necklaces', 'Chains'],                                      defaultPos: { x: 45, y: 11, w: 10, h: 7  }, icon: NecklaceIcon },
  { id: 'tops',    label: 'Tops',      tags: ['T-Shirts', 'Shirts', 'Sweaters', 'Polos', 'Henleys', 'Tank Tops'],     defaultPos: { x: 39, y: 16, w: 22, h: 25 }, icon: ShirtIcon },
  { id: 'outers',  label: 'Outers',    tags: ['Jackets', 'Coats', 'Rain Jackets', 'Blazers', 'Vests'],                defaultPos: { x: 36, y: 15, w: 28, h: 30 }, icon: JacketIcon },
  { id: 'watches', label: 'Watches',   tags: ['Watch', 'Watches'],                                                    defaultPos: { x: 60, y: 38, w: 7,  h: 7  }, icon: WatchIcon },
  { id: 'belts',   label: 'Belts',     tags: ['Belt', 'Belts'],                                                       defaultPos: { x: 40, y: 39, w: 20, h: 5  }, icon: BeltIcon },
  { id: 'bottoms', label: 'Bottoms',   tags: ['Jeans', 'Chinos', 'Shorts', 'Trousers', 'Joggers', 'Pants'],           defaultPos: { x: 40, y: 42, w: 20, h: 30 }, icon: PantsIcon },
  { id: 'socks',   label: 'Socks',     tags: ['Socks'],                                                               defaultPos: { x: 38, y: 72, w: 24, h: 9  }, icon: SocksIcon },
  { id: 'shoes',   label: 'Shoes',     tags: ['Shoes', 'Sneakers', 'Boots', 'Loafers', 'Sandals'],                    defaultPos: { x: 36, y: 82, w: 28, h: 12 }, icon: ShoesIcon },
]

const matchesCategory = (item, cat) => {
  if (!cat.tags) return true  // "All items"
  const t = (item.tags || []).map((x) => x.toLowerCase())
  const c = (item.categories || []).map((x) => x.toLowerCase())
  return cat.tags.some((tag) => {
    const lower = tag.toLowerCase()
    return t.includes(lower) || c.includes(lower)
  })
}

// For "All items" mode, figure out which category an item belongs to (for default placement size).
const detectCategory = (item) => {
  for (const cat of OUTFIT_CATEGORIES) {
    if (cat.id === 'all') continue
    if (matchesCategory(item, cat)) return cat
  }
  return OUTFIT_CATEGORIES.find((c) => c.id === 'top')
}

const newPlacedId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

// Detail view for a clicked item — shows photo + meta + "Add to outfit" button
const OutfitItemDetail = ({ item, onClose, onAdd }) => {
  const images = getImages(item)
  const [imgIdx, setImgIdx] = useState(item.displayImageIndex || 0)
  return (
    <div
      className="backdrop-enter"
      onClick={(e) => { e.stopPropagation(); onClose() }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(19, 37, 27, 0.65)', backdropFilter: 'blur(4px)',
        zIndex: 10005, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        className="modal-enter"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'calc(100% - 32px)', maxWidth: '380px', maxHeight: '85%',
          background: COLORS.cream, borderRadius: '12px',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(19, 37, 27, 0.35)',
        }}
      >
        {images.length > 0 ? (
          <div style={{ width: '100%', flexShrink: 0, position: 'relative', background: COLORS.creamDeep }}>
            <img src={images[imgIdx] || images[0]} alt="" style={{ width: '100%', maxHeight: '46vh', objectFit: 'contain', display: 'block' }} />
            {images.length > 1 && (
              <>
                <button onClick={() => setImgIdx((imgIdx - 1 + images.length) % images.length)} style={{
                  position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)',
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}><ChevronLeft size={14} strokeWidth={2.5} /></button>
                <button onClick={() => setImgIdx((imgIdx + 1) % images.length)} style={{
                  position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}><ChevronRight size={14} strokeWidth={2.5} /></button>
              </>
            )}
          </div>
        ) : (
          <div style={{ height: '180px', background: COLORS.creamDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textFaint }}>
            <ShirtIcon size={36} strokeWidth={1} />
          </div>
        )}
        <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto' }}>
          {item.brand && (
            <div style={{
              fontFamily: FONTS.sub, fontSize: '10px', color: COLORS.textMuted,
              textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 600, marginBottom: '2px',
            }}>{item.brand}</div>
          )}
          <div className="title-bold" style={{ fontSize: '19px', color: COLORS.text, lineHeight: 1.15 }}>
            {item.title || item.name}
          </div>
          {item.price && (
            <span style={{
              fontFamily: FONTS.sub, fontSize: '11px', padding: '4px 12px',
              background: '#1C5F39', borderRadius: '999px',
              fontWeight: 700, color: COLORS.cream,
              display: 'inline-block', marginTop: '6px',
            }}>${Math.ceil(Number(item.price))}</span>
          )}
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
          }}>Close</button>
          <button onClick={onAdd} style={{
            flex: 1, padding: '11px', background: COLORS.green,
            color: COLORS.cream, border: 'none', borderRadius: '6px',
            fontFamily: FONTS.sub, fontSize: '11.5px', letterSpacing: '0.14em',
            textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer',
          }}>Add to outfit</button>
        </div>
      </div>
    </div>
  )
}

const OutfitPicker = ({ items, onClose }) => {
  const [category, setCategory] = useState('all')
  const [catOpen, setCatOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(true)
  const [placed, setPlaced] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [expandedItem, setExpandedItem] = useState(null)
  const [ghost, setGhost] = useState(null)

  const canvasRef = useRef(null)
  const interactionRef = useRef(null)
  const longPressTimer = useRef(null)
  const pressStart = useRef(null)

  const currentCat = OUTFIT_CATEGORIES.find((c) => c.id === category)
  const choices = currentCat ? items.filter((it) => matchesCategory(it, currentCat)) : []

  // In "All items" mode the selected cat doesn't know the item's true category, so fall back to detection.
  const resolveCat = (item, cat) => (cat?.id === 'all' || !cat) ? detectCategory(item) : cat

  const addAt = (item, cat, xPct, yPct) => {
    const target = resolveCat(item, cat)
    const id = newPlacedId()
    const w = target.defaultPos.w
    const h = target.defaultPos.h
    setPlaced((prev) => [...prev, {
      id, item, categoryId: target.id,
      x: Math.max(0, Math.min(100 - w, xPct - w / 2)),
      y: Math.max(0, Math.min(100 - h, yPct - h / 2)),
      w, h,
    }])
    setSelectedId(id)
  }

  const addToOutfit = (item, cat) => {
    const target = resolveCat(item, cat)
    const id = newPlacedId()
    setPlaced((prev) => [...prev, {
      id, item, categoryId: target.id,
      x: target.defaultPos.x, y: target.defaultPos.y,
      w: target.defaultPos.w, h: target.defaultPos.h,
    }])
    setSelectedId(id)
  }

  const removePlaced = (id) => {
    setPlaced((prev) => prev.filter((p) => p.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const randomOutfit = () => {
    const next = []
    OUTFIT_CATEGORIES.forEach((cat) => {
      const opts = items.filter((it) => matchesCategory(it, cat))
      if (opts.length > 0) {
        const choice = opts[Math.floor(Math.random() * opts.length)]
        next.push({
          id: `${newPlacedId()}-${cat.id}`,
          item: choice, categoryId: cat.id,
          x: cat.defaultPos.x, y: cat.defaultPos.y,
          w: cat.defaultPos.w, h: cat.defaultPos.h,
        })
      }
    })
    setPlaced(next)
    setSelectedId(null)
  }

  // === pointer interactions ===
  // List tile: tap → detail, long-press → drag to canvas
  const onListPointerDown = (e, item) => {
    pressStart.current = { x: e.clientX, y: e.clientY, item, time: Date.now() }
    clearTimeout(longPressTimer.current)
    longPressTimer.current = setTimeout(() => {
      // Enter drag-from-list mode. Auto-hide the picker so the canvas is fully reachable
      // for the drop; reopen on drop/cancel so the user can keep adding items.
      longPressTimer.current = null
      interactionRef.current = { type: 'list-drag', item, cat: currentCat, hadPickerOpen: true }
      setPickerOpen(false)
      setGhost({ item, x: e.clientX, y: e.clientY })
    }, 220)
  }

  // Pointer move/up handled at window level when an interaction is active
  useEffect(() => {
    const onMove = (e) => {
      const s = interactionRef.current
      // Cancel pending long-press if user moves while still in pre-drag window
      if (!s && pressStart.current && longPressTimer.current) {
        const dx = Math.abs(e.clientX - pressStart.current.x)
        const dy = Math.abs(e.clientY - pressStart.current.y)
        if (dx > 8 || dy > 8) {
          clearTimeout(longPressTimer.current)
          longPressTimer.current = null
          pressStart.current = null
        }
        return
      }
      if (!s) return
      if (s.type === 'list-drag') {
        setGhost({ item: s.item, x: e.clientX, y: e.clientY })
      } else if (s.type === 'move' || s.type === 'resize') {
        const r = canvasRef.current?.getBoundingClientRect()
        if (!r) return
        const dxPct = ((e.clientX - s.startX) / r.width) * 100
        const dyPct = ((e.clientY - s.startY) / r.height) * 100
        if (s.type === 'move') {
          setPlaced((prev) => prev.map((p) => p.id === s.id ? {
            ...p,
            x: Math.max(0, Math.min(100 - p.w, s.origX + dxPct)),
            y: Math.max(0, Math.min(100 - p.h, s.origY + dyPct)),
          } : p))
        } else {
          // Aspect-ratio-preserving scale: derive a single scale factor from the diagonal drag.
          // Min size is 12% so the 18px corner buttons never overflow the box.
          const aspect = s.origH / s.origW
          const signedDelta = (dxPct + dyPct) / 2
          let newW = Math.max(12, s.origW + signedDelta)
          let newH = newW * aspect
          setPlaced((prev) => prev.map((p) => {
            if (p.id !== s.id) return p
            const maxW = 100 - p.x
            const maxH = 100 - p.y
            if (newW > maxW) { newW = maxW; newH = newW * aspect }
            if (newH > maxH) { newH = maxH; newW = newH / aspect }
            if (newH < 12)   { newH = 12;   newW = newH / aspect }
            if (newW < 12)   { newW = 12;   newH = newW * aspect }
            return { ...p, w: newW, h: newH }
          }))
        }
      }
    }
    const onUp = (e) => {
      const s = interactionRef.current
      if (s?.type === 'list-drag') {
        const r = canvasRef.current?.getBoundingClientRect()
        if (r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          const xPct = ((e.clientX - r.left) / r.width) * 100
          const yPct = ((e.clientY - r.top) / r.height) * 100
          addAt(s.item, s.cat, xPct, yPct)
        }
        setGhost(null)
        if (s.hadPickerOpen) setPickerOpen(true)
      }
      interactionRef.current = null
      pressStart.current = null
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [currentCat])

  const onListPointerUp = (e, item) => {
    // If long-press fired we're already in drag mode; window handler finishes
    if (interactionRef.current?.type === 'list-drag') return
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
      // It was a tap — open detail
      setExpandedItem(item)
    }
    pressStart.current = null
  }

  const onPlacedPointerDown = (e, p) => {
    e.stopPropagation()
    setSelectedId(p.id)
    const r = canvasRef.current?.getBoundingClientRect()
    if (!r) return
    interactionRef.current = {
      type: 'move', id: p.id,
      startX: e.clientX, startY: e.clientY,
      origX: p.x, origY: p.y,
    }
  }

  const onResizePointerDown = (e, p) => {
    e.stopPropagation()
    setSelectedId(p.id)
    interactionRef.current = {
      type: 'resize', id: p.id,
      startX: e.clientX, startY: e.clientY,
      origW: p.w, origH: p.h,
    }
  }

  return createPortal(
    <div className="backdrop-enter" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(19, 37, 27, 0.6)', backdropFilter: 'blur(4px)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div className="modal-enter" onClick={(e) => e.stopPropagation()} style={{
        width: 'calc(100% - 12px)', maxWidth: '960px', height: 'calc(100vh - 32px)',
        background: COLORS.cream, borderRadius: '12px',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(19, 37, 27, 0.35)',
      }}>
        {/* Header — hamburger moved to canvas; only dice + close stay up here */}
        <div style={{ padding: '14px 16px', background: COLORS.green, color: COLORS.cream, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div className="title-bold" style={{ fontSize: '17px', color: COLORS.cream }}>Pick an Outfit</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={randomOutfit} style={{ width: '34px', height: '34px', background: COLORS.green, border: '2px solid rgba(244,238,224,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: COLORS.cream, padding: 0 }}>
              <DiceIcon size={20} />
            </button>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: COLORS.cream, cursor: 'pointer', padding: '5px' }}><XIcon size={18} /></button>
          </div>
        </div>

        {/* Body — canvas fills the entire modal body; picker slides in as overlay */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
          <div
            onClick={() => setSelectedId(null)}
            ref={canvasRef}
            style={{
              position: 'relative', width: '100%', height: '100%',
              background: COLORS.white, overflow: 'hidden', touchAction: 'none',
            }}
          >
            {/* Hamburger toggle — pinned to the top-right of the canvas */}
            <button
              onClick={(e) => { e.stopPropagation(); setPickerOpen((v) => !v) }}
              title={pickerOpen ? 'Hide items' : 'Show items'}
              style={{
                position: 'absolute', top: '12px', right: '12px', zIndex: 6,
                width: '38px', height: '38px', borderRadius: '50%',
                background: COLORS.cream, border: `1px solid ${COLORS.greenLine}`,
                color: COLORS.green, display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', padding: 0,
                boxShadow: '0 2px 8px rgba(19, 37, 27, 0.18)',
              }}
            ><MenuIcon size={18} strokeWidth={2} /></button>

            {/* Silhouette body — purely decorative, centered. Drop targets and placed items
                live as siblings (in the canvas) so they can be placed anywhere, not just inside the body. */}
            <div
              style={{
                position: 'absolute', top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)',
                aspectRatio: '1/2.2', height: '100%',
                background: COLORS.white, pointerEvents: 'none',
              }}
            >
              <svg viewBox="0 0 200 440" preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', padding: '4% 8%', pointerEvents: 'none' }}>
                <ellipse cx="100" cy="30" rx="18" ry="22" fill={COLORS.greenLine} opacity="0.4" />
                <rect x="88" y="50" width="24" height="14" rx="6" fill={COLORS.greenLine} opacity="0.4" />
                <path d="M58 64 Q60 60 100 60 Q140 60 142 64 L148 110 L148 195 Q148 200 140 200 L60 200 Q52 200 52 195 L52 110 Z" fill={COLORS.greenLine} opacity="0.4" />
                <path d="M58 64 L44 68 Q34 72 28 82 L22 110 Q18 126 20 144 L22 174 Q24 182 28 184 L36 186 Q40 184 38 178 L36 144 L38 110 L48 82 L58 72 Z" fill={COLORS.greenLine} opacity="0.4" />
                <path d="M142 64 L156 68 Q166 72 172 82 L178 110 Q182 126 180 144 L178 174 Q176 182 172 184 L164 186 Q160 184 162 178 L164 144 L162 110 L152 82 L142 72 Z" fill={COLORS.greenLine} opacity="0.4" />
                <path d="M68 200 L92 200 L90 280 L86 340 L88 380 L88 400 Q86 410 78 412 L68 412 Q60 410 62 400 L64 380 L64 340 L66 280 Z" fill={COLORS.greenLine} opacity="0.4" />
                <path d="M108 200 L132 200 L134 280 L136 340 L138 380 L138 400 Q136 410 132 412 L122 412 Q114 410 112 400 L112 380 L114 340 L110 280 Z" fill={COLORS.greenLine} opacity="0.4" />
                <path d="M54 400 L88 400 Q92 400 92 408 L92 420 Q90 430 78 430 L54 430 Q46 430 46 420 L46 408 Q48 400 54 400 Z" fill={COLORS.greenLine} opacity="0.4" />
                <path d="M112 400 L146 400 Q152 400 154 408 L154 420 Q152 430 146 430 L120 430 Q108 430 108 420 L108 408 Q110 400 112 400 Z" fill={COLORS.greenLine} opacity="0.4" />
              </svg>
            </div>

            {/* Placed items live on the canvas (siblings of the silhouette body) so they can
                be positioned anywhere within the whole drop area. */}
            {placed.map((p) => {
              const img = getImages(p.item)[0]
              const isSelected = selectedId === p.id
              return (
                <div
                  key={p.id}
                  onPointerDown={(e) => onPlacedPointerDown(e, p)}
                  onClick={(e) => { e.stopPropagation(); setSelectedId(p.id) }}
                  style={{
                    position: 'absolute',
                    top: `${p.y}%`, left: `${p.x}%`,
                    width: `${p.w}%`, height: `${p.h}%`,
                    cursor: 'move',
                    touchAction: 'none',
                    borderRadius: '10px', overflow: 'hidden',
                  }}
                >
                  {img ? (
                    <img src={img} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', borderRadius: '10px', filter: isSelected ? 'drop-shadow(0 0 4px rgba(31,61,46,0.45))' : 'none' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: COLORS.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}>
                      <ShirtIcon size={14} style={{ color: COLORS.textFaint }} />
                    </div>
                  )}
                  {isSelected && (
                    <>
                      {/* X — grey, fixed 20px, inset 4px from top-right corner of the picture box */}
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); removePlaced(p.id) }}
                        style={{
                          position: 'absolute', top: '4px', right: '4px',
                          width: '20px', height: '20px', borderRadius: '50%',
                          background: 'rgba(60, 60, 60, 0.85)', border: '1.5px solid rgba(255,255,255,0.7)',
                          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', padding: 0, zIndex: 5,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                        }}
                      ><XIcon size={10} strokeWidth={2.8} /></button>
                      {/* Resize — grey, fixed 20px, inset 4px from bottom-right corner; diagonal arrow icon */}
                      <button
                        onPointerDown={(e) => onResizePointerDown(e, p)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute', bottom: '4px', right: '4px',
                          width: '20px', height: '20px', borderRadius: '50%',
                          background: 'rgba(60, 60, 60, 0.85)', border: '1.5px solid rgba(255,255,255,0.7)',
                          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'nwse-resize', padding: 0, zIndex: 5, touchAction: 'none',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                        }}
                      ><ResizeIcon size={11} strokeWidth={2.4} /></button>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {/* Slide-in picker panel — overlays the canvas from the right */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', top: 0, right: 0, bottom: 0,
              width: 'min(360px, 80%)',
              background: COLORS.white, borderLeft: `1px solid ${COLORS.greenLine}`,
              boxShadow: pickerOpen ? '-8px 0 24px rgba(19, 37, 27, 0.18)' : 'none',
              transform: pickerOpen ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 0.25s ease',
              display: 'flex', flexDirection: 'column', minWidth: 0, zIndex: 4,
            }}
          >
            {/* Category dropdown — narrower so it doesn't sit under the hamburger button (which is
                positioned at top-right of the canvas and floats above the picker). The dropdown
                panel is anchored directly to the button bottom with no gap and a shared border. */}
            <div style={{ padding: '14px 60px 0 16px', flexShrink: 0, position: 'relative', zIndex: catOpen ? 52 : 'auto' }}>
              <button
                onClick={() => setCatOpen((v) => !v)}
                style={{
                  width: '100%', padding: '10px 12px',
                  borderRadius: catOpen ? '8px 8px 0 0' : '8px',
                  border: `1px solid ${catOpen ? COLORS.green : COLORS.greenLine}`,
                  borderBottom: catOpen ? 'none' : `1px solid ${catOpen ? COLORS.green : COLORS.greenLine}`,
                  background: category !== 'all' ? COLORS.green : COLORS.creamDeep,
                  color: category !== 'all' ? COLORS.cream : COLORS.textMuted,
                  fontFamily: FONTS.sub, fontSize: '11px', fontWeight: 600,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: '6px',
                  transition: 'background 0.3s ease, color 0.3s ease, border-color 0.3s ease',
                  position: 'relative', zIndex: 3,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  {currentCat?.icon && React.createElement(currentCat.icon, { size: 14, strokeWidth: 1.8 })}
                  {currentCat ? currentCat.label : 'Select'}
                </span>
                <ChevronDown size={14} strokeWidth={2} />
              </button>
              {catOpen && (
                <>
                  <div onClick={() => setCatOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1 }} />
                  <div style={{
                    position: 'absolute', top: '100%', left: '16px', right: '60px',
                    marginTop: 0, background: COLORS.cream, borderRadius: '0 0 8px 8px',
                    border: `1px solid ${catOpen ? COLORS.green : COLORS.greenLine}`, borderTop: 'none',
                    boxShadow: '0 8px 24px rgba(19, 37, 27, 0.15)',
                    zIndex: 2,
                  }}>
                    {OUTFIT_CATEGORIES.map((c, i) => (
                      <button
                        key={c.id}
                        onClick={() => { setCategory(c.id); setCatOpen(false) }}
                        style={{
                          width: '100%', padding: '10px 14px', border: 'none',
                          borderBottom: i < OUTFIT_CATEGORIES.length - 1 ? `1px solid ${COLORS.greenLineSoft}` : 'none',
                          background: category === c.id ? 'rgba(31, 61, 46, 0.08)' : 'transparent',
                          fontFamily: FONTS.sub, fontSize: '12px', fontWeight: category === c.id ? 600 : 500,
                          color: category === c.id ? COLORS.green : COLORS.text,
                          cursor: 'pointer', textAlign: 'left',
                          display: 'flex', alignItems: 'center', gap: '10px',
                        }}
                      >
                        {c.icon && React.createElement(c.icon, { size: 15, strokeWidth: 1.8 })}
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div style={{ padding: '10px 16px 6px', flexShrink: 0 }}>
              <div style={{ fontFamily: FONTS.sub, fontSize: '10px', color: COLORS.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
                {choices.length} option{choices.length !== 1 ? 's' : ''} · tap to view, hold to drag
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 16px' }}>
              {choices.length === 0 ? (
                <div style={{ fontFamily: FONTS.sub, fontSize: '12px', color: COLORS.textFaint, fontStyle: 'italic', textAlign: 'center', padding: '24px 0' }}>
                  No items match this category yet.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px' }}>
                  {choices.map((item) => {
                    const img = getImages(item)[0]
                    return (
                      <div
                        key={item.id}
                        onPointerDown={(e) => onListPointerDown(e, item)}
                        onPointerUp={(e) => onListPointerUp(e, item)}
                        onPointerCancel={() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null } pressStart.current = null }}
                        style={{
                          aspectRatio: '3/4', borderRadius: '8px', overflow: 'hidden',
                          cursor: 'grab', position: 'relative',
                          border: `1px solid ${COLORS.greenLine}`,
                          background: COLORS.cream,
                          touchAction: 'none',
                          WebkitUserSelect: 'none', userSelect: 'none',
                        }}
                      >
                        {img ? (
                          <img src={img} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ShirtIcon size={18} style={{ color: COLORS.textFaint }} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Drag ghost — follows pointer during long-press drag */}
      {ghost && (() => {
        const img = getImages(ghost.item)[0]
        return (
          <div style={{
            position: 'fixed', left: ghost.x - 40, top: ghost.y - 53,
            width: '80px', height: '107px', borderRadius: '8px',
            background: COLORS.cream, border: `2px solid ${COLORS.green}`,
            overflow: 'hidden', boxShadow: '0 12px 32px rgba(19, 37, 27, 0.4)',
            transform: 'scale(0.9)', opacity: 0.92,
            pointerEvents: 'none', zIndex: 10004,
          }}>
            {img && <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>
        )
      })()}

      {/* Expanded item detail */}
      {expandedItem && (
        <OutfitItemDetail
          item={expandedItem}
          onClose={() => setExpandedItem(null)}
          onAdd={() => {
            addToOutfit(expandedItem, currentCat)
            setExpandedItem(null)
          }}
        />
      )}
    </div>,
    document.body
  )
}

const ClosetTile = ({ item, onClick, cols, onUpdate }) => {
  const images = getImages(item)
  const displayIdx = item.displayImageIndex || 0
  const currentImg = images[displayIdx] || images[0]
  const guard = useScrollGuard(onClick)

  return (
    <div
      onPointerDown={guard.onPointerDown}
      onClick={guard.onClick}
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
              }}>{item.brand}</div>
            )}
            <div style={{
              fontFamily: FONTS.sub, fontSize: '13.5px', fontWeight: 600, lineHeight: 1.2,
              overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              marginTop: item.brand ? '2px' : 0,
            }}>
              {item.name || item.title}
            </div>
            {item.tags && item.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                {item.tags.map((t) => (
                  <span key={t} style={{
                    fontFamily: FONTS.sub, fontSize: '9px', padding: '3px 9px',
                    background: 'rgba(244,238,224,0.25)', borderRadius: '999px',
                    letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
                  }}>{t}</span>
                ))}
              </div>
            )}
          </div>
        </CropOverlay>
      ) : (
        <div style={{ width: '100%', height: '100%', background: COLORS.creamDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textFaint }}>
          <ShirtIcon size={28} strokeWidth={1.2} />
        </div>
      )}
    </div>
  )
}

export const ClosetPage = ({ items, addOpen, onAddOpenChange, outfitOpen: outfitOpenProp, onOutfitOpenChange, onSelectItem, onSaveItem, onUpdate, onNavigate }) => {
  const [catFilter, setCatFilter] = useState([])
  const [tagFilter, setTagFilter] = useState([])
  const [colorFilter, setColorFilter] = useState([])
  const [gridCols, setGridCols] = useState(() => {
    const saved = loadJson(CLOSET_COLS_KEY)
    return typeof saved === 'number' ? saved : 3
  })
  const [outfitOpenLocal, setOutfitOpenLocal] = useState(false)
  // Allow App to externally trigger the outfit picker (e.g. from Home → Create Outfit).
  const outfitOpen = outfitOpenProp !== undefined ? outfitOpenProp : outfitOpenLocal
  const setOutfitOpen = (v) => { onOutfitOpenChange ? onOutfitOpenChange(v) : setOutfitOpenLocal(v) }

  const handleGridColsChange = (v) => { setGridCols(v); saveJson(CLOSET_COLS_KEY, v) }

  const allCategories = useMemo(() => loadCategories(), [])
  const allTags = useMemo(() => loadTags(), [])
  const allColors = useMemo(() => loadColors(), [])

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (catFilter.length > 0) {
        const cats = item.categories || (item.category ? [item.category] : [])
        if (!catFilter.some((f) => cats.includes(f))) return false
      }
      if (tagFilter.length > 0) {
        const tags = item.tags || []
        if (!tagFilter.some((f) => tags.includes(f))) return false
      }
      if (colorFilter.length > 0) {
        const colors = item.colors || []
        if (!colorFilter.some((f) => colors.includes(f))) return false
      }
      return true
    })
  }, [items, catFilter, tagFilter, colorFilter])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 className="title-bold" style={{ fontSize: '34px', margin: 0, color: COLORS.text, lineHeight: 1.0 }}>My Closet</h2>
          <p style={{ fontFamily: FONTS.sub, fontSize: '11px', color: COLORS.textMuted, margin: '8px 0 0', textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 500 }}>Pieces I Own</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <CircleButton onClick={() => setOutfitOpen(true)}>
            <ShirtIcon size={16} strokeWidth={1.6} />
          </CircleButton>
          <CircleButton onClick={() => onNavigate && onNavigate('calendar')}>
            <CalendarIcon size={16} strokeWidth={1.6} />
          </CircleButton>
          <GridSizeControl cols={gridCols} onChange={handleGridColsChange} />
          <CircleButton onClick={() => onAddOpenChange(true)}>
            <PlusIcon size={18} strokeWidth={1.8} />
          </CircleButton>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <FilterDropdown label="All Styles" icon={SparklesIcon} optionKind="styles" options={allCategories} selected={catFilter} onChange={setCatFilter} />
        <FilterDropdown label="All Categories" icon={TagIcon} optionKind="categories" options={allTags} selected={tagFilter} onChange={setTagFilter} />
        <FilterDropdown label="All Colors" icon={PaletteIcon} optionKind="colors" options={allColors} selected={colorFilter} onChange={setColorFilter} />
      </div>

      {filtered.length === 0 ? (
        <div className="tile" style={{ padding: '40px 20px', textAlign: 'center', color: COLORS.textMuted, fontStyle: 'italic', fontSize: '13.5px' }}>
          {items.length === 0 ? 'Your closet is empty. Tap + to add a piece.' : 'No items match these filters.'}
        </div>
      ) : (
        <div
          key={`${catFilter.join(',')}-${tagFilter.join(',')}-${colorFilter.join(',')}`}
          style={{ display: 'grid', gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: '10px' }}
        >
          {filtered.map((item, idx) => (
            <div key={item.id} style={{ animation: `tileIn 0.4s cubic-bezier(0.25, 0.1, 0.25, 1) both`, animationDelay: `${Math.min(idx * 0.04, 0.5)}s` }}>
              <ClosetTile item={item} onClick={() => onSelectItem(item)} cols={gridCols} onUpdate={onUpdate} />
            </div>
          ))}
        </div>
      )}

      {addOpen && (
        <AddClosetModal
          onClose={() => onAddOpenChange(false)}
          onSave={(item) => { onSaveItem(item); onAddOpenChange(false) }}
        />
      )}

      {outfitOpen && (
        <OutfitPicker items={items} onClose={() => setOutfitOpen(false)} />
      )}

    </div>
  )
}
