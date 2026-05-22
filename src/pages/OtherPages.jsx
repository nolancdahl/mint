import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { COLORS, FONTS } from '../lib/theme'
import { PageTitle, SectionTitle, StatCard, FieldLabel } from '../components/Primitives'
import { PlusIcon, SendIcon, XIcon, CameraIcon, PenIcon, CheckIcon, MessageIcon, ClockIcon, SparklesIcon, ClipboardIcon, ChevronDown, ChevronLeft, ChevronRight, LinkIcon, TagIcon, TypeIcon, TrashIcon, SearchIcon } from '../components/Icons'
import { loadJson, saveJson, fileToResizedDataUrl } from '../lib/storage'
import { useSyncedJson } from '../lib/useSyncedJson'
import { SHOPPING_CATEGORIES, CLOSET_KEY, WISHLIST_KEY } from '../lib/constants'
import { db, auth } from '../lib/firebase'
import { buildCrossAppBlock } from '../lib/crossAppContext'

// Snapshot of the user's saved profile data to send with each Lorenzo chat request.
// The Netlify function embeds this in the system prompt so Claude can ground answers in
// the user's actual measurements, brand fits, color palette, etc.
const gatherUserContext = () => {
  const profile = loadJson(PROFILE_KEY)
  const profileObj = (profile && typeof profile === 'object' && !Array.isArray(profile)) ? profile : {}
  const brandFits = loadJson('garmint_brand_fits_v2')
  const saleBrands = loadJson('garmint_sale_brands_v1')
  const colorPalette = loadJson('garmint_color_palette_v1')
  const closet = loadJson(CLOSET_KEY)
  const wishlist = loadJson(WISHLIST_KEY)
  return {
    stylePrefs: profileObj.stylePrefs || '',
    measurements: profileObj.measurements || {},
    brandFits: Array.isArray(brandFits) ? brandFits : [],
    saleBrands: Array.isArray(saleBrands) ? saleBrands : [],
    colorPalette: (colorPalette && typeof colorPalette === 'object' && !Array.isArray(colorPalette) && colorPalette.season) ? colorPalette : null,
    closetItemCount: Array.isArray(closet) ? closet.length : 0,
    wishlistItemCount: Array.isArray(wishlist) ? wishlist.length : 0,
  }
}

// Section title with a circular + button inline on the right.
// Used by Profile sections that need a top-right add affordance (Brand Fits, Sale Tracking, etc.).
const SectionTitleWithAdd = ({ children, subtitle, onAdd }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', margin: '28px 0 12px' }}>
    <div>
      <h3 style={{
        fontFamily: FONTS.sub, fontSize: '11px', textTransform: 'uppercase',
        letterSpacing: '0.22em', color: COLORS.textMuted, margin: 0, fontWeight: 600,
      }}>{children}</h3>
      {subtitle && (
        <div style={{
          fontFamily: FONTS.sub, fontSize: '11px', color: COLORS.textFaint,
          fontStyle: 'italic', marginTop: '4px',
        }}>{subtitle}</div>
      )}
    </div>
    {onAdd && (
      <button onClick={onAdd} style={{
        width: '32px', height: '32px', borderRadius: '50%',
        border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep,
        color: COLORS.green, display: 'flex', alignItems: 'center',
        justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
      }}><PlusIcon size={16} strokeWidth={1.8} /></button>
    )}
  </div>
)

const PROFILE_KEY = 'garmint_profile_v1'
const BODY_PHOTOS_KEY = 'garmint_body_photos_v1'

// Tiered list of measurements with their "how to measure" hint. Order is preserved by tier.
// Measurements grouped by body part. The renderer inserts a small header whenever the `group`
// changes from the previous row, so reordering this array reorders the visual sections.
// Stored as { [label]: value }; the group field is just a render hint.
const DEFAULT_MEASUREMENTS = [
  // Overall — whole-body baselines
  { group: 'Overall',    label: 'Height',                       hint: 'Barefoot, against a wall.' },
  { group: 'Overall',    label: 'Weight',                       hint: 'Relevant for fit predictions, not just doctor offices.' },
  { group: 'Overall',    label: 'Posture notes',                hint: 'Sloping shoulders, forward head, longer right arm, etc. Tailors often note these for jacket fitting.' },

  // Head & Neck
  { group: 'Head & Neck',label: 'Head circumference',           hint: 'Around the widest part of the head, just above the ears — for hats.' },
  { group: 'Head & Neck',label: 'Neck circumference',           hint: 'Base of neck, where a dress shirt collar sits.' },

  // Torso (chest, back, shoulders, waist)
  { group: 'Torso',      label: 'Chest',                        hint: 'Fullest part, under armpits, around the back, arms relaxed at sides.' },
  { group: 'Torso',      label: 'Shoulder width',               hint: 'Point of one shoulder bone to the other, across the back.' },
  { group: 'Torso',      label: 'Yoke / cross-back',            hint: 'Shoulder seam to shoulder seam across the upper back.' },
  { group: 'Torso',      label: 'Armhole depth',                hint: 'From the top of the shoulder down to the bottom of the armhole — how deep the armhole sits.' },
  { group: 'Torso',      label: 'Front torso length',           hint: 'Top of shoulder to natural waist, down the front.' },
  { group: 'Torso',      label: 'Back torso length',            hint: 'Base of neck to natural waist, down the back — where your "longer torso" gets quantified.' },
  { group: 'Torso',      label: 'Natural waist',                hint: 'At your navel, the narrowest part of your torso.' },
  { group: 'Torso',      label: 'Stomach / belly',              hint: 'At navel height — often matches natural waist, but worth confirming if there is a difference.' },

  // Arms (shoulder seam → wrist)
  { group: 'Arms',       label: 'Sleeve length',                hint: 'Center back of neck, over the shoulder, down to the wrist bone (with arm slightly bent).' },
  { group: 'Arms',       label: 'Collar to cuff',               hint: 'Shoulder seam down the arm to the wrist — different from sleeve length (which goes center-back).' },
  { group: 'Arms',       label: 'Bicep circumference',          hint: 'Fullest part, arm relaxed.' },
  { group: 'Arms',       label: 'Forearm circumference',        hint: 'Fullest part of the forearm — for fitted shirt sleeves.' },
  { group: 'Arms',       label: 'Wrist circumference',          hint: 'At the wrist bone — get the actual number (<38 mm = watch territory).' },
  { group: 'Arms',       label: 'Cuff / shirt sleeve opening',  hint: 'Your wrist plus a finger or two.' },

  // Hips & Waist (pants seat area)
  { group: 'Hips & Waist', label: 'Hip / seat',                 hint: 'Fullest part, usually around 8" below the natural waist.' },
  { group: 'Hips & Waist', label: 'Trouser waist preference',   hint: 'Where you actually like your pants to sit (often 1–2" above the natural waist for high-rise heritage cuts).' },
  { group: 'Hips & Waist', label: 'Rise (front and back)',      hint: 'Top of waistband down through the crotch — critical for high-waisted trousers.' },

  // Legs
  { group: 'Legs',       label: 'Inseam',                       hint: 'Crotch to where you want your trouser hem.' },
  { group: 'Legs',       label: 'Outseam',                      hint: 'Top of waistband to the floor (cross-checks inseam + rise).' },
  { group: 'Legs',       label: 'Thigh circumference',          hint: 'Fullest part of the upper leg, standing relaxed.' },
  { group: 'Legs',       label: 'Knee circumference',           hint: 'Around the middle of the kneecap, standing — relevant for slim and tapered cuts.' },
  { group: 'Legs',       label: 'Calf circumference',           hint: 'Fullest part of the calf — relevant for boots and tapered trousers.' },
  { group: 'Legs',       label: 'Ankle circumference',          hint: 'Just above the ankle bone — for the leg opening of trousers.' },

  // Feet
  { group: 'Feet',       label: 'Shoe size',                    hint: 'Length, width, arch — a proper Brannock device measurement, not "I wear an 11".' },
  { group: 'Feet',       label: 'Foot length and width (mm)',   hint: 'Length heel-to-toe and width at the widest part, in millimeters — useful if you ever order European shoes.' },
]

const MEASUREMENT_GROUPS = Object.fromEntries(DEFAULT_MEASUREMENTS.map((m) => [m.label, m.group]))

// Stored as { [label]: value } so existing user data stays compatible. Lookup the hint by label.
const MEASUREMENT_HINTS = Object.fromEntries(DEFAULT_MEASUREMENTS.map((m) => [m.label, m.hint]))

const buildDefaultMeasurements = () => Object.fromEntries(DEFAULT_MEASUREMENTS.map((m) => [m.label, '']))

const loadProfile = () => {
  const saved = loadJson(PROFILE_KEY)
  const defaults = {
    photo: null,
    stylePrefs: '',
    measurements: buildDefaultMeasurements(),
    brandFits: { 'Taylor Stitch': '', Mango: '', COS: '', Everlane: '' },
  }
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
    // Merge defaults so users see new measurements added by us, but keep their existing values.
    return {
      ...defaults,
      ...saved,
      measurements: { ...defaults.measurements, ...(saved.measurements || {}) },
    }
  }
  return defaults
}

const CALENDAR_KEY = 'garmint_calendar_v1'

const fmtDate = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

