import React, { useState, useRef, useEffect } from 'react'
import { COLORS, FONTS } from '../lib/theme'
import { PageTitle, SectionTitle, StatCard } from '../components/Primitives'
import { PlusIcon, SendIcon, XIcon, CameraIcon } from '../components/Icons'
import { loadJson, saveJson, fileToResizedDataUrl } from '../lib/storage'

const PROFILE_KEY = 'garmint_profile_v1'
const BODY_PHOTOS_KEY = 'garmint_body_photos_v1'

const loadProfile = () => {
  const saved = loadJson(PROFILE_KEY)
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved
  return {
    photo: null,
    stylePrefs: '',
    measurements: {
      Height: '', Inseam: '', Waist: '', Chest: '', Shoulders: '', Wrist: '', Shoe: '',
    },
    brandFits: {
      'Taylor Stitch': '', Mango: '', COS: '', Everlane: '',
    },
  }
}

export const CalendarPage = () => {
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  return (
    <div>
      <PageTitle title="May 2026" subtitle="What you wore" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {days.map((d, i) => (
          <div
            key={i}
            style={{
              textAlign: 'center', fontSize: '10px', color: COLORS.textMuted, padding: '8px 0',
              letterSpacing: '0.15em', fontFamily: FONTS.sub, textTransform: 'uppercase', fontWeight: 600,
            }}
          >{d}</div>
        ))}
        {Array.from({ length: 31 }).map((_, i) => (
          <div
            key={i}
            className="tile"
            style={{
              aspectRatio: '1', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
              padding: '5px 6px', fontSize: '10px', color: COLORS.textMuted, fontFamily: FONTS.sub, cursor: 'pointer',
            }}
          >{i + 1}</div>
        ))}
      </div>
    </div>
  )
}

export const StatsPage = ({ items, wishlist }) => (
  <div>
    <PageTitle title="Insights" subtitle="Patterns in what you wear" />
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

const SuggestionChip = ({ children }) => (
  <button
    style={{
      padding: '14px', background: COLORS.creamDeep, border: `1px solid ${COLORS.greenLine}`,
      borderRadius: '6px', fontSize: '12.5px', color: COLORS.text, cursor: 'pointer',
      textAlign: 'left', fontFamily: FONTS.sub, fontWeight: 500, transition: 'background 0.15s, border-color 0.15s',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.creamLight; e.currentTarget.style.borderColor = COLORS.green }}
    onMouseLeave={(e) => { e.currentTarget.style.background = COLORS.creamDeep; e.currentTarget.style.borderColor = COLORS.greenLine }}
  >{children}</button>
)

export const ExpertPage = () => {
  const [input, setInput] = useState('')
  return (
    <div>
      <PageTitle title="Ask Lorenzo" subtitle="Your style advisor" />
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <input
          value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="What goes with wool flannel trousers?"
          style={{
            flex: 1, padding: '13px 14px', borderRadius: '4px',
            border: `1px solid ${COLORS.greenLine}`, background: COLORS.white,
            fontFamily: FONTS.sub, fontSize: '14px', color: COLORS.text, outline: 'none',
          }}
        />
        <button style={{
          padding: '0 18px', background: COLORS.green, color: COLORS.cream,
          border: 'none', borderRadius: '4px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><SendIcon size={16} /></button>
      </div>
      <SectionTitle>Quick prompts</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
        <SuggestionChip>Rate my outfit</SuggestionChip>
        <SuggestionChip>What's missing in my closet?</SuggestionChip>
        <SuggestionChip>Color pairings</SuggestionChip>
        <SuggestionChip>Brand recommendations</SuggestionChip>
        <SuggestionChip>Fabric care</SuggestionChip>
        <SuggestionChip>Proportions check</SuggestionChip>
      </div>
      <SectionTitle>Or upload a photo</SectionTitle>
      <div className="tile" style={{
        padding: '36px 20px', textAlign: 'center',
        border: `1px dashed ${COLORS.greenLine}`, color: COLORS.textMuted, fontSize: '13px', cursor: 'pointer',
      }}>
        <PlusIcon size={28} strokeWidth={1.3} />
        <div style={{ marginTop: '8px' }}>Tap to add a photo of your fit</div>
      </div>
    </div>
  )
}

const EditableRow = ({ label, value, onChange, placeholder }) => {
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
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '13px 18px', borderBottom: `1px solid ${COLORS.greenLineSoft}`,
        cursor: editing ? 'default' : 'pointer', transition: 'background 0.15s',
      }}
      onClick={() => { if (!editing) setEditing(true) }}
      onMouseEnter={(e) => { if (!editing) e.currentTarget.style.background = 'rgba(31, 61, 46, 0.03)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{
        fontFamily: FONTS.sub, fontSize: '11px', color: COLORS.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 500, flexShrink: 0,
      }}>{label}</span>
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
            width: '120px',
          }}
        />
      ) : (
        <span className="title-bold" style={{ fontSize: '16px', color: value ? COLORS.green : COLORS.textFaint }}>
          {value || placeholder || '—'}
        </span>
      )}
    </div>
  )
}

