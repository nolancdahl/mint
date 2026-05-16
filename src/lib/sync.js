import { db } from './firebase'
import {
  doc, setDoc, onSnapshot, collection, writeBatch,
} from 'firebase/firestore'
import { loadJson, saveJson } from './storage'
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
