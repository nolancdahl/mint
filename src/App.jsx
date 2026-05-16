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

  // Track whether updates come from Firestore (to avoid re-uploading)
  const fromFirestore = useRef(false)

  // Save to localStorage + Firestore
  const persist = useCallback((key, items) => {
    saveJson(key, items)
    if (!fromFirestore.current && user) {
      uploadToFirestore(user.uid, key, items)
    }
    fromFirestore.current = false
  }, [user])

  useEffect(() => { persist(CLOSET_KEY, closetItems) }, [closetItems, persist])
  useEffect(() => { persist(WISHLIST_KEY, wishlistItems) }, [wishlistItems, persist])
  useEffect(() => { persist(INSPO_KEY, inspoItems) }, [inspoItems, persist])

  // Subscribe to Firestore real-time updates when logged in
  useEffect(() => {
    if (!user) return
    // On first sign-in, push any existing localStorage data up
    const hasLocal = loadJson(CLOSET_KEY).length > 0 || loadJson(WISHLIST_KEY).length > 0 || loadJson(INSPO_KEY).length > 0
    if (hasLocal) {
      uploadAllToFirestore(user.uid)
    }

    const unsub = subscribeToAll(user.uid, {
      [CLOSET_KEY]: (items) => { fromFirestore.current = true; setClosetItems(items) },
      [WISHLIST_KEY]: (items) => { fromFirestore.current = true; setWishlistItems(items) },
      [INSPO_KEY]: (items) => { fromFirestore.current = true; setInspoItems(items) },
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
          />
        )
      case 'inspiration':
        return (
          <InspirationPage
            items={inspoItems}
            onSave={(item) => setInspoItems((prev) => [item, ...prev])}
            onDelete={(id) => setInspoItems((prev) => prev.filter((i) => i.id !== id))}
            onUpdate={(updated) => setInspoItems((prev) => prev.map((i) => i.id === updated.id ? updated : i))}
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
      <Header
        onProfileClick={() => { setCurrentPage('profile'); closeAll() }}
        onLogoClick={() => { setCurrentPage('home'); closeAll() }}
        profileActive={onProfilePage}
      />
      <main key={currentPage} className="page-enter" style={{ padding: '18px 18px 32px', maxWidth: '1100px', margin: '0 auto' }}>
        {renderPage()}
      </main>
      <FloatingChatButton onClick={() => setChatOpen((v) => !v)} active={chatOpen} />
      <BottomNav pages={navPages} current={currentPage} onChange={(id) => { setCurrentPage(id); closeAll() }} />
      {chatMounted && <ChatPopup isOpen={chatOpen} onClose={() => setChatOpen(false)} />}
      {selectedClosetItem && (
        <ItemDetailModal item={selectedClosetItem} onClose={() => setSelectedClosetItem(null)} onDelete={handleDeleteCloset} />
      )}
      {selectedWishlistItem && (
        <WishlistItemDetail item={selectedWishlistItem} onClose={() => setSelectedWishlistItem(null)} onDelete={handleDeleteWishlist} />
      )}
    </div>
  )
}

export default function App() {
  return <AppShell />
}
