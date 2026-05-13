import { useState, useEffect } from 'react'
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from './AuthContext'
import { FavoritesProvider } from './FavoritesContext'
import CatalogPage from './pages/CatalogPage'
import ConfirmPage from './pages/ConfirmPage'
import StatusPage from './pages/StatusPage'
import AdminPage from './pages/AdminPage'
import OrderHistoryPage from './pages/OrderHistoryPage'
import ProfilePage from './pages/ProfilePage'
import FavoritesPage from './pages/FavoritesPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ForgotPinPage from './pages/ForgotPinPage'
import ResetPinPage from './pages/ResetPinPage'
import ImageMapper from './pages/ImageMapper'
import CategoryMapper from './pages/CategoryMapper'
import TestPage from './pages/TestPage'
import ProductRenamer from './pages/ProductRenamer'
import PrintBillPage from './pages/PrintBillPage'
import UPIPaymentPage from './pages/UPIPaymentPage'
import PrivacyPolicy from './pages/PrivacyPolicy'
import CartPanel from './components/CartPanel'
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

  usePWABackGuard()

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
          <Routes location={location} key={location.pathname}>
            {/* Auth Routes */}
            <Route path="/login"      element={<PageTransition><LoginPage /></PageTransition>} />
            <Route path="/signup"     element={<PageTransition><SignupPage /></PageTransition>} />
            <Route path="/forgot-pin" element={<PageTransition><ForgotPinPage /></PageTransition>} />
            <Route path="/reset-pin"  element={<PageTransition><ResetPinPage /></PageTransition>} />

            {/* Protected Routes */}
            <Route path="/"        element={<ProtectedRoute><PageTransition><CatalogPage searchQuery={searchQuery} navCategory={navCategory} /></PageTransition></ProtectedRoute>} />
            <Route path="/confirm" element={<ProtectedRoute><PageTransition><ConfirmPage /></PageTransition></ProtectedRoute>} />
            <Route path="/status/:token" element={<ProtectedRoute><PageTransition><StatusPage /></PageTransition></ProtectedRoute>} />
            <Route path="/orders"    element={<ProtectedRoute><PageTransition><OrderHistoryPage /></PageTransition></ProtectedRoute>} />
            <Route path="/profile"   element={<ProtectedRoute><PageTransition><ProfilePage /></PageTransition></ProtectedRoute>} />
            <Route path="/favorites" element={<ProtectedRoute><PageTransition><FavoritesPage /></PageTransition></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="/manage-store-99"       element={<AdminPage />} />
            <Route path="/admin/mapper"          element={<ImageMapper />} />
            <Route path="/admin/category-mapper" element={<CategoryMapper />} />
            <Route path="/admin/renamer"         element={<ProductRenamer />} />
            <Route path="/admin/print/:token"    element={<PrintBillPage />} />
            <Route path="/pay/upi"               element={<ProtectedRoute><UPIPaymentPage /></ProtectedRoute>} />
            <Route path="/privacy"               element={<PrivacyPolicy />} />
            <Route path="/test"                  element={<TestPage />} />
          </Routes>
        </AnimatePresence>

        {!isAuthPage && <CartPanel />}
        {!isAuthPage && <BottomNav />}
        {!isAuthPage && <Footer />}
        <InstallPrompt />
      </>
    </FavoritesProvider>
  )
}
