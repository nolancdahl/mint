import React, { useState, useRef, useEffect } from 'react'
import { COLORS, FONTS } from '../lib/theme'

// Songs live in /public. Add a new one by dropping the file in and adding a row here.
const SONGS = [
  { key: 'track1', label: 'Track 1', src: '/music.mp3' },
  { key: 'righton', label: 'Marvin Gaye · Right On', src: '/Marvin%20Gaye%20-%20Right%20On.mp3' },
]

const NoteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
  </svg>
)
const PauseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
)

// Top-right music picker. Mirrors the CYBYWY ambient-sounds selector: a circular
// button that opens a small menu of tracks. Tapping a track plays it (looping);
// tapping the playing one pauses it (keeps the spot); tapping the button while
// something plays pauses it.
export const MusicSelector = () => {
  const [open, setOpen] = useState(false)
  const [playingKey, setPlayingKey] = useState(null)
  const audiosRef = useRef({})
  const wrapRef = useRef(null)

  const getAudio = (song) => {
    let a = audiosRef.current[song.key]
    if (!a) {
      a = new Audio(song.src)
      a.loop = true // replays from the start at the end
      a.addEventListener('play', () => setPlayingKey(song.key))
      a.addEventListener('pause', () => setPlayingKey((k) => (k === song.key ? null : k)))
      audiosRef.current[song.key] = a
    }
    return a
  }

  const playSong = (song) => {
    Object.entries(audiosRef.current).forEach(([k, a]) => { if (k !== song.key) a.pause() })
    getAudio(song).play().catch(() => {})
  }
  const pauseAll = () => Object.values(audiosRef.current).forEach((a) => a.pause())

  const select = (song) => {
    if (playingKey === song.key) getAudio(song).pause() // toggle off, keep position
    else playSong(song)
    setOpen(false)
  }

  // Close the menu on an outside tap.
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const onButtonClick = () => {
    if (open) { setOpen(false); return }
    if (playingKey) { pauseAll(); return } // tap to pause (keeps position)
    setOpen(true)
  }

  const rowStyle = (active, enabled = true) => ({
    display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left',
    padding: '9px 10px', borderRadius: '8px',
    background: active ? COLORS.green : 'transparent',
    color: active ? COLORS.cream : (enabled ? COLORS.text : COLORS.textFaint),
    border: 'none', cursor: enabled ? 'pointer' : 'default',
    fontFamily: FONTS.sub, fontSize: '13px', fontWeight: 600,
  })

  return (
    <div ref={wrapRef} style={{ position: 'fixed', top: '6px', right: '6px', zIndex: 60 }}>
      <button
        onClick={onButtonClick}
        aria-label={playingKey ? 'Pause music' : 'Choose music'}
        title={playingKey ? 'Pause music' : 'Choose music'}
        style={{
          width: '40px', height: '40px', borderRadius: '50%',
          background: 'transparent', color: COLORS.cream,
          border: '1.75px solid rgba(245, 245, 245, 0.55)', boxShadow: 'none',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
        }}
      >
        {playingKey ? <PauseIcon /> : <NoteIcon />}
      </button>

      {open && (
        <div className="popup-enter" style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: '200px', background: COLORS.cream,
          border: `1px solid ${COLORS.greenLine}`, borderRadius: '12px', padding: '6px',
          boxShadow: '0 10px 28px rgba(19, 37, 27, 0.22)',
        }}>
          {SONGS.map((s) => {
            const active = playingKey === s.key
            return (
              <button key={s.key} onClick={() => select(s)} style={rowStyle(active)}>
                <span style={{ display: 'inline-flex', color: active ? COLORS.cream : COLORS.green }}>
                  {active ? <PauseIcon /> : <NoteIcon />}
                </span>
                <span style={{ flex: 1 }}>{s.label}</span>
              </button>
            )
          })}
          <div style={{ height: '1px', background: COLORS.greenLineSoft, margin: '6px 6px' }} />
          <button onClick={() => { pauseAll(); setOpen(false) }} disabled={!playingKey} style={rowStyle(false, !!playingKey)}>
            <span style={{ fontSize: '15px', lineHeight: 1 }}>⏹</span>
            <span style={{ flex: 1 }}>Stop</span>
          </button>
        </div>
      )}
    </div>
  )
}
