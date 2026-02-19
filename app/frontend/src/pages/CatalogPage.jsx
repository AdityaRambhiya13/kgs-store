import { useState, useEffect, useMemo } from 'react'
import Navbar from '../components/Navbar'
import ProductCard from '../components/ProductCard'
import { getProducts } from '../api'
import { motion } from 'framer-motion'

const CATEGORIES = ['All']

export default function CatalogPage() {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [search, setSearch] = useState('')
    const [activeCategory, setActiveCategory] = useState('All')

    useEffect(() => {
        getProducts()
            .then(data => { setProducts(data); setLoading(false) })
            .catch(err => { setError(err.message); setLoading(false) })
    }, [])

    const categories = useMemo(() => {
        const cats = [...new Set(products.map(p => p.category).filter(Boolean))]
        return ['All', ...cats]
    }, [products])

    const filtered = useMemo(() => {
        return products.filter(p => {
            const matchSearch = !search ||
                p.name.toLowerCase().includes(search.toLowerCase()) ||
                (p.category || '').toLowerCase().includes(search.toLowerCase())
            const matchCat = activeCategory === 'All' || p.category === activeCategory
            return matchSearch && matchCat
        })
    }, [products, search, activeCategory])

    return (
        <div>
            <Navbar searchQuery={search} onSearchChange={setSearch} />

            {/* Hero */}
            <div className="hero">
                <div className="hero-content">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        🏪 Quick Shop
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                    >
                        No Wait — Just Shop!
                    </motion.p>
                    <motion.p
                        className="hero-sub"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                    >
                        Browse • Add to Cart • Get Your Token • Pick Up!
                    </motion.p>
                </div>
            </div>

            {/* Catalog */}
            <div className="container catalog-section" style={{ paddingTop: 20 }}>
                {/* Category chips */}
                {!loading && categories.length > 1 && (
                    <div className="category-bar">
                        {categories.map(cat => (
                            <motion.button
                                key={cat}
                                className={`chip ${activeCategory === cat ? 'active' : ''}`}
                                onClick={() => setActiveCategory(cat)}
                                whileTap={{ scale: 0.94 }}
                            >{cat}</motion.button>
                        ))}
                    </div>
                )}

                {/* Section header */}
                <div className="section-header">
                    <span className="section-title">
                        {loading ? 'Loading...' : `🛍️ Products (${filtered.length})`}
                    </span>
                </div>

                {/* Error */}
                {error && (
                    <div className="empty-state">
                        <div className="emoji">😕</div>
                        <h3>Could not load products</h3>
                        <p>{error}</p>
                        <p style={{ marginTop: 8, fontSize: 13 }}>Make sure the API server is running on port 8000</p>
                    </div>
                )}

                {/* Skeletons */}
                {loading && (
                    <div className="product-grid">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="skeleton skeleton-card" />
                        ))}
                    </div>
                )}

                {/* Empty search */}
                {!loading && !error && filtered.length === 0 && (
                    <div className="empty-state">
                        <div className="emoji">🔍</div>
                        <h3>No products found</h3>
                        <p>Try a different search term or category.</p>
                    </div>
                )}

                {/* Product Grid */}
                {!loading && !error && filtered.length > 0 && (
                    <div className="product-grid">
                        {filtered.map((p, i) => (
                            <motion.div
                                key={p.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03, duration: 0.3 }}
                            >
                                <ProductCard product={p} />
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
