// Netlify function: scrape real products from the user's tracked brands, then use
// Claude to pick the best ones based on their style profile.
//
// Flow:
//   1. For each brand, scrape the shop/collection page for product listings
//   2. Extract name, price, image, URL from the HTML
//   3. Send the scraped catalog + user profile to Claude
//   4. Claude picks the 6 best matches and explains why
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const { stylePrefs, measurements, brandFits, saleBrands, closetSummary, wishlistSummary, colorPalette } = JSON.parse(event.body || '{}')

  if (!saleBrands || saleBrands.length === 0) {
    return { statusCode: 200, headers, body: JSON.stringify({ items: [] }) }
  }

  try {
    // Step 1: Scrape each brand's collection page in parallel
    const brandProducts = await Promise.all(
      saleBrands.filter(b => b.url).map(async (brand) => {
        const products = await scrapeCollectionPage(brand.url, brand.name)
        return { brand: brand.name, url: brand.url, products }
      })
    )

    // Flatten all products into a single catalog
    const catalog = []
    for (const bp of brandProducts) {
      for (const p of bp.products) {
        catalog.push({ ...p, brand: p.brand || bp.brand })
      }
    }

    if (catalog.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ items: [] }) }
    }

    // Step 2: Ask Claude to pick the best 6 from the REAL scraped products
    const catalogSummary = catalog.map((p, i) =>
      `[${i}] ${p.brand} — ${p.name}${p.price ? ` ($${p.price})` : ''}${p.category ? ` [${p.category}]` : ''}`
    ).join('\n')

    const prompt = [
      'You are a menswear stylist. Below is a catalog of REAL products scraped from fashion brand websites.',
      'Pick the 6 best items for this user. Return ONLY a JSON array of objects.',
      '',
      'CATALOG (index — brand — name — price — category):',
      catalogSummary,
      '',
      stylePrefs ? `USER STYLE PREFERENCES: ${stylePrefs}` : '',
      measurements ? `BODY MEASUREMENTS: ${JSON.stringify(measurements)}` : '',
      colorPalette ? `COLOR PALETTE: ${JSON.stringify(colorPalette)}` : '',
      brandFits && brandFits.length > 0 ? `BRAND SIZE FITS: ${JSON.stringify(brandFits.slice(0, 10))}` : '',
      closetSummary ? `ALREADY OWNS: ${closetSummary}` : '',
      wishlistSummary ? `ALREADY EYEING: ${wishlistSummary}` : '',
      '',
      'RULES:',
      '- Pick exactly 6 items by their index number.',
      '- Spread picks across different brands when possible.',
      '- Vary categories (not 6 shirts).',
      '- Skip items they already own or are eyeing.',
      '- For each pick, write a 1-sentence reason why it suits this user.',
      '',
      'Return ONLY this JSON, no other text:',
      '[{"index":0,"reason":"..."},{"index":3,"reason":"..."},...]',
    ].filter(Boolean).join('\n')

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      thinking: { type: 'disabled' },
      output_config: { effort: 'low' },
      messages: [{ role: 'user', content: prompt }],
    })

    const text = msg.content[0]?.text || '[]'
    const jsonMatch = text.match(/\[[\s\S]*?\]/)
    let picks = []
    if (jsonMatch) {
      try { picks = JSON.parse(jsonMatch[0]) } catch { picks = [] }
    }

    // Map picks back to the real scraped product data
    const items = picks
      .filter(p => typeof p.index === 'number' && catalog[p.index])
      .slice(0, 6)
      .map(p => ({
        ...catalog[p.index],
        reason: p.reason || null,
      }))

    return { statusCode: 200, headers, body: JSON.stringify({ items }) }
  } catch (e) {
    console.error('recommend-items error:', e)
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }
  }
}

// =============================================================================
// Scrape a brand's collection/shop page and extract individual products.
// Tries multiple strategies: JSON-LD, Shopify JSON API, and HTML parsing.
// =============================================================================

const UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
const SOCIAL_UA = 'facebookexternalhit/1.1'

async function scrapeCollectionPage(brandUrl, brandName) {
  // Normalize the URL — try common collection paths
  const base = brandUrl.replace(/\/+$/, '')
  const candidates = [
    `${base}/collections/all`,
    `${base}/collections/new-arrivals`,
    `${base}/shop`,
    `${base}/collections`,
    `${base}/products`,
    base, // homepage as last resort (many brands show products there)
  ]

  for (const url of candidates) {
    const products = await tryScrapePage(url, brandName)
    if (products.length >= 3) return products.slice(0, 40) // cap to keep payload reasonable
  }

  // If structured scraping failed, try the Shopify products.json API
  const shopifyProducts = await tryShopifyJson(base, brandName)
  if (shopifyProducts.length > 0) return shopifyProducts.slice(0, 40)

  return []
}

async function fetchHtml(url, ua) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': ua, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const html = await res.text()
    if (html.includes('captcha-delivery.com') || html.includes('cf-challenge')) return null
    if (html.length < 500) return null
    return html
  } catch { return null }
}

async function tryScrapePage(url, brandName) {
  const html = await fetchHtml(url, UA) || await fetchHtml(url, SOCIAL_UA)
  if (!html) return []

  // Strategy 1: JSON-LD Product arrays
  const jsonLdProducts = extractJsonLdProducts(html, url, brandName)
  if (jsonLdProducts.length >= 3) return jsonLdProducts

  // Strategy 2: Shopify-style product JSON embedded in page
  const shopifyEmbedded = extractShopifyEmbedded(html, url, brandName)
  if (shopifyEmbedded.length >= 3) return shopifyEmbedded

  // Strategy 3: Parse product links from HTML (generic)
  const htmlProducts = extractProductLinks(html, url, brandName)
  if (htmlProducts.length >= 3) return htmlProducts

  // Merge whatever we found
  return [...jsonLdProducts, ...shopifyEmbedded, ...htmlProducts]
}

// Shopify sites expose /products.json — richest data source
async function tryShopifyJson(baseUrl, brandName) {
  try {
    const res = await fetch(`${baseUrl}/products.json?limit=50`, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return []
    const data = await res.json()
    if (!data.products || !Array.isArray(data.products)) return []

    return data.products.map(p => {
      const variant = p.variants?.[0]
      const img = p.images?.[0]?.src || p.image?.src || null
      return {
        name: p.title,
        brand: p.vendor || brandName,
        price: variant?.price || null,
        image: img,
        url: `${baseUrl}/products/${p.handle}`,
        category: p.product_type || null,
      }
    }).filter(p => p.name && p.url)
  } catch { return [] }
}

// Extract products from JSON-LD structured data
function extractJsonLdProducts(html, pageUrl, brandName) {
  const products = []
  const baseUrl = new URL(pageUrl)
  const jsonLdPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match

  while ((match = jsonLdPattern.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1])
      const candidates = []
      if (Array.isArray(data)) candidates.push(...data)
      else candidates.push(data)
      if (data?.['@graph']) candidates.push(...data['@graph'])
      if (data?.itemListElement) {
        for (const el of data.itemListElement) {
          if (el.item) candidates.push(el.item)
        }
      }

      for (const item of candidates) {
        if (item['@type'] !== 'Product' && item['@type'] !== 'product') continue
        const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers
        let img = null
        if (item.image) {
          const imgs = Array.isArray(item.image) ? item.image : [item.image]
          const first = imgs[0]
          img = typeof first === 'string' ? first : first?.url || first?.contentUrl || null
        }
        if (img) img = makeAbsolute(img, baseUrl)

        let productUrl = item.url || null
        if (productUrl) productUrl = makeAbsolute(productUrl, baseUrl)

        products.push({
          name: item.name || null,
          brand: (typeof item.brand === 'string' ? item.brand : item.brand?.name) || brandName,
          price: offer?.price || offer?.lowPrice || null,
          image: img,
          url: productUrl,
          category: item.category || null,
        })
      }
    } catch { /* skip malformed JSON-LD */ }
  }

  return products.filter(p => p.name && (p.url || p.image))
}

