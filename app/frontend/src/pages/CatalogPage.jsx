import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import ProductVariantModal from '../components/ProductVariantModal'
import { useCart } from '../CartContext'
import { getProducts } from '../api'

const CATEGORY_EMOJI = { Rice: '🍚', Wheat: '🌾', Jowari: '🌽', Bajri: '🫘', 'Daals & Pulses': '🫘' }


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

        // If searching, ignore category clamping and show all matches
        if (searchQuery && searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase();
            return result.filter(g =>
                (g.name && g.name.toLowerCase().includes(lowerQuery)) ||
                (g.base_name && g.base_name.toLowerCase().includes(lowerQuery)) ||
                (g.description && g.description.toLowerCase().includes(lowerQuery))
            );
        }

        if (activeCategory !== 'All') {
            result = result.filter(g => g.category === activeCategory);
            // Don't clamp when a specific category is selected
            return [{ category: activeCategory, items: result }];
        }

        // When "All" is active, group items by category and clamp to 4
        const categoriesMap = {};
        result.forEach(g => {
            const cat = g.category || 'Other';
            if (!categoriesMap[cat]) categoriesMap[cat] = [];
            categoriesMap[cat].push(g);
        });

        const clampedGroups = [];
        for (const cat of categories) {
            if (cat === 'All' || !categoriesMap[cat]) continue;
            clampedGroups.push({
                category: cat,
                items: categoriesMap[cat],       // full list
                clamped: categoriesMap[cat].slice(0, 4) // clamped to 4
            });
        }

        return clampedGroups;
    }, [grouped, activeCategory, searchQuery, categories])

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

            {/* Catalog Layout */}
            <div className="catalog-wrapper">
                {/* Fixed Left Sidebar */}
                <aside className="category-sidebar">
                    <div className="sidebar-list">
                        {categories.map(cat => (
                            <div
                                key={cat}
                                className={`sidebar-item ${activeCategory === cat ? 'active' : ''}`}
                                onClick={() => setActiveCategory(cat)}
                            >
                                <div className="sidebar-emoji">{cat === 'All' ? '✨' : CATEGORY_EMOJI[cat] || '📦'}</div>
                                {cat}
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="main-content">

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

                    {/* Product grid with category headers */}
                    {!loading && !error && filtered.length > 0 && (
                        <div className="product-sections">
                            {filtered.map((groupObj, groupIndex) => {
                                // Check if we are in 'search' mode which returns a flat array instead of category objects
                                const isSearchMode = searchQuery && searchQuery.trim();

                                // Handle flat array structure from search
                                if (isSearchMode) {
                                    return (
                                        <AnimatePresence key={`search-${groupIndex}`}>
                                            <div className="product-grid" style={{ marginTop: '16px' }}>
                                                <motion.div
                                                    key={groupObj.base_name || groupObj.name}
                                                    initial={{ opacity: 0, y: 24 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.32, delay: Math.min(groupIndex * 0.045, 0.5) }}
                                                >
                                                    <ProductCard
                                                        product={groupObj}
                                                        onClick={() => setSelectedGroup(groupObj)}
                                                    />
                                                </motion.div>
                                            </div>
                                        </AnimatePresence>
                                    )
                                }

                                // Normal category grouped rendering
                                const hasMore = groupObj.items.length > 4;
                                const displayItems = activeCategory === 'All' ? groupObj.clamped : groupObj.items;

                                return (
                                    <div key={groupObj.category} className="category-section" style={{ marginBottom: '40px' }}>

                                        {/* Category Header */}
                                        {activeCategory === 'All' && (
                                            <div className="section-header">
                                                <h2 className="section-title">
                                                    {CATEGORY_EMOJI[groupObj.category] || ''} {groupObj.category}
                                                </h2>
                                                {hasMore && (
                                                    <button
                                                        onClick={() => setActiveCategory(groupObj.category)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: 'var(--primary)',
                                                            fontWeight: '700',
                                                            fontSize: '15px',
                                                            cursor: 'pointer',
                                                            padding: '4px 8px'
                                                        }}
                                                    >
                                                        See All
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Items Grid */}
                                        <AnimatePresence>
                                            <div className="product-grid">
                                                {displayItems.map((item, i) => (
                                                    <motion.div
                                                        key={item.base_name || item.name}
                                                        initial={{ opacity: 0, y: 24 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 0.32, delay: Math.min(i * 0.045, 0.5) }}
                                                    >
                                                        <ProductCard
                                                            product={item}
                                                            onClick={() => setSelectedGroup(item)}
                                                        />
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </AnimatePresence>

                                        {/* Bottom See All Button for Clamped Groups */}
                                        {activeCategory === 'All' && hasMore && (
                                            <div style={{ textAlign: 'center', marginTop: '16px' }}>
                                                <button
                                                    className="btn btn-outline"
                                                    onClick={() => setActiveCategory(groupObj.category)}
                                                    style={{ width: '100%', maxWidth: '300px', padding: '12px' }}
                                                >
                                                    View all {groupObj.items.length} options
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </main>
            </div>

            {/* Variant modal */}
            <ProductVariantModal
                group={selectedGroup}
                onClose={() => setSelectedGroup(null)}
            />

            {/* Sticky Cart Bar */}
            {cartCount > 0 && (
                <div className="sticky-cart-bar" onClick={() => setCartOpen(true)}>
                    <div className="sticky-cart-info" style={{ color: '#fff', fontSize: '15px', fontWeight: '600' }}>
                        🛒 {cartCount} {cartCount === 1 ? 'item' : 'items'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                        <span style={{ fontWeight: '800', fontSize: '18px' }}>₹{cartTotal.toFixed(0)}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700', fontSize: '15px' }}>
                            View Cart <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </div>
                    </div>
                </div>
            )}


        </div>
    )
}
