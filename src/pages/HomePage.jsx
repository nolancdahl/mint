import React, { useState, useEffect, useMemo } from 'react'
import { PageTitle, SectionTitle } from '../components/Primitives'
import { WeatherTile } from '../components/WeatherTile'
import { COLORS, FONTS } from '../lib/theme'
import { CalendarIcon, ShirtIcon, ImageIcon, ShoppingBagIcon, ExternalIcon, LayersIcon } from '../components/Icons'
import { loadJson, saveJson } from '../lib/storage'
import { CLOSET_KEY, WISHLIST_KEY } from '../lib/constants'

const SALE_BRANDS_KEY = 'garmint_sale_brands_v1'
const PROFILE_KEY = 'garmint_profile_v1'
const RECS_CACHE_KEY = 'garmint_recs_cache_v1'

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

// Product recommendation card with image, name, brand, price, link
const RecCard = ({ item }) => {
  const hasImage = !!item.image
  return (
    <a
      href={item.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="tile"
      style={{
        overflow: 'hidden', padding: 0, position: 'relative',
        textDecoration: 'none', cursor: 'pointer', display: 'flex',
        flexDirection: 'column', color: COLORS.text,
      }}
    >
      {/* Image area */}
      <div style={{
        aspectRatio: '3/4', overflow: 'hidden',
        background: hasImage ? COLORS.creamDeep : COLORS.green,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        {hasImage ? (
          <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
          />
        ) : null}
        {/* Fallback shown when no image or image fails */}
        <div style={{
          display: hasImage ? 'none' : 'flex',
          position: 'absolute', inset: 0,
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: COLORS.green, color: COLORS.cream, padding: '12px', textAlign: 'center',
        }}>
          <div style={{ fontFamily: FONTS.sub, fontSize: '9px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 600 }}>From</div>
          <div className="title-bold" style={{ fontSize: '15px', lineHeight: 1.1, marginTop: '4px' }}>{item.brand}</div>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '10px 10px 12px' }}>
        <div style={{
          fontFamily: FONTS.sub, fontSize: '9px', textTransform: 'uppercase',
          letterSpacing: '0.14em', fontWeight: 600, color: COLORS.textMuted,
        }}>{item.brand}</div>
        <div style={{
          fontFamily: FONTS.sub, fontSize: '12px', fontWeight: 600, color: COLORS.text,
          marginTop: '2px', lineHeight: 1.25,
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>{item.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
          {item.price && (
            <div style={{
              fontFamily: FONTS.sub, fontSize: '12px', fontWeight: 700, color: COLORS.green,
            }}>{item.price.startsWith('$') ? item.price : `$${item.price}`}</div>
          )}
          <ExternalIcon size={11} strokeWidth={2} style={{ color: COLORS.textFaint }} />
        </div>
        {item.reason && (
          <div style={{
            fontFamily: FONTS.sub, fontSize: '10px', color: COLORS.textFaint,
            marginTop: '6px', lineHeight: 1.35, fontStyle: 'italic',
            overflow: 'hidden', textOverflow: 'ellipsis',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>{item.reason}</div>
        )}
      </div>
    </a>
  )
}

// Loading skeleton for recommendations
const RecSkeleton = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
    {[0, 1, 2, 3, 4, 5].map(i => (
      <div key={i} className="tile" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ aspectRatio: '3/4', background: COLORS.creamDeep, animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ padding: '10px' }}>
          <div style={{ height: '8px', width: '40%', background: COLORS.greenLineSoft, borderRadius: '4px', marginBottom: '6px' }} />
          <div style={{ height: '10px', width: '80%', background: COLORS.greenLineSoft, borderRadius: '4px', marginBottom: '6px' }} />
          <div style={{ height: '10px', width: '30%', background: COLORS.greenLineSoft, borderRadius: '4px' }} />
        </div>
      </div>
    ))}
  </div>
)

const FUNC_BASE = 'https://nolan-mint.netlify.app'

const greeting = (() => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
})()

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

  // (Removed the "Recommended for You" product-scraping fetch — see note in the JSX below.)

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <h1 className="title-bold" style={{ fontSize: '34px', margin: 0, color: COLORS.green, lineHeight: 1, letterSpacing: '-0.02em' }}>
            mint
          </h1>
          <svg className="mint-leaf" width="28" height="18" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 12C2 12 10 2 22 2C32 2 38 8 38 12C38 16 32 22 22 22C10 22 2 12 2 12Z" fill={COLORS.green} fillOpacity="0.15" stroke={COLORS.green} strokeWidth="1.6" strokeLinecap="round" />
            <path d="M2 12C10 12 26 12 38 12" stroke={COLORS.green} strokeWidth="1.4" strokeLinecap="round" />
            <path d="M12 6C14 8 16 10 18 12" stroke={COLORS.green} strokeWidth="1" strokeLinecap="round" />
            <path d="M10 18C13 16 16 13 18 12" stroke={COLORS.green} strokeWidth="1" strokeLinecap="round" />
            <path d="M24 6C23 8 21 10 20 12" stroke={COLORS.green} strokeWidth="1" strokeLinecap="round" />
            <path d="M26 18C24 16 22 14 20 12" stroke={COLORS.green} strokeWidth="1" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      <div style={{ textAlign: 'center', marginBottom: '18px', marginTop: '48px' }}>
        <h2 className="title-bold" style={{ fontSize: '26px', margin: 0, color: COLORS.text, lineHeight: 1.1 }}>
          {greeting}, Nolán
        </h2>
        <div style={{ fontFamily: FONTS.sub, fontSize: '11px', color: COLORS.textMuted, marginTop: '4px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500 }}>
          Today
        </div>
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

      {/* Outfit suggestions */}
      <SectionTitle>Today's Outfits</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', alignItems: 'stretch' }}>
        <OutfitCard pieces={outfits[0]} label="Option 1" onClick={onCreateOutfit} />
        <OutfitCard pieces={outfits[1]} label="Option 2" onClick={onCreateOutfit} />
        <OutfitCard pieces={outfits[2]} label="Option 3" onClick={onCreateOutfit} />
      </div>

      {/* "Recommended for You" was removed: dependable per-item scraping from arbitrary
          retail sites isn't feasible from a serverless function (they bot-block), so the
          section couldn't reliably surface real individual items. */}

      <DailyQuoteTip seed={seed} />

      {/* Pulse animation for skeleton loader */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
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
  const column = { display: 'flex', flexDirection: 'column' }
  const tileFill = { ...tileStyle, flex: 1 }
  return (
    <div style={{
      marginTop: '24px',
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
      alignItems: 'stretch',
    }}>
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
      <div style={column}>
        <div style={eyebrow}>Quote</div>
        <div style={tileFill}>
          <div style={{
            fontFamily: FONTS.title, fontSize: '14px', lineHeight: 1.35,
            fontStyle: 'italic', color: COLORS.text,
          }}>"{quote.text}"</div>
          <div className="title-bold" style={{
            fontFamily: FONTS.title, fontSize: '10px', marginTop: '8px',
            lineHeight: 1.15, letterSpacing: '-0.01em', color: COLORS.green,
          }}>— {quote.by}</div>
        </div>
      </div>
    </div>
  )
}
