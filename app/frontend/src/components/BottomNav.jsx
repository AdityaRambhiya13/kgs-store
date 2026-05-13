import { useNavigate, useLocation } from 'react-router-dom'
import { useCart } from '../CartContext'
import { useAuth } from '../AuthContext'
import { motion } from 'framer-motion'

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { cartCount, setCartOpen } = useCart()
  const { user } = useAuth()

  const tabs = [
    {
      id: 'home',
      label: 'Home',
      path: '/',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
          <polyline points="9,21 9,12 15,12 15,21"/>
        </svg>
      ),
    },
    {
      id: 'search',
      label: 'Search',
      path: '/?search=1',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      ),
      action: () => {
        navigate('/')
        // Focus search bar after navigation
        setTimeout(() => {
          const input = document.querySelector('.nav-search-input')
          if (input) { input.focus(); input.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }
        }, 100)
      },
    },
    {
      id: 'cart',
      label: 'Cart',
      isCart: true,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1"/>
          <circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
      ),
      action: () => setCartOpen(true),
    },
    {
      id: 'profile',
      label: 'Profile',
      path: user ? '/profile' : '/login',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    },
  ]

  const isActive = (tab) => {
    if (tab.isCart) return false
    return location.pathname === tab.path || (tab.path !== '/' && location.pathname.startsWith(tab.path))
  }

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      {tabs.map(tab => {
        const active = isActive(tab)
        return (
          <motion.button
            key={tab.id}
            id={`bottom-nav-${tab.id}`}
            className={`bottom-nav-tab${active ? ' active' : ''}${tab.isCart ? ' cart-tab' : ''}`}
            onClick={tab.action || (() => navigate(tab.path))}
            whileTap={{ scale: 0.88 }}
            transition={{ duration: 0.15 }}
            aria-label={tab.label}
            aria-current={active ? 'page' : undefined}
          >
            <span className="bottom-nav-icon" style={{ position: 'relative' }}>
              {tab.icon}
              {tab.isCart && cartCount > 0 && (
                <motion.span
                  key={cartCount}
                  className="bottom-nav-badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                >
                  {cartCount > 9 ? '9+' : cartCount}
                </motion.span>
              )}
            </span>
            <span className="bottom-nav-label">{tab.label}</span>
            {active && (
              <motion.span
                className="bottom-nav-indicator"
                layoutId="bottom-nav-indicator"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </motion.button>
        )
      })}
    </nav>
  )
}