// Calendar tile: shows day number + an outfit/photo thumbnail when one's been logged.
// Empty tiles open a small menu (Upload / Paste / Pick outfit). Today is outlined in green.
const CalendarDayTile = ({ dateStr, dayNum, isToday, entry, onUpload, onPaste, onPickOutfit, onRemove }) => {
  const fileRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)

  // Always toggle the menu — filled days can be replaced (re-upload, re-pick outfit).
  // The remove X handles clearing.
  const onClick = () => setMenuOpen((v) => !v)

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const it of items) {
      if (it.type.startsWith('image/')) {
        e.preventDefault()
        const f = it.getAsFile()
        if (f) {
          const dataUrl = await fileToResizedDataUrl(f, 800, 0.85)
          onPaste(dataUrl)
          setMenuOpen(false)
          return
        }
      }
    }
  }

  return (
    <div
      onClick={onClick}
      className="tile"
      style={{
        aspectRatio: '1', position: 'relative', overflow: 'hidden', cursor: 'pointer',
        padding: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
        border: isToday ? `2px solid ${COLORS.green}` : 'none',
        boxShadow: isToday ? '0 0 0 1px rgba(31, 61, 46, 0.15)' : undefined,
      }}
    >
      {entry?.photo ? (
        <img src={entry.photo} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : null}
      <div style={{
        position: 'absolute', top: '4px', right: '6px',
        fontSize: '10px', fontWeight: isToday ? 700 : 500,
        color: entry?.photo ? '#fff' : (isToday ? COLORS.green : COLORS.textMuted),
        fontFamily: FONTS.sub,
        textShadow: entry?.photo ? '0 1px 2px rgba(0,0,0,0.5)' : 'none',
      }}>{dayNum}</div>
      {entry && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          style={{
            position: 'absolute', top: '3px', left: '3px',
            width: '16px', height: '16px', borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
          }}
        ><XIcon size={8} strokeWidth={2.5} /></button>
      )}
      {menuOpen && (
        <>
          <div onClick={(e) => { e.stopPropagation(); setMenuOpen(false) }} style={{ position: 'fixed', inset: 0, zIndex: 100 }} />
          <div onClick={(e) => e.stopPropagation()} style={{
            position: 'absolute', top: '100%', left: 0, zIndex: 101,
            background: COLORS.cream, borderRadius: '8px',
            border: `1px solid ${COLORS.greenLine}`,
            boxShadow: '0 8px 24px rgba(19, 37, 27, 0.18)',
            padding: '6px', width: '160px', display: 'flex', flexDirection: 'column', gap: '4px',
          }}>
            <button onClick={() => { setMenuOpen(false); fileRef.current?.click() }} style={menuBtn}>Upload photo</button>
            <button
              contentEditable
              suppressContentEditableWarning
              onPaste={handlePaste}
              style={{ ...menuBtn, fontStyle: 'italic', color: COLORS.textFaint }}
            >Paste image…</button>
            <button onClick={() => { setMenuOpen(false); onPickOutfit() }} style={{ ...menuBtn, background: COLORS.green, color: COLORS.cream }}>Pick outfit</button>
          </div>
        </>
      )}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={async (e) => {
          if (e.target.files[0]) {
            const dataUrl = await fileToResizedDataUrl(e.target.files[0], 800, 0.85)
            onUpload(dataUrl)
          }
          e.target.value = ''
        }}
      />
    </div>
  )
}

const menuBtn = {
  padding: '8px 10px', background: COLORS.creamDeep, border: 'none', borderRadius: '6px',
  fontFamily: FONTS.sub, fontSize: '11px', fontWeight: 600, color: COLORS.text,
  cursor: 'pointer', textAlign: 'left', letterSpacing: '0.04em',
}

