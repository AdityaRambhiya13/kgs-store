import { Routes, Route } from 'react-router-dom'
import CatalogPage from './pages/CatalogPage'
import ConfirmPage from './pages/ConfirmPage'
import StatusPage from './pages/StatusPage'
import AdminPage from './pages/AdminPage'
import CartPanel from './components/CartPanel'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/confirm" element={<ConfirmPage />} />
        <Route path="/status/:token" element={<StatusPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
      <CartPanel />
    </>
  )
}
