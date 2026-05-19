// Netlify serverless function to scrape product metadata from a URL
export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const { url } = JSON.parse(event.body || '{}')
  if (!url) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'URL required' }) }
  }

  try {
    // Try multiple user agents — some sites whitelist social bots for OG tags
    const userAgents = [
      'Twitterbot/1.0',
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    ]

    let result = null
    for (const ua of userAgents) {
      result = await tryFetch(url, ua)
      if (result && (result.title || result.price || result.images.length > 0)) break
    }

    // Fallback: try microlink API
    if (!result || (!result.title && !result.price && result.images.length === 0)) {
      const microlinkResult = await tryMicrolink(url)
      if (microlinkResult && (microlinkResult.title || microlinkResult.images.length > 0)) {
        result = mergeResults(result, microlinkResult)
      }
    }

    // Last resort: extract what we can from the URL itself
    if (!result || !result.title) {
      const urlData = extractFromUrl(url)
      result = mergeResults(result, urlData)
    }

    if (!result) {
      return { statusCode: 200, headers, body: JSON.stringify({ error: 'Could not extract metadata' }) }
    }

    return { statusCode: 200, headers, body: JSON.stringify(result) }
  } catch (err) {
    // Even on error, try to extract from URL
    const urlData = extractFromUrl(url)
    if (urlData.title || urlData.brand) {
      return { statusCode: 200, headers, body: JSON.stringify(urlData) }
    }
    return { statusCode: 200, headers, body: JSON.stringify({ error: err.message }) }
  }
}

function mergeResults(existing, newData) {
  if (!existing) return newData
  if (!newData) return existing
  return {
    title: existing.title || newData.title,
    brand: existing.brand || newData.brand,
    price: existing.price || newData.price,
    images: (existing.images && existing.images.length > 0) ? existing.images : (newData.images || []),
    description: existing.description || newData.description,
    color: existing.color || newData.color,
    category: existing.category || newData.category,
    siteName: existing.siteName || newData.siteName,
  }
}

// Extract brand and product name from URL path
function extractFromUrl(url) {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.replace('www.', '')

    // Get brand from hostname (e.g. "octobre-editions.com" -> "Octobre Editions")
    const brandPart = hostname.split('.')[0]
    const brand = brandPart
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')

    // Get product name from path (e.g. "/product/dusk-elasticated-pants/navy-white-stripes")
    const pathParts = parsed.pathname.split('/').filter(Boolean)
    // Skip common path segments
    const skipWords = ['product', 'products', 'shop', 'collections', 'catalog', 'item', 'us-en', 'en', 'fr', 'de', 'us', 'uk', 'p', 'dp']
    const nameParts = pathParts.filter((p) => !skipWords.includes(p.toLowerCase()))

    // Use the longest segment as the product name, format it
    let title = null
    if (nameParts.length > 0) {
      // Take the first meaningful segment as title
      const nameSegment = nameParts[0]
      title = nameSegment
        .split(/[-_]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    }

    // Try to extract color/variant from remaining segments
    let color = null
    if (nameParts.length > 1) {
      const colorSegment = nameParts[nameParts.length - 1]
      color = colorSegment
        .split(/[-_]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    }

    return {
      title,
      brand,
      price: null,
      images: [],
      description: null,
      color,
      category: null,
      siteName: brand,
    }
  } catch {
    return { title: null, brand: null, price: null, images: [], description: null, color: null, category: null, siteName: null }
  }
}

async function tryFetch(url, userAgent) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    })

    if (!res.ok) return null
    const html = await res.text()

    // Check if we got a captcha/blocked page
    if (html.includes('captcha-delivery.com') || html.includes('cf-challenge') ||
        (html.includes('Please enable JS') && html.length < 2000)) {
      return null
    }

    return extractFromHtml(html, url)
  } catch {
    return null
  }
}

