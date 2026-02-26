import { useCart } from '../CartContext'
import { useAuth } from '../AuthContext'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function Navbar({ searchQuery, onSearchChange }) {
    const { cartCount, setCartOpen } = useCart()
    const { user, logout } = useAuth()
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
                <span className="nav-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', minWidth: 'max-content' }}>
                    <span className="nav-logo-text" style={{ fontSize: '22px', color: 'var(--primary)' }}>Ketan General Stores</span>
                </span>

                {/* Search Bar - only show if searchQuery is provided (customer side) */}
                {searchQuery !== undefined && (
                    <div className="nav-search">
                        <span className="nav-search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Search for groceries..."
                            value={searchQuery || ''}
                            onChange={e => onSearchChange(e.target.value)}
                        />
                    </div>
                )}

                {/* Actions */}
                <div className="nav-actions">
                    {user ? (
                        <div className="nav-dropdown-wrapper" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <motion.button
                                className="icon-btn"
                                whileTap={{ scale: 0.88 }}
                                onClick={() => navigate('/orders')}
                                title="My Profile / Orders"
                                style={{ fontSize: '18px', padding: '8px' }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            </motion.button>
                            <motion.button
                                className="btn btn-ghost"
                                whileTap={{ scale: 0.88 }}
                                onClick={() => {
                                    logout()
                                    navigate('/')
                                }}
                                title="Sign Out"
                                style={{ fontSize: '14px', padding: '6px 12px', fontWeight: '600' }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                <span>Sign Out</span>
                            </motion.button>
                        </div>
                    ) : (
                        <motion.button
                            className="btn btn-primary"
                            whileTap={{ scale: 0.88 }}
                            onClick={() => navigate('/login')}
                            title="Login"
                            style={{ padding: '8px 16px' }}
                        >
                            Login
                        </motion.button>
                    )}
                    <motion.button
                        className="nav-cart-btn icon-btn"
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setCartOpen(true)}
                        title="Open cart"
                        animate={cartCount > 0 ? { scale: [1, 1.12, 1] } : {}}
                        transition={{ duration: 0.3 }}
                        style={{ padding: '8px', position: 'relative' }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
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
