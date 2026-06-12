import React, { useState, useRef, useEffect, useMemo } from 'react'
import { COLORS, FONTS } from '../lib/theme'
import { SendIcon } from './Icons'
import { loadJson } from '../lib/storage'
import { CLOSET_KEY, WISHLIST_KEY } from '../lib/constants'
import { db, auth } from '../lib/firebase'
import { buildCrossAppBlock } from '../lib/crossAppContext'

const PROFILE_KEY = 'garmint_profile_v1'

const PROMPT_POOL = [
  'What colors go well with olive chinos?',
  'How do I style a bomber jacket casually?',
  'Rate my outfit for a dinner date',
  'What basics am I missing in my wardrobe?',
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
  'What belt matches brown leather boots?',
  'Tips for mixing casual and dressy pieces',
  'How do I roll up sleeves the right way?',
  'What goes with a grey crewneck sweater?',
  'Best proportions for oversized tops?',
  'How to add color to a neutral wardrobe?',
  'What are must-have wardrobe staples?',
  'How to care for denim to last longer?',
  'Suggest outfits for a weekend trip',
  'Which sunglasses match my face shape?',
  'How to style a polo shirt without being preppy?',
  'What shorts work for a casual dinner?',
  'Best ways to wear a button-down untucked',
  'How to make a plain tee look styled?',
  'What coat goes with everything?',
  'How to break in new leather shoes?',
  'Suggest fits for a music festival',
  'What watch style matches streetwear?',
]

const getDailyPrompts = () => {
  const today = new Date()
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  const shuffled = [...PROMPT_POOL]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = ((seed * 2654435761 + i * 31) >>> 0) % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, 8)
}

// Same context builder used by ExpertPage — gives Jeeves the user's mint data.
const buildOwnAppContext = () => {
  const profile = loadJson(PROFILE_KEY)
  const profileObj = (profile && typeof profile === 'object' && !Array.isArray(profile)) ? profile : {}
  const brandFits = loadJson('garmint_brand_fits_v2')
  const saleBrands = loadJson('garmint_sale_brands_v1')
  const colorPalette = loadJson('garmint_color_palette_v1')
  const closet = loadJson(CLOSET_KEY)
  const wishlist = loadJson(WISHLIST_KEY)

  const sections = []

  const stylePrefs = profileObj.stylePrefs || ''
  if (stylePrefs.trim()) sections.push(`### Style preferences\n${stylePrefs}`)

  const meas = profileObj.measurements || {}
  const filledMeas = Object.entries(meas).filter(([, v]) => v && String(v).trim())
  if (filledMeas.length > 0) sections.push(`### Body measurements\n${JSON.stringify(Object.fromEntries(filledMeas))}`)

  const fits = Array.isArray(brandFits) ? brandFits : []
  if (fits.length > 0) {
    const compact = fits.slice(0, 40).map(({ brand, name, size, fitNotes, categories, tags, colors }) =>
      JSON.stringify({ brand, name, size, fitNotes, categories, tags, colors })
    )
    sections.push(`### Brand size fits (${fits.length} entries)\n${compact.join('\n')}`)
  }

  if (colorPalette && typeof colorPalette === 'object' && colorPalette.season) {
    sections.push(`### Color palette analysis\n${JSON.stringify(colorPalette)}`)
  }

  const brands = Array.isArray(saleBrands) ? saleBrands : []
  if (brands.length > 0) sections.push(`### Tracked brands\n${JSON.stringify(brands.map(b => b.name))}`)

  const closetArr = Array.isArray(closet) ? closet : []
  const wishArr = Array.isArray(wishlist) ? wishlist : []
  if (closetArr.length > 0) {
    const compact = closetArr.slice(0, 50).map(({ name, brand, category, color, size, notes }) =>
      JSON.stringify({ name, brand, category, color, size, notes })
    )
    sections.push(`### Closet (${closetArr.length} items)\n${compact.join('\n')}`)
  }
  if (wishArr.length > 0) {
    const compact = wishArr.slice(0, 50).map(({ name, brand, category, color, size, notes, price }) =>
      JSON.stringify({ name, brand, category, color, size, notes, price })
    )
    sections.push(`### Wishlist (${wishArr.length} items)\n${compact.join('\n')}`)
  }

  if (sections.length === 0) return ''
  return 'THIS APP (MINT / CLOTHES) — the user\'s wardrobe data\n\n' + sections.join('\n\n')
}

