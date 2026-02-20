import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
    const { cartCount, setCartOpen } = useCart()
    const abortRef = useRef(null)
    const prevCartCount = useRef(cartCount)

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


            {/* Category chips */}
            <div className="category-scroll">
                {categories.map(cat => (
                    <motion.button
                        key={cat}
                        className={`category-chip ${activeCategory === cat ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat)}
                        whileTap={{ scale: 0.92 }}
                    >
                        {cat === 'All' ? '✨ All' : `${CATEGORY_EMOJI[cat] || ''} ${cat}`}
                    </motion.button>
                ))}
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


        </div>
    )
}
