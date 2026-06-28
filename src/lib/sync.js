import { db, storage } from './firebase'
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { loadJson, saveJson, loadTs, saveTs, dataUrlToBlob } from './storage'
import { CLOSET_KEY, WISHLIST_KEY, INSPO_KEY } from './constants'

// Sync model: LAST WRITE WINS by timestamp, per key. Every local edit stamps the
// moment it happened (persisted in localStorage as `<key>:ts`). On sign-in and on
// every snapshot we compare the remote `updatedAt` against the local timestamp and
// adopt whichever is newer — so all devices converge on the single most-recent
// version and deletes propagate exactly like any other change.

const COLLECTIONS = {
  [CLOSET_KEY]: 'closet',
  [WISHLIST_KEY]: 'wishlist',
  [INSPO_KEY]: 'inspo',
}

const userDocRef = (uid, key) => doc(db, 'users', uid, 'data', COLLECTIONS[key])

// Write a collection's array to its Firestore doc, stamping the local timestamp.
export const uploadToFirestore = async (uid, key, items, ts = Date.now()) => {
  saveTs(key, ts)
  try {
    await setDoc(userDocRef(uid, key), { items, updatedAt: ts })
  } catch (e) {
    console.warn('Firestore write failed:', e)
  }
}

// Reconcile each collection on sign-in: adopt the cloud if it's newer (covers
// deletes/edits from another device), otherwise push local up. Never blindly
// overwrites the cloud with stale local data.
export const reconcileCollectionsOnSignIn = async (uid, handlers = {}) => {
  for (const key of Object.keys(COLLECTIONS)) {
    try {
      const snap = await getDoc(userDocRef(uid, key))
      const localTs = loadTs(key)
      if (!snap.exists()) {
        const ts = localTs || Date.now()
        await uploadToFirestore(uid, key, loadJson(key), ts)
        continue
      }
      const data = snap.data()
      const items = data.items || []
      const remoteTs = data.updatedAt || 0
      if (remoteTs > localTs) {
        saveJson(key, items)
        saveTs(key, remoteTs)
        handlers[key]?.(items)
      } else {
        const ts = localTs || Date.now()
        await uploadToFirestore(uid, key, loadJson(key), ts)
      }
    } catch (e) {
      console.warn('collection reconcile failed for', key, e)
    }
  }
}

// Subscribe to real-time updates for a key; adopt any remote write newer than
// our local timestamp. Returns an unsubscribe function.
export const subscribeToCollection = (uid, key, onData) => {
  return onSnapshot(userDocRef(uid, key), (snap) => {
    if (!snap.exists()) return
    const data = snap.data()
    const items = data.items || []
    const remoteTs = data.updatedAt || 0
    if (remoteTs <= loadTs(key)) return // our own echo or stale — ignore
    saveJson(key, items)
    saveTs(key, remoteTs)
    onData(items)
  }, (err) => {
    console.warn('Firestore listen error:', err)
  })
}

