import React, { useState, useEffect, useCallback, useRef } from 'react'
import { CLOSET_KEY, WISHLIST_KEY, INSPO_KEY } from './lib/constants'
import { loadJson, saveJson } from './lib/storage'
import { uploadToFirestore, subscribeToAll, reconcileCollectionsOnSignIn, setSyncUser, subscribeToProfileKeys, reconcileProfileOnSignIn } from './lib/sync'
import { bridgeSharedProfile } from './lib/sharedProfile'
import { useSyncedJson } from './lib/useSyncedJson'
import { useAuth, LoginScreen, handleSignOut } from './components/AuthGate'
import { Header } from './components/Header'
import { BottomNav } from './components/BottomNav'
import { MusicSelector } from './components/MusicSelector'
import { FloatingChatButton } from './components/FloatingChatButton'
import { ChatPopup } from './components/ChatPopup'
import { ItemDetailModal } from './components/ItemDetailModal'
import { WishlistItemDetail } from './components/WishlistItemDetail'
import {
  HomeIcon, ShirtIcon, BarChartIcon, ShoppingBagIcon, ImageIcon, SparklesIcon, UserIcon,
} from './components/Icons'
import { HomePage } from './pages/HomePage'
import { ClosetPage } from './pages/ClosetPage'
import { ShoppingPage } from './pages/ShoppingPage'
import { StatsPage, ExpertPage, ProfilePage, CalendarPage } from './pages/OtherPages'
import { InspirationPage } from './pages/InspirationPage'
import { COLORS, FONTS } from './lib/theme'

const UpdateBanner = () => {
  const [update, setUpdate] = useState(null)

  useEffect(() => {
    // Listen for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              setUpdate(new Date())
            }
          })
        })
      })
      // Also check on page load if there was a recent update
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setUpdate(new Date())
      })
    }
  }, [])

  useEffect(() => {
    if (!update) return
    const t = setTimeout(() => setUpdate(null), 10000)
    return () => clearTimeout(t)
  }, [update])

  if (!update) return null

  const timeStr = update.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  return (
    <div
      onClick={() => setUpdate(null)}
      style={{
        position: 'fixed',
        top: '14px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        padding: '8px 18px',
        borderRadius: '999px',
        background: COLORS.cream,
        color: COLORS.green,
        fontFamily: FONTS.sub,
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.06em',
        boxShadow: '0 4px 16px rgba(19, 37, 27, 0.2)',
        cursor: 'pointer',
        animation: 'fadeUp 0.3s ease both',
        whiteSpace: 'nowrap',
      }}
    >
      Latest update pushed · {timeStr}
    </div>
  )
}