const BODY_PHOTO_TYPES = ['Face', 'Body Front', 'Body Side', 'Body Back']

const BodyPhotoSection = () => {
  const [photos, setPhotos] = useState(() => {
    const saved = loadJson(BODY_PHOTOS_KEY)
    return (saved && typeof saved === 'object' && !Array.isArray(saved)) ? saved : {}
  })
  const fileRefs = useRef({})

  const handlePhoto = async (type, file) => {
    if (!file || !file.type.startsWith('image/')) return
    const dataUrl = await fileToResizedDataUrl(file, 600, 0.8)
    const updated = { ...photos, [type]: dataUrl }
    setPhotos(updated)
    saveJson(BODY_PHOTOS_KEY, updated)
  }

  const removePhoto = (type) => {
    const updated = { ...photos }
    delete updated[type]
    setPhotos(updated)
    saveJson(BODY_PHOTOS_KEY, updated)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '10px' }}>
      {BODY_PHOTO_TYPES.map((type) => (
        <div key={type} style={{ textAlign: 'center' }}>
          {photos[type] ? (
            <div style={{ position: 'relative' }}>
              <img src={photos[type]} alt={type} style={{
                width: '100%', aspectRatio: '3/4', objectFit: 'cover',
                borderRadius: '8px', display: 'block',
              }} />
              <button onClick={() => removePhoto(type)} style={{
                position: 'absolute', top: '4px', right: '4px',
                width: '20px', height: '20px', borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
              }}><XIcon size={10} /></button>
            </div>
          ) : (
            <div
              onClick={() => fileRefs.current[type]?.click()}
              style={{
                width: '100%', aspectRatio: '3/4', borderRadius: '8px',
                border: `1px dashed ${COLORS.greenLine}`, background: COLORS.creamDeep,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', gap: '4px', color: COLORS.textFaint,
              }}
            >
              <PlusIcon size={16} strokeWidth={1.5} />
            </div>
          )}
          <div style={{
            fontFamily: FONTS.sub, fontSize: '9px', color: COLORS.textMuted,
            textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginTop: '4px',
          }}>{type}</div>
          <input
            ref={(el) => { fileRefs.current[type] = el }}
            type="file" accept="image/*" style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files[0]) handlePhoto(type, e.target.files[0]); e.target.value = '' }}
          />
        </div>
      ))}
    </div>
  )
}

