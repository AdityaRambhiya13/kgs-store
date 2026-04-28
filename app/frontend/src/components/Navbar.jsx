import { useState, useEffect, useRef } from 'react'
import { useCart } from '../CartContext'
import { useAuth } from '../AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const SEARCH_CATEGORIES = [
  { name: 'Atta, Rice & Dal',           emoji: '🌾' },
  { name: 'Masala & Dry Fruits',        emoji: '🌶️' },
  { name: 'Snacks & Munchies',          emoji: '🍿' },
  { name: 'Sweet Tooth',                emoji: '🍭' },
  { name: 'Cleaning Essentials',        emoji: '🧼' },
  { name: 'Instant & Frozen Food',      emoji: '🍜' },
  { name: 'Dairy & Bread',              emoji: '🥛' },
  { name: 'Personal Care',              emoji: '💄' },
  { name: 'Cold Drinks & Juices',       emoji: '🥤' },
  { name: 'Wellness',                  emoji: '💊' },
  { name: 'Tea, Coffee & Health Drinks',emoji: '☕' },
  { name: 'Home & Lifestyle',           emoji: '🏠' },
  { name: 'Pooja Needs',                emoji: '🪔' },
  { name: 'Miscellaneous',              emoji: '📦' },
]

export default function Navbar({ searchQuery, onSearchChange, onCategorySelect }) {
  const { cartCount, setCartOpen } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [locationName, setLocationName] = useState('Kalyan (W)')
  const [searchFocused, setSearchFocused] = useState(false)
  const searchWrapRef = useRef(null)

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleCategoryClick = (catName) => {
    if (onCategorySelect) onCategorySelect(catName)
    if (onSearchChange) onSearchChange('')
    setSearchFocused(false)
  }

  // Whether to show category dropdown
  const showCategoryDropdown = searchFocused && !(searchQuery && searchQuery.trim())

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Row 1: logo + location + actions */}
        <div className="nav-top-row">

          {/* Left group: Logo + Location */}
          <div className="nav-left">
            <div className="nav-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
              <span className="nav-logo-text">KGS</span>
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

          {/* Right: Profile + Favorite + Cart */}
          <div className="nav-actions">
            {user ? (
              <>
                <motion.button
                  className="icon-btn"
                  whileTap={{ scale: 0.88 }}
                  onClick={() => navigate('/profile')}
                  title="My Profile"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </motion.button>

                <motion.button
                  className="icon-btn nav-fav-btn"
                  whileTap={{ scale: 0.88 }}
                  onClick={() => navigate('/favorites')}
                  title="My Favorites"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </motion.button>
              </>
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

        {/* Row 2: Search bar (only on catalog page) with category dropdown */}
        {searchQuery !== undefined && (
          <div className="nav-search-row">
            <div className="nav-search-wrap" ref={searchWrapRef}>
              <svg className="nav-search-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                type="text"
                className="nav-search-input"
                placeholder="Search groceries, snacks, masala..."
                value={searchQuery || ''}
                onChange={e => onSearchChange(e.target.value)}
                onFocus={() => setSearchFocused(true)}
              />
              {searchQuery && (
                <button className="nav-search-clear" onClick={() => { onSearchChange(''); setSearchFocused(true) }}>✕</button>
              )}

              {/* Category dropdown on search focus */}
              <AnimatePresence>
                {showCategoryDropdown && (
                  <motion.div
                    className="search-category-dropdown"
                    initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
                    animate={{ opacity: 1, y: 0, scaleY: 1 }}
                    exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
                    transition={{ duration: 0.18 }}
                  >
                    <p className="search-dropdown-label">Browse Categories</p>
                    <div className="search-dropdown-grid">
                      {SEARCH_CATEGORIES.map(cat => (
                        <button
                          key={cat.name}
                          className="search-dropdown-cat-btn"
                          onMouseDown={(e) => { e.preventDefault(); handleCategoryClick(cat.name) }}
                        >
                          <span className="search-dropdown-emoji">{cat.emoji}</span>
                          <span>{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
