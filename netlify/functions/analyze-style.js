// Netlify function: real Claude-vision analysis of the user's skin-tone or body photos.
//
// POST body: { type: 'skin' | 'body', images: [ "<https-url-or-dataURL>", ... ] }
//   - data URLs are decoded in place (base64 + media type)
//   - https URLs (Firebase Storage) are fetched and base64-encoded server-side
//   - capped to the first 4 images to keep the request small + fast
//
// Returns STRICT JSON:
//   type 'skin' → { undertone, season, palette:{flatter:[5 hex], avoid:[2 hex]}, skinNotes, recommendations }
//   type 'body' → { build, proportions, findings, recommendations }
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

const MAX_IMAGES = 4
const SUPPORTED_MEDIA = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

// Turn a data URL or https URL into a Claude image content block ({ type:'image', source:{...} }).
async function toImageBlock(src) {
  if (typeof src !== 'string') return null

  // data:image/jpeg;base64,XXXX
  if (src.startsWith('data:image/')) {
    const m = src.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/)
    if (!m) return null
    let mediaType = m[1].toLowerCase()
    if (!SUPPORTED_MEDIA.includes(mediaType)) mediaType = 'image/jpeg'
    return { type: 'image', source: { type: 'base64', media_type: mediaType, data: m[2] } }
  }

  // https URL (Firebase Storage) — fetch + base64.
  if (src.startsWith('http')) {
    try {
      const res = await fetch(src, { signal: AbortSignal.timeout(10000) })
      if (!res.ok) return null
      let mediaType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim().toLowerCase()
      if (!SUPPORTED_MEDIA.includes(mediaType)) mediaType = 'image/jpeg'
      const buf = Buffer.from(await res.arrayBuffer())
      return { type: 'image', source: { type: 'base64', media_type: mediaType, data: buf.toString('base64') } }
    } catch {
      return null
    }
  }

  return null
}

const SKIN_PROMPT = [
  'You are a professional color analyst. Study the attached photos of a person (taken in natural light)',
  'and determine their seasonal color analysis. Judge skin undertone, value, and contrast.',
  '',
  'Respond with ONLY a single JSON object, no prose, no markdown fences:',
  '{',
  '  "undertone": "one of: Warm, Cool, Neutral, Warm-neutral, Cool-neutral",',
  '  "season": "a 12-season label, e.g. Soft Autumn, Cool Winter, Warm Spring, True Summer",',
  '  "palette": {',
  '    "flatter": ["#hex","#hex","#hex","#hex","#hex"],',
  '    "avoid": ["#hex","#hex"]',
  '  },',
  '  "skinNotes": "2-3 sentences on what the photos actually show about their coloring",',
  '  "recommendations": "2-3 sentences on how this should change what they wear and buy going forward"',
  '}',
  'The flatter array MUST have exactly 5 valid hex colors and avoid MUST have exactly 2.',
].join('\n')

const BODY_PROMPT = [
  'You are a respectful menswear fit consultant. The attached photos are provided by the user for the',
  'sole purpose of clothing-fit guidance. Be professional, body-positive, and clinical — comment only on',
  'how clothing should be cut to fit and flatter, never on attractiveness or health.',
  '',
  'Respond with ONLY a single JSON object, no prose, no markdown fences:',
  '{',
  '  "build": "short phrase for overall build, e.g. Lean athletic, Broad-shouldered, Average",',
  '  "proportions": "short phrase on proportions, e.g. Longer torso, Shorter legs, Balanced",',
  '  "findings": "2-4 sentences on what the photos suggest for how clothing fits this person",',
  '  "recommendations": "2-4 sentences of concrete fit/style guidance going forward: cuts, rises, and fits to favor or avoid"',
  '}',
].join('\n')

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  let type, images
  try {
    ({ type, images } = JSON.parse(event.body || '{}'))
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) }
  }

  if (type !== 'skin' && type !== 'body') {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "type must be 'skin' or 'body'" }) }
  }
  if (!Array.isArray(images) || images.length === 0) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'images array is required' }) }
  }

  try {
    // Build image content blocks (cap to first few; drop any that fail to load).
    const blocks = (await Promise.all(images.slice(0, MAX_IMAGES).map(toImageBlock))).filter(Boolean)
    if (blocks.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Could not load any of the supplied images' }) }
    }

    const prompt = type === 'skin' ? SKIN_PROMPT : BODY_PROMPT

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      thinking: { type: 'disabled' },
      messages: [{ role: 'user', content: [...blocks, { type: 'text', text: prompt }] }],
    })

    const text = (msg.content || []).map((b) => (b.type === 'text' ? b.text : '')).join('') || ''
    const result = extractJson(text)
    if (!result) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Model returned no parseable JSON' }) }
    }

    return { statusCode: 200, headers, body: JSON.stringify(result) }
  } catch (e) {
    console.error('analyze-style error:', e)
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message || 'Analysis failed' }) }
  }
}

// Robustly pull the first {...} object out of the model's text and parse it. Tries a direct parse
// first, then the first balanced-looking brace span, salvaging trailing-comma slips.
function extractJson(text) {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim()
  const tryParse = (s) => {
    try { return JSON.parse(s) } catch { /* fall through */ }
    try { return JSON.parse(s.replace(/,\s*([}\]])/g, '$1')) } catch { return null }
  }

  const direct = tryParse(cleaned)
  if (direct && typeof direct === 'object') return direct

  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start !== -1 && end > start) {
    const parsed = tryParse(cleaned.slice(start, end + 1))
    if (parsed && typeof parsed === 'object') return parsed
  }
  return null
}