export const ProfilePage = ({ user, onSignOut, profilePhoto, onProfilePhotoChange }) => {
  const [profile, setProfile] = useState(loadProfile)
  const photoRef = useRef(null)
  const [addMeasOpen, setAddMeasOpen] = useState(false)
  const [newMeasLabel, setNewMeasLabel] = useState('')
  const [addBrandOpen, setAddBrandOpen] = useState(false)
  const [newBrandLabel, setNewBrandLabel] = useState('')
  const measInputRef = useRef(null)
  const brandInputRef = useRef(null)

  const save = (updated) => {
    setProfile(updated)
    saveJson(PROFILE_KEY, updated)
  }

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

  const updateBrandFit = (key, val) => {
    save({ ...profile, brandFits: { ...profile.brandFits, [key]: val } })
  }

  const addBrand = () => {
    const label = newBrandLabel.trim()
    if (!label || profile.brandFits[label] !== undefined) return
    save({ ...profile, brandFits: { ...profile.brandFits, [label]: '' } })
    setNewBrandLabel('')
    setAddBrandOpen(false)
  }

  const handleProfilePhoto = async (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const dataUrl = await fileToResizedDataUrl(file, 300, 0.85)
    save({ ...profile, photo: dataUrl })
    if (onProfilePhotoChange) onProfilePhotoChange(dataUrl)
  }

  useEffect(() => {
    if (addMeasOpen && measInputRef.current) measInputRef.current.focus()
  }, [addMeasOpen])
  useEffect(() => {
    if (addBrandOpen && brandInputRef.current) brandInputRef.current.focus()
  }, [addBrandOpen])

  const photo = profile.photo || profilePhoto

  return (
    <div>
      <PageTitle title="Profile" subtitle="Your fit + preferences" />

      {/* Profile photo + user info */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
        <div
          onClick={() => photoRef.current?.click()}
          style={{
            width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden',
            background: COLORS.creamDeep, border: `2px solid ${COLORS.greenLine}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', marginBottom: '10px',
          }}
        >
          {photo ? (
            <img src={photo} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <PlusIcon size={24} strokeWidth={1.3} style={{ color: COLORS.textFaint }} />
          )}
        </div>
        <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files[0]) handleProfilePhoto(e.target.files[0]); e.target.value = '' }}
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
          border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep,
          fontFamily: FONTS.sub, fontSize: '13px', color: COLORS.text, outline: 'none',
          resize: 'vertical', lineHeight: 1.5,
        }}
      />

      {/* Body measurements header with + button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', marginBottom: '10px' }}>
        <div style={{
          fontFamily: FONTS.sub, fontSize: '10px', textTransform: 'uppercase',
          letterSpacing: '0.2em', fontWeight: 600, color: COLORS.textMuted,
        }}>Body measurements</div>
        <button onClick={() => setAddMeasOpen(true)} style={{
          width: '30px', height: '30px', borderRadius: '50%',
          border: `1px solid ${COLORS.green}`, background: COLORS.creamDeep,
          color: COLORS.green, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', padding: 0, flexShrink: 0,
        }}>
          <PlusIcon size={14} strokeWidth={2} />
        </button>
      </div>
      <div className="tile" style={{ padding: '0', overflow: 'hidden' }}>
        {Object.entries(profile.measurements).map(([key, val]) => (
          <EditableRow
            key={key}
            label={key}
            value={val}
            placeholder="Add"
            onChange={(v) => updateMeasurement(key, v)}
          />
        ))}
      </div>

      {addMeasOpen && (
        <div style={{
          marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center',
        }}>
          <input
            ref={measInputRef}
            value={newMeasLabel}
            onChange={(e) => setNewMeasLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addMeasurement() }}
            placeholder="e.g. Neck, Thigh..."
            style={{
              flex: 1, padding: '10px 14px', borderRadius: '6px',
              border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep,
              fontFamily: FONTS.sub, fontSize: '12px', color: COLORS.text, outline: 'none',
            }}
          />
          <button onClick={addMeasurement} style={{
            padding: '8px 14px', background: COLORS.green, border: 'none',
            borderRadius: '6px', color: COLORS.cream, fontFamily: FONTS.sub,
            fontSize: '11px', fontWeight: 600, cursor: 'pointer',
          }}>Add</button>
          <button onClick={() => setAddMeasOpen(false)} style={{
            padding: '8px 10px', background: 'transparent', border: `1px solid ${COLORS.greenLine}`,
            borderRadius: '6px', color: COLORS.textMuted, fontFamily: FONTS.sub,
            fontSize: '11px', fontWeight: 600, cursor: 'pointer',
          }}>Cancel</button>
        </div>
      )}

      <SectionTitle>Body photos</SectionTitle>
      <div style={{
        fontFamily: FONTS.sub, fontSize: '11px', color: COLORS.textFaint,
        fontStyle: 'italic', marginBottom: '6px',
      }}>For AI fit and shape recommendations</div>
      <BodyPhotoSection />

      {/* Brand size fits header with + button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', marginBottom: '10px' }}>
        <div style={{
          fontFamily: FONTS.sub, fontSize: '10px', textTransform: 'uppercase',
          letterSpacing: '0.2em', fontWeight: 600, color: COLORS.textMuted,
        }}>Brand size fits</div>
        <button onClick={() => setAddBrandOpen(true)} style={{
          width: '30px', height: '30px', borderRadius: '50%',
          border: `1px solid ${COLORS.green}`, background: COLORS.creamDeep,
          color: COLORS.green, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', padding: 0, flexShrink: 0,
        }}>
          <PlusIcon size={14} strokeWidth={2} />
        </button>
      </div>
      <div className="tile" style={{ padding: '0', overflow: 'hidden' }}>
        {Object.entries(profile.brandFits).map(([key, val]) => (
          <EditableRow
            key={key}
            label={key}
            value={val}
            placeholder="Add fits"
            onChange={(v) => updateBrandFit(key, v)}
          />
        ))}
      </div>

      {addBrandOpen && (
        <div style={{
          marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center',
        }}>
          <input
            ref={brandInputRef}
            value={newBrandLabel}
            onChange={(e) => setNewBrandLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addBrand() }}
            placeholder="e.g. Nike, Uniqlo..."
            style={{
              flex: 1, padding: '10px 14px', borderRadius: '6px',
              border: `1px solid ${COLORS.greenLine}`, background: COLORS.creamDeep,
              fontFamily: FONTS.sub, fontSize: '12px', color: COLORS.text, outline: 'none',
            }}
          />
          <button onClick={addBrand} style={{
            padding: '8px 14px', background: COLORS.green, border: 'none',
            borderRadius: '6px', color: COLORS.cream, fontFamily: FONTS.sub,
            fontSize: '11px', fontWeight: 600, cursor: 'pointer',
          }}>Add</button>
          <button onClick={() => setAddBrandOpen(false)} style={{
            padding: '8px 10px', background: 'transparent', border: `1px solid ${COLORS.greenLine}`,
            borderRadius: '6px', color: COLORS.textMuted, fontFamily: FONTS.sub,
            fontSize: '11px', fontWeight: 600, cursor: 'pointer',
          }}>Cancel</button>
        </div>
      )}
    </div>
  )
}