function AppShell() {
  const user = useAuth()
  const [currentPage, setCurrentPage] = useState('home')

  const [chatOpen, setChatOpen] = useState(false)
  const [chatMounted, setChatMounted] = useState(false)
  const [closetItems, setClosetItems] = useState(() => loadJson(CLOSET_KEY))
  const [wishlistItems, setWishlistItems] = useState(() => loadJson(WISHLIST_KEY))
  const [closetAddOpen, setClosetAddOpen] = useState(false)
  const [closetOutfitOpen, setClosetOutfitOpen] = useState(false)
  const [shopPasteOpen, setShopPasteOpen] = useState(false)
  const [chatPrefill, setChatPrefill] = useState('')
  const [selectedClosetItem, setSelectedClosetItem] = useState(null)
  const [selectedWishlistItem, setSelectedWishlistItem] = useState(null)
  const [inspoItems, setInspoItems] = useState(() => loadJson(INSPO_KEY))
  // Read the profile through useSyncedJson so the header avatar updates when ProfilePage
  // (or another device) changes the photo. Stored value is the whole profile object;
  // we only consume the photo here.
  const [syncedProfile, setSyncedProfile] = useSyncedJson('garmint_profile_v1', null)
  const profilePhoto = (syncedProfile && typeof syncedProfile === 'object' && !Array.isArray(syncedProfile)) ? (syncedProfile.photo || null) : null
  const setProfilePhoto = useCallback((photo) => {
    setSyncedProfile((prev) => ({ ...(prev || {}), photo }))
  }, [setSyncedProfile])

  // Track which keys were just updated from Firestore (per-key, not shared boolean)
  const firestoreKeys = useRef(new Set())
  const [saveFlash, setSaveFlash] = useState(false)
  const saveTimer = useRef(null)

  const showSaveFlash = useCallback(() => {
    setSaveFlash(true)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setSaveFlash(false), 1500)
  }, [])

  // Read `user` through a ref so `persist`'s identity stays stable across sign-in.
  // Without this, signing in would change `persist`, re-fire the persist effects with
  // the still-empty initial state, and overwrite the Firestore doc with [] before the
  // snapshot listener had a chance to populate state.
  const userRef = useRef(user)
  userRef.current = user

  // Save to localStorage + Firestore
  const persist = useCallback((key, items) => {
    saveJson(key, items)
    if (firestoreKeys.current.has(key)) {
      firestoreKeys.current.delete(key)
    } else if (userRef.current) {
      uploadToFirestore(userRef.current.uid, key, items)
      showSaveFlash()
    }
  }, [showSaveFlash])

  // Skip initial mount persist (data already in localStorage)
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    persist(CLOSET_KEY, closetItems)
  }, [closetItems, persist])
  useEffect(() => {
    if (!mounted.current) return
    persist(WISHLIST_KEY, wishlistItems)
  }, [wishlistItems, persist])
  useEffect(() => {
    if (!mounted.current) return
    persist(INSPO_KEY, inspoItems)
  }, [inspoItems, persist])

  // Subscribe to Firestore real-time updates when logged in
  useEffect(() => {
    if (!user) {
      setSyncUser(null)
      return
    }
    // Register the user with the profile-sync layer so saveSyncedJson knows where to write.
    setSyncUser(user)

    const collHandlers = {
      [CLOSET_KEY]: (items) => { firestoreKeys.current.add(CLOSET_KEY); setClosetItems(items) },
      [WISHLIST_KEY]: (items) => { firestoreKeys.current.add(WISHLIST_KEY); setWishlistItems(items) },
      [INSPO_KEY]: (items) => { firestoreKeys.current.add(INSPO_KEY); setInspoItems(items) },
    }

    // Merge cloud + local on sign-in (NEVER blindly overwrite the cloud), THEN
    // start real-time subscriptions. This prevents a fresh/stale device or a new
    // app version from wiping data that lives in the cloud.
    let unsub = () => {}, unsubProfile = () => {}, unsubShared = () => {}
    let cancelled = false
    ;(async () => {
      await reconcileCollectionsOnSignIn(user.uid, collHandlers)
      await reconcileProfileOnSignIn(user.uid)
      if (cancelled) return
      unsub = subscribeToAll(user.uid, collHandlers)
      unsubProfile = subscribeToProfileKeys(user.uid)
      // Bridge to the homebase shared profile doc — keeps Height / Weight / Age / photo
      // in sync with sibling apps (e.g. gym) that read & write the same identity.
      unsubShared = bridgeSharedProfile(user.uid)
    })()
    return () => { cancelled = true; unsub(); unsubProfile(); unsubShared() }
  }, [user])

  useEffect(() => {
    if (chatOpen) setChatMounted(true)
    else if (chatMounted) {
      const t = setTimeout(() => setChatMounted(false), 220)
      return () => clearTimeout(t)
    }
  }, [chatOpen, chatMounted])

  const handleSaveCloset = (item) => setClosetItems((prev) => [item, ...prev])
  const handleDeleteCloset = (id) => {
    setClosetItems((prev) => prev.filter((i) => i.id !== id))
    setSelectedClosetItem(null)
  }
  const handleSaveWishlist = (item) => setWishlistItems((prev) => [item, ...prev])
  const handleDeleteWishlist = (id) => {
    setWishlistItems((prev) => prev.filter((i) => i.id !== id))
    setSelectedWishlistItem(null)
  }

  const navPages = [
    { id: 'home', label: 'Home', icon: HomeIcon },
    { id: 'closet', label: 'Closet', icon: ShirtIcon },
    { id: 'shopping', label: 'List', icon: ShoppingBagIcon },
    { id: 'inspiration', label: 'Lookbook', icon: ImageIcon },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ]

  const closeAll = () => {
    setClosetAddOpen(false)
    setClosetOutfitOpen(false)
    setShopPasteOpen(false)
  }
  const openCloset = () => {
    setCurrentPage('closet')
    setClosetAddOpen(true)
  }
  const openCreateOutfit = () => {
    setCurrentPage('closet')
    setClosetOutfitOpen(true)
  }

  // Show loading while auth state resolves
  if (user === undefined) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: COLORS.cream,
      }}>
        <div style={{ fontSize: '28px', color: COLORS.green, opacity: 0.5, fontFamily: "'Manrope', sans-serif", fontWeight: 700, letterSpacing: '-0.02em' }}>
          mint
        </div>
      </div>
    )
  }

  // Show login if not authenticated
  if (!user) return <LoginScreen />

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage closetCount={closetItems.length} wishlistCount={wishlistItems.length} onCreateOutfit={openCreateOutfit} onNavigate={setCurrentPage} />
      case 'closet':
        return (
          <ClosetPage
            items={closetItems}
            addOpen={closetAddOpen}
            onAddOpenChange={setClosetAddOpen}
            outfitOpen={closetOutfitOpen}
            onOutfitOpenChange={setClosetOutfitOpen}
            onSelectItem={setSelectedClosetItem}
            onSaveItem={handleSaveCloset}
            onUpdate={(updated) => setClosetItems((prev) => prev.map((i) => i.id === updated.id ? updated : i))}
            onNavigate={setCurrentPage}
          />
        )
      case 'shopping':
        return (
          <ShoppingPage
            items={wishlistItems}
            pasteOpen={shopPasteOpen}
            onPasteOpenChange={setShopPasteOpen}
            onSave={handleSaveWishlist}
            onSelectItem={setSelectedWishlistItem}
            onReorder={(newItems) => setWishlistItems(newItems)}
            onUpdate={(updated) => setWishlistItems((prev) => prev.map((i) => i.id === updated.id ? updated : i))}
          />
        )
      case 'inspiration':
        return (
          <InspirationPage
            items={inspoItems}
            onSave={(item) => setInspoItems((prev) => [item, ...prev])}
            onDelete={(id) => setInspoItems((prev) => prev.filter((i) => i.id !== id))}
            onUpdate={(updated) => setInspoItems((prev) => prev.map((i) => i.id === updated.id ? updated : i))}
            onReorder={(newItems) => setInspoItems(newItems)}
          />
        )
      case 'calendar':
        return <CalendarPage onPickOutfit={() => openCreateOutfit()} onBack={() => setCurrentPage('closet')} />
      case 'profile':
        return <ProfilePage user={user} onSignOut={handleSignOut} profilePhoto={profilePhoto} onProfilePhotoChange={setProfilePhoto} onNavigate={setCurrentPage} onSetChatPrefill={setChatPrefill} closetItems={closetItems} wishlistItems={wishlistItems} chatPrefill={chatPrefill} onPrefillConsumed={() => setChatPrefill('')} />
      default:
        return <HomePage closetCount={closetItems.length} wishlistCount={wishlistItems.length} onAddPiece={openCloset} onNavigate={setCurrentPage} />
    }
  }

  return (
    <div style={{
      // Fixed-height flex column: header + scrollable main + locked bottom nav.
      // Locks the bottom nav so only the content area scrolls (phone fix — the whole
      // page, nav included, used to scroll on the List and Closet pages).
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      // Cream sits behind the banner's transparent arch (so the arch reads as cream
      // at rest, and content shows over it as you scroll up).
      background: COLORS.cream,
    }}>
      <UpdateBanner />
      <Header
        onLogoClick={() => { setCurrentPage('home'); closeAll() }}
      />
      {/* Top-right music picker (menu of tracks). */}
      <MusicSelector />
      <main
        key={currentPage}
        className="page-enter hide-scrollbar"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          // Stop the rubber-band overscroll that lifts the page and shows a gap
          // when you keep dragging past the bottom.
          overscrollBehavior: 'none',
          // Pulled up to overlap the banner's arch (66px), behind it (z 1 < header 20).
          // The extra top padding starts the content just below the arch, so scrolling
          // up carries it through the arch before the green clips it.
          position: 'relative',
          zIndex: 1,
          padding: '84px 18px 32px',
          maxWidth: '1100px',
          margin: '0 auto',
          marginTop: '-66px',
          width: '100%',
        }}
      >
        {renderPage()}
      </main>
      {saveFlash && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(142px + env(safe-area-inset-bottom, 0px))',
          right: '22px',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: '#2ecc71',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 103,
          boxShadow: '0 4px 14px rgba(46, 204, 113, 0.4)',
          animation: 'saveFlashIn 0.25s ease-out',
          fontSize: '20px',
          fontWeight: 700,
        }}>
          ✓
        </div>
      )}
      <FloatingChatButton onClick={() => setChatOpen((v) => !v)} active={chatOpen} />
      <BottomNav pages={navPages} current={currentPage} onChange={(id) => { setCurrentPage(id); closeAll() }} />
      {chatMounted && <ChatPopup isOpen={chatOpen} onClose={() => setChatOpen(false)} />}
      {selectedClosetItem && (
        <ItemDetailModal
          item={selectedClosetItem}
          onClose={() => setSelectedClosetItem(null)}
          onDelete={handleDeleteCloset}
          onUpdate={(updated) => {
            setClosetItems((prev) => prev.map((i) => i.id === updated.id ? updated : i))
            setSelectedClosetItem(updated)
          }}
        />
      )}
      {selectedWishlistItem && (
        <WishlistItemDetail
          item={selectedWishlistItem}
          onClose={() => setSelectedWishlistItem(null)}
          onDelete={handleDeleteWishlist}
          onUpdate={(updated) => {
            setWishlistItems((prev) => prev.map((i) => i.id === updated.id ? updated : i))
            setSelectedWishlistItem(updated)
          }}
        />
      )}
    </div>
  )
}

export default function App() {
  return <AppShell />
}
