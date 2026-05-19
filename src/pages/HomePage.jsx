import React, { useState, useEffect, useMemo } from 'react'
import { PageTitle, SectionTitle } from '../components/Primitives'
import { WeatherTile } from '../components/WeatherTile'
import { COLORS, FONTS } from '../lib/theme'
import { CalendarIcon, ShirtIcon, ImageIcon, ShoppingBagIcon, ExternalIcon, LayersIcon } from '../components/Icons'
import { loadJson } from '../lib/storage'
import { CLOSET_KEY } from '../lib/constants'

const SALE_BRANDS_KEY = 'garmint_sale_brands_v1'

const ActionTile = ({ icon: IconComp, label, description, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '16px 8px 14px', background: COLORS.creamDeep,
      border: 'none', borderRadius: '14px',
      boxShadow: '0 2px 6px rgba(19, 37, 27, 0.10), 0 1px 2px rgba(19, 37, 27, 0.06)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
      cursor: 'pointer', color: COLORS.green, textAlign: 'center',
      transition: 'transform 0.15s, box-shadow 0.15s',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 37, 27, 0.14), 0 2px 4px rgba(19, 37, 27, 0.08)' }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(19, 37, 27, 0.10), 0 1px 2px rgba(19, 37, 27, 0.06)' }}
  >
    <IconComp size={20} strokeWidth={1.5} />
    <div style={{ fontFamily: FONTS.sub, fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1.2 }}>{label}</div>
    {description && <div style={{ fontFamily: FONTS.sub, fontSize: '9px', color: COLORS.textFaint, lineHeight: 1.2, fontWeight: 500 }}>{description}</div>}
  </button>
)

const CLOTHING_TYPES = {
  tops: ['T-Shirts', 'Sweaters', 'Shirts', 'Polos', 'Henleys'],
  bottoms: ['Jeans', 'Chinos', 'Shorts', 'Trousers', 'Joggers'],
  shoes: ['Shoes', 'Sneakers', 'Boots', 'Loafers', 'Sandals'],
  socks: ['Socks'],
  outer: ['Jackets', 'Rain Jackets', 'Coats', 'Blazers', 'Vests'],
  accessories: ['Hats', 'Scarves', 'Sunglasses', 'Belts', 'Watches'],
}

const pickFromCloset = (items, typeList) => {
  const matches = items.filter((item) => {
    const tags = (item.tags || []).map((t) => t.toLowerCase())
    const cats = (item.categories || []).map((c) => c.toLowerCase())
    return typeList.some((t) => tags.includes(t.toLowerCase()) || cats.includes(t.toLowerCase()))
  })
  if (matches.length === 0) return null
  return matches[Math.floor(Math.random() * matches.length)]
}

const generateOutfit = (items, seed) => {
  // Deterministic random with seed
  const rng = (s) => { s = Math.imul(s ^ (s >>> 16), 0x45d9f3b); s = Math.imul(s ^ (s >>> 16), 0x45d9f3b); return ((s ^ (s >>> 16)) >>> 0) / 4294967296 }
  const shuffled = [...items].sort(() => rng(seed++) - 0.5)

  const top = pickFromCloset(shuffled, CLOTHING_TYPES.tops)
  const bottom = pickFromCloset(shuffled, CLOTHING_TYPES.bottoms)
  const shoes = pickFromCloset(shuffled, CLOTHING_TYPES.shoes)
  const socks = pickFromCloset(shuffled, CLOTHING_TYPES.socks)
  const outer = pickFromCloset(shuffled, CLOTHING_TYPES.outer)
  const accessory = pickFromCloset(shuffled, CLOTHING_TYPES.accessories)

  const pieces = [top, bottom, shoes, socks].filter(Boolean)
  if (outer) pieces.push(outer)
  if (accessory) pieces.push(accessory)
  return pieces
}