export const subscribeToAll = (uid, handlers) => {
  const unsubs = Object.keys(COLLECTIONS).map((key) =>
    subscribeToCollection(uid, key, (items) => {
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
// Generic per-user-key sync for Profile-page data (measurements, photos, brand
// fits, calendar, etc.). One Firestore doc per key under users/{uid}/profile/{key}
// with a { value, updatedAt } payload. Same last-write-wins model as above.
// =============================================================================

export const PROFILE_SYNC_KEYS = [
  'garmint_profile_v1',
  'garmint_body_photos_v1',
  'garmint_skin_photos_v1',
  'garmint_brand_fits_v2',
  'garmint_sale_brands_v1',
  'garmint_color_palette_v1',
  'garmint_body_analysis_v1',
  'garmint_calendar_v1',
  'garmint_sizes_v1',
  'garmint_lorenzo_history_v1',
  'garmint_wishlist_tags_v1',
  'garmint_wishlist_colors_v1',
  'garmint_wishlist_cats_v1',
]

const profileDocRef = (uid, key) => doc(db, 'users', uid, 'profile', key)

let _currentUser = null
export const setSyncUser = (user) => { _currentUser = user }

const isDataUrl = (s) => typeof s === 'string' && s.startsWith('data:image/')

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

// Strip data URLs, write to Firestore at timestamp `ts`, update local cache.
export const syncProfileKey = async (uid, key, value, ts = Date.now()) => {
  if (isEmptyValue(value)) return value
  const sanitized = await replaceDataUrls(value, uid)
  saveJson(key, sanitized)
  saveTs(key, ts)
  await setDoc(profileDocRef(uid, key), { value: sanitized, updatedAt: ts })
  return sanitized
}

// Used by components (via useSyncedJson) to write a value. Persists + stamps
// locally immediately, then debounces the Firestore upload (400ms).
const _debounceTimers = {}
export const saveSyncedJson = (key, value) => {
  saveJson(key, value)
  const ts = Date.now()
  saveTs(key, ts)
  if (!_currentUser || !PROFILE_SYNC_KEYS.includes(key)) return
  clearTimeout(_debounceTimers[key])
  _debounceTimers[key] = setTimeout(() => {
    const uid = _currentUser?.uid
    if (!uid) return
    void (async () => {
      try {
        const sanitized = await syncProfileKey(uid, key, value, loadTs(key))
        if (JSON.stringify(sanitized) !== JSON.stringify(value)) {
          window.dispatchEvent(new CustomEvent(`mint-sync:${key}`, { detail: sanitized }))
        }
      } catch (e) { console.warn('saveSyncedJson failed for', key, e) }
    })()
  }, 400)
}

// Reconcile each profile key on sign-in: adopt cloud if newer, else push local up.
export const reconcileProfileOnSignIn = async (uid) => {
  for (const key of PROFILE_SYNC_KEYS) {
    try {
      const snap = await getDoc(profileDocRef(uid, key))
      const localTs = loadTs(key)
      const local = loadJson(key)
      if (!snap.exists()) {
        if (!isEmptyValue(local)) await syncProfileKey(uid, key, local, localTs || Date.now())
        continue
      }
      const data = snap.data()
      const value = data?.value
      const remoteTs = data?.updatedAt || 0
      if (value !== undefined && remoteTs > localTs) {
        saveJson(key, value)
        saveTs(key, remoteTs)
        window.dispatchEvent(new CustomEvent(`mint-sync:${key}`, { detail: value }))
      } else if (!isEmptyValue(local)) {
        await syncProfileKey(uid, key, local, localTs || Date.now())
      }
    } catch (e) {
      console.warn('profile reconcile failed for', key, e)
    }
  }
}

// Subscribe to remote updates for every profile key; adopt writes newer than local.
export const subscribeToProfileKeys = (uid) => {
  const unsubs = PROFILE_SYNC_KEYS.map((key) =>
    onSnapshot(profileDocRef(uid, key), (snap) => {
      if (!snap.exists()) return
      const data = snap.data()
      const value = data?.value
      if (value === undefined) return
      const remoteTs = data?.updatedAt || 0
      if (remoteTs <= loadTs(key)) return // our own echo or stale — ignore
      saveJson(key, value)
      saveTs(key, remoteTs)
      window.dispatchEvent(new CustomEvent(`mint-sync:${key}`, { detail: value }))
    }, (err) => console.warn('profile listen error:', key, err))
  )
  return () => unsubs.forEach((fn) => fn())
}

export const refetchOnVisibility = (uid) => {
  const handler = () => {
    if (document.visibilityState === 'visible') {
      reconcileCollectionsOnSignIn(uid)
      reconcileProfileOnSignIn(uid)
    }
  }
  document.addEventListener('visibilitychange', handler)
  return () => document.removeEventListener('visibilitychange', handler)
}