async function tryMicrolink(url) {
  try {
    const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}`
    const res = await fetch(apiUrl)
    if (!res.ok) return null

    const json = await res.json()
    if (json.status !== 'success' || !json.data) return null

    const d = json.data
    // Skip if microlink also got blocked
    if (d.title && d.title.includes('ERROR')) return null

    const images = []
    if (d.image?.url) images.push(d.image.url)

    let price = null
    if (d.description) {
      const priceMatch = d.description.match(/[\$€£]\s*([\d,.]+)/)
      if (priceMatch) price = priceMatch[1].replace(',', '')
    }

    return {
      title: d.title || null,
      brand: d.publisher || null,
      price,
      images,
      description: d.description || null,
      color: null,
      category: null,
      siteName: d.publisher || null,
    }
  } catch {
    return null
  }
}

function extractFromHtml(html, url) {
  const getMeta = (property) => {
    const patterns = [
      new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'),
      new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, 'i'),
      new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'),
      new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${property}["']`, 'i'),
    ]
    for (const p of patterns) {
      const m = html.match(p)
      if (m) return m[1].trim()
    }
    return null
  }

  // Title
  const ogTitle = getMeta('og:title')
  const twitterTitle = getMeta('twitter:title')
  const htmlTitle = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim()
  let title = ogTitle || twitterTitle || htmlTitle || null
  if (title) {
    // Clean site name suffix
    title = title.replace(/\s*[\|–—]\s*[^|–—]+$/, '').trim()
    // Don't use error titles
    if (title.toLowerCase().includes('error') || title.toLowerCase().includes('denied')) title = null
  }

  // Images
  const images = []
  const ogImgPatterns = [
    /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/gi,
    /<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:image["']/gi,
  ]
  for (const pattern of ogImgPatterns) {
    let imgMatch
    while ((imgMatch = pattern.exec(html)) !== null) {
      const src = imgMatch[1].trim()
      if (src && !images.includes(src)) images.push(src)
    }
  }
  if (images.length === 0) {
    const twitterImage = getMeta('twitter:image')
    if (twitterImage) images.push(twitterImage)
  }

  const baseUrl = new URL(url)

  // JSON-LD extraction
  let schemaPrice = null
  let schemaBrand = null
  let schemaColor = null
  let schemaCategory = null
  let schemaName = null
  let schemaImages = []
  const jsonLdPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let ldMatch
  while ((ldMatch = jsonLdPattern.exec(html)) !== null) {
    try {
      const data = JSON.parse(ldMatch[1])
      const candidates = [data]
      if (Array.isArray(data)) candidates.push(...data)
      if (data['@graph']) candidates.push(...data['@graph'])

      for (const item of candidates) {
        if (item['@type'] === 'Product' || item['@type'] === 'product') {
          if (!schemaPrice && item.offers) {
            const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers
            schemaPrice = offer?.price || offer?.lowPrice || null
          }
          if (!schemaBrand) {
            schemaBrand = typeof item.brand === 'string' ? item.brand : item.brand?.name || null
          }
          if (!schemaColor) schemaColor = item.color || null
          if (!schemaCategory) schemaCategory = item.category || null
          if (!schemaName) schemaName = item.name || null
          if (item.image) {
            const imgs = Array.isArray(item.image) ? item.image : [item.image]
            for (const img of imgs) {
              const imgUrl = typeof img === 'string' ? img : img?.url || img?.contentUrl
              if (imgUrl && !schemaImages.includes(imgUrl)) schemaImages.push(imgUrl)
            }
          }
        }
      }
    } catch { /* ignore */ }
  }

  // Add schema images
  if (images.length < 2 && schemaImages.length > 0) {
    for (const img of schemaImages) {
      try {
        const absImg = img.startsWith('//') ? 'https:' + img : new URL(img, baseUrl.origin).href
        if (!images.includes(absImg)) images.push(absImg)
      } catch {}
    }
  }

  // Make all images absolute
  const absoluteImages = images.map((img) => {
    try {
      if (img.startsWith('//')) return 'https:' + img
      return new URL(img, baseUrl.origin).href
    } catch { return img }
  })

  const priceAmount = getMeta('og:price:amount') || getMeta('product:price:amount') || getMeta('price')
  const price = priceAmount || schemaPrice || null
  const metaBrand = getMeta('og:brand') || getMeta('product:brand') || getMeta('brand')
  const siteName = getMeta('og:site_name') || null
  const brand = metaBrand || schemaBrand || siteName || null
  if (!title && schemaName) title = schemaName
  const description = getMeta('og:description') || getMeta('description') || null
  const color = schemaColor || null
  const category = schemaCategory || null

  return {
    title,
    brand,
    price,
    images: absoluteImages,
    description,
    color,
    category,
    siteName,
  }
}
