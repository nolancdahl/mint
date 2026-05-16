import React, { useState } from 'react'
import { COLORS, FONTS } from '../lib/theme'
import { PageTitle, SectionTitle, StatCard } from '../components/Primitives'
import { PlusIcon, SendIcon } from '../components/Icons'

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
              textAlign: 'center',
              fontSize: '10px',
              color: COLORS.textMuted,
              padding: '8px 0',
              letterSpacing: '0.15em',
              fontFamily: FONTS.sub,
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            {d}
          </div>
        ))}
        {Array.from({ length: 31 }).map((_, i) => (
          <div
            key={i}
            className="tile"
            style={{
              aspectRatio: '1',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-end',
              padding: '5px 6px',
              fontSize: '10px',
              color: COLORS.textMuted,
              fontFamily: FONTS.sub,
              cursor: 'pointer',
            }}
          >
            {i + 1}
          </div>
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
    <div
      className="tile"
      style={{ padding: '24px 20px', minHeight: '80px', color: COLORS.textMuted, fontStyle: 'italic', fontSize: '13px', textAlign: 'center' }}
    >
      Add items to see your palette.
    </div>
    <SectionTitle>Most worn</SectionTitle>
    <div
      className="tile"
      style={{ padding: '24px 20px', color: COLORS.textMuted, fontStyle: 'italic', fontSize: '13px', textAlign: 'center' }}
    >
      Log outfits on the Calendar to populate this.
    </div>
  </div>
)


const SuggestionChip = ({ children }) => (
  <button
    style={{
      padding: '14px',
      background: COLORS.creamDeep,
      border: `1px solid ${COLORS.greenLine}`,
      borderRadius: '6px',
      fontSize: '12.5px',
      color: COLORS.text,
      cursor: 'pointer',
      textAlign: 'left',
      fontFamily: FONTS.sub,
      fontWeight: 500,
      transition: 'background 0.15s, border-color 0.15s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = COLORS.creamLight
      e.currentTarget.style.borderColor = COLORS.green
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = COLORS.creamDeep
      e.currentTarget.style.borderColor = COLORS.greenLine
    }}
  >
    {children}
  </button>
)

export const ExpertPage = () => {
  const [input, setInput] = useState('')
  return (
    <div>
      <PageTitle title="Style Expert" subtitle="Ask anything" />
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What goes with wool flannel trousers?"
          style={{
            flex: 1,
            padding: '13px 14px',
            borderRadius: '4px',
            border: `1px solid ${COLORS.greenLine}`,
            background: COLORS.white,
            fontFamily: FONTS.sub,
            fontSize: '14px',
            color: COLORS.text,
            outline: 'none',
          }}
        />
        <button
          style={{
            padding: '0 18px',
            background: COLORS.green,
            color: COLORS.cream,
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SendIcon size={16} />
        </button>
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
      <div
        className="tile"
        style={{
          padding: '36px 20px',
          textAlign: 'center',
          border: `1px dashed ${COLORS.greenLine}`,
          color: COLORS.textMuted,
          fontSize: '13px',
          cursor: 'pointer',
        }}
      >
        <PlusIcon size={28} strokeWidth={1.3} />
        <div style={{ marginTop: '8px' }}>Tap to add a photo of your fit</div>
      </div>
    </div>
  )
}

const EditableRow = ({ label, value, placeholder }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '13px 18px',
      borderBottom: `1px solid ${COLORS.greenLineSoft}`,
      cursor: 'pointer',
      transition: 'background 0.15s',
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(31, 61, 46, 0.03)')}
    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
  >
    <span
      style={{
        fontFamily: FONTS.sub,
        fontSize: '11px',
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.16em',
        fontWeight: 500,
      }}
    >
      {label}
    </span>
    <span className="title-bold" style={{ fontSize: '16px', color: value ? COLORS.green : COLORS.textFaint }}>
      {value || placeholder || '—'}
    </span>
  </div>
)

export const ProfilePage = ({ user, onSignOut }) => (
  <div>
    <PageTitle title="Profile" subtitle="Your fit + preferences" />
    {user && (
      <div className="tile" style={{ padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="title-bold" style={{ fontSize: '15px', color: COLORS.green }}>{user.displayName || 'User'}</div>
          <div style={{ fontFamily: FONTS.sub, fontSize: '11px', color: COLORS.textMuted, marginTop: '2px' }}>{user.email}</div>
        </div>
        <button
          onClick={onSignOut}
          style={{
            padding: '8px 16px', background: 'transparent', border: `1px solid ${COLORS.greenLine}`,
            borderRadius: '999px', fontFamily: FONTS.sub, fontSize: '11px', letterSpacing: '0.1em',
            textTransform: 'uppercase', fontWeight: 600, color: COLORS.textMuted, cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </div>
    )}
    <SectionTitle>Style preferences</SectionTitle>
    <textarea
      placeholder="Aesthetic direction, brands I love, what I'm trying to avoid, references I keep returning to..."
      style={{
        width: '100%',
        minHeight: '120px',
        padding: '14px 16px',
        borderRadius: '6px',
        border: `1px solid ${COLORS.greenLine}`,
        background: COLORS.creamDeep,
        fontFamily: FONTS.sub,
        fontSize: '13px',
        color: COLORS.text,
        outline: 'none',
        resize: 'vertical',
        lineHeight: 1.5,
      }}
    />
    <SectionTitle>Body measurements</SectionTitle>
    <div className="tile" style={{ padding: '0', overflow: 'hidden' }}>
      <EditableRow label="Height" value="6'0″" />
      <EditableRow label="Inseam" value="30″" />
      <EditableRow label="Waist" value="34″" />
      <EditableRow label="Chest" placeholder="Add" />
      <EditableRow label="Shoulders" placeholder="Add" />
      <EditableRow label="Wrist" value="< 38mm" />
      <EditableRow label="Shoe" placeholder="Add" />
    </div>
    <div style={{ height: '10px' }} />
    <button
      style={{
        width: '100%',
        padding: '11px',
        background: 'transparent',
        border: `1px dashed ${COLORS.greenLine}`,
        borderRadius: '6px',
        fontFamily: FONTS.sub,
        fontSize: '11px',
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        fontWeight: 600,
        color: COLORS.green,
        cursor: 'pointer',
      }}
    >
      + Add measurement
    </button>
    <SectionTitle>Brand size fits</SectionTitle>
    <div className="tile" style={{ padding: '0', overflow: 'hidden' }}>
      <EditableRow label="Taylor Stitch" placeholder="L / M / 32×30" />
      <EditableRow label="Mango" placeholder="Add fits" />
      <EditableRow label="COS" placeholder="Add fits" />
      <EditableRow label="Everlane" placeholder="Add fits" />
    </div>
  </div>
)
