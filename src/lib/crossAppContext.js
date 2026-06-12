// crossAppContext.js — CANONICAL SHARED FILE (copy verbatim into each app's src/lib).
//
// What it does: reads a compact snapshot of the user's data from EVERY other app in the
// homebase suite (they all live under users/<uid>/ in the shared Firebase project) and renders
// a text block that an app's chat bot injects into its system prompt. This is what lets
// Benjamin (finances) know your gym goals, Lorenzo (style) know your meal-plan budget, etc.
//
// Why a manifest: the Firestore *client* SDK cannot list subcollections, so we cannot discover
// doc ids at runtime. Every cross-app doc must be listed in CROSS_APP_MANIFEST below.
//   >>> WHEN ANY APP ADDS A NEW profile/ OR data/ DOC, ADD IT HERE TOO. <<<
//
// Why size caps: the user opted into "everything", but dumping 800 transactions into every
// prompt is wasteful. We read whole docs, then `compact()` caps long arrays and strips heavy
// fields (image data URLs, base64) before rendering.
import { doc, getDoc } from 'firebase/firestore'

// app: short key (also the value passed as `excludeApp` so an app skips its own docs).
// coll: the subcollection under users/<uid>/ ('data' | 'profile' | 'buckit').
// id: the document id. label: human label shown to the bot. cap: max array items to render.
export const CROSS_APP_MANIFEST = [
  // Shared cross-app identity (read by everyone)
  { app: 'shared',   label: 'Shared identity (name, photo, height, weight, age, rhr)', coll: 'profile', id: 'homebase_shared_profile_v1' },

  // Finances · ledger
  { app: 'finances', label: 'Finances: profile',         coll: 'data', id: 'ledger_profile_v1' },
  { app: 'finances', label: 'Finances: income setup',    coll: 'data', id: 'ledger_income_setup_v1' },
  { app: 'finances', label: 'Finances: net worth',       coll: 'data', id: 'ledger_net_worth_v1' },
  { app: 'finances', label: 'Finances: goals',           coll: 'data', id: 'ledger_goals_v1', cap: 30 },
  { app: 'finances', label: 'Finances: subscriptions',   coll: 'data', id: 'ledger_subscriptions_v1', cap: 40 },
  { app: 'finances', label: 'Finances: bills',           coll: 'data', id: 'ledger_bills_v1', cap: 40 },

  // Clothes · mint
  { app: 'clothes',  label: 'Style: profile/measurements', coll: 'profile', id: 'garmint_profile_v1' },
  { app: 'clothes',  label: 'Style: brand fits',           coll: 'profile', id: 'garmint_brand_fits_v2', cap: 40 },
  { app: 'clothes',  label: 'Style: color palette',        coll: 'profile', id: 'garmint_color_palette_v1' },
  { app: 'clothes',  label: 'Style: sizes',                coll: 'profile', id: 'garmint_sizes_v1' },
  { app: 'clothes',  label: 'Style: closet',               coll: 'data', id: 'closet', cap: 50 },
  { app: 'clothes',  label: 'Style: wishlist',             coll: 'data', id: 'wishlist', cap: 50 },

  // Daily Task · sunrise
  { app: 'daily',    label: 'Daily tasks: profile',        coll: 'data', id: 'sunrise_profile_v1' },
  { app: 'daily',    label: 'Daily tasks: lifetime totals',coll: 'data', id: 'sunrise_totals_v1' },
  { app: 'daily',    label: 'Daily tasks: savings funds',  coll: 'data', id: 'sunrise_funds_v1' },

  // Gym · Arnold
  { app: 'gym',      label: 'Gym: profile (goals, injuries)', coll: 'profile', id: 'gym_profile_v1' },
  { app: 'gym',      label: 'Gym: workout data (logs, exercises, ORMs)', coll: 'profile', id: 'gym_workout_data_v1' },

  // Bucket List · buck it
  { app: 'bucket',   label: 'Bucket list: full state',     coll: 'buckit', id: 'state' },

  // Skincare & Haircare · NOUR-ish
  { app: 'skincare', label: 'Skincare: profile',           coll: 'data', id: 'user_profile' },
  { app: 'skincare', label: 'Skincare: journal',           coll: 'data', id: 'journal_entries', cap: 20 },
  { app: 'skincare', label: 'Skincare: hair log',          coll: 'data', id: 'hair_entries', cap: 20 },

  // Meal Plan · nolan's kitchen
  { app: 'meals',    label: 'Meals: preferences',          coll: 'data', id: 'userPreferences' },
  { app: 'meals',    label: 'Meals: macro goals',          coll: 'data', id: 'macroGoalsV5' },
  { app: 'meals',    label: 'Meals: budget',               coll: 'data', id: 'budget' },
  { app: 'meals',    label: 'Meals: triggers/allergies',   coll: 'data', id: 'userTriggers' },
  { app: 'meals',    label: 'Meals: profile notes',        coll: 'data', id: 'profileNotes' },

  // Cleaning · tydee
  { app: 'cleaning', label: 'Cleaning: chore log',         coll: 'data', id: 'cleaning_chores_v1' },
]

