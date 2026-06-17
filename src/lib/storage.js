export const loadJson = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}

export const saveJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn('Storage failed', e)
  }
}

// Per-key last-write timestamp (ms epoch) for last-write-wins sync resolution.
export const loadTs = (key) => {
  const v = Number(localStorage.getItem(`${key}:ts`))
  return Number.isFinite(v) ? v : 0
}
export const saveTs = (key, ts) => {
  try { localStorage.setItem(`${key}:ts`, String(ts)) } catch (e) { /* ignore */ }
}

// Convert a data URL to a Blob
export const dataUrlToBlob = (dataUrl) => {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)[1]
  const binary = atob(base64)
  const arr = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

// Resize an image file to max-width 800px JPEG data URL
export const fileToResizedDataUrl = (file, maxWidth = 800, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