export const ChatPopup = ({ isOpen, onClose }) => {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [crossApp, setCrossApp] = useState('')
  const msgEndRef = useRef(null)
  const inputRef = useRef(null)
  const dailyPrompts = useMemo(() => getDailyPrompts(), [])

  // Fetch cross-app context once when the popup opens.
  useEffect(() => {
    if (!isOpen) return
    const uid = auth?.currentUser?.uid
    if (!db || !uid) return
    let cancelled = false
    buildCrossAppBlock(db, uid, { excludeApp: 'clothes' }).then((block) => {
      if (!cancelled) setCrossApp(block)
    })
    return () => { cancelled = true }
  }, [isOpen])

  useEffect(() => {
    if (msgEndRef.current) msgEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    const trimmed = (text || input).trim()
    if (!trimmed || sending) return

    const userMsg = { role: 'user', text: trimmed }
    const nextHistory = [...messages, userMsg]
    setMessages(nextHistory)
    setInput('')
    setSending(true)

    try {
      const res = await fetch('https://nolan-jeeves.netlify.app/.netlify/functions/jeeves-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextHistory.map((m) => ({ role: m.role, text: m.text })),
          userContext: { crossApp: [buildOwnAppContext(), crossApp].filter(Boolean).join('\n\n') },
          appKey: 'clothes',
        }),
      })
      let data = {}
      try { data = await res.json() } catch { /* non-JSON body */ }
      if (!res.ok || !data.text) {
        throw new Error(data.error || `Jeeves unreachable (HTTP ${res.status})`)
      }
      setMessages((prev) => [...prev, { role: 'jeeves', text: data.text }])
    } catch (e) {
      setMessages((prev) => [...prev, {
        role: 'jeeves',
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

  const canSend = input.trim().length > 0 && !sending

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'transparent' }} />
      <div
        onClick={(e) => e.stopPropagation()}
        className={isOpen ? 'popup-enter' : 'popup-exit'}
        style={{
          position: 'fixed',
          bottom: 'calc(146px + env(safe-area-inset-bottom, 0px))',
          right: '18px',
          width: '380px',
          maxWidth: 'calc(100vw - 36px)',
          maxHeight: '75vh',
          background: COLORS.cream,
          borderRadius: '16px',
          boxShadow: '0 16px 40px rgba(19, 37, 27, 0.28), 0 2px 8px rgba(19, 37, 27, 0.12)',
          zIndex: 101,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: `1px solid ${COLORS.greenLine}`,
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 18px 14px',
          borderBottom: `1px solid ${COLORS.greenLine}`,
          background: COLORS.green, color: COLORS.cream,
          borderRadius: '16px 16px 0 0',
        }}>
          <div className="title-bold" style={{ fontSize: '20px', color: COLORS.cream }}>Ask Jeeves</div>
          <div style={{
            fontFamily: FONTS.sub, fontSize: '9.5px',
            color: 'rgba(244, 238, 224, 0.7)',
            letterSpacing: '0.2em', textTransform: 'uppercase',
            marginTop: '3px', fontWeight: 500,
          }}>
            Get insights on your closet
          </div>
        </div>

        {/* Messages / prompts area */}
        <div style={{
          flex: 1, minHeight: '200px', padding: '16px',
          overflowY: 'auto', background: COLORS.creamLight,
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
                      padding: '7px 12px',
                      background: COLORS.creamDeep,
                      border: `1px solid ${COLORS.greenLine}`,
                      borderRadius: '999px',
                      fontFamily: FONTS.sub, fontSize: '11px', fontWeight: 500,
                      color: COLORS.green, cursor: 'pointer',
                      transition: 'background 0.15s, border-color 0.15s',
                      lineHeight: 1.3,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.cream; e.currentTarget.style.borderColor = COLORS.green }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = COLORS.creamDeep; e.currentTarget.style.borderColor = COLORS.greenLine }}
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
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: msg.role === 'user' ? COLORS.green : COLORS.creamDeep,
                  color: msg.role === 'user' ? COLORS.cream : COLORS.text,
                  fontFamily: FONTS.sub, fontSize: '13px', lineHeight: 1.45,
                  fontWeight: 500,
                }}>
                  {msg.text}
                </div>
              ))}
              {sending && (
                <div style={{
                  alignSelf: 'flex-start', maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: '14px 14px 14px 4px',
                  background: COLORS.creamDeep, color: COLORS.textFaint,
                  fontFamily: FONTS.sub, fontSize: '13px', fontStyle: 'italic',
                }}>
                  Thinking...
                </div>
              )}
              <div ref={msgEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div style={{
          display: 'flex', gap: '8px', padding: '12px 14px',
          borderTop: `1px solid ${COLORS.greenLine}`, background: COLORS.cream,
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a question..."
            style={{
              flex: 1, padding: '11px 14px',
              borderRadius: '12px',
              border: `1px solid ${COLORS.greenLine}`,
              background: COLORS.white,
              fontFamily: FONTS.sub, fontSize: '13px',
              outline: 'none', color: COLORS.text,
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!canSend}
            style={{
              padding: '0 16px',
              background: canSend ? COLORS.green : COLORS.greenLine,
              color: COLORS.cream,
              border: 'none',
              borderRadius: '12px',
              cursor: canSend ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s ease, opacity 0.2s ease',
              opacity: canSend ? 1 : 0.5,
            }}
          >
            <SendIcon size={14} />
          </button>
        </div>
      </div>
    </>
  )
}
