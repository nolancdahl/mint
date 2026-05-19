import { useState, useEffect, useCallback } from 'react'
import { loadJson } from './storage'
import { saveSyncedJson } from './sync'

// React hook: read/write a localStorage-backed JSON value that is automatically synced to
// Firestore when the user is signed in. Components using this hook re-render when the value
// changes remotely (other device, other tab) or when local data URLs are swapped for Storage
// URLs after a background image upload.
//
// `defaultValue` is used if there is nothing saved yet for this key. Two cases get special-cased
// so the hook plays nicely with how loadJson reports "missing":
//   - loadJson returns `[]` for any missing key (it always returns at least an empty array).
//     If the caller's defaultValue is NOT an array, treat the `[]` from loadJson as "missing".
//   - If saved is an empty array and defaultValue is also an array, keep the empty array.
export const useSyncedJson = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    const saved = loadJson(key)
    if (saved === null || saved === undefined) return defaultValue
    // loadJson returns [] for missing keys. Disambiguate "user has no items" from "key was never written"
    // by looking at the default: if the caller defaulted to an empty array, the empty saved is meaningful
    // (the user really has nothing). Otherwise treat the empty array as "missing" and use defaultValue.
    if (Array.isArray(saved) && saved.length === 0) {
      if (Array.isArray(defaultValue) && defaultValue.length === 0) return saved
      return defaultValue
    }
    return saved
  })

  useEffect(() => {
    const handler = (e) => setValue(e.detail)
    window.addEventListener(`mint-sync:${key}`, handler)
    return () => window.removeEventListener(`mint-sync:${key}`, handler)
  }, [key])

  // Mirrors useState's setter API: accepts a value or an updater function.
  const setSyncedValue = useCallback((updater) => {
    setValue((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveSyncedJson(key, next)
      return next
    })
  }, [key])

  return [value, setSyncedValue]
}
