import { useState, useEffect } from 'react'
import { useCart } from '../CartContext'
import { useAuth } from '../AuthContext'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function Navbar({ searchQuery, onSearchChange }) {
  const { cartCount, setCartOpen } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [locationName, setLocationName] = useState('Kalyan (W)')

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`);
          const data = await res.json();
          if (data.address) {
            const city = data.address.city || data.address.town || data.address.village || data.address.suburb || 'My Location';
            setLocationName(city);
          }
        } catch (err) {
          console.error("Location fetch failed:", err);
        }
      }, (err) => {
        console.warn("Geolocation permission denied or failed:", err);
      });
    }
  }, [])

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Row 1: logo + location + actions */}
        <div className="nav-top-row">

          {/* Left group: Logo + Location */}
          <div className="nav-left">
            <div className="nav-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
              <span className="nav-logo-text">KGS</span>
              <div className="nav-delivery-badge">
                <span className="nav-delivery-time">⚡ 10 mins</span>
              </div>
            </div>

            {/* Location selector */}
            <button className="nav-location-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span className="nav-location-text">
                <span className="nav-location-label">Deliver to</span>
                <span className="nav-location-name">{locationName} ▾</span>
              </span>
            </button>
          </div>

          {/* Right: Profile + Cart */}
          <div className="nav-actions">
            {user ? (
              <motion.button
                className="icon-btn"
                whileTap={{ scale: 0.88 }}
                onClick={() => navigate('/profile')}
                title="My Profile"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </motion.button>
            ) : (
              <motion.button
                className="btn btn-primary nav-login-btn"
                whileTap={{ scale: 0.88 }}
                onClick={() => navigate('/login')}
              >
                👤 Login
              </motion.button>
            )}

            <motion.button
              className="nav-cart-btn icon-btn"
              whileTap={{ scale: 0.92 }}
              onClick={() => setCartOpen(true)}
              title="Open cart"
              animate={cartCount > 0 ? { scale: [1, 1.12, 1] } : {}}
              transition={{ duration: 0.3 }}
              style={{ position: 'relative' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              {cartCount > 0 && (
                <motion.span
                  key={cartCount}
                  className="cart-badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                >
                  {cartCount}
                </motion.span>
              )}
            </motion.button>
          </div>
        </div>

        {/* Row 2: Search bar (only on catalog page) */}
        {searchQuery !== undefined && (
          <div className="nav-search-row">
            <div className="nav-search-wrap">
              <svg className="nav-search-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                type="text"
                className="nav-search-input"
                placeholder="Search milk, bread, rice, wheat..."
                value={searchQuery || ''}
                onChange={e => onSearchChange(e.target.value)}
              />
              {searchQuery && (
                <button className="nav-search-clear" onClick={() => onSearchChange('')}>✕</button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
