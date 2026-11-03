import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from './AuthContext'
import { FavoritesProvider } from './FavoritesContext'
import { adminLogin, getStoreStatus } from './api'
import ShutdownPage from './pages/ShutdownPage'

// Lazy loaded pages
const CatalogPage = lazy(() => import('./pages/CatalogPage'))
const ConfirmPage = lazy(() => import('./pages/ConfirmPage'))
const StatusPage = lazy(() => import('./pages/StatusPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const OrderHistoryPage = lazy(() => import('./pages/OrderHistoryPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const ForgotPinPage = lazy(() => import('./pages/ForgotPinPage'))
const ResetPinPage = lazy(() => import('./pages/ResetPinPage'))
const ImageMapper = lazy(() => import('./pages/ImageMapper'))
const CategoryMapper = lazy(() => import('./pages/CategoryMapper'))
const TestPage = lazy(() => import('./pages/TestPage'))
const ProductRenamer = lazy(() => import('./pages/ProductRenamer'))
const PrintBillPage = lazy(() => import('./pages/PrintBillPage'))
const UPIPaymentPage = lazy(() => import('./pages/UPIPaymentPage'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))

import CartPanel from './components/CartPanel'
import MobileCartBar from './components/MobileCartBar'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import BottomNav from './components/BottomNav'
import InstallPrompt from './components/InstallPrompt'
import OfflineBanner from './components/OfflineBanner'

// Page transition variants — slide-in from bottom, fade out
const pageVariants = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -8,  transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } },
}

function PageTransition({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ width: '100%', minHeight: 0 }}
    >
      {children}
    </motion.div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return null
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '70vh',
      gap: '16px'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        border: '3px solid rgba(37, 99, 235, 0.1)',
        borderTopColor: '#2563eb',
        animation: 'spin 1s linear infinite'
      }} />
      <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 500 }}>Loading...</span>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

function AdminRoute({ children }) {
  const [authed, setAuthed] = useState(!!localStorage.getItem('adminToken'))
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e?.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await adminLogin(password.trim())
      localStorage.setItem('adminToken', res.access_token)
      setAuthed(true)
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  if (authed) return children

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#0b0f1a',
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '32px',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)'
      }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔐</div>
        <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Admin Verification</h2>
        <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '24px' }}>Please enter admin password to access this page.</p>
        <form onSubmit={handleLogin}>
          <input
            type="password"
            placeholder="Admin Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(15, 23, 42, 0.6)',
              color: '#fff',
              outline: 'none',
              fontSize: '14px',
              marginBottom: '16px'
            }}
            autoFocus
          />
          {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>⚠️ {error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>
      </div>
    </div>
  )
}

// PWA back-navigation guard — in standalone mode, prevent exiting the app
// when the user is already at the home page by pushing a "sentinel" history entry
function usePWABackGuard() {
  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true

    if (!isStandalone) return

    // Push a dummy history entry on first load so pressing back doesn't quit
    if (!sessionStorage.getItem('pwa_guard_init')) {
      sessionStorage.setItem('pwa_guard_init', '1')
      window.history.pushState(null, '', window.location.href)
    }

    const handlePopState = () => {
      // Re-push the sentinel so the app stays alive
      window.history.pushState(null, '', window.location.href)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])
}

