import React, { useState, useEffect, useRef } from 'react'
import { COLORS, FONTS } from '../lib/theme'
import { ChevronLeft, ChevronRight } from './Icons'

const weatherCodeMap = (code) => {
  if (code === 0) return { emoji: '☀️', desc: 'Clear and sunny' }
  if (code === 1) return { emoji: '🌤️', desc: 'Mainly clear' }
  if (code === 2) return { emoji: '⛅', desc: 'Partly cloudy' }
  if (code === 3) return { emoji: '☁️', desc: 'Overcast' }
  if (code <= 48) return { emoji: '🌫️', desc: 'Foggy' }
  if (code <= 57) return { emoji: '🌦️', desc: 'Light drizzle' }
  if (code <= 65) return { emoji: '🌧️', desc: 'Rainy' }
  if (code <= 67) return { emoji: '🌧️', desc: 'Freezing rain' }
  if (code <= 77) return { emoji: '🌨️', desc: 'Snowy' }
  if (code <= 82) return { emoji: '🌦️', desc: 'Showers' }
  if (code <= 86) return { emoji: '🌨️', desc: 'Snow showers' }
  if (code >= 95) return { emoji: '⛈️', desc: 'Thunderstorms' }
  return { emoji: '🌡️', desc: '—' }
}

const formatHour = (timeStr) => {
  const d = new Date(timeStr)
  let h = d.getHours()
  const ampm = h >= 12 ? 'pm' : 'am'
  h = h % 12
  if (h === 0) h = 12
  return `${h}${ampm}`
}

const dayLabel = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00')
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]
}

const buildRecommendation = (temp, code, rain) => {
  let weather = ''
  let advice = ''

  if (temp < 45) {
    weather = `Cold today at ${temp}F.`
    advice = 'Bundle up with heavy layers, a warm outer coat, and something to cover your neck.'
  } else if (temp < 55) {
    weather = `Crisp and cool at ${temp}F.`
    advice = 'Think a solid mid-layer, a light jacket, and closed-toe shoes.'
  } else if (temp < 65) {
    weather = `Mild at ${temp}F.`
    advice = 'A light top layer should do. Maybe carry a jacket if you will be out late.'
  } else if (temp < 72) {
    weather = `Pleasant at ${temp}F.`
    advice = 'Breathable fabrics, skip the heavy layers. Comfortable shoes.'
  } else if (temp < 78) {
    weather = `Warm at ${temp}F.`
    advice = 'Keep it light and airy. Breathable fabrics and shoes that let your feet breathe.'
  } else {
    weather = `Hot at ${temp}F.`
    advice = 'Go as light as you can. Loose cuts, thin fabrics, and stay hydrated.'
  }

  let rainNote = ''
  if (rain >= 70) rainNote = ` Heavy rain likely (${rain}%). Bring a rain jacket or an umbrella and wear shoes you don't care about getting wet.`
  else if (rain >= 40) rainNote = ` Decent rain chance (${rain}%). A water-resistant outer layer is worth carrying.`
  else if (rain >= 20) rainNote = ` Slim chance of showers (${rain}%). Maybe toss an umbrella in the bag.`

  return `${weather} ${advice}${rainNote}`
}

// Day-aware recommendation: looks across the rest of today's hours and dresses you for the
// whole day's arc (its warm peak, cool dips, and *when* rain is likely) — not just right now.
const clothingFor = (t) => {
  if (t < 45) return 'bundle up with heavy layers and a warm coat'
  if (t < 55) return 'a mid-layer and a light jacket'
  if (t < 65) return 'a light top layer'
  if (t < 72) return 'breathable layers, nothing heavy'
  if (t < 78) return 'light, airy fabrics'
  return 'the lightest, loosest things you have'
}

const partOfDay = (h) => (h < 11 ? 'the morning' : h < 14 ? 'midday' : h < 18 ? 'the afternoon' : 'the evening')

const buildDayRecommendation = (hours) => {
  if (!hours || hours.length === 0) return null
  const temps = hours.map((h) => h.temp)
  const hi = Math.max(...temps)
  const lo = Math.min(...temps)

  let s = `Tops out around ${hi}°F — go with ${clothingFor(hi)}.`
  if (hi - lo >= 10) {
    const coolHour = hours.reduce((a, b) => (b.temp < a.temp ? b : a))
    s += ` It dips to ${lo}° in ${partOfDay(coolHour.hour)}, so bring a layer you can shed.`
  }

  const wet = hours.filter((h) => h.rain >= 45)
  if (wet.length) {
    const parts = []
    for (const h of wet) {
      const p = partOfDay(h.hour)
      const existing = parts.find((x) => x.p === p)
      if (existing) existing.peak = Math.max(existing.peak, h.rain)
      else parts.push({ p, peak: h.rain })
    }
    const when = parts.map((x) => x.p).join(' and ')
    const peak = Math.max(...wet.map((h) => h.rain))
    s += ` Rain likely in ${when} (up to ${peak}%) — bring an umbrella.`
  } else {
    const maybe = hours.some((h) => h.rain >= 25)
    s += maybe ? ' Slight chance of a shower — maybe pack an umbrella.' : ' Looks dry all day.'
  }
  return s
}

