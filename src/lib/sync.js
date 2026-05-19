import { db, storage } from './firebase'
import {
  doc, setDoc, onSnapshot, collection, writeBatch,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { loadJson, saveJson, dataUrlToBlob } from './storage'
import { CLOSET_KEY, WISHLIST_KEY, INSPO_KEY } from './constants'

const COLLECTIONS = {
  [CLOSET_KEY]: 'closet',
  [WISHLIST_KEY]: 'wishlist',
  [INSPO_KEY]: 'inspo',
}

// Write a full array to a single Firestore doc per collection
// We store as a single doc to keep reads/writes minimal
const userDocRef = (uid, key) =>
  doc(db, 'users', uid, 'data', COLLECTIONS[key])

export const uploadToFirestore = async (uid, key, items) => {
  try {
    await setDoc(userDocRef(uid, key), { items, updatedAt: Date.now() })
  } catch (e) {
    console.warn('Firestore write failed:', e)
  }
}

export const uploadAllToFirestore = async (uid) => {
  try {
    const batch = writeBatch(db)
    for (const key of Object.keys(COLLECTIONS)) {
      const items = loadJson(key)
      batch.set(userDocRef(uid, key), { items, updatedAt: Date.now() })
    }
    await batch.commit()
  } catch (e) {
    console.warn('Firestore batch write failed:', e)
  }
}

// Subscribe to real-time updates for a given key
// Returns an unsubscribe function
export const subscribeToCollection = (uid, key, onData) => {
  return onSnapshot(userDocRef(uid, key), (snap) => {
    if (snap.exists()) {
      const data = snap.data()
      onData(data.items || [])
    }
  }, (err) => {
    console.warn('Firestore listen error:', err)
  })
}

// Subscribe to all collections, returns cleanup function
export const subscribeToAll = (uid, handlers) => {
  const unsubs = Object.keys(COLLECTIONS).map((key) =>
    subscribeToCollection(uid, key, (items) => {
      // Update localStorage cache
      saveJson(key, items)
      // Notify the app
      if (handlers[key]) handlers[key](items)
    })
  )
  return () => unsubs.forEach((fn) => fn())
}

// Upload an image (data URL) to Firebase Storage and return the download URL
export const uploadImageToStorage = async (uid, dataUrl) => {
  const blob = dataUrlToBlob(dataUrl)
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
  const storageRef = ref(storage, `users/${uid}/images/${filename}`)
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' })
  return getDownloadURL(storageRef)
}

// =============================================================================
// Generic per-user-key sync (used by Profile-page data: measurements, photos,
// brand fits, calendar, etc.)
//
// Pattern is the same shape as `subscribeToAll` / `uploadToFirestore` above:
//   - one Firestore doc per key under users/{uid}/profile/{key}
//   - { value, updatedAt } payload (not { items } — these aren't always arrays)
//   - data-URL images are auto-uploaded to Storage before the Firestore write
//     so we never hit the 1MB-per-doc limit
//
// Components use the `useSyncedJson(key, default)` hook in `./useSyncedJson.js`
// for read+write. saveSyncedJson is the underlying writer.
// =============================================================================

// Add a key here to make it sync across devices automatically.
export const PROFILE_SYNC_KEYS = [
  'garmint_profile_v1',          // style prefs, measurements, profile photo
  'garmint_body_photos_v1',      // typed body photo slots (Face / Body Front / ...)
  'garmint_skin_photos_v1',      // skin tone photo array
  'garmint_brand_fits_v2',       // brand fit entries (each may carry images)
  'garmint_sale_brands_v1',      // brands the user follows
  'garmint_color_palette_v1',    // cached palette analysis result
  'garmint_calendar_v1',         // per-day outfit photos
  'garmint_sizes_v1',            // user-added size labels (shared with closet/list)
  'garmint_lorenzo_history_v1',  // Ask-Lorenzo chat history
  'garmint_wishlist_tags_v1',    // user-added "Categories" labels (e.g. Chinos, Hats)
  'garmint_wishlist_colors_v1',  // user-added color names
  'garmint_wishlist_cats_v1',    // user-added "Styles" labels (e.g. Formal, Streetwear)
]

const profileDocRef = (uid, key) => doc(db, 'users', uid, 'profile', key)

let _currentUser = null
export const setSyncUser = (user) => { _currentUser = user }

const isDataUrl = (s) => typeof s === 'string' && s.startsWith('data:image/')

// Recursively walk a value, replacing data-URL strings with Storage download URLs.
// On upload failure for any individual image, keep the original data URL so the
// user's local view stays intact even if Storage is down.
const replaceDataUrls = async (value, uid) => {
  if (isDataUrl(value)) {
    try { return await uploadImageToStorage(uid, value) }
    catch (e) { console.warn('profile-sync image upload failed; keeping data URL', e); return value }
  }
  if (Array.isArray(value)) return Promise.all(value.map((v) => replaceDataUrls(v, uid)))
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) out[k] = await replaceDataUrls(v, uid)
    return out
  }
  return value
}

const isEmptyValue = (v) => (
  v === null || v === undefined ||
  (Array.isArray(v) && v.length === 0) ||
  (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0)
)

// Strip data URLs, write to Firestore, update local cache with the URL-only version.
export const syncProfileKey = async (uid, key, value) => {
  if (isEmptyValue(value)) return value
  const sanitized = await replaceDataUrls(value, uid)
  saveJson(key, sanitized)
  await setDoc(profileDocRef(uid, key), { value: sanitized, updatedAt: Date.now() })
  return sanitized
}

// Used by components (via useSyncedJson) to write a value. Persists to localStorage
// synchronously and then fires the Firestore upload in the background. If the value
// contains data URLs they're swapped for Storage URLs before re-broadcasting so other
// hooks subscribed to the key see the URL-version.
export const saveSyncedJson = (key, value) => {
  saveJson(key, value)
  if (!_currentUser || !PROFILE_SYNC_KEYS.includes(key)) return
  void (async () => {
    try {
      const sanitized = await syncProfileKey(_currentUser.uid, key, value)
      if (JSON.stringify(sanitized) !== JSON.stringify(value)) {
        window.dispatchEvent(new CustomEvent(`mint-sync:${key}`, { detail: sanitized }))
      }
    } catch (e) { console.warn('saveSyncedJson failed for', key, e) }
  })()
}

// First-sign-in push: send any local profile data up to Firestore so other devices see it.
export const uploadAllProfileToFirestore = async (uid) => {
  for (const key of PROFILE_SYNC_KEYS) {
    const value = loadJson(key)
    if (isEmptyValue(value)) continue
    try { await syncProfileKey(uid, key, value) }
    catch (e) { console.warn('initial profile sync failed for', key, e) }
  }
}

// Subscribe to remote updates for every profile key. Each update is mirrored to localStorage
// and broadcast as a `mint-sync:<key>` window event — useSyncedJson hooks listen and re-render.
export const subscribeToProfileKeys = (uid) => {
  const unsubs = PROFILE_SYNC_KEYS.map((key) =>
    onSnapshot(profileDocRef(uid, key), (snap) => {
      if (!snap.exists()) return
      const data = snap.data()
      const value = data?.value
      if (value === undefined) return
      saveJson(key, value)
      window.dispatchEvent(new CustomEvent(`mint-sync:${key}`, { detail: value }))
    }, (err) => console.warn('profile listen error:', key, err))
  )
  return () => unsubs.forEach((fn) => fn())
}
