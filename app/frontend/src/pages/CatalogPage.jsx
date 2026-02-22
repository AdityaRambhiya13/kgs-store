import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import ProductVariantModal from '../components/ProductVariantModal'
import { useCart } from '../CartContext'
import { getProducts } from '../api'

const CATEGORY_EMOJI = { Rice: '🍚', Wheat: '🌾', Jowari: '🌽', Bajri: '🫘' }


export default function CatalogPage({ searchQuery = '' }) {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [activeCategory, setActiveCategory] = useState('All')
    const [selectedGroup, setSelectedGroup] = useState(null)
    const [fabWiggle, setFabWiggle] = useState(false)
    const { cartCount, cartTotal, setCartOpen } = useCart()
    const abortRef = useRef(null)
    const prevCartCount = useRef(cartCount)
    const location = useLocation()
    const navigate = useNavigate()
    const [toastMessage, setToastMessage] = useState('')

    // Check for cancel message from redirect
    useEffect(() => {
        if (location.state?.cancelMessage) {
            setToastMessage(location.state.cancelMessage)
            // Clear the location state so it doesn't reappear on reload
            navigate(location.pathname, { replace: true, state: {} })
        }
    }, [location.state?.cancelMessage, navigate, location.pathname])

    // Manage auto-hide timer for toast
    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => {
                setToastMessage('')
            }, 10000)
            return () => clearTimeout(timer)
        }
    }, [toastMessage])

    // Wiggle FAB on new cart item
    useEffect(() => {
        if (cartCount > prevCartCount.current) {
            setFabWiggle(true)
            setTimeout(() => setFabWiggle(false), 600)
        }
        prevCartCount.current = cartCount
    }, [cartCount])

    useEffect(() => {
        const controller = new AbortController()
        abortRef.current = controller
        setLoading(true)
        getProducts(controller.signal)
            .then(data => {
                if (!controller.signal.aborted) {
                    setProducts(Array.isArray(data) ? data : [])
                    setLoading(false)
                }
            })
            .catch(err => {
                if (!controller.signal.aborted) {
                    setError(err.message || 'Could not load products')
                    setLoading(false)
                }
            })
        return () => controller.abort()
    }, [])

    const categories = useMemo(() => {
        const cats = [...new Set(products.map(p => p.category).filter(Boolean))]
        return ['All', ...cats]
    }, [products])

    const grouped = useMemo(() => {
        const groups = {}
        products.forEach(p => {
            const key = p.base_name || p.name
            if (!groups[key]) groups[key] = { ...p, variants: [] }
            groups[key].variants.push(p)
            groups[key].variants.sort((a, b) => a.price - b.price)
        })
        return Object.values(groups)
    }, [products])

    const filtered = useMemo(() => {
        let result = grouped;
        if (activeCategory !== 'All') {
            result = result.filter(g => g.category === activeCategory);
        }
        if (searchQuery && searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(g =>
                (g.name && g.name.toLowerCase().includes(lowerQuery)) ||
                (g.base_name && g.base_name.toLowerCase().includes(lowerQuery)) ||
                (g.description && g.description.toLowerCase().includes(lowerQuery))
            );
        }
        return result;
    }, [grouped, activeCategory, searchQuery])

    return (
        <div className="catalog-page">
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: -20, x: '-50%' }}
                        transition={{ duration: 0.3 }}
                        style={{
                            position: 'fixed',
                            top: '80px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 1000,
                            background: toastMessage.includes('blocked') ? 'rgba(239, 68, 68, 0.95)' : 'rgba(245, 158, 11, 0.95)',
                            color: 'white',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                            fontSize: '14px',
                            fontWeight: 600,
                            textAlign: 'center',
                            minWidth: '280px',
                            maxWidth: '90%'
                        }}
                    >
                        {toastMessage}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Category chips */}
            <div className="category-scroll-wrapper">
                <div className="category-bar">
                    {categories.map(cat => (
                        <motion.button
                            key={cat}
                            className={`chip ${activeCategory === cat ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat)}
                            whileTap={{ scale: 0.92 }}
                        >
                            {cat === 'All' ? '✨ All' : `${CATEGORY_EMOJI[cat] || ''} ${cat}`}
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="loading-state">
                    <div className="spinner" />
                    <p>Loading products…</p>
                </div>
            )}

            {error && !loading && (
                <div className="empty-state">
                    <div className="emoji">⚠️</div>
                    <h3>Couldn't load products</h3>
                    <p>{error}</p>
                </div>
            )}

            {!loading && !error && filtered.length === 0 && (
                <div className="empty-state">
                    <div className="emoji">🌾</div>
                    <h3>No products found</h3>
                    <p>Try a different category.</p>
                </div>
            )}

            {/* Product grid */}
            {!loading && !error && filtered.length > 0 && (
                <AnimatePresence>
                    <div className="product-grid">
                        {filtered.map((group, i) => (
                            <motion.div
                                key={group.base_name || group.name}
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.32, delay: Math.min(i * 0.045, 0.5) }}
                            >
                                <ProductCard
                                    product={group}
                                    onClick={() => setSelectedGroup(group)}
                                />
                            </motion.div>
                        ))}
                    </div>
                </AnimatePresence>
            )}

            {/* Variant modal */}
            <ProductVariantModal
                group={selectedGroup}
                onClose={() => setSelectedGroup(null)}
            />

            {/* Sticky Cart Bar */}
            {cartCount > 0 && (
                <div className="sticky-cart-bar" onClick={() => setCartOpen(true)}>
                    <div className="sticky-cart-info">
                        <span className="sticky-cart-title">View Cart</span>
                        <span className="sticky-cart-subtitle">{cartCount} {cartCount === 1 ? 'item' : 'items'}</span>
                    </div>
                    <div className="sticky-cart-total">₹{cartTotal.toFixed(0)}</div>
                </div>
            )}


        </div>
    )
}
