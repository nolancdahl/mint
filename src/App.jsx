import React, { useState, useEffect, useCallback, useRef } from 'react'
import { CLOSET_KEY, WISHLIST_KEY, INSPO_KEY } from './lib/constants'
import { loadJson, saveJson } from './lib/storage'
import { uploadToFirestore, subscribeToAll, uploadAllToFirestore } from './lib/sync'
import { useAuth, LoginScreen, handleSignOut } from './components/AuthGate'
import { Header } from './components/Header'
import { BottomNav } from './components/BottomNav'
import { FloatingChatButton } from './components/FloatingChatButton'
import { ChatPopup } from './components/ChatPopup'
import { ItemDetailModal } from './components/ItemDetailModal'
import { WishlistItemDetail } from './components/WishlistItemDetail'
import {
  HomeIcon, ShirtIcon, CalendarIcon, BarChartIcon, ShoppingBagIcon, ImageIcon, SparklesIcon,
} from './components/Icons'
import { HomePage } from './pages/HomePage'
import { ClosetPage } from './pages/ClosetPage'
import { ShoppingPage } from './pages/ShoppingPage'
import { CalendarPage, StatsPage, ExpertPage, ProfilePage } from './pages/OtherPages'
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
  const [shopPasteOpen, setShopPasteOpen] = useState(false)
  const [selectedClosetItem, setSelectedClosetItem] = useState(null)
  const [selectedWishlistItem, setSelectedWishlistItem] = useState(null)
  const [inspoItems, setInspoItems] = useState(() => loadJson(INSPO_KEY))

  // Track which keys were just updated from Firestore (per-key, not shared boolean)
  const firestoreKeys = useRef(new Set())
  const [saveFlash, setSaveFlash] = useState(false)
  const saveTimer = useRef(null)

  const showSaveFlash = useCallback(() => {
    setSaveFlash(true)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setSaveFlash(false), 1500)
  }, [])

  // Save to localStorage + Firestore
  const persist = useCallback((key, items) => {
    saveJson(key, items)
    if (firestoreKeys.current.has(key)) {
      firestoreKeys.current.delete(key)
    } else if (user) {
      uploadToFirestore(user.uid, key, items)
      showSaveFlash()
    }
  }, [user, showSaveFlash])

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
    if (!user) return
    // On first sign-in, push any existing localStorage data up
    const hasLocal = loadJson(CLOSET_KEY).length > 0 || loadJson(WISHLIST_KEY).length > 0 || loadJson(INSPO_KEY).length > 0
    if (hasLocal) {
      uploadAllToFirestore(user.uid)
    }

    const unsub = subscribeToAll(user.uid, {
      [CLOSET_KEY]: (items) => { firestoreKeys.current.add(CLOSET_KEY); setClosetItems(items) },
      [WISHLIST_KEY]: (items) => { firestoreKeys.current.add(WISHLIST_KEY); setWishlistItems(items) },
      [INSPO_KEY]: (items) => { firestoreKeys.current.add(INSPO_KEY); setInspoItems(items) },
    })
    return unsub
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
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'stats', label: 'Stats', icon: BarChartIcon },
    { id: 'shopping', label: 'Shop', icon: ShoppingBagIcon },
    { id: 'inspiration', label: 'Inspo', icon: ImageIcon },
    { id: 'expert', label: 'Expert', icon: SparklesIcon },
  ]

  const onProfilePage = currentPage === 'profile'
  const closeAll = () => {
    setChatOpen(false)
    setClosetAddOpen(false)
    setShopPasteOpen(false)
  }
  const openCloset = () => {
    setCurrentPage('closet')
    setClosetAddOpen(true)
  }

  // Show loading while auth state resolves
  if (user === undefined) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: COLORS.cream,
      }}>
        <div className="garmint-logo" style={{ fontSize: '28px', color: COLORS.green, opacity: 0.5 }}>
          garmint
        </div>
      </div>
    )
  }

  // Show login if not authenticated
  if (!user) return <LoginScreen />

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage closetCount={closetItems.length} wishlistCount={wishlistItems.length} onAddPiece={openCloset} />
      case 'closet':
        return (
          <ClosetPage
            items={closetItems}
            addOpen={closetAddOpen}
            onAddOpenChange={setClosetAddOpen}
            onSelectItem={setSelectedClosetItem}
            onSaveItem={handleSaveCloset}
          />
        )
      case 'calendar':
        return <CalendarPage />
      case 'stats':
        return <StatsPage items={closetItems} wishlist={wishlistItems} />
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
      case 'expert':
        return <ExpertPage />
      case 'profile':
        return <ProfilePage user={user} onSignOut={handleSignOut} />
      default:
        return <HomePage closetCount={closetItems.length} wishlistCount={wishlistItems.length} onAddPiece={openCloset} />
    }
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '78px' }}>
      <UpdateBanner />
      <Header
        onProfileClick={() => { setCurrentPage('profile'); closeAll() }}
        onLogoClick={() => { setCurrentPage('home'); closeAll() }}
        profileActive={onProfilePage}
      />
      <main key={currentPage} className="page-enter" style={{ padding: '18px 18px 32px', maxWidth: '1100px', margin: '0 auto' }}>
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
        <ItemDetailModal item={selectedClosetItem} onClose={() => setSelectedClosetItem(null)} onDelete={handleDeleteCloset} />
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
