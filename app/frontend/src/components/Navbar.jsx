import { useCart } from '../CartContext'
import { motion } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'

export default function Navbar({ searchQuery, onSearchChange }) {
    const { cartCount, setCartOpen } = useCart()
    const navigate = useNavigate()
    const location = useLocation()

    const toggleTheme = () => {
        const root = document.documentElement
        const current = root.getAttribute('data-theme')
        root.setAttribute('data-theme', current === 'dark' ? '' : 'dark')
    }

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                {/* Logo */}
                <span className="nav-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    <span className="nav-logo-icon">🏪</span>
                    <span className="nav-logo-text gradient-text">Quick Shop</span>
                </span>

                {/* Search — only on catalog page */}
                {location.pathname === '/' && (
                    <div className="nav-search">
                        <span className="nav-search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={e => onSearchChange(e.target.value)}
                            aria-label="Search products"
                        />
                    </div>
                )}

                {/* Actions */}
                <div className="nav-actions">
                    <button className="icon-btn" onClick={toggleTheme} title="Toggle dark mode">🌙</button>
                    <motion.button
                        className="icon-btn"
                        whileTap={{ scale: 0.88 }}
                        onClick={() => setCartOpen(true)}
                        title="Open cart"
                    >
                        🛒
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
        </nav>
    )
}
