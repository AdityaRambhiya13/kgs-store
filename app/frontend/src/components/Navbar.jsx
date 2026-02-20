import { useCart } from '../CartContext'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function Navbar({ searchQuery, onSearchChange }) {
    const { cartCount, setCartOpen } = useCart()
    const navigate = useNavigate()

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
                    <span className="nav-logo-text gradient-text" style={{ fontSize: '22px' }}>Ketan General Stores</span>
                </span>

                {/* Search Bar - only show if searchQuery is provided (customer side) */}
                {searchQuery !== undefined && (
                    <div className="nav-search">
                        <span className="nav-search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Search for grains..."
                            value={searchQuery || ''}
                            onChange={e => onSearchChange(e.target.value)}
                        />
                    </div>
                )}

                {/* Actions */}
                <div className="nav-actions">
                    <button className="icon-btn" onClick={toggleTheme} title="Toggle dark mode">🌙</button>
                    <motion.button
                        className="icon-btn"
                        whileTap={{ scale: 0.88 }}
                        onClick={() => navigate('/orders')}
                        title="My Orders"
                    >
                        📋
                    </motion.button>
                    <motion.button
                        className="nav-cart-btn"
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setCartOpen(true)}
                        title="Open cart"
                        animate={cartCount > 0 ? { scale: [1, 1.12, 1] } : {}}
                        transition={{ duration: 0.3 }}
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
