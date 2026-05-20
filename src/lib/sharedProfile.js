// Bridge between mint's profile doc and the cross-app shared profile doc.
//
// Why this exists: gym (and future homebase apps) write a flat identity object to
// users/<uid>/profile/homebase_shared_profile_v1 (fields: name, photo, height, weight, age, ...).
// Mint's own profile lives at users/<uid>/profile/garmint_profile_v1 with measurements nested
// under `measurements.Height` etc. This module syncs the shared subset in both directions so a
// height typed in gym shows up under mint's Body Measurements, and vice versa.
//
// Feedback-loop guards: every write tracks the value it just sent; the next snapshot for that
// same value is ignored. Without this, A's write would trigger B's snapshot, B's write would
// trigger A's snapshot, and Firestore would burn writes forever.
import { db } from './firebase'
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore'

const SHARED_KEY = 'homebase_shared_profile_v1'
const MINT_PROFILE_KEY = 'garmint_profile_v1'

// Shared schema → mint's nested profile shape.
const applySharedToMint = (mintProfile, shared) => {
  const next = { ...(mintProfile || {}) }
  if (typeof shared.photo === 'string' && shared.photo) next.photo = shared.photo
  next.measurements = { ...(next.measurements || {}) }
  if (typeof shared.height === 'string' && shared.height) next.measurements.Height = shared.height
  if (typeof shared.weight === 'string' && shared.weight) next.measurements.Weight = shared.weight
  if (typeof shared.age === 'string' && shared.age) next.measurements.Age = shared.age
  return next
}

// Mint's profile → flat shared schema (only the fields gym + other apps care about).
const extractShared = (mintProfile) => {
  if (!mintProfile) return {}
  const out = {}
  if (mintProfile.photo) out.photo = mintProfile.photo
  const m = mintProfile.measurements || {}
  if (m.Height) out.height = m.Height
  if (m.Weight) out.weight = m.Weight
  if (m.Age) out.age = m.Age
  return out
}

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)

export const bridgeSharedProfile = (uid) => {
  if (!uid) return () => {}
  const sharedRef = doc(db, 'users', uid, 'profile', SHARED_KEY)
  const mintRef = doc(db, 'users', uid, 'profile', MINT_PROFILE_KEY)

  let lastSharedWritten = null
  let lastMintWritten = null

  // shared → mint: when gym or another homebase app updates the shared identity, propagate into
  // mint's profile doc so useSyncedJson('garmint_profile_v1') re-renders the existing UI.
  const unsubShared = onSnapshot(sharedRef, async (snap) => {
    if (!snap.exists()) return
    const shared = snap.data()?.value
    if (!shared || typeof shared !== 'object') return
    if (eq(shared, lastSharedWritten)) return
    try {
      const mintSnap = await getDoc(mintRef)
      const mintProfile = mintSnap.exists() ? (mintSnap.data()?.value || {}) : {}
      const merged = applySharedToMint(mintProfile, shared)
      if (eq(merged, mintProfile)) return
      lastMintWritten = merged
      await setDoc(mintRef, { value: merged, updatedAt: Date.now() }, { merge: true })
    } catch (e) { console.warn('shared→mint sync failed:', e) }
  }, (err) => console.warn('shared profile listen error:', err))

  // mint → shared: when the user edits Height/Weight/Age (or uploads a photo) in mint, mirror the
  // change up to the shared doc so gym + future apps see it.
  const unsubMint = onSnapshot(mintRef, async (snap) => {
    if (!snap.exists()) return
    const mintProfile = snap.data()?.value
    if (!mintProfile || typeof mintProfile !== 'object') return
    if (eq(mintProfile, lastMintWritten)) return
    try {
      const extracted = extractShared(mintProfile)
      if (Object.keys(extracted).length === 0) return
      const sharedSnap = await getDoc(sharedRef)
      const oldShared = sharedSnap.exists() ? (sharedSnap.data()?.value || {}) : {}
      const merged = { ...oldShared, ...extracted }
      if (eq(merged, oldShared)) return
      lastSharedWritten = merged
      await setDoc(sharedRef, { value: merged, updatedAt: Date.now() }, { merge: true })
    } catch (e) { console.warn('mint→shared sync failed:', e) }
  }, (err) => console.warn('mint profile listen error:', err))

  return () => { unsubShared(); unsubMint() }
}
