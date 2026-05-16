import React from 'react'
import { PageTitle, SectionTitle, StatCard } from '../components/Primitives'
import { WeatherTile } from '../components/WeatherTile'
import { COLORS, FONTS } from '../lib/theme'
import { CalendarIcon, ShirtIcon, ImageIcon, ShoppingBagIcon } from '../components/Icons'

const QuickPill = ({ icon: IconComp, label, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '7px 14px',
      borderRadius: '999px',
      border: `1px solid ${COLORS.greenLine}`,
      background: COLORS.creamDeep,
      cursor: 'pointer',
      fontFamily: FONTS.sub,
      fontSize: '11px',
      color: COLORS.green,
      fontWeight: 600,
      letterSpacing: '0.06em',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      whiteSpace: 'nowrap',
      transition: 'background 0.15s, border-color 0.15s',
    }}
  >
    <IconComp size={13} strokeWidth={1.8} />
    {label}
  </button>
)

export const HomePage = ({ closetCount, wishlistCount, onAddPiece }) => (
  <div>
    <PageTitle title="Good morning, Nolán" subtitle="Today" />
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
      <QuickPill icon={CalendarIcon} label="Log today's outfit" />
      <QuickPill icon={ShirtIcon} label="Add to closet" onClick={onAddPiece} />
      <QuickPill icon={ImageIcon} label="Save inspo image" />
      <QuickPill icon={ShoppingBagIcon} label="Paste a wishlist link" />
    </div>
    <WeatherTile />
    <SectionTitle>This week</SectionTitle>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '8px' }}>
      <StatCard label="Closet" value={closetCount || '—'} detail="items catalogued" />
      <StatCard label="Wishlist" value={wishlistCount || '—'} detail="under consideration" />
      <StatCard label="Worn" value="—" detail="this month" />
      <StatCard label="Top piece" value="—" detail="most worn" />
    </div>
  </div>
)
