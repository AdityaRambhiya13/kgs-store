import { useCart } from '../CartContext'
import { useAuth } from '../AuthContext'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function Navbar({ searchQuery, onSearchChange }) {
    const { cartCount, setCartOpen } = useCart()
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                {/* Logo & Top Bar Actions Container */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' }}>
                    <span className="nav-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span className="nav-logo-text" style={{ fontSize: '26px', color: 'var(--primary)', letterSpacing: '-1px' }}>KGS</span>
                        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '6px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Delivery in</span>
                            <span style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text)' }}>15 mins</span>
                        </div>
                    </span>

                    {/* Actions */}
                    <div className="nav-actions">
                        {user ? (
                            <div className="nav-dropdown-wrapper" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <motion.button
                                    className="icon-btn"
                                    whileTap={{ scale: 0.88 }}
                                    onClick={() => navigate('/orders')}
                                    title="My Profile"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                </motion.button>
                            </div>
                        ) : (
                            <motion.button
                                className="btn btn-primary"
                                whileTap={{ scale: 0.88 }}
                                onClick={() => navigate('/login')}
                                title="Login"
                                style={{ padding: '8px 16px', borderRadius: '12px' }}
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

                {/* Search Bar (Takes full width below header always) */}
                {searchQuery !== undefined && (
                    <div className="nav-search" style={{ width: '100%', marginTop: '12px', display: 'flex', margin: '16px auto 0 auto' }}>
                        <span className="nav-search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Search 'Rice', 'Wheat', 'Daals'..."
                            value={searchQuery || ''}
                            onChange={e => onSearchChange(e.target.value)}
                            style={{ borderRadius: '12px', padding: '14px 16px 14px 42px', fontSize: '15px', backgroundColor: 'var(--bg-surface)' }}
                        />
                    </div>
                )}
            </div>
        </nav>
    )
}