// Some Shopify themes embed product data in a JS variable
function extractShopifyEmbedded(html, pageUrl, brandName) {
  const products = []
  const baseUrl = new URL(pageUrl)

  // Look for Shopify's collection JSON in script tags
  const patterns = [
    /var\s+meta\s*=\s*(\{[\s\S]*?\});/,
    /"products"\s*:\s*(\[[\s\S]*?\])\s*[,}]/,
  ]

  for (const pattern of patterns) {
    const m = html.match(pattern)
    if (!m) continue
    try {
      const data = JSON.parse(m[1])
      const items = Array.isArray(data) ? data : data.products || []
      for (const item of items) {
        if (!item.title && !item.name) continue
        const img = item.featured_image || item.images?.[0]?.src || item.images?.[0] || null
        products.push({
          name: item.title || item.name,
          brand: item.vendor || brandName,
          price: item.price ? (item.price / 100).toFixed(0) : item.variants?.[0]?.price || null,
          image: img ? makeAbsolute(typeof img === 'string' ? img : img.src || '', baseUrl) : null,
          url: item.url ? makeAbsolute(item.url, baseUrl) : item.handle ? `${baseUrl.origin}/products/${item.handle}` : null,
          category: item.product_type || item.type || null,
        })
      }
    } catch { /* skip */ }
  }

  return products.filter(p => p.name && (p.url || p.image))
}

// Generic HTML parsing: look for product cards with links, images, prices
function extractProductLinks(html, pageUrl, brandName) {
  const products = []
  const baseUrl = new URL(pageUrl)

  // Find product links: <a href="/products/..." or "/collections/.../products/..."
  const linkPattern = /<a[^>]*href=["'](\/(?:products|collections\/[^"']*\/products)\/[^"'?#]+)["'][^>]*>([\s\S]*?)<\/a>/gi
  const seen = new Set()
  let linkMatch

  while ((linkMatch = linkPattern.exec(html)) !== null) {
    const href = linkMatch[1]
    if (seen.has(href)) continue
    seen.add(href)

    const cardHtml = linkMatch[2]
    const absUrl = makeAbsolute(href, baseUrl)

    // Try to find an image in the card
    const imgMatch = cardHtml.match(/<img[^>]*src=["']([^"']+)["']/i)
      || cardHtml.match(/<img[^>]*srcset=["']([^\s"']+)/i)
    let image = imgMatch ? imgMatch[1] : null
    if (image) image = makeAbsolute(image, baseUrl)

    // Try to find a name
    const nameMatch = cardHtml.match(/<(?:h[2-4]|p|span|div)[^>]*class=["'][^"']*(?:title|name|product)[^"']*["'][^>]*>([^<]+)/i)
    const nameFromAlt = cardHtml.match(/<img[^>]*alt=["']([^"']+)["']/i)
    const name = nameMatch?.[1]?.trim() || nameFromAlt?.[1]?.trim() || slugToName(href)

    // Try to find a price
    const priceMatch = cardHtml.match(/[\$€£]\s*([\d,.]+)/)
      || cardHtml.match(/(?:price|amount)[^>]*>([\d,.]+)/i)
    const price = priceMatch ? priceMatch[1].replace(',', '') : null

    products.push({
      name,
      brand: brandName,
      price,
      image,
      url: absUrl,
      category: null,
    })
  }

  return products.filter(p => p.name && p.url)
}

function makeAbsolute(url, baseUrl) {
  if (!url) return null
  try {
    if (url.startsWith('//')) return 'https:' + url
    if (url.startsWith('http')) return url
    return new URL(url, baseUrl.origin).href
  } catch { return url }
}

function slugToName(path) {
  const slug = path.split('/').filter(Boolean).pop() || ''
  return slug
    .split(/[-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
