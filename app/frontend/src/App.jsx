import { useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import CatalogPage from './pages/CatalogPage'
import ConfirmPage from './pages/ConfirmPage'
import StatusPage from './pages/StatusPage'
import AdminPage from './pages/AdminPage'
import OrderHistoryPage from './pages/OrderHistoryPage'
import CartPanel from './components/CartPanel'
import Navbar from './components/Navbar'

export default function App() {
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <>
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<CatalogPage searchQuery={searchQuery} />} />
          <Route path="/confirm" element={<ConfirmPage />} />
          <Route path="/status/:token" element={<StatusPage />} />
          <Route path="/manage-store-99" element={<AdminPage />} />
          <Route path="/orders" element={<OrderHistoryPage />} />
        </Routes>
      </AnimatePresence>
      <CartPanel />
    </>
  )
}