// Horizontal scrolling strip with explicit left/right scroll arrows.
// The arrows fade out at the start/end of the scroll range so they only show when there's somewhere to go.
const HourlyStrip = ({ children }) => {
  const scrollRef = useRef(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(true)

  const updateArrows = () => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    updateArrows()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', updateArrows, { passive: true })
    window.addEventListener('resize', updateArrows)
    return () => {
      el.removeEventListener('scroll', updateArrows)
      window.removeEventListener('resize', updateArrows)
    }
  }, [])

  const scrollBy = (delta) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: delta, behavior: 'smooth' })
  }

  const arrowBtn = (side) => ({
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    [side]: '-2px',
    width: '26px', height: '26px', borderRadius: '50%',
    background: COLORS.cream, border: `1px solid ${COLORS.greenLine}`,
    color: COLORS.green, display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', padding: 0, zIndex: 3,
    boxShadow: '0 2px 6px rgba(19, 37, 27, 0.18)',
    opacity: 1, transition: 'opacity 0.2s',
  })

  return (
    <div style={{ position: 'relative', margin: '0 -4px' }}>
      <div ref={scrollRef} className="hide-scrollbar" style={{
        display: 'flex', gap: '4px', overflowX: 'auto',
        WebkitOverflowScrolling: 'touch', paddingBottom: '2px',
        paddingLeft: '28px', paddingRight: '28px',
      }}>
        {children}
      </div>
      {canLeft && (
        <button onClick={() => scrollBy(-160)} aria-label="Scroll left" style={arrowBtn('left')}>
          <ChevronLeft size={14} strokeWidth={2} />
        </button>
      )}
      {canRight && (
        <button onClick={() => scrollBy(160)} aria-label="Scroll right" style={arrowBtn('right')}>
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      )}
    </div>
  )
}