export const CalendarPage = ({ onPickOutfit }) => {
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const today = new Date()
  const todayStr = fmtDate(today.getFullYear(), today.getMonth(), today.getDate())

  // Track which month is being viewed. Starts on the current month; user can navigate freely.
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const { year, month } = view
  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstWeekday = new Date(year, month, 1).getDay()

  const prevMonth = () => setView((v) => v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 })
  const nextMonth = () => setView((v) => v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 })
  const goToToday = () => setView({ year: today.getFullYear(), month: today.getMonth() })

  // Synced across devices; calendar photos data URLs upload to Storage automatically.
  const [entries, setEntries] = useSyncedJson(CALENDAR_KEY, {})

  const setEntry = (dateStr, partial) => {
    setEntries((prev) => {
      const base = (prev && typeof prev === 'object' && !Array.isArray(prev)) ? prev : {}
      return { ...base, [dateStr]: { ...(base[dateStr] || {}), ...partial } }
    })
  }
  const removeEntry = (dateStr) => {
    setEntries((prev) => {
      const base = (prev && typeof prev === 'object' && !Array.isArray(prev)) ? prev : {}
      const next = { ...base }; delete next[dateStr]; return next
    })
  }

  const navBtn = {
    width: '34px', height: '34px', borderRadius: '50%',
    border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep,
    color: COLORS.green, display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0,
  }
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', gap: '12px' }}>
        <button onClick={prevMonth} aria-label="Previous month" style={navBtn}>
          <ChevronLeft size={16} strokeWidth={1.8} />
        </button>
        <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
          <h2 className="title-bold" style={{ fontSize: '24px', margin: 0, color: COLORS.text, lineHeight: 1.0 }}>
            {monthLabel}
          </h2>
          <button
            onClick={goToToday}
            disabled={isCurrentMonth}
            style={{
              marginTop: '4px', padding: '2px 10px', background: 'transparent', border: 'none',
              fontFamily: FONTS.sub, fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase',
              fontWeight: 600, color: isCurrentMonth ? COLORS.textMuted : COLORS.green,
              cursor: isCurrentMonth ? 'default' : 'pointer',
            }}
          >{isCurrentMonth ? "What I wore" : "← back to today"}</button>
        </div>
        <button onClick={nextMonth} aria-label="Next month" style={navBtn}>
          <ChevronRight size={16} strokeWidth={1.8} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {dayLabels.map((d, i) => (
          <div key={i} style={{
            textAlign: 'center', fontSize: '10px', color: COLORS.textMuted, padding: '8px 0',
            letterSpacing: '0.15em', fontFamily: FONTS.sub, textTransform: 'uppercase', fontWeight: 600,
          }}>{d}</div>
        ))}
        {Array.from({ length: firstWeekday }).map((_, i) => <div key={`pad-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1
          const dateStr = fmtDate(year, month, dayNum)
          return (
            <CalendarDayTile
              key={`${year}-${month}-${dayNum}`}
              dateStr={dateStr}
              dayNum={dayNum}
              isToday={dateStr === todayStr}
              entry={entries && entries[dateStr]}
              onUpload={(dataUrl) => setEntry(dateStr, { photo: dataUrl })}
              onPaste={(dataUrl) => setEntry(dateStr, { photo: dataUrl })}
              onPickOutfit={() => onPickOutfit && onPickOutfit(dateStr)}
              onRemove={() => removeEntry(dateStr)}
            />
          )
        })}
      </div>
    </div>
  )
}

export const StatsPage = ({ items, wishlist }) => (
  <div>
    <PageTitle title="Insights" subtitle="Patterns in what I wear" />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
      <StatCard label="Total items" value={items.length || '—'} />
      <StatCard label="Wishlist" value={wishlist.length || '—'} />
      <StatCard label="Outfits logged" value="—" />
      <StatCard label="Avg per look" value="—" />
    </div>
    <SectionTitle>Color breakdown</SectionTitle>
    <div className="tile" style={{ padding: '24px 20px', minHeight: '80px', color: COLORS.textMuted, fontStyle: 'italic', fontSize: '13px', textAlign: 'center' }}>
      Add items to see your palette.
    </div>
    <SectionTitle>Most worn</SectionTitle>
    <div className="tile" style={{ padding: '24px 20px', color: COLORS.textMuted, fontStyle: 'italic', fontSize: '13px', textAlign: 'center' }}>
      Log outfits on the Calendar to populate this.
    </div>
  </div>
)

const EXPERT_PROMPTS = [
  'What colors pair well with navy?',
  'How should I style my chinos?',
  'Rate my outfit for a dinner date',
  'What basics am I missing?',
  'Best brands for affordable linen shirts?',
  'How to build a capsule wardrobe?',
  'What shoes pair with slim fit jeans?',
  'How to dress for a smart-casual event?',
  'What fabrics work best in summer heat?',
  'Help me match patterns and textures',
  'Which jacket styles are most versatile?',
  'How to layer for a spring look?',
  'What accessories complete a minimal outfit?',
  'Suggest an outfit for a job interview',
  'Best trouser cuts for my body type?',
  'How to style earth tones together?',
  'What can I wear with white sneakers?',
  'How to transition fits from day to night?',
  'Tips for mixing casual and dressy pieces',
  'What goes with a grey crewneck sweater?',
  'How to add color to a neutral wardrobe?',
  'What are must-have wardrobe staples?',
  'Suggest outfits for a weekend trip',
  'Best ways to wear a button-down untucked',
  'How to make a plain tee look styled?',
  'What coat goes with everything?',
  'Suggest fits for a music festival',
]

const getDailyExpertPrompts = () => {
  const today = new Date()
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  const shuffled = [...EXPERT_PROMPTS]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = ((seed * 2654435761 + i * 37) >>> 0) % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, 8)
}

const QuickActionTile = ({ icon, label, description, onClick, active }) => (
  <button
    onClick={onClick}
    style={{
      flex: 1, padding: '20px 12px', background: active ? 'rgba(31, 61, 46, 0.06)' : COLORS.creamDeep,
      border: 'none', borderRadius: '14px',
      boxShadow: '0 2px 6px rgba(19, 37, 27, 0.10), 0 1px 2px rgba(19, 37, 27, 0.06)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
      cursor: 'pointer', color: COLORS.green, textAlign: 'center',
      transition: 'background 0.15s, transform 0.15s, box-shadow 0.15s',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 37, 27, 0.14), 0 2px 4px rgba(19, 37, 27, 0.08)' }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(19, 37, 27, 0.10), 0 1px 2px rgba(19, 37, 27, 0.06)' }}
  >
    {icon}
    <div style={{ fontFamily: FONTS.sub, fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
    <div style={{ fontFamily: FONTS.sub, fontSize: '10px', color: COLORS.textFaint, lineHeight: 1.3, fontWeight: 500 }}>{description}</div>
  </button>
)

const LORENZO_HISTORY_KEY = 'garmint_lorenzo_history_v1'

export const ExpertPage = ({ prefill, onPrefillConsumed }) => {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [activePanel, setActivePanel] = useState(null) // 'ask' | 'photo' | 'history' | null
  const [photoImages, setPhotoImages] = useState([])
  const [sending, setSending] = useState(false)
  const [crossApp, setCrossApp] = useState('')
  // Synced across devices via Firestore — chat history appears on phone after a desktop session.
  const [history, setHistory] = useSyncedJson(LORENZO_HISTORY_KEY, [])
  const [historyQuery, setHistoryQuery] = useState('')
  const fileRef = useRef(null)
  const pasteRef = useRef(null)
  const msgEndRef = useRef(null)
  const inputRef = useRef(null)
  const dailyPrompts = useState(() => getDailyExpertPrompts())[0]

  // Persist the current chat to history whenever the user navigates away from the Ask panel.
  useEffect(() => {
    if (activePanel !== 'ask' && messages.length > 0) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      setHistory((prev) => [{ id, when: Date.now(), messages }, ...(prev || [])].slice(0, 50))
      setMessages([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePanel])

  const filteredHistory = useMemo(() => {
    const q = historyQuery.trim().toLowerCase()
    if (!q) return history
    return history.filter((h) => h.messages.some((m) => m.text && m.text.toLowerCase().includes(q)))
  }, [history, historyQuery])

  // Fetch the user's other-app data once when the Ask panel opens (not per message) —
  // slow-changing data, so one read per session keeps Firestore reads and latency down.
  useEffect(() => {
    if (activePanel !== 'ask') return
    const uid = auth?.currentUser?.uid
    if (!db || !uid) return
    let cancelled = false
    buildCrossAppBlock(db, uid, { excludeApp: 'clothes' }).then((block) => {
      if (!cancelled) setCrossApp(block)
    })
    return () => { cancelled = true }
  }, [activePanel])

  // Honor an inbound prefill (e.g., from Profile → "Chat with Lorenzo"): pop open the Ask panel
  // and seed the input. User still presses Send to submit it.
  useEffect(() => {
    if (prefill) {
      setActivePanel('ask')
      setInput(prefill)
      setTimeout(() => inputRef.current?.focus(), 80)
      if (onPrefillConsumed) onPrefillConsumed()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill])

  useEffect(() => {
    if (msgEndRef.current) msgEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    const trimmed = (text || input).trim()
    if (!trimmed || sending) return

    const userMsg = { role: 'user', text: trimmed }
    // Capture the next history value synchronously so we send the same one the UI is rendering.
    const nextHistory = [...messages, userMsg]
    setMessages(nextHistory)
    setInput('')
    setSending(true)

    try {
      const res = await fetch('/.netlify/functions/lorenzo-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextHistory.map((m) => ({ role: m.role, text: m.text })),
          userContext: { ...gatherUserContext(), crossApp },
        }),
      })
      let data = {}
      try { data = await res.json() } catch { /* non-JSON body */ }
      if (!res.ok || !data.text) {
        throw new Error(data.error || `Lorenzo unreachable (HTTP ${res.status})`)
      }
      setMessages((prev) => [...prev, { role: 'lorenzo', text: data.text }])
    } catch (e) {
      setMessages((prev) => [...prev, {
        role: 'lorenzo',
        text: `I had trouble reaching the network just now — ${e.message}. Try again in a moment.`,
      }])
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handlePhotoFile = async (files) => {
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue
      const dataUrl = await fileToResizedDataUrl(file, 800, 0.85)
      setPhotoImages((prev) => [...prev, dataUrl])
    }
  }

  const handlePhotoPaste = async (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const it of items) {
      if (it.type.startsWith('image/')) {
        e.preventDefault()
        const file = it.getAsFile()
        if (file) {
          const dataUrl = await fileToResizedDataUrl(file, 800, 0.85)
          setPhotoImages((prev) => [...prev, dataUrl])
        }
      }
    }
  }

  const canSend = input.trim().length > 0 && !sending

  const togglePanel = (panel) => {
    setActivePanel((prev) => prev === panel ? null : panel)
    if (panel === 'ask') setTimeout(() => inputRef.current?.focus(), 100)
  }

  return (
    <div>
      <PageTitle title="Ask Lorenzo" subtitle="My style advisor" />

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <QuickActionTile
          icon={<MessageIcon size={22} strokeWidth={1.5} />}
          label="Ask"
          description="Chat with Lorenzo"
          onClick={() => togglePanel('ask')}
          active={activePanel === 'ask'}
        />
        <QuickActionTile
          icon={<CameraIcon size={22} strokeWidth={1.5} />}
          label="Photo"
          description="Get style advice"
          onClick={() => togglePanel('photo')}
          active={activePanel === 'photo'}
        />
        <QuickActionTile
          icon={<ClockIcon size={22} strokeWidth={1.5} />}
          label="History"
          description="Past conversations"
          onClick={() => togglePanel('history')}
          active={activePanel === 'history'}
        />
      </div>

      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files.length) handlePhotoFile([...e.target.files]); e.target.value = '' }}
      />

      {/* Ask panel */}
      {activePanel === 'ask' && (
        <div style={{
          background: COLORS.creamDeep, borderRadius: '14px',
          boxShadow: '0 2px 6px rgba(19, 37, 27, 0.10), 0 1px 2px rgba(19, 37, 27, 0.06)',
          overflow: 'hidden', animation: 'tileIn 0.3s ease both',
        }}>
          <div style={{
            minHeight: '180px', maxHeight: '380px', overflowY: 'auto', padding: '16px',
          }}>
            {messages.length === 0 ? (
              <div>
                <div style={{
                  fontFamily: FONTS.sub, fontSize: '11px', color: COLORS.textFaint,
                  textAlign: 'center', marginBottom: '14px', fontStyle: 'italic',
                }}>
                  Ask about fit, fabric, brands, color, anything.
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
                  {dailyPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      style={{
                        padding: '7px 12px', background: COLORS.cream,
                        border: `1px solid ${COLORS.greenLine}`, borderRadius: '999px',
                        fontFamily: FONTS.sub, fontSize: '11px', fontWeight: 500,
                        color: COLORS.green, cursor: 'pointer',
                        transition: 'background 0.15s, border-color 0.15s',
                        lineHeight: 1.3,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = COLORS.green }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.greenLine }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%', padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: msg.role === 'user' ? COLORS.green : COLORS.cream,
                    color: msg.role === 'user' ? COLORS.cream : COLORS.text,
                    fontFamily: FONTS.sub, fontSize: '13px', lineHeight: 1.45, fontWeight: 500,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {msg.text}
                  </div>
                ))}
                {sending && (
                  <div style={{
                    alignSelf: 'flex-start', padding: '10px 14px',
                    borderRadius: '14px 14px 14px 4px', background: COLORS.cream,
                    fontFamily: FONTS.sub, fontSize: '13px', color: COLORS.textFaint, fontStyle: 'italic',
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                  }}>
                    <span style={{
                      width: '12px', height: '12px', border: `2px solid ${COLORS.greenLine}`,
                      borderTopColor: COLORS.green, borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite', display: 'inline-block',
                    }} />
                    Lorenzo is thinking…
                  </div>
                )}
                <div ref={msgEndRef} />
              </div>
            )}
          </div>

          <div style={{
            display: 'flex', gap: '8px', padding: '12px 14px',
            borderTop: `1px solid ${COLORS.greenLineSoft}`, background: COLORS.cream,
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What goes with wool flannel trousers?"
              style={{
                flex: 1, padding: '12px 14px', borderRadius: '12px',
                border: `1px solid ${COLORS.greenLine}`, background: COLORS.white,
                fontFamily: FONTS.sub, fontSize: '13px', color: COLORS.text, outline: 'none',
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!canSend}
              style={{
                padding: '0 18px', background: canSend ? COLORS.green : COLORS.greenLine,
                color: COLORS.cream, border: 'none', borderRadius: '12px',
                cursor: canSend ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s ease, opacity 0.2s ease',
                opacity: canSend ? 1 : 0.5,
              }}
            >
              <SendIcon size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Photo panel */}
      {activePanel === 'photo' && (
        <div style={{
          background: COLORS.creamDeep, borderRadius: '14px',
          boxShadow: '0 2px 6px rgba(19, 37, 27, 0.10), 0 1px 2px rgba(19, 37, 27, 0.06)',
          padding: '18px', animation: 'tileIn 0.3s ease both',
        }}>
          <div style={{
            fontFamily: FONTS.sub, fontSize: '11px', color: COLORS.textFaint,
            textAlign: 'center', marginBottom: '14px', fontStyle: 'italic',
          }}>
            Upload photos and Lorenzo will give you style feedback. Try:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
            {['Full outfit photo', 'Closeup of a piece', 'Color combo check', 'Fit check', 'Inspo image for recreation'].map((tip) => (
              <span key={tip} style={{
                padding: '5px 10px', background: COLORS.cream, borderRadius: '999px',
                fontFamily: FONTS.sub, fontSize: '10px', color: COLORS.textMuted, fontWeight: 500,
                border: `1px solid ${COLORS.greenLineSoft}`,
              }}>{tip}</span>
            ))}
          </div>

          {/* Uploaded photos */}
          {photoImages.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {photoImages.map((img, i) => (
                <div key={i} style={{ position: 'relative', width: '70px', height: '70px' }}>
                  <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                  <button onClick={() => setPhotoImages((prev) => prev.filter((_, j) => j !== i))} style={{
                    position: 'absolute', top: '-4px', right: '-4px',
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
                  }}><XIcon size={9} /></button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => fileRef.current?.click()} style={{
              flex: 1, padding: '14px', background: COLORS.cream,
              border: `1px solid ${COLORS.greenLine}`, borderRadius: '10px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
              cursor: 'pointer', color: COLORS.textMuted,
            }}>
              <PlusIcon size={18} strokeWidth={1.5} />
              <span style={{ fontFamily: FONTS.sub, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Upload</span>
            </button>
            <div
              ref={pasteRef}
              contentEditable
              suppressContentEditableWarning
              onPaste={handlePhotoPaste}
              style={{
                flex: 1, padding: '14px', background: COLORS.cream,
                border: `1px solid ${COLORS.greenLine}`, borderRadius: '10px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '6px', color: COLORS.textMuted, outline: 'none',
                fontFamily: FONTS.sub, fontSize: '10px', textTransform: 'uppercase',
                letterSpacing: '0.1em', fontWeight: 600, textAlign: 'center',
                minHeight: 0,
              }}
            >
              <ClipboardIcon size={16} strokeWidth={1.5} />
              <span>Paste</span>
            </div>
          </div>

          {photoImages.length > 0 && (
            <button
              onClick={() => { sendMessage(`[Photo uploaded for style advice]`); setActivePanel('ask') }}
              style={{
                width: '100%', marginTop: '12px', padding: '12px',
                background: COLORS.green, color: COLORS.cream, border: 'none',
                borderRadius: '10px', fontFamily: FONTS.sub, fontSize: '11px',
                fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Get advice on {photoImages.length} photo{photoImages.length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* History panel — search-and-filter past conversations by keyword */}
      {activePanel === 'history' && (
        <div style={{
          background: COLORS.creamDeep, borderRadius: '14px',
          boxShadow: '0 2px 6px rgba(19, 37, 27, 0.10), 0 1px 2px rgba(19, 37, 27, 0.06)',
          padding: '14px', animation: 'tileIn 0.3s ease both',
        }}>
          <div style={{ position: 'relative', marginBottom: history.length > 0 ? '12px' : 0 }}>
            <SearchIcon size={14} strokeWidth={1.8} style={{
              position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
              color: COLORS.textFaint,
            }} />
            <input
              value={historyQuery}
              onChange={(e) => setHistoryQuery(e.target.value)}
              placeholder="Search keywords in chats..."
              style={{
                width: '100%', padding: '10px 12px 10px 34px',
                background: COLORS.cream, border: `1px solid ${COLORS.greenLine}`,
                borderRadius: '8px', fontFamily: FONTS.sub, fontSize: '12px',
                color: COLORS.text, outline: 'none', boxSizing: 'border-box',
              }}
            />
            {historyQuery && (
              <button onClick={() => setHistoryQuery('')} style={{
                position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                width: '20px', height: '20px', borderRadius: '50%',
                background: COLORS.creamDeep, border: 'none', color: COLORS.textMuted,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
              }}><XIcon size={10} strokeWidth={2.5} /></button>
            )}
          </div>
          {history.length === 0 ? (
            <div style={{
              fontFamily: FONTS.sub, fontSize: '12px', color: COLORS.textFaint,
              fontStyle: 'italic', textAlign: 'center', padding: '16px 0',
            }}>
              No previous conversations yet. Chat with Lorenzo and your history will appear here.
            </div>
          ) : filteredHistory.length === 0 ? (
            <div style={{
              fontFamily: FONTS.sub, fontSize: '12px', color: COLORS.textFaint,
              fontStyle: 'italic', textAlign: 'center', padding: '16px 0',
            }}>
              No chats match "{historyQuery}".
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', overflowY: 'auto' }}>
              {filteredHistory.map((h) => {
                const firstUser = h.messages.find((m) => m.role === 'user')
                const preview = firstUser?.text || h.messages[0]?.text || '(empty)'
                const date = new Date(h.when).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                return (
                  <button
                    key={h.id}
                    onClick={() => { setMessages(h.messages); setActivePanel('ask') }}
                    style={{
                      textAlign: 'left', padding: '10px 12px', borderRadius: '8px',
                      background: COLORS.cream, border: `1px solid ${COLORS.greenLineSoft}`,
                      fontFamily: FONTS.sub, cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      fontSize: '12px', color: COLORS.text, fontWeight: 500,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{preview}</div>
                    <div style={{
                      fontSize: '10px', color: COLORS.textFaint, marginTop: '2px',
                      letterSpacing: '0.06em',
                    }}>{date} · {h.messages.length} message{h.messages.length !== 1 ? 's' : ''}</div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const EditableRow = ({ label, value, onChange, placeholder, hint }) => {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  const inputRef = useRef(null)

  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus() }, [editing])

  const save = () => {
    setEditing(false)
    if (onChange) onChange(draft)
  }

  return (
    <div
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
        padding: '12px 18px', borderBottom: `1px solid ${COLORS.greenLineSoft}`,
        cursor: editing ? 'default' : 'pointer', transition: 'background 0.15s',
      }}
      onClick={() => { if (!editing) setEditing(true) }}
      onMouseEnter={(e) => { if (!editing) e.currentTarget.style.background = 'rgba(31, 61, 46, 0.03)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONTS.sub, fontSize: '11px', color: COLORS.textMuted,
          textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 500,
        }}>{label}</div>
        {hint && (
          <div style={{
            fontFamily: FONTS.sub, fontSize: '10.5px', color: COLORS.textFaint,
            lineHeight: 1.35, marginTop: '3px', fontWeight: 400,
          }}>{hint}</div>
        )}
      </div>
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === 'Enter') save() }}
          style={{
            textAlign: 'right', border: 'none', outline: 'none',
            background: 'transparent', fontFamily: FONTS.sub,
            fontSize: '14px', color: COLORS.green, fontWeight: 600,
            width: '120px', flexShrink: 0,
          }}
        />
      ) : (
        <span className="title-bold" style={{ fontSize: '16px', color: value ? COLORS.green : COLORS.textFaint, flexShrink: 0 }}>
          {value || placeholder || '—'}
        </span>
      )}
    </div>
  )
}

const BODY_PHOTO_TYPES = ['Face', 'Body Front', 'Body Side', 'Body Back']

const MinusIcon = ({ size = 20, strokeWidth = 1.5, ...rest }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    <path d="M5 12h14" />
  </svg>
)

const cropToSquare = (src, posX, posY, zoom) => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img
      const S = 400
      const scale = Math.max(S / w, S / h)
      const rw = w * scale * zoom
      const rh = h * scale * zoom
      const sx = (rw - S) * posX / 100 / (scale * zoom)
      const sy = (rh - S) * posY / 100 / (scale * zoom)
      const sw = S / (scale * zoom)
      const sh = S / (scale * zoom)
      const canvas = document.createElement('canvas')
      canvas.width = S
      canvas.height = S
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, S, S)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.src = src
  })
}

const ProfilePhotoCropModal = ({ src, onConfirm, onCancel }) => {
  const [pos, setPos] = useState({ x: 50, y: 50 })
  const [zoom, setZoom] = useState(1)
  const dragRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current) return
      const rect = containerRef.current?.getBoundingClientRect()
      const sensitivity = rect ? 100 / Math.max(rect.width, 1) : 0.5
      setPos({
        x: Math.min(100, Math.max(0, dragRef.current.startPosX - (e.clientX - dragRef.current.startX) * sensitivity)),
        y: Math.min(100, Math.max(0, dragRef.current.startPosY - (e.clientY - dragRef.current.startY) * sensitivity)),
      })
    }
    const onUp = () => { dragRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onTouchStart = (e) => {
      e.preventDefault()
      const t = e.touches[0]
      dragRef.current = { startX: t.clientX, startY: t.clientY, startPosX: pos.x, startPosY: pos.y }
    }
    const onTouchMove = (e) => {
      if (!dragRef.current) return
      e.preventDefault()
      const t = e.touches[0]
      const rect = el.getBoundingClientRect()
      const sensitivity = rect ? 100 / Math.max(rect.width, 1) : 0.5
      setPos({
        x: Math.min(100, Math.max(0, dragRef.current.startPosX - (t.clientX - dragRef.current.startX) * sensitivity)),
        y: Math.min(100, Math.max(0, dragRef.current.startPosY - (t.clientY - dragRef.current.startY) * sensitivity)),
      })
    }
    const onTouchEnd = () => { dragRef.current = null }
    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => { el.removeEventListener('touchstart', onTouchStart); el.removeEventListener('touchmove', onTouchMove); el.removeEventListener('touchend', onTouchEnd) }
  }, [pos.x, pos.y])

  const handleConfirm = async () => {
    const cropped = await cropToSquare(src, pos.x, pos.y, zoom)
    onConfirm(cropped)
  }

  const btnStyle = {
    width: '32px', height: '32px', borderRadius: '50%',
    border: 'none', color: '#fff', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  }

  return createPortal(
    <div
      className="backdrop-enter"
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(19,37,27,0.7)',
        zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '20px',
      }}
    >
      <div className="modal-enter" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div style={{
          fontFamily: FONTS.sub, fontSize: '11px', textTransform: 'uppercase',
          letterSpacing: '0.18em', fontWeight: 600, color: 'rgba(255,255,255,0.7)',
        }}>Move and zoom</div>
        <div
          ref={containerRef}
          onMouseDown={(e) => {
            e.preventDefault()
            dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: pos.x, startPosY: pos.y }
          }}
          style={{
            width: '220px', height: '220px', borderRadius: '50%', overflow: 'hidden',
            cursor: 'grab', border: '3px solid rgba(255,255,255,0.4)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <img src={src} draggable={false} alt="" style={{
            width: '100%', height: '100%', objectFit: 'cover',
            objectPosition: `${pos.x}% ${pos.y}%`,
            transform: zoom !== 1 ? `scale(${zoom})` : undefined,
            pointerEvents: 'none', display: 'block',
            transition: 'transform 0.1s ease',
          }} />
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={() => setZoom((z) => Math.max(1, z - 0.15))} style={{ ...btnStyle, background: 'rgba(255,255,255,0.15)', opacity: zoom <= 1 ? 0.4 : 1 }}>
            <MinusIcon size={16} strokeWidth={2.5} />
          </button>
          <div style={{ fontFamily: FONTS.sub, fontSize: '10px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, width: '40px', textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </div>
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.15))} style={{ ...btnStyle, background: 'rgba(255,255,255,0.15)' }}>
            <PlusIcon size={16} strokeWidth={2.5} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
          <button onClick={onCancel} style={{
            padding: '10px 24px', background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.2)', borderRadius: '999px',
            fontFamily: FONTS.sub, fontSize: '11px', letterSpacing: '0.12em',
            textTransform: 'uppercase', fontWeight: 600, color: 'rgba(255,255,255,0.8)', cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleConfirm} style={{
            padding: '10px 24px', background: '#2ecc71',
            border: 'none', borderRadius: '999px',
            fontFamily: FONTS.sub, fontSize: '11px', letterSpacing: '0.12em',
            textTransform: 'uppercase', fontWeight: 600, color: '#fff', cursor: 'pointer',
          }}>Confirm</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Small Upload/Paste popover modeled on Lookbook's AddInspoPopover.
const PhotoUploadPopover = ({ onClose, onUpload, onPaste }) => {
  const pasteRef = useRef(null)
  const [pasting, setPasting] = useState(false)
  return (
    <>
      <div onClick={(e) => { e.stopPropagation(); onClose() }} style={{ position: 'fixed', inset: 0, zIndex: 100 }} />
      <div className="dropdown-enter" style={{
        position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 101,
        background: COLORS.cream, borderRadius: '10px',
        border: `1px solid ${COLORS.greenLine}`,
        boxShadow: '0 8px 24px rgba(19, 37, 27, 0.15)',
        width: '200px', overflow: 'hidden',
      }}>
        {!pasting ? (
          <div style={{ display: 'flex', gap: '6px', padding: '10px' }}>
            <button onClick={(e) => { e.stopPropagation(); onUpload(); onClose() }} style={{
              flex: 1, padding: '16px 8px', background: COLORS.creamDeep,
              border: `1px solid ${COLORS.greenLine}`, borderRadius: '8px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
              cursor: 'pointer', color: COLORS.textMuted,
            }}>
              <PlusIcon size={18} strokeWidth={1.5} />
              <span style={{ fontFamily: FONTS.sub, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Upload</span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); setPasting(true); setTimeout(() => pasteRef.current?.focus(), 100) }} style={{
              flex: 1, padding: '16px 8px', background: COLORS.creamDeep,
              border: `1px solid ${COLORS.greenLine}`, borderRadius: '8px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
              cursor: 'pointer', color: COLORS.textMuted,
            }}>
              <ClipboardIcon size={16} strokeWidth={1.5} />
              <span style={{ fontFamily: FONTS.sub, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Paste</span>
            </button>
          </div>
        ) : (
          <div style={{ padding: '10px' }}>
            <div
              ref={pasteRef}
              contentEditable
              onPaste={(e) => { onPaste(e); onClose() }}
              style={{
                minHeight: '60px', padding: '12px', background: COLORS.white,
                border: `1.5px solid ${COLORS.greenLine}`, borderRadius: '8px',
                fontFamily: FONTS.sub, fontSize: '11px', color: COLORS.textFaint,
                outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                textAlign: 'center',
              }}
            >Paste image here</div>
          </div>
        )}
      </div>
    </>
  )
}

// Rectangular photo tile (3:4 aspect, matches List page tile look). When empty, shows a + that opens
// a Lookbook-style upload/paste menu. When filled, shows a small remove X.
const PhotoTile = ({ src, label, onUpload, onPaste, onRemove }) => {
  const fileRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        aspectRatio: '3/4', borderRadius: '8px', overflow: 'hidden',
        position: 'relative', background: COLORS.creamDeep,
        border: src ? 'none' : `1px dashed ${COLORS.greenLine}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: src ? 'default' : 'pointer', color: COLORS.textFaint,
      }} onClick={() => { if (!src) setMenuOpen((v) => !v) }}>
        {src ? (
          <>
            <img src={src} alt={label || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button onClick={(e) => { e.stopPropagation(); onRemove() }} style={{
              position: 'absolute', top: '6px', right: '6px',
              width: '22px', height: '22px', borderRadius: '50%',
              background: 'rgba(0,0,0,0.55)', border: '1.5px solid rgba(255,255,255,0.6)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', padding: 0,
            }}><XIcon size={10} strokeWidth={2.5} /></button>
          </>
        ) : (
          <PlusIcon size={22} strokeWidth={1.4} />
        )}
      </div>
      {label && (
        <div style={{
          fontFamily: FONTS.sub, fontSize: '10px', color: COLORS.textMuted,
          textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600,
          marginTop: '6px', textAlign: 'center',
        }}>{label}</div>
      )}
      {menuOpen && (
        <PhotoUploadPopover
          onClose={() => setMenuOpen(false)}
          onUpload={() => fileRef.current?.click()}
          onPaste={onPaste}
        />
      )}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files[0]) onUpload(e.target.files[0]); e.target.value = '' }}
      />
    </div>
  )
}

