import { useState } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from './AuthContext'
import CatalogPage from './pages/CatalogPage'
import ConfirmPage from './pages/ConfirmPage'
import StatusPage from './pages/StatusPage'
import AdminPage from './pages/AdminPage'
import OrderHistoryPage from './pages/OrderHistoryPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ForgotPinPage from './pages/ForgotPinPage'
import ResetPinPage from './pages/ResetPinPage'
import CartPanel from './components/CartPanel'
import Navbar from './components/Navbar'

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

  // Hide Navbar/Cart on Auth and Admin pages
  const isAuthPage = ['/login', '/signup', '/forgot-pin', '/reset-pin'].includes(location.pathname) || location.pathname.startsWith('/manage-store')


  return (
    <>
      {!isAuthPage && <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-pin" element={<ForgotPinPage />} />
          <Route path="/reset-pin" element={<ResetPinPage />} />

          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute><CatalogPage searchQuery={searchQuery} /></ProtectedRoute>} />
          <Route path="/confirm" element={<ProtectedRoute><ConfirmPage /></ProtectedRoute>} />
          <Route path="/status/:token" element={<ProtectedRoute><StatusPage /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><OrderHistoryPage /></ProtectedRoute>} />

          {/* Admin Route */}
          <Route path="/manage-store-99" element={<AdminPage />} />
        </Routes>
      </AnimatePresence>
      {!isAuthPage && <CartPanel />}
    </>
  )
}
