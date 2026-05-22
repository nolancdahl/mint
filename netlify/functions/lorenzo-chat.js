// Netlify function: calls Claude (Sonnet 4.6) on behalf of the Lorenzo chat.
//
// Why server-side: the Anthropic API key must never ship to the browser. The frontend POSTs the
// chat history + a snapshot of the user's profile here; we build a system prompt and call Claude.
//
// Prompt caching: the system prompt (persona + user context) is marked with cache_control so
// follow-up turns in the same chat hit cache. Note Sonnet 4.6's minimum cacheable prefix is 2048
// tokens — short system prompts silently skip caching, which is fine (no cost, no error).
import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-sonnet-4-6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

const formatUserContext = (ctx) => {
  const parts = []

  if (ctx.stylePrefs && String(ctx.stylePrefs).trim()) {
    parts.push(`Style preferences (their own words):\n${String(ctx.stylePrefs).trim()}`)
  }

  if (ctx.measurements && typeof ctx.measurements === 'object') {
    const filled = Object.entries(ctx.measurements)
      .filter(([, v]) => v && String(v).trim())
      .map(([k, v]) => `${k} ${String(v).trim()}`)
    if (filled.length > 0) parts.push(`Measurements: ${filled.join(', ')}`)
  }

  if (ctx.colorPalette && ctx.colorPalette.season) {
    const p = ctx.colorPalette
    const flatter = Array.isArray(p.flatter) ? p.flatter.join(', ') : ''
    const avoid = Array.isArray(p.avoid) ? p.avoid.join(', ') : ''
    parts.push(
      `Color palette analysis: ${p.season} season, ${p.undertone || 'unspecified'} undertone.` +
      (flatter ? ` Flattering: ${flatter}.` : '') +
      (avoid ? ` Avoid: ${avoid}.` : '')
    )
  }

  if (Array.isArray(ctx.brandFits) && ctx.brandFits.length > 0) {
    const fits = ctx.brandFits.slice(0, 40).map((f) => {
      const head = [f.brand, f.name].filter(Boolean).join(' — ')
      const tail = [f.size && `size ${f.size}`, f.fitNotes].filter(Boolean).join(' · ')
      return tail ? `${head}: ${tail}` : head
    }).filter(Boolean)
    if (fits.length > 0) parts.push(`Brand fit notes:\n- ${fits.join('\n- ')}`)
  }

  if (Array.isArray(ctx.saleBrands) && ctx.saleBrands.length > 0) {
    parts.push(`Brands they follow: ${ctx.saleBrands.map((b) => b.name).filter(Boolean).join(', ')}`)
  }

  if (typeof ctx.closetItemCount === 'number') {
    parts.push(`Closet size: ${ctx.closetItemCount} items.`)
  }
  if (typeof ctx.wishlistItemCount === 'number') {
    parts.push(`Wishlist size: ${ctx.wishlistItemCount} items.`)
  }

  return parts.length > 0
    ? parts.join('\n\n')
    : '(No profile data saved yet — keep advice general and nudge them to fill in measurements, brand fits, or skin-tone photos so you can tailor future answers.)'
}

const buildSystemPrompt = (userContext = {}) => [
  'You are Lorenzo — a direct, opinionated personal style advisor inside the "mint" wardrobe app.',
  '',
  'PERSONALITY',
  '- Knowledgeable friend, not a textbook. Concise (2–4 short paragraphs unless they ask for more).',
  '- Practical, grounded in fit / fabric / material reality. Never wishy-washy.',
  '- Honest. If a choice will not work, say so and explain why.',
  '- Build outfits from what they already own before recommending new purchases.',
  '- Reference their actual data silently — do not list it back at them.',
  '',
  'EXPERTISE',
  '- Fit, tailoring, construction, fabric behavior.',
  '- Color theory and seasonal palettes.',
  '- Brand-specific sizing quirks. Respect any fit notes the user has saved.',
  '- Cohesive outfit composition (proportions, contrast, texture).',
  '',
  'FORMATTING (the chat UI renders plain text only — no markdown)',
  '- Do NOT use ** for bold or _ for italics. They appear as literal characters in the bubble.',
  '- For emphasis, use CAPS sparingly.',
  '- For section breaks, use a dashed line: --------',
  '- For lists, use plain bullets with leading "- " (or "• ").',
  '- Keep paragraphs short. Blank lines between paragraphs are fine.',
  '',
  'USER PROFILE',
  '',
  formatUserContext(userContext),
  ...(userContext.crossApp ? ['', '--------', '', userContext.crossApp] : []),
  '',
  'Address the user directly. Use their measurements, brand fits, and color palette to ground advice when relevant. If they have not filled something in, do not invent values — work with what is there.',
].join('\n')

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Server is missing ANTHROPIC_API_KEY. Add it in Netlify environment variables.' }),
    }
  }

  let payload
  try { payload = JSON.parse(event.body || '{}') }
  catch { return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON body' }) } }

  const { messages = [], userContext = {} } = payload

  if (!Array.isArray(messages) || messages.length === 0) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'messages must be a non-empty array' }) }
  }

  // Normalize messages: frontend uses { role: 'user' | 'lorenzo', text }; the API wants
  // { role: 'user' | 'assistant', content }. Drop empties to avoid API 400s.
  const apiMessages = messages
    .map((m) => {
      const role = (m.role === 'lorenzo' || m.role === 'assistant') ? 'assistant' : 'user'
      const text = (m.text ?? m.content ?? '').toString().trim()
      return text ? { role, content: text } : null
    })
    .filter(Boolean)

  if (apiMessages.length === 0) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'No non-empty messages provided' }) }
  }
  if (apiMessages[0].role !== 'user') {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'First message must be from the user' }) }
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const systemPrompt = buildSystemPrompt(userContext)

  try {
    // Sonnet 4.6 default effort is "high" — too slow for an interactive chat. Drop to "low" with
    // thinking disabled; per Sonnet 4.6 chat guidance this matches or beats older no-thinking
    // performance while keeping latency tight.
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      thinking: { type: 'disabled' },
      output_config: { effort: 'low' },
      system: [
        { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
      ],
      messages: apiMessages,
    })

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim()

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        text,
        usage: response.usage,
        stop_reason: response.stop_reason,
      }),
    }
  } catch (e) {
    console.error('lorenzo-chat error:', e && (e.message || e))
    const status = (e && typeof e.status === 'number' && e.status >= 400 && e.status < 600) ? e.status : 500
    return {
      statusCode: status,
      headers: corsHeaders,
      body: JSON.stringify({ error: (e && e.message) || 'Lorenzo could not respond right now.' }),
    }
  }
}