const BodyPhotoSection = React.forwardRef((_props, ref) => {
  // Synced across devices. Data URLs are auto-uploaded to Firebase Storage by saveSyncedJson.
  const [photos, setPhotos] = useSyncedJson(BODY_PHOTOS_KEY, {})
  const fileRef = useRef(null)
  // Two-step menu: pick which type ('Face'/'Body Front'/...) then Upload or Paste for that slot.
  const [pickingType, setPickingType] = useState(false)
  const [pendingType, setPendingType] = useState(null)

  const setPhoto = (type, dataUrl) => setPhotos((prev) => ({ ...(prev || {}), [type]: dataUrl }))

  const handleUpload = async (type, file) => {
    if (!file || !file.type.startsWith('image/')) return
    const dataUrl = await fileToResizedDataUrl(file, 800, 0.85)
    setPhoto(type, dataUrl)
  }

  const handlePaste = async (type, e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const it of items) {
      if (it.type.startsWith('image/')) {
        e.preventDefault()
        const file = it.getAsFile()
        if (file) {
          const dataUrl = await fileToResizedDataUrl(file, 800, 0.85)
          setPhoto(type, dataUrl)
        }
      }
    }
  }

  const removePhoto = (type) => setPhotos((prev) => {
    const next = { ...(prev || {}) }; delete next[type]; return next
  })

  // Expose the + flow to the parent (used by the section-title + button).
  useEffect(() => {
    if (!ref) return
    if (typeof ref === 'function') ref({ openMenu: () => setPickingType(true) })
    else if (ref) ref.current = { openMenu: () => setPickingType(true) }
    return () => { if (ref && typeof ref !== 'function') ref.current = null }
  }, [ref])

  const filled = BODY_PHOTO_TYPES.filter((t) => photos[t])
  const hasAny = filled.length > 0

  return (
    <div style={{ position: 'relative' }}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={async (e) => {
          if (e.target.files[0] && pendingType) {
            await handleUpload(pendingType, e.target.files[0])
            setPendingType(null)
          }
          e.target.value = ''
        }}
      />

      {/* Step 1: choose which slot to fill */}
      {pickingType && !pendingType && (
        <>
          <div onClick={() => setPickingType(false)} style={{ position: 'fixed', inset: 0, zIndex: 100 }} />
          <div className="dropdown-enter" style={{
            position: 'absolute', top: '-58px', right: 0, zIndex: 101,
            background: COLORS.cream, borderRadius: '10px',
            border: `1px solid ${COLORS.greenLine}`,
            boxShadow: '0 8px 24px rgba(19, 37, 27, 0.18)',
            padding: '8px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px',
            width: '220px',
          }}>
            {BODY_PHOTO_TYPES.map((t) => (
              <button key={t} onClick={() => { setPendingType(t); setPickingType(false) }} style={{
                padding: '10px 8px', background: COLORS.creamDeep,
                border: `1px solid ${COLORS.greenLine}`, borderRadius: '8px',
                fontFamily: FONTS.sub, fontSize: '10px', fontWeight: 600,
                color: COLORS.green, cursor: 'pointer',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>{t}</button>
            ))}
          </div>
        </>
      )}

      {/* Step 2: Upload or Paste for the chosen slot */}
      {pendingType && (
        <div style={{ position: 'absolute', top: '-58px', right: 0, zIndex: 101 }}>
          <PhotoUploadPopover
            onClose={() => setPendingType(null)}
            onUpload={() => fileRef.current?.click()}
            onPaste={(e) => handlePaste(pendingType, e)}
          />
        </div>
      )}

      {!hasAny ? (
        <div className="tile" style={{
          padding: '24px 16px', textAlign: 'center', color: COLORS.textFaint,
          fontFamily: FONTS.sub, fontSize: '12px', fontStyle: 'italic',
        }}>Add photos of yourself for AI fit and shape recommendations.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '6px' }}>
          {BODY_PHOTO_TYPES.map((type) => (
            <PhotoTile
              key={type}
              src={photos[type]}
              label={type}
              onUpload={(file) => handleUpload(type, file)}
              onPaste={(e) => handlePaste(type, e)}
              onRemove={() => removePhoto(type)}
            />
          ))}
        </div>
      )}
    </div>
  )
})