// Docs are stored in a few shapes across apps: { value, updatedAt }, { items, updatedAt },
// or the raw object. Normalize to the payload the bot cares about.
const unwrap = (data) => {
  if (!data || typeof data !== 'object') return data
  if ('value' in data) return data.value
  if ('items' in data) return data.items
  const { updatedAt, ...rest } = data
  return rest
}

const isEmpty = (v) => (
  v == null ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) ||
  (typeof v === 'string' && v.trim() === '')
)

const STR_CAP = 600

// Recursively shrink a value so a prompt stays bounded: cap arrays, truncate long strings,
// and drop image data URLs / base64 blobs that are useless to a text model.
const compact = (value, cap = 25) => {
  if (value == null || typeof value !== 'object') {
    if (typeof value === 'string' && value.length > STR_CAP) return value.slice(0, STR_CAP) + '…'
    return value
  }
  if (Array.isArray(value)) {
    const head = value.slice(0, cap).map((v) => compact(v, cap))
    if (value.length > cap) head.push(`…${value.length - cap} more`)
    return head
  }
  const out = {}
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === 'string' && (v.startsWith('data:') || v.length > 2000)) { out[k] = '[image omitted]'; continue }
    out[k] = compact(v, cap)
  }
  return out
}

// Read every manifest doc (minus the caller's own app) in parallel. Missing/empty docs are
// skipped. Failures on individual docs are swallowed so one permission error can't break chat.
export const readCrossAppContext = async (db, uid, { excludeApp } = {}) => {
  if (!db || !uid) return {}
  const entries = CROSS_APP_MANIFEST.filter((m) => m.app !== excludeApp)
  const results = await Promise.all(entries.map(async (m) => {
    try {
      const snap = await getDoc(doc(db, 'users', uid, m.coll, m.id))
      if (!snap.exists()) return null
      const value = unwrap(snap.data())
      return isEmpty(value) ? null : { ...m, value }
    } catch { return null }
  }))
  const byApp = {}
  for (const r of results.filter(Boolean)) {
    (byApp[r.app] = byApp[r.app] || []).push({ label: r.label, value: r.value, cap: r.cap })
  }
  return byApp
}

// Render the per-app data into a compact text block for the system prompt. Returns '' when
// there is nothing to share, so callers can skip the section entirely.
export const formatCrossAppContext = (byApp) => {
  const apps = Object.keys(byApp || {})
  if (apps.length === 0) return ''
  const lines = [
    'CROSS-APP CONTEXT — the user\'s data from their OTHER homebase apps',
    '(Use this to reason across the user\'s whole life — their goals, profile, plans, and habits',
    'live in sibling apps. Reference it only when relevant; never dump it back verbatim.)',
    '',
  ]
  for (const app of apps) {
    for (const sec of byApp[app]) {
      lines.push(`### ${sec.label}`)
      lines.push(JSON.stringify(compact(sec.value, sec.cap || 25)))
      lines.push('')
    }
  }
  return lines.join('\n').trim()
}

// Convenience: read + render in one call. Returns '' on any failure or when nothing to share.
export const buildCrossAppBlock = async (db, uid, opts = {}) => {
  try {
    const byApp = await readCrossAppContext(db, uid, opts)
    return formatCrossAppContext(byApp)
  } catch (e) {
    console.warn('cross-app context failed:', e)
    return ''
  }
}
