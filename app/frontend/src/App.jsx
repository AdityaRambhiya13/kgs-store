import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import CatalogPage from './pages/CatalogPage'
import ConfirmPage from './pages/ConfirmPage'
import StatusPage from './pages/StatusPage'
import AdminPage from './pages/AdminPage'
import CartPanel from './components/CartPanel'

export default function App() {
  const location = useLocation()

  return (
    <>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/confirm" element={<ConfirmPage />} />
          <Route path="/status/:token" element={<StatusPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </AnimatePresence>
      <CartPanel />
    </>
  )
}