const SKIN_PHOTOS_KEY = 'garmint_skin_photos_v1'

// Imperative ref so ProfilePage can drive Skin section's + button from the title row.
const SkinPhotoSection = React.forwardRef((_props, ref) => {
  // Synced across devices; data URLs upload to Storage automatically.
  const [photos, setPhotos] = useSyncedJson(SKIN_PHOTOS_KEY, [])
  const fileRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const appendPhoto = (dataUrl) => setPhotos((prev) => [...(prev || []), dataUrl])

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const dataUrl = await fileToResizedDataUrl(file, 800, 0.85)
    appendPhoto(dataUrl)
  }

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const it of items) {
      if (it.type.startsWith('image/')) {
        e.preventDefault()
        const file = it.getAsFile()
        if (file) await handleFile(file)
      }
    }
  }

  const removePhoto = (idx) => setPhotos((prev) => (prev || []).filter((_, i) => i !== idx))

  React.useImperativeHandle(ref, () => ({
    openMenu: () => setMenuOpen(true),
  }))

  return (
    <div style={{ position: 'relative' }}>
      {/* Hidden file input + popover anchored to the section, opened via the +-in-title button. */}
      {menuOpen && (
        <div style={{ position: 'absolute', top: '-44px', right: 0 }}>
          <PhotoUploadPopover
            onClose={() => setMenuOpen(false)}
            onUpload={() => fileRef.current?.click()}
            onPaste={handlePaste}
          />
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = '' }}
      />

      {photos.length === 0 ? (
        <div className="tile" style={{
          padding: '24px 16px', textAlign: 'center', color: COLORS.textFaint,
          fontFamily: FONTS.sub, fontSize: '12px', fontStyle: 'italic',
        }}>Add 2+ photos in natural light for color palette analysis.</div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
          gap: '10px', marginTop: '6px',
        }}>
          {photos.map((img, i) => (
            <div key={i} style={{ position: 'relative', aspectRatio: '3/4', borderRadius: '8px', overflow: 'hidden' }}>
              <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button onClick={() => removePhoto(i)} style={{
                position: 'absolute', top: '6px', right: '6px',
                width: '22px', height: '22px', borderRadius: '50%',
                background: 'rgba(0,0,0,0.55)', border: '1.5px solid rgba(255,255,255,0.6)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', padding: 0,
              }}><XIcon size={10} strokeWidth={2.5} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

const COLOR_PALETTE_CACHE_KEY = 'garmint_color_palette_v1'

// Placeholder palette/season — swapped for Lorenzo's real analysis later. Keyed on photo signature
// (count for now) so it persists between renders without re-analyzing.
const FAKE_PALETTES = [
  { season: 'Soft Autumn', undertone: 'Warm-neutral',
    flatter: ['#C8A36A', '#8E5A3B', '#4A6B4A', '#D9C9A8', '#5C4033'],
    avoid: ['#FF1493', '#00FFFF'] },
  { season: 'Cool Winter', undertone: 'Cool',
    flatter: ['#0B2545', '#7D8597', '#C9D6DF', '#7A1F4E', '#2E3B4E'],
    avoid: ['#FFD700', '#FF8C00'] },
  { season: 'Warm Spring', undertone: 'Warm',
    flatter: ['#E8A87C', '#F4D35E', '#C38D9E', '#5C8975', '#D6883D'],
    avoid: ['#2F2F4F', '#808080'] },
]

const ColorPaletteSection = ({ onChatWithLorenzo }) => {
  // Reads stay in sync with whatever SkinPhotoSection / other devices write, via useSyncedJson.
  const [skinPhotos] = useSyncedJson(SKIN_PHOTOS_KEY, [])
  const photoCount = Array.isArray(skinPhotos) ? skinPhotos.length : 0
  const [analyzing, setAnalyzing] = useState(false)
  const [palette, setPalette] = useSyncedJson(COLOR_PALETTE_CACHE_KEY, null)

  // Kick off the (fake) analysis when we have 2+ photos and no cached palette.
  useEffect(() => {
    if (photoCount >= 2 && !palette && !analyzing) {
      setAnalyzing(true)
      const t = setTimeout(() => {
        const result = FAKE_PALETTES[photoCount % FAKE_PALETTES.length]
        setPalette(result)
        setAnalyzing(false)
      }, 1800)
      return () => clearTimeout(t)
    }
  }, [photoCount, palette, analyzing, setPalette])

  return (
    <div>
      <SectionTitle>Color palette</SectionTitle>
      {photoCount < 2 ? (
        <div style={{
          padding: '18px', borderRadius: '10px', background: COLORS.creamDeep, textAlign: 'center',
        }}>
          <div style={{ fontFamily: FONTS.sub, fontSize: '12px', color: COLORS.textFaint, fontStyle: 'italic' }}>
            Upload 2+ skin tone photos above to unlock your personalized color palette.
          </div>
        </div>
      ) : analyzing ? (
        <div style={{
          padding: '24px 18px', borderRadius: '10px', background: COLORS.creamDeep,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
        }}>
          <div style={{
            width: '32px', height: '32px', border: `3px solid ${COLORS.greenLine}`,
            borderTopColor: COLORS.green, borderRadius: '50%',
            animation: 'spin 0.9s linear infinite',
          }} />
          <div style={{ fontFamily: FONTS.sub, fontSize: '12px', color: COLORS.textMuted, fontStyle: 'italic' }}>
            Analyzing your skin tones…
          </div>
        </div>
      ) : palette ? (
        <div style={{
          padding: '16px', borderRadius: '10px', background: COLORS.creamDeep,
          boxShadow: '0 2px 6px rgba(19, 37, 27, 0.08)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
            <div>
              <div className="title-bold" style={{ fontSize: '18px', color: COLORS.text, lineHeight: 1.1 }}>{palette.season}</div>
              <div style={{ fontFamily: FONTS.sub, fontSize: '11px', color: COLORS.textMuted, marginTop: '2px' }}>
                Undertone · {palette.undertone}
              </div>
            </div>
          </div>
          <div style={{ fontFamily: FONTS.sub, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 600, color: COLORS.textMuted, marginBottom: '6px' }}>Flattering</div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
            {palette.flatter.map((c) => (
              <div key={c} title={c} style={{ flex: 1, aspectRatio: '1/1.2', borderRadius: '6px', background: c, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' }} />
            ))}
          </div>
          <div style={{ fontFamily: FONTS.sub, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 600, color: COLORS.textMuted, marginBottom: '6px' }}>Avoid</div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
            {palette.avoid.map((c) => (
              <div key={c} title={c} style={{ width: '36px', aspectRatio: '1/1.2', borderRadius: '6px', background: c, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' }} />
            ))}
          </div>
          <button onClick={onChatWithLorenzo} style={{
            width: '100%', padding: '12px', background: COLORS.green, color: COLORS.cream,
            border: 'none', borderRadius: '8px',
            fontFamily: FONTS.sub, fontSize: '11.5px', fontWeight: 600,
            letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
            <SparklesIcon size={14} strokeWidth={1.8} />
            Chat with Lorenzo about this
          </button>
        </div>
      ) : null}
    </div>
  )
}

const BRAND_FITS_KEY = 'garmint_brand_fits_v2'
const SALE_BRANDS_KEY = 'garmint_sale_brands_v1'
const SALE_NOTIFICATIONS_KEY = 'garmint_sale_notifications_v1'

// Closet-style "Add brand fit" modal — full-screen overlay, scrollable.
const BrandFitFormModal = ({ initial, onClose, onSave }) => {
  const fileRef = useRef(null)
  const pasteRef = useRef(null)
  const [brand, setBrand] = useState(initial?.brand || '')
  const [name, setName] = useState(initial?.name || initial?.item || '')
  const [url, setUrl] = useState(initial?.url || '')
  const [size, setSize] = useState(initial?.size || '')
  const [fitNotes, setFitNotes] = useState(initial?.fitNotes || initial?.notes || '')
  const [images, setImages] = useState(initial?.images || (initial?.image ? [initial.image] : []))
  const [previewIdx, setPreviewIdx] = useState(0)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [categories, setCategories] = useState(initial?.categories || [])  // Styles
  const [tags, setTags] = useState(initial?.tags || [])  // Types
  const [colors, setColors] = useState(initial?.colors || [])
  const [newColor, setNewColor] = useState('')
  const [newTag, setNewTag] = useState('')

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const dataUrl = await fileToResizedDataUrl(file, 800, 0.85)
    setImages((prev) => { const next = [...prev, dataUrl]; setPreviewIdx(next.length - 1); return next })
  }

  const handlePasteEvent = async (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const it of items) {
      if (it.type.startsWith('image/')) { e.preventDefault(); const f = it.getAsFile(); if (f) await handleFile(f) }
    }
    setPasteOpen(false)
  }

  const toggle = (list, setList, v) => setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  const fieldStyle = {
    width: '100%', padding: '12px 14px 12px 38px', borderRadius: '6px',
    border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep,
    fontFamily: FONTS.sub, fontSize: '13px', color: COLORS.text, outline: 'none',
  }

  const canSave = !!(brand || name)
  const handleSave = () => {
    if (!canSave) return
    onSave({
      id: initial?.id || Date.now(),
      brand, name, url: url || null,
      size, fitNotes,
      categories, tags, colors,
      image: images[0] || null,
      images: images.length > 0 ? images : null,
    })
  }

  return createPortal(
    <div
      className="backdrop-enter"
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(19, 37, 27, 0.55)', backdropFilter: 'blur(3px)',
        zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div onClick={(e) => e.stopPropagation()} className="modal-enter" style={{
        width: 'calc(100% - 32px)', maxWidth: '400px', maxHeight: '85%',
        background: COLORS.cream, borderRadius: '12px',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(19, 37, 27, 0.35)',
      }}>
        <div style={{ padding: '14px 16px', background: COLORS.green, color: COLORS.cream, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div className="title-bold" style={{ fontSize: '17px', color: COLORS.cream }}>{initial ? 'Edit brand fit' : 'Add brand fit'}</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: COLORS.cream, cursor: 'pointer', padding: '5px' }}><XIcon size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <FieldLabel>Picture</FieldLabel>
          {images.length > 0 && (
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <img src={images[previewIdx]} alt="" style={{ width: '100%', maxHeight: '240px', objectFit: 'contain', borderRadius: '8px', display: 'block', background: COLORS.creamDeep }} />
              <button onClick={() => { setImages((p) => { const n = p.filter((_, i) => i !== previewIdx); setPreviewIdx(Math.min(previewIdx, n.length - 1)); return n }) }} style={{
                position: 'absolute', top: '8px', right: '8px', width: '28px', height: '28px', borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}><XIcon size={14} /></button>
              {images.length > 1 && (
                <>
                  <button onClick={() => setPreviewIdx((previewIdx - 1 + images.length) % images.length)} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><ChevronLeft size={14} strokeWidth={2.5} /></button>
                  <button onClick={() => setPreviewIdx((previewIdx + 1) % images.length)} style={{ position: 'absolute', right: '40px', top: '50%', transform: 'translateY(-50%)', width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><ChevronRight size={14} strokeWidth={2.5} /></button>
                </>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            <button onClick={() => fileRef.current?.click()} style={{ flex: 1, padding: '14px 12px', background: COLORS.creamDeep, border: `1px solid ${COLORS.greenLine}`, borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', color: COLORS.textMuted }}>
              <PlusIcon size={16} strokeWidth={1.5} />
              <span style={{ fontFamily: FONTS.sub, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>Upload</span>
            </button>
            {!pasteOpen ? (
              <button onClick={() => { setPasteOpen(true); setTimeout(() => pasteRef.current?.focus(), 100) }} style={{ flex: 1, padding: '14px 12px', background: COLORS.creamDeep, border: `1px solid ${COLORS.greenLine}`, borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', color: COLORS.textMuted }}>
                <ClipboardIcon size={14} strokeWidth={1.5} />
                <span style={{ fontFamily: FONTS.sub, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>Paste</span>
              </button>
            ) : (
              <div ref={pasteRef} contentEditable onPaste={handlePasteEvent} style={{ flex: 1, padding: '10px', background: COLORS.white, border: `1.5px solid ${COLORS.greenLine}`, borderRadius: '8px', fontFamily: FONTS.sub, fontSize: '11px', color: COLORS.textFaint, outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 0 }} />
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = '' }}
          />

          <FieldLabel>Brand</FieldLabel>
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Taylor Stitch" style={fieldStyle} />
            <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: COLORS.textFaint }}><TagIcon size={15} /></div>
          </div>

          <FieldLabel>Name</FieldLabel>
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. The Telegraph Henley" style={fieldStyle} />
            <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: COLORS.textFaint }}><TypeIcon size={15} /></div>
          </div>

          <FieldLabel>Product URL</FieldLabel>
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="(optional)" style={fieldStyle} />
            <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: COLORS.textFaint }}><LinkIcon size={15} /></div>
          </div>

          <FieldLabel>Size</FieldLabel>
          <input value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. M, 32x30, 10.5" style={{ ...fieldStyle, padding: '12px 14px', marginBottom: '14px' }} />

          <FieldLabel>Fit Notes</FieldLabel>
          <textarea value={fitNotes} onChange={(e) => setFitNotes(e.target.value)} placeholder="Runs large, tight in shoulders, shrinks 1 size after wash..."
            rows={3}
            style={{ width: '100%', padding: '12px 14px', borderRadius: '6px', border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep, fontFamily: FONTS.sub, fontSize: '13px', color: COLORS.text, outline: 'none', resize: 'vertical', marginBottom: '14px', boxSizing: 'border-box' }} />

          <FieldLabel>Categories</FieldLabel>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {SHOPPING_CATEGORIES.map((c) => (
              <button key={c} onClick={() => toggle(categories, setCategories, c)} style={{
                padding: '7px 14px', borderRadius: '999px', fontSize: '11px', fontWeight: 600,
                letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: FONTS.sub,
                border: `1px solid ${categories.includes(c) ? COLORS.green : COLORS.greenLine}`,
                background: categories.includes(c) ? COLORS.green : COLORS.creamDeep,
                color: categories.includes(c) ? COLORS.cream : COLORS.green, cursor: 'pointer',
              }}>{c}</button>
            ))}
          </div>

          <FieldLabel>Type</FieldLabel>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
            {tags.map((t) => (
              <button key={t} onClick={() => toggle(tags, setTags, t)} style={{
                padding: '6px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 500,
                fontFamily: FONTS.sub, border: `1px solid ${COLORS.green}`,
                background: COLORS.green, color: COLORS.cream, cursor: 'pointer',
              }}>{t} ×</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
            <input value={newTag} onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && newTag.trim()) { setTags((p) => [...p, newTag.trim()]); setNewTag('') } }}
              placeholder="Add type (e.g. Henley)" style={{ ...fieldStyle, padding: '8px 12px', fontSize: '12px' }} />
          </div>

          <FieldLabel>Colors</FieldLabel>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
            {colors.map((c) => (
              <button key={c} onClick={() => toggle(colors, setColors, c)} style={{
                padding: '6px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 500,
                fontFamily: FONTS.sub, border: `1px solid ${COLORS.green}`,
                background: COLORS.green, color: COLORS.cream, cursor: 'pointer',
              }}>{c} ×</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
            <input value={newColor} onChange={(e) => setNewColor(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && newColor.trim()) { setColors((p) => [...p, newColor.trim()]); setNewColor('') } }}
              placeholder="Add color (e.g. Navy)" style={{ ...fieldStyle, padding: '8px 12px', fontSize: '12px' }} />
          </div>
        </div>

        <div style={{ padding: '12px 16px', borderTop: `1px solid ${COLORS.greenLine}`, display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', background: 'transparent', border: `1px solid ${COLORS.greenLine}`, borderRadius: '6px', fontFamily: FONTS.sub, fontSize: '11.5px', fontWeight: 600, color: COLORS.green, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.14em' }}>Discard</button>
          <button onClick={handleSave} disabled={!canSave} style={{ flex: 1, padding: '11px', background: canSave ? COLORS.green : COLORS.greenLine, border: 'none', borderRadius: '6px', fontFamily: FONTS.sub, fontSize: '11.5px', fontWeight: 600, color: COLORS.cream, cursor: canSave ? 'pointer' : 'not-allowed', textTransform: 'uppercase', letterSpacing: '0.14em', opacity: canSave ? 1 : 0.6 }}>Save</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

const BrandFitsSection = ({ onAddRef }) => {
  // Synced across devices; any per-entry image data URLs upload to Storage automatically.
  const [entries, saveEntries] = useSyncedJson(BRAND_FITS_KEY, [])
  const [editing, setEditing] = useState(null)  // entry or 'new'
  const [expandedBrand, setExpandedBrand] = useState(null)

  // Expose startNew to the parent so the section-title + button can invoke it.
  // Plain ref assignment works for non-forwardRef components; useImperativeHandle is unreliable here.
  useEffect(() => {
    if (onAddRef) onAddRef.current = { startNew: () => setEditing('new') }
    return () => { if (onAddRef) onAddRef.current = null }
  }, [onAddRef])

  const handleSave = (entry) => {
    if (editing === 'new') saveEntries((prev) => [...(prev || []), entry])
    else saveEntries((prev) => (prev || []).map((e) => e.id === entry.id ? entry : e))
    setEditing(null)
  }
  const handleDelete = (id) => saveEntries((prev) => (prev || []).filter((e) => e.id !== id))

  // Group entries by brand for the collapsible table.
  const groups = useMemo(() => {
    const map = {}
    for (const e of (entries || [])) {
      const key = e.brand || 'Unspecified'
      if (!map[key]) map[key] = []
      map[key].push(e)
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [entries])

  return (
    <>
      {(entries || []).length === 0 ? (
        <div className="tile" style={{ padding: '20px 16px', textAlign: 'center', color: COLORS.textFaint, fontFamily: FONTS.sub, fontSize: '12px', fontStyle: 'italic' }}>
          Track how items fit you. Lorenzo uses this to give better recommendations.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {groups.map(([brand, items]) => {
            const open = expandedBrand === brand
            return (
              <div key={brand} className="tile" style={{ padding: 0, overflow: 'hidden' }}>
                <button
                  onClick={() => setExpandedBrand(open ? null : brand)}
                  style={{
                    width: '100%', padding: '12px 14px', background: 'transparent', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="title-bold" style={{ fontSize: '14px', color: COLORS.text }}>{brand}</div>
                    <span style={{
                      fontFamily: FONTS.sub, fontSize: '9px', padding: '2px 8px',
                      background: COLORS.creamDeep, borderRadius: '999px',
                      letterSpacing: '0.08em', fontWeight: 600, color: COLORS.textMuted,
                    }}>{items.length}</span>
                  </div>
                  <span style={{ display: 'inline-flex', color: COLORS.textMuted, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>
                    <ChevronDown size={16} strokeWidth={2} />
                  </span>
                </button>
                {open && (
                  <div style={{ padding: '0 12px 12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px' }}>
                    {items.map((entry) => {
                      const img = entry.images?.[0] || entry.image
                      return (
                        <div key={entry.id} onClick={() => setEditing(entry)} className="tile" style={{
                          aspectRatio: '3/4', cursor: 'pointer', padding: 0, overflow: 'hidden', position: 'relative',
                        }}>
                          {img ? (
                            <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', background: COLORS.creamDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textFaint }}>
                              <TagIcon size={20} />
                            </div>
                          )}
                          <div style={{
                            position: 'absolute', left: 0, right: 0, bottom: 0,
                            padding: '26px 8px 8px', color: COLORS.cream,
                            background: 'linear-gradient(to top, rgba(19,37,27,0.78), transparent)',
                          }}>
                            <div style={{ fontFamily: FONTS.sub, fontSize: '10.5px', fontWeight: 600, lineHeight: 1.15, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {entry.name || 'Item'}
                            </div>
                            {entry.size && (
                              <div style={{ fontFamily: FONTS.sub, fontSize: '9px', marginTop: '2px', opacity: 0.85 }}>Size {entry.size}</div>
                            )}
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(entry.id) }} style={{
                            position: 'absolute', top: '6px', right: '6px', width: '20px', height: '20px',
                            borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
                          }}><TrashIcon size={9} /></button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {editing && (
        <BrandFitFormModal
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </>
  )
}

const SaleTrackingSection = ({ onAddRef }) => {
  // Synced across devices.
  const [brands, saveBrands] = useSyncedJson(SALE_BRANDS_KEY, [])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', url: '' })

  useEffect(() => {
    if (onAddRef) onAddRef.current = { startAdd: () => { setForm({ name: '', url: '' }); setAdding(true) } }
    return () => { if (onAddRef) onAddRef.current = null }
  }, [onAddRef])

  const handleAdd = () => {
    if (!form.name) return
    saveBrands((prev) => [...(prev || []), { ...form, id: Date.now(), lastChecked: null }])
    setForm({ name: '', url: '' })
    setAdding(false)
  }

  const handleRemove = (idx) => saveBrands((prev) => (prev || []).filter((_, i) => i !== idx))

  return (
    <>
      {(brands || []).length === 0 && !adding && (
        <div className="tile" style={{ padding: '20px 16px', textAlign: 'center', color: COLORS.textFaint, fontFamily: FONTS.sub, fontSize: '12px', fontStyle: 'italic' }}>
          Add brands to monitor for sales. The app checks weekly and notifies you on the home page.
        </div>
      )}

      {(brands || []).map((brand, idx) => (
        <div key={brand.id || idx} style={{
          padding: '10px 14px', background: COLORS.creamDeep, borderRadius: '8px',
          marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontFamily: FONTS.sub, fontSize: '12px', fontWeight: 600, color: COLORS.text }}>{brand.name}</div>
            {brand.url && <div style={{ fontFamily: FONTS.sub, fontSize: '10px', color: COLORS.textFaint, marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{brand.url}</div>}
          </div>
          <button onClick={() => handleRemove(idx)} style={{ background: 'transparent', border: 'none', color: COLORS.textFaint, cursor: 'pointer', padding: '4px' }}>
            <XIcon size={12} />
          </button>
        </div>
      ))}

      {adding && (
        <div style={{ padding: '12px', background: COLORS.creamDeep, borderRadius: '10px', marginTop: '8px' }}>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Brand name (e.g. COS, Everlane)"
            style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: `1px solid ${COLORS.greenLine}`, background: COLORS.white, fontFamily: FONTS.sub, fontSize: '12px', color: COLORS.text, outline: 'none', marginBottom: '8px', boxSizing: 'border-box' }}
          />
          <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="Homepage URL (e.g. https://www.cos.com)"
            style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: `1px solid ${COLORS.greenLine}`, background: COLORS.white, fontFamily: FONTS.sub, fontSize: '12px', color: COLORS.text, outline: 'none', marginBottom: '8px', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setAdding(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: `1px solid ${COLORS.greenLine}`, borderRadius: '6px', fontFamily: FONTS.sub, fontSize: '11px', fontWeight: 600, color: COLORS.textMuted, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cancel</button>
            <button onClick={handleAdd} style={{ flex: 1, padding: '10px', background: COLORS.green, border: 'none', borderRadius: '6px', fontFamily: FONTS.sub, fontSize: '11px', fontWeight: 600, color: COLORS.cream, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Add</button>
          </div>
        </div>
      )}
    </>
  )
}

export const ProfilePage = ({ user, onSignOut, profilePhoto, onProfilePhotoChange, onNavigate, onSetChatPrefill }) => {
  // Profile is synced across devices via Firestore. Use the raw saved value but pass it through
  // the same default-merging that `loadProfile` does so newly-added default measurements appear
  // in the UI even if the stored doc is older.
  const [savedProfile, setSavedProfile] = useSyncedJson(PROFILE_KEY, null)
  const profile = useMemo(() => {
    const defaults = {
      photo: null,
      stylePrefs: '',
      measurements: buildDefaultMeasurements(),
      brandFits: { 'Taylor Stitch': '', Mango: '', COS: '', Everlane: '' },
    }
    if (!savedProfile || typeof savedProfile !== 'object' || Array.isArray(savedProfile)) return defaults
    return {
      ...defaults,
      ...savedProfile,
      measurements: { ...defaults.measurements, ...(savedProfile.measurements || {}) },
    }
  }, [savedProfile])
  const setProfile = setSavedProfile
  const photoRef = useRef(null)
  const skinSectionRef = useRef(null)
  const bodyPhotoRef = useRef(null)
  const brandFitsRef = useRef(null)
  const saleTrackingRef = useRef(null)
  const [cropPending, setCropPending] = useState(null)
  const [photoHovered, setPhotoHovered] = useState(false)
  const [measOpen, setMeasOpen] = useState(false)  // collapsible measurements table
  const [addMeasOpen, setAddMeasOpen] = useState(false)
  const [newMeasLabel, setNewMeasLabel] = useState('')
  const measInputRef = useRef(null)

  // `setProfile` from useSyncedJson already saves to localStorage and Firestore.
  const save = (updated) => setProfile(updated)

  const updateMeasurement = (key, val) => {
    save({ ...profile, measurements: { ...profile.measurements, [key]: val } })
  }

  const addMeasurement = () => {
    const label = newMeasLabel.trim()
    if (!label || profile.measurements[label] !== undefined) return
    save({ ...profile, measurements: { ...profile.measurements, [label]: '' } })
    setNewMeasLabel('')
    setAddMeasOpen(false)
  }

  const handleProfileFileSelect = async (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const dataUrl = await fileToResizedDataUrl(file, 800, 0.9)
    setCropPending(dataUrl)
  }

  const handleCropConfirm = (croppedDataUrl) => {
    save({ ...profile, photo: croppedDataUrl })
    if (onProfilePhotoChange) onProfilePhotoChange(croppedDataUrl)
    setCropPending(null)
  }

  useEffect(() => {
    if (addMeasOpen && measInputRef.current) measInputRef.current.focus()
  }, [addMeasOpen])

  const photo = profile.photo || profilePhoto

  return (
    <div>
      <PageTitle title="Profile" subtitle="My fit + preferences" />

      {/* Profile photo + user info */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
        <div
          onClick={() => photoRef.current?.click()}
          onMouseEnter={() => setPhotoHovered(true)}
          onMouseLeave={() => setPhotoHovered(false)}
          style={{
            width: '200px', height: '200px', borderRadius: '50%', overflow: 'hidden',
            background: COLORS.creamDeep, border: `2px solid ${COLORS.greenLine}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', marginBottom: '12px', position: 'relative',
          }}
        >
          {photo ? (
            <>
              <img src={photo} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {photoHovered && (
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'opacity 0.15s',
                }}>
                  <PenIcon size={28} strokeWidth={1.8} style={{ color: 'rgba(255,255,255,0.85)' }} />
                </div>
              )}
            </>
          ) : (
            <PlusIcon size={36} strokeWidth={1.3} style={{ color: COLORS.textFaint }} />
          )}
        </div>
        <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files[0]) handleProfileFileSelect(e.target.files[0]); e.target.value = '' }}
        />
        {user && (
          <div style={{ textAlign: 'center' }}>
            <div className="title-bold" style={{ fontSize: '15px', color: COLORS.green }}>{user.displayName || 'User'}</div>
            <div style={{ fontFamily: FONTS.sub, fontSize: '11px', color: COLORS.textMuted, marginTop: '2px' }}>{user.email}</div>
            <button
              onClick={onSignOut}
              style={{
                marginTop: '8px', padding: '6px 14px', background: 'transparent',
                border: `1px solid ${COLORS.greenLine}`, borderRadius: '999px',
                fontFamily: FONTS.sub, fontSize: '10px', letterSpacing: '0.1em',
                textTransform: 'uppercase', fontWeight: 600, color: COLORS.textMuted, cursor: 'pointer',
              }}
            >Sign out</button>
          </div>
        )}
      </div>

      <SectionTitle>Style preferences</SectionTitle>
      <textarea
        value={profile.stylePrefs}
        onChange={(e) => save({ ...profile, stylePrefs: e.target.value })}
        placeholder="Aesthetic direction, brands I love, what I'm trying to avoid, references I keep returning to..."
        style={{
          width: '100%', minHeight: '120px', padding: '14px 16px', borderRadius: '6px',
          border: 'none', background: COLORS.creamDeep,
          boxShadow: '0 2px 4px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)',
          fontFamily: FONTS.sub, fontSize: '13px', color: COLORS.text, outline: 'none',
          resize: 'vertical', lineHeight: 1.5,
        }}
      />

      {/* Body measurements — collapsible. Caret toggles the table; the + button uses the same
          circular style as every other section header for consistency. */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', margin: '28px 0 12px' }}>
        <button
          onClick={() => setMeasOpen((v) => !v)}
          style={{
            background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: '8px',
          }}
        >
          <h3 style={{
            fontFamily: FONTS.sub, fontSize: '11px', textTransform: 'uppercase',
            letterSpacing: '0.22em', color: COLORS.textMuted, margin: 0, fontWeight: 600,
          }}>Body measurements</h3>
          <span style={{
            display: 'inline-flex', color: COLORS.textMuted,
            transition: 'transform 0.2s', transform: measOpen ? 'rotate(180deg)' : 'none',
          }}><ChevronDown size={14} strokeWidth={2} /></span>
        </button>
        <button
          onClick={() => { setMeasOpen(true); setAddMeasOpen(true) }}
          title="Add custom measurement"
          style={{
            width: '32px', height: '32px', borderRadius: '50%',
            border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep,
            color: COLORS.green, display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
          }}
        ><PlusIcon size={16} strokeWidth={1.8} /></button>
      </div>
      {measOpen && (
        <>
          <div style={{ borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ background: COLORS.creamDeep }}>
              {(() => {
                const rendered = []
                let lastGroup = null
                // Render the defaults first, in their declared (grouped) order. Each new group
                // gets a small header inserted before its first row.
                for (const m of DEFAULT_MEASUREMENTS) {
                  if (m.group !== lastGroup) {
                    rendered.push(
                      <div key={`hdr-${m.group}`} style={{
                        fontFamily: FONTS.sub, fontSize: '9px',
                        textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700,
                        color: COLORS.green, padding: '14px 18px 6px',
                        background: 'rgba(31, 61, 46, 0.06)',
                        borderTop: `1px solid ${COLORS.greenLineSoft}`,
                      }}>{m.group}</div>
                    )
                    lastGroup = m.group
                  }
                  rendered.push(
                    <EditableRow
                      key={m.label}
                      label={m.label}
                      hint={m.hint}
                      value={profile.measurements[m.label] || ''}
                      placeholder="—"
                      onChange={(v) => updateMeasurement(m.label, v)}
                    />
                  )
                }
                // Any user-added measurements not in the defaults — list under "Custom".
                const customKeys = Object.keys(profile.measurements).filter((k) => !MEASUREMENT_GROUPS[k])
                if (customKeys.length > 0) {
                  rendered.push(
                    <div key="hdr-Custom" style={{
                      fontFamily: FONTS.sub, fontSize: '9px',
                      textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700,
                      color: COLORS.green, padding: '14px 18px 6px',
                      background: 'rgba(31, 61, 46, 0.06)',
                      borderTop: `1px solid ${COLORS.greenLineSoft}`,
                    }}>Custom</div>
                  )
                  for (const k of customKeys) {
                    rendered.push(
                      <EditableRow
                        key={k}
                        label={k}
                        value={profile.measurements[k] || ''}
                        placeholder="—"
                        onChange={(v) => updateMeasurement(k, v)}
                      />
                    )
                  }
                }
                return rendered
              })()}
            </div>
          </div>
          {addMeasOpen && (
            <div style={{ marginTop: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input ref={measInputRef} value={newMeasLabel} onChange={(e) => setNewMeasLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addMeasurement() }} placeholder="e.g. Custom measurement"
                style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep, fontFamily: FONTS.sub, fontSize: '11px', color: COLORS.text, outline: 'none' }}
              />
              <button onClick={addMeasurement} title="Add" style={{
                width: '32px', height: '32px', borderRadius: '50%',
                border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep,
                color: COLORS.green, display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
              }}><PlusIcon size={14} strokeWidth={1.8} /></button>
              <button onClick={() => setAddMeasOpen(false)} title="Cancel" style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'transparent', border: `1px solid ${COLORS.greenLine}`,
                color: COLORS.textMuted, display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0,
              }}><XIcon size={12} strokeWidth={2} /></button>
            </div>
          )}
        </>
      )}

      {/* Body photos — empty state matches Skin Tone; + in title opens a 2-step type-picker → upload/paste */}
      <SectionTitleWithAdd
        subtitle="For AI fit and shape recommendations"
        onAdd={() => bodyPhotoRef.current?.openMenu()}
      >Body photos</SectionTitleWithAdd>
      <BodyPhotoSection ref={bodyPhotoRef} />

      {/* Skin tone photos — array, + button in title opens Lookbook-style upload/paste menu */}
      <SectionTitleWithAdd
        subtitle="Photos in natural light for color palette analysis"
        onAdd={() => skinSectionRef.current?.openMenu()}
      >Skin tone photos</SectionTitleWithAdd>
      <SkinPhotoSection ref={skinSectionRef} />

      <ColorPaletteSection onChatWithLorenzo={() => {
        if (onSetChatPrefill) onSetChatPrefill("I just got my color palette analysis. Help me apply it — what specific pieces and brands should I look at given my season and undertone?")
        if (onNavigate) onNavigate('expert')
      }} />

      {/* Brand Size Fits — circular + opens closet-style modal; results show as collapsible brand groups */}
      <SectionTitleWithAdd
        subtitle="Track how items fit you so Lorenzo can recommend better"
        onAdd={() => brandFitsRef.current?.startNew()}
      >Brand size fits</SectionTitleWithAdd>
      <BrandFitsSection onAddRef={brandFitsRef} />

      <SectionTitleWithAdd
        subtitle="Brands the app monitors for sales (also drives Home recommendations)"
        onAdd={() => saleTrackingRef.current?.startAdd()}
      >Sale tracking</SectionTitleWithAdd>
      <SaleTrackingSection onAddRef={saleTrackingRef} />

      {cropPending && (
        <ProfilePhotoCropModal
          src={cropPending}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropPending(null)}
        />
      )}
    </div>
  )
}
