import { useState } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
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
import UPIPaymentPage from './pages/UPIPaymentPage'
import PrivacyPolicy from './pages/PrivacyPolicy'
import CartPanel from './components/CartPanel'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import MobileCartBar from './components/MobileCartBar'
import InstallPrompt from './components/InstallPrompt'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return null
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

export default function App() {
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')
  const [navCategory, setNavCategory] = useState(null)

  // Hide Navbar/Cart on Auth and Admin pages
  const isAuthPage = ['/login', '/signup', '/forgot-pin', '/reset-pin'].includes(location.pathname) || 
                     location.pathname.startsWith('/manage-store') || 
                     location.pathname === '/admin/mapper' ||
                     location.pathname === '/admin/category-mapper' ||
                     location.pathname === '/admin/renamer' ||
                     location.pathname.startsWith('/pay/')
  const showSearch = location.pathname === '/'

  const handleCategorySelect = (catName) => {
    setNavCategory(catName)
    // Reset after passing down (CatalogPage will read it)
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

        <Routes location={location} key={location.pathname}>
          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-pin" element={<ForgotPinPage />} />
          <Route path="/reset-pin" element={<ResetPinPage />} />

          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute><CatalogPage searchQuery={searchQuery} navCategory={navCategory} /></ProtectedRoute>} />
          <Route path="/confirm" element={<ProtectedRoute><ConfirmPage /></ProtectedRoute>} />
          <Route path="/status/:token" element={<ProtectedRoute><StatusPage /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><OrderHistoryPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />

          {/* Admin Routes */}
          <Route path="/manage-store-99" element={<AdminPage />} />
          <Route path="/admin/mapper" element={<ImageMapper />} />
          <Route path="/admin/category-mapper" element={<CategoryMapper />} />
          <Route path="/admin/renamer" element={<ProductRenamer />} />
          <Route path="/pay/upi" element={<ProtectedRoute><UPIPaymentPage /></ProtectedRoute>} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/test" element={<TestPage />} />
        </Routes>

        {!isAuthPage && <CartPanel />}
        {!isAuthPage && <MobileCartBar />}
        {!isAuthPage && <Footer />}
        <InstallPrompt />
      </>
    </FavoritesProvider>
  )
}