export const WeatherTile = () => {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    const url =
      'https://api.open-meteo.com/v1/forecast?latitude=47.6062&longitude=-122.3321&current=temperature_2m,weather_code,precipitation_probability&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&timezone=auto&forecast_days=8'
    fetch(url)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setErr(true))
  }, [])

  if (err)
    return (
      <div className="tile" style={{ padding: '20px', color: COLORS.textMuted, fontStyle: 'italic', fontSize: '13px', textAlign: 'center' }}>
        Weather unavailable
      </div>
    )

  if (!data)
    return (
      <div className="tile" style={{ padding: '20px', color: COLORS.textFaint, fontSize: '13px', textAlign: 'center' }}>
        Loading the sky…
      </div>
    )

  const currentTemp = Math.round(data.current.temperature_2m)
  const currentInfo = weatherCodeMap(data.current.weather_code)
  const todayHigh = Math.round(data.daily.temperature_2m_max[0])
  const todayLow = Math.round(data.daily.temperature_2m_min[0])
  const todayRain = data.daily.precipitation_probability_max[0]

  // 24 hourly entries starting from current
  const now = new Date()
  const hourlyTimes = data.hourly.time

  // The rest of *today* (from now to midnight) — drives the day-aware recommendation.
  const todayHours = hourlyTimes
    .map((t, i) => ({ d: new Date(t), temp: Math.round(data.hourly.temperature_2m[i]), rain: data.hourly.precipitation_probability[i] || 0 }))
    .filter((h) => h.d.getTime() >= now.getTime() - 30 * 60 * 1000 && h.d.getDate() === now.getDate() && h.d.getMonth() === now.getMonth())
    .map((h) => ({ ...h, hour: h.d.getHours() }))
  const recommendation = buildDayRecommendation(todayHours)
    || buildRecommendation(currentTemp, data.current.weather_code, todayRain)
  let startIdx = hourlyTimes.findIndex((t) => new Date(t).getTime() > now.getTime() - 30 * 60 * 1000)
  if (startIdx < 0) startIdx = 0
  const hourly = Array.from({ length: 24 }, (_, i) => {
    const idx = startIdx + i
    return {
      time: hourlyTimes[idx],
      emoji: weatherCodeMap(data.hourly.weather_code[idx]).emoji,
      temp: Math.round(data.hourly.temperature_2m[idx]),
      rain: data.hourly.precipitation_probability[idx],
    }
  })

  // 7 days (today + next 6)
  const daily = data.daily.time.slice(0, 7).map((dateStr, i) => ({
    day: i === 0 ? 'Today' : dayLabel(dateStr),
    emoji: weatherCodeMap(data.daily.weather_code[i]).emoji,
    high: Math.round(data.daily.temperature_2m_max[i]),
    rain: data.daily.precipitation_probability_max[i],
  }))

  return (
    <div className="tile" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <div style={{ fontSize: '40px', lineHeight: 1 }}>{currentInfo.emoji}</div>
          <div>
            <div className="title-bold" style={{ fontSize: '30px', color: COLORS.green, lineHeight: 1 }}>
              {currentTemp}°
            </div>
            <div style={{ fontFamily: FONTS.sub, fontSize: '11.5px', color: COLORS.text, marginTop: '4px', fontWeight: 500 }}>
              {currentInfo.desc}
            </div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '8px', fontFamily: FONTS.sub, fontSize: '11.5px', color: COLORS.textMuted, flexWrap: 'wrap' }}>
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 600 }}>Seattle</span>
            <span style={{ color: COLORS.textFaint }}>·</span>
            <span>H {todayHigh}° L {todayLow}°</span>
            <span style={{ color: COLORS.textFaint }}>·</span>
            <span>🌧 {todayRain}% today</span>
          </div>
          <div style={{ fontFamily: FONTS.sub, fontSize: '12.5px', lineHeight: 1.5, color: COLORS.text, marginTop: '8px' }}>
            {recommendation}
          </div>
        </div>
      </div>

      <div style={{ height: '1px', background: COLORS.greenLineSoft, margin: '14px 0 12px' }} />

      <div
        style={{
          fontFamily: FONTS.sub,
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.22em',
          color: COLORS.textMuted,
          fontWeight: 600,
          marginBottom: '10px',
        }}
      >
        Next 24 hours
      </div>

      {/* Wrapper holds left/right scroll arrows + a right-edge fade so users can scroll the strip. */}
      <HourlyStrip>
        {hourly.map((h, i) => (
          <div
            key={i}
            style={{
              flex: '0 0 auto',
              minWidth: '52px',
              textAlign: 'center',
              padding: '8px 4px',
              borderRadius: '4px',
              background: i === 0 ? 'rgba(31, 61, 46, 0.08)' : 'transparent',
            }}
          >
            <div
              style={{
                fontFamily: FONTS.sub,
                fontSize: '10px',
                color: COLORS.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 600,
              }}
            >
              {i === 0 ? 'Now' : formatHour(h.time)}
            </div>
            <div style={{ fontSize: '20px', margin: '4px 0 2px' }}>{h.emoji}</div>
            <div style={{ fontFamily: FONTS.sub, fontSize: '11.5px', color: COLORS.text, fontWeight: 600 }}>
              {h.temp}°
            </div>
            <div
              style={{
                fontFamily: FONTS.sub,
                fontSize: '9.5px',
                color: h.rain >= 40 ? COLORS.green : COLORS.textFaint,
                marginTop: '2px',
                fontWeight: h.rain >= 40 ? 600 : 400,
              }}
            >
              🌧 {h.rain}%
            </div>
          </div>
        ))}
      </HourlyStrip>

      <div style={{ height: '1px', background: COLORS.greenLineSoft, margin: '14px 0 12px' }} />

      <div
        style={{
          fontFamily: FONTS.sub,
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.22em',
          color: COLORS.textMuted,
          fontWeight: 600,
          marginBottom: '10px',
        }}
      >
        Week ahead
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {daily.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', padding: '6px 2px' }}>
            <div
              style={{
                fontFamily: FONTS.sub,
                fontSize: '9.5px',
                color: COLORS.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontWeight: 600,
              }}
            >
              {d.day}
            </div>
            <div style={{ fontSize: '18px', margin: '4px 0 2px' }}>{d.emoji}</div>
            <div style={{ fontFamily: FONTS.sub, fontSize: '11px', color: COLORS.text, fontWeight: 600 }}>
              {d.high}°
            </div>
            <div
              style={{
                fontFamily: FONTS.sub,
                fontSize: '9px',
                color: d.rain >= 40 ? COLORS.green : COLORS.textFaint,
                marginTop: '1px',
                fontWeight: d.rain >= 40 ? 600 : 400,
              }}
            >
              🌧 {d.rain}%
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