export default function App() {
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')
  const [navCategory, setNavCategory] = useState(null)

  // Store shutdown / maintenance state
  const [storeStatus, setStoreStatus] = useState({
    is_shutdown: false,
    title: '',
    message: ''
  })
  const [statusChecking, setStatusChecking] = useState(false)

  usePWABackGuard()

  const fetchStoreStatus = useCallback(async () => {
    try {
      setStatusChecking(true)
      const data = await getStoreStatus()
      if (data && typeof data.is_shutdown === 'boolean') {
        setStoreStatus(data)
      }
    } catch (err) {
      if (err.message !== 'Not Found' && !err.message?.includes('404')) {
        console.error("Failed to fetch store status:", err)
      }
    } finally {
      setStatusChecking(false)
    }
  }, [])

  useEffect(() => {
    fetchStoreStatus()
    const interval = setInterval(fetchStoreStatus, 20000)
    return () => clearInterval(interval)
  }, [fetchStoreStatus])

  // Real-time WebSocket connection to receive instant shutdown updates
  useEffect(() => {
    let ws = null
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      let host = window.location.host
      const apiUrl = import.meta.env.VITE_API_URL
      if (apiUrl) {
        try {
          const u = new URL(apiUrl)
          host = u.host
        } catch (e) {}
      }
      ws = new WebSocket(`${protocol}//${host}/ws/customer`)
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'store_status_changed') {
            setStoreStatus(prev => ({
              ...prev,
              is_shutdown: msg.is_shutdown,
              title: msg.title || prev.title,
              message: msg.message || prev.message
            }))
          }
        } catch (e) {}
      }
    } catch (err) {}
    return () => {
      if (ws) ws.close()
    }
  }, [])

  // Hide Navbar/Cart on Auth and Admin pages
  const isAuthPage = ['/login', '/signup', '/forgot-pin', '/reset-pin'].includes(location.pathname) ||
                     location.pathname.startsWith('/manage-store') ||
                     location.pathname === '/admin/mapper' ||
                     location.pathname === '/admin/category-mapper' ||
                     location.pathname === '/admin/renamer' ||
                     location.pathname.startsWith('/admin/print/') ||
                     location.pathname.startsWith('/pay/')
  const showSearch = location.pathname === '/'

  const handleCategorySelect = (catName) => {
    setNavCategory(catName)
    setTimeout(() => setNavCategory(null), 100)
  }

  const isAdminRoute = location.pathname.startsWith('/manage-store') ||
                       location.pathname.startsWith('/admin')

  // If store is temporarily shut down and the visitor is not in admin portal, display the shutdown screen
  if (storeStatus.is_shutdown && !isAdminRoute) {
    return (
      <FavoritesProvider>
        <>
          <OfflineBanner />
          <ShutdownPage
            status={storeStatus}
            onCheckAgain={fetchStoreStatus}
            isChecking={statusChecking}
          />
        </>
      </FavoritesProvider>
    )
  }

  return (
    <FavoritesProvider>
      <>
        {!isAuthPage && (
          <Navbar
            searchQuery={showSearch ? searchQuery : undefined}
            onSearchChange={setSearchQuery}
            onCategorySelect={handleCategorySelect}
          />
        )}

        {/* Offline banner — always visible on connectivity loss */}
        <OfflineBanner />

        <AnimatePresence mode="wait">
          <Suspense fallback={<PageLoader />}>
            <Routes location={location} key={location.pathname}>
              {/* Auth Routes */}
              <Route path="/login"      element={<PageTransition><LoginPage /></PageTransition>} />
              <Route path="/signup"     element={<PageTransition><SignupPage /></PageTransition>} />
              <Route path="/forgot-pin" element={<PageTransition><ForgotPinPage /></PageTransition>} />
              <Route path="/reset-pin"  element={<PageTransition><ResetPinPage /></PageTransition>} />

              {/* Protected Routes */}
              <Route path="/"        element={<PageTransition><CatalogPage searchQuery={searchQuery} navCategory={navCategory} /></PageTransition>} />
              <Route path="/confirm" element={<ProtectedRoute><PageTransition><ConfirmPage /></PageTransition></ProtectedRoute>} />
              <Route path="/status/:token" element={<ProtectedRoute><PageTransition><StatusPage /></PageTransition></ProtectedRoute>} />
              <Route path="/orders"    element={<ProtectedRoute><PageTransition><OrderHistoryPage /></PageTransition></ProtectedRoute>} />
              <Route path="/profile"   element={<ProtectedRoute><PageTransition><ProfilePage /></PageTransition></ProtectedRoute>} />
              <Route path="/favorites" element={<ProtectedRoute><PageTransition><FavoritesPage /></PageTransition></ProtectedRoute>} />

              {/* Admin Routes */}
              <Route path="/manage-store-99"       element={<AdminRoute><AdminPage /></AdminRoute>} />
              <Route path="/admin/mapper"          element={<AdminRoute><ImageMapper /></AdminRoute>} />
              <Route path="/admin/category-mapper" element={<AdminRoute><CategoryMapper /></AdminRoute>} />
              <Route path="/admin/renamer"         element={<AdminRoute><ProductRenamer /></AdminRoute>} />
              <Route path="/admin/print/:token"    element={<AdminRoute><PrintBillPage /></AdminRoute>} />
              <Route path="/pay/upi"               element={<ProtectedRoute><UPIPaymentPage /></ProtectedRoute>} />
              <Route path="/privacy"               element={<PrivacyPolicy />} />
              <Route path="/test"                  element={<TestPage />} />
            </Routes>
          </Suspense>
        </AnimatePresence>

        {!isAuthPage && <CartPanel />}
        {!isAuthPage && <MobileCartBar />}
        {!isAuthPage && <BottomNav />}
        {!isAuthPage && <Footer />}
        <InstallPrompt />
      </>
    </FavoritesProvider>
  )
}