const OutfitCard = ({ pieces, label, onClick }) => {
  if (pieces.length === 0) return (
    <div className="tile" style={{
      padding: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
      textAlign: 'center', color: COLORS.textFaint, fontFamily: FONTS.sub,
      fontSize: '11px', fontStyle: 'italic', minHeight: '160px',
    }}>
      Add more items to your closet for suggestions
    </div>
  )

  return (
    <div
      onClick={onClick}
      className="tile"
      style={{
        padding: '12px', cursor: onClick ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{
        fontFamily: FONTS.sub, fontSize: '10px', textTransform: 'uppercase',
        letterSpacing: '0.16em', fontWeight: 600, color: COLORS.textMuted, marginBottom: '10px',
      }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', flex: 1 }}>
        {pieces.map((item, i) => {
          const img = item.images?.[0] || item.image
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{
                aspectRatio: '1/1', borderRadius: '6px', overflow: 'hidden',
                background: COLORS.greenLineSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {img ? (
                  <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <ShirtIcon size={16} strokeWidth={1.2} style={{ color: COLORS.textFaint }} />
                )}
              </div>
              <div style={{
                fontFamily: FONTS.sub, fontSize: '9.5px', color: COLORS.text,
                marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap', fontWeight: 500,
              }}>{item.title || item.name || item.brand || 'Item'}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const NotificationItem = ({ text, link }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 14px', borderBottom: `1px solid ${COLORS.greenLineSoft}`,
  }}>
    <div style={{ fontFamily: FONTS.sub, fontSize: '12px', color: COLORS.text, lineHeight: 1.4, flex: 1 }}>
      {text}
    </div>
    {link && (
      <a href={link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: COLORS.green, flexShrink: 0, marginLeft: '8px' }}>
        <ExternalIcon size={14} strokeWidth={1.8} />
      </a>
    )}
  </div>
)

export const HomePage = ({ closetCount, wishlistCount, onCreateOutfit, onNavigate }) => {
  const closetItems = useMemo(() => loadJson(CLOSET_KEY), [])
  const saleBrands = useMemo(() => {
    const s = loadJson(SALE_BRANDS_KEY)
    return Array.isArray(s) ? s : []
  }, [])

  const today = new Date()
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()

  const outfits = useMemo(() => {
    if (closetItems.length < 3) return [[], [], []]
    return [
      generateOutfit(closetItems, seed),
      generateOutfit(closetItems, seed + 1000),
      generateOutfit(closetItems, seed + 2000),
    ]
  }, [closetItems, seed])

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '18px' }}>
        <h2 className="title-bold" style={{ fontSize: '26px', margin: 0, color: COLORS.text, lineHeight: 1.1 }}>
          Good morning, Nolan
        </h2>
        <div style={{ fontFamily: FONTS.sub, fontSize: '11px', color: COLORS.textMuted, marginTop: '4px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500 }}>
          Today
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
        <ActionTile icon={LayersIcon} label="Create Outfit" description="Pick a look" onClick={onCreateOutfit} />
        <ActionTile icon={CalendarIcon} label="Log outfit" description="Track what you wore" onClick={() => onNavigate && onNavigate('calendar')} />
        <ActionTile icon={ShoppingBagIcon} label="Add to List" description="Items you want" onClick={() => onNavigate && onNavigate('shopping')} />
        <ActionTile icon={ImageIcon} label="Add to Lookbook" description="Bookmark a look" onClick={() => onNavigate && onNavigate('inspiration')} />
      </div>

      <WeatherTile />

      {/* Notification Center */}
      <SectionTitle>Notifications</SectionTitle>
      <div style={{
        borderRadius: '12px', overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(19, 37, 27, 0.08)',
        background: COLORS.creamDeep,
        marginBottom: '8px',
      }}>
        <NotificationItem text="No sale alerts yet. Add brands to your profile and items to your list to get notified." />
      </div>

      {/* Outfit suggestions — 3 large tiles matching Recommended Items width.
          Each tile contains a 2-col grid of items rendered as squares with the item label below. */}
      <SectionTitle>Today's Outfits</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', alignItems: 'stretch' }}>
        <OutfitCard pieces={outfits[0]} label="Option 1" onClick={onCreateOutfit} />
        <OutfitCard pieces={outfits[1]} label="Option 2" onClick={onCreateOutfit} />
        <OutfitCard pieces={outfits[2]} label="Option 3" onClick={onCreateOutfit} />
      </div>

      {/* Recommended Items — pulled from brands tracked in Profile → Sale Tracking.
          Real product feeds aren't wired up yet; tiles act as quick links to each brand. */}
      <div style={{ marginTop: '20px' }}>
        <SectionTitle>Recommended Items</SectionTitle>
        {saleBrands.length === 0 ? (
          <div className="tile" style={{ padding: '20px', textAlign: 'center', color: COLORS.textMuted, fontFamily: FONTS.sub, fontSize: '12px', fontStyle: 'italic' }}>
            Add brands in Profile → Sale Tracking to see online recommendations from them here.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {saleBrands.slice(0, 6).map((brand, i) => (
              <a
                key={brand.id || brand.name || i}
                href={brand.url || '#'}
                target={brand.url ? '_blank' : '_self'}
                rel="noopener noreferrer"
                className="tile"
                style={{
                  aspectRatio: '3/4', overflow: 'hidden', padding: 0, position: 'relative',
                  textDecoration: 'none', cursor: 'pointer', display: 'flex',
                  background: COLORS.green, color: COLORS.cream,
                  alignItems: 'flex-end',
                }}
              >
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'radial-gradient(circle at 30% 20%, rgba(244,238,224,0.2), transparent 60%)',
                }} />
                <div style={{ position: 'relative', padding: '12px', width: '100%' }}>
                  <div style={{ fontFamily: FONTS.sub, fontSize: '9px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 600 }}>From</div>
                  <div className="title-bold" style={{ fontSize: '17px', lineHeight: 1.1, marginTop: '2px' }}>{brand.name}</div>
                  <div style={{ fontFamily: FONTS.sub, fontSize: '10px', marginTop: '6px', opacity: 0.75, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Browse latest <ExternalIcon size={11} strokeWidth={2} />
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      <DailyQuoteTip seed={seed} />
    </div>
  )
}

const QUOTES = [
  { text: 'Style is a way to say who you are without having to speak.', by: 'Rachel Zoe' },
  { text: "Fashions fade, style is eternal.", by: 'Yves Saint Laurent' },
  { text: 'Elegance is refusal.', by: 'Coco Chanel' },
  { text: 'The dress must follow the body of a woman, not the body following the shape of the dress.', by: 'Hubert de Givenchy' },
  { text: 'Buy less, choose well, make it last.', by: 'Vivienne Westwood' },
  { text: "I don't design clothes. I design dreams.", by: 'Ralph Lauren' },
  { text: 'Simplicity is the keynote of all true elegance.', by: 'Coco Chanel' },
  { text: 'Clothes mean nothing until someone lives in them.', by: 'Marc Jacobs' },
  { text: 'In order to be irreplaceable one must always be different.', by: 'Coco Chanel' },
  { text: 'A well-tied tie is the first serious step in life.', by: 'Oscar Wilde' },
  { text: "Style is knowing who you are, what you want to say, and not giving a damn.", by: 'Gore Vidal' },
  { text: 'Dressing well is a form of good manners.', by: 'Tom Ford' },
]

const TIPS = [
  { title: 'The 70/30 rule', text: 'Build outfits around 70% neutrals and 30% accent — easier to mix, easier to repeat.' },
  { title: 'Shoulder seam check', text: "When buying a jacket, the shoulder seam should end where your shoulder ends. Everything else can be tailored — shoulders can't." },
  { title: 'Denim trick', text: 'Wash raw or selvedge denim inside-out in cold water once every 6+ months to keep the fades crisp.' },
  { title: 'Belt-to-shoe match', text: 'Match leather belt color to leather shoes — the closer they are, the more pulled together the outfit looks.' },
  { title: 'The one-third rule', text: 'When tucking, leave a slight blouson — tight-tucked shirts on slim pants flatten your silhouette.' },
  { title: 'Wash less, air more', text: 'Sweaters, jeans, and outerwear last 3–5x longer if you air them out instead of washing after every wear.' },
  { title: 'Sock visibility', text: 'No-show socks for loafers/sneakers; mid-calf for dress shoes; let no skin show when you sit down.' },
  { title: 'Color anchoring', text: 'If an outfit feels off, anchor it with one black or navy piece — usually shoes or pants. The rest will balance.' },
  { title: 'Iron after, not before', text: "Iron a shirt right before wearing it, not after washing. Steam from your skin will smooth wrinkles." },
  { title: 'Buy your size', text: 'Vanity sizing is real — a 32 at one brand is a 30 at another. Trust the fit, not the number.' },
  { title: 'Three-piece minimum', text: 'A great outfit is usually three distinct pieces (e.g., shirt + jacket + pants). Two reads casual; four reads costume.' },
  { title: 'Quality, then quantity', text: 'One $200 pair of leather shoes resoled twice outlives ten $40 pairs — and looks better the whole time.' },
]

const pickByDay = (arr, seed) => arr[((seed % arr.length) + arr.length) % arr.length]

const DailyQuoteTip = ({ seed }) => {
  const tip = pickByDay(TIPS, seed)
  const quote = pickByDay(QUOTES, seed + 7)
  const tileStyle = {
    padding: '16px',
    background: COLORS.creamDeep,
    border: 'none',
    borderRadius: '12px',
  }
  const eyebrow = {
    fontFamily: FONTS.sub, fontSize: '9px', textTransform: 'uppercase',
    letterSpacing: '0.22em', fontWeight: 600, color: COLORS.textMuted,
    marginBottom: '4px',
  }
  // Section-title style label sits OUTSIDE the tile; everything else is inside.
  // `align-items: stretch` (grid default) makes the two columns equal height; each column is
  // itself a flex column with the inner tile set to flex:1 so the tiles match in height too.
  const column = { display: 'flex', flexDirection: 'column' }
  const tileFill = { ...tileStyle, flex: 1 }
  return (
    <div style={{
      marginTop: '24px',
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
      alignItems: 'stretch',
    }}>
      {/* Tip column */}
      <div style={column}>
        <div style={eyebrow}>Tip</div>
        <div style={tileFill}>
          <div className="title-bold" style={{
            fontFamily: FONTS.title, fontSize: '16px', color: COLORS.green,
            lineHeight: 1.15, letterSpacing: '-0.01em', marginBottom: '8px',
          }}>{tip.title}</div>
          <div style={{
            fontFamily: FONTS.sub, fontSize: '12.5px', lineHeight: 1.5,
            color: COLORS.text,
          }}>{tip.text}</div>
        </div>
      </div>
      {/* Quote column */}
      <div style={column}>
        <div style={eyebrow}>Quote</div>
        <div style={tileFill}>
          <div style={{
            fontFamily: FONTS.title, fontSize: '14px', lineHeight: 1.35,
            fontStyle: 'italic', color: COLORS.text,
          }}>“{quote.text}”</div>
          <div className="title-bold" style={{
            fontFamily: FONTS.title, fontSize: '10px', marginTop: '8px',
            lineHeight: 1.15, letterSpacing: '-0.01em', color: COLORS.green,
          }}>— {quote.by}</div>
        </div>
      </div>
    </div>
  )
}
