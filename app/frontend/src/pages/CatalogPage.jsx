import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import ProductVariantModal from '../components/ProductVariantModal'
import HeroBanner from '../components/HeroBanner'
import CategoryGrid from '../components/CategoryGrid'
import SmartSections from '../components/SmartSections'
import { useCart } from '../CartContext'
import { getProducts } from '../api'

const CATEGORY_MAP = {
  // Grains & Staples
  'Rice': 'Grains & Staples',
  'Wheat': 'Grains & Staples',
  'Jowari': 'Grains & Staples',
  'Bajri': 'Grains & Staples',
  'Daals & Pulses': 'Grains & Staples',
  'Atta, Rice & Dal': 'Grains & Staples',
  // Dairy & Eggs
  'Dairy': 'Dairy & Eggs',
  'Dairy & Bread': 'Dairy & Eggs',
  'Eggs': 'Dairy & Eggs',
  // Snacks & Sweets
  'Snacks': 'Snacks & Sweets',
  'Munchies': 'Snacks & Sweets',
  'Sweets & Biscuits': 'Snacks & Sweets',
  'Bakery': 'Snacks & Sweets',
  // Beverages
  'Beverages': 'Beverages',
  'Soft Drinks': 'Beverages',
  'Tea, Coffee & More': 'Beverages',
  // Essentials & Spices
  'Spices': 'Essentials & Spices',
  'Salt, Sugar & Oil': 'Essentials & Spices',
  'Masalas & Spices': 'Essentials & Spices',
  'Cooking Essentials': 'Essentials & Spices',
  // Home & Hygiene
  'Cleaning Essentials': 'Home & Hygiene',
  'Personal Care': 'Home & Hygiene',
  'Bath & Body': 'Home & Hygiene',
  'Laundry': 'Home & Hygiene',
  // Instant Foods
  'Instant Food': 'Instant Foods',
  'Ready to Eat': 'Instant Foods',
  'Noodles & Pasta': 'Instant Foods',
}

const CATEGORY_EMOJI = {
  'Grains & Staples': '🌾',
  'Dairy & Eggs': '🥛',
  'Snacks & Sweets': '🍿',
  'Beverages': '🥤',
  'Essentials & Spices': '🌶️',
  'Home & Hygiene': '🧼',
  'Instant Foods': '🍜',
  'Fruits & Vegetables': '🥦',
  'Meat & Seafood': '🥩',
  'All': '✨'
}

const BLOCKED_CATEGORIES = ['Pet Supplies', 'Books & Media', 'Packaging & Carry Bags', 'Stationery']

export default function CatalogPage({ searchQuery = '' }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [fabWiggle, setFabWiggle] = useState(false)
  const { cartCount, cartTotal, cartOpen, setCartOpen } = useCart()
  const { user } = useAuth()
  const abortRef = useRef(null)
  const prevCartCount = useRef(cartCount)
  const location = useLocation()
  const navigate = useNavigate()
  const [toastMessage, setToastMessage] = useState('')

  useEffect(() => {
    if (location.state?.cancelMessage) {
      setToastMessage(location.state.cancelMessage)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state?.cancelMessage, navigate, location.pathname])

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 10000)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

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
    const rawCats = [...new Set(products.map(p => {
        const mapped = CATEGORY_MAP[p.category] || p.category
        return mapped
    }).filter(cat => cat && !BLOCKED_CATEGORIES.includes(cat)))]
    return ['All', ...rawCats.sort()]
  }, [products])

  const grouped = useMemo(() => {
    const groups = {}
    products.forEach(p => {
      const cat = CATEGORY_MAP[p.category] || p.category
      if (BLOCKED_CATEGORIES.includes(cat)) return

      const key = p.base_name || p.name
      if (!groups[key]) groups[key] = { ...p, category: cat, variants: [] }
      groups[key].variants.push(p)
      groups[key].variants.sort((a, b) => a.price - b.price)
    })
    return Object.values(groups)
  }, [products])

  const filtered = useMemo(() => {
    let result = grouped

    if (searchQuery && searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase()
      return result.filter(g =>
        (g.name && g.name.toLowerCase().includes(lowerQuery)) ||
        (g.base_name && g.base_name.toLowerCase().includes(lowerQuery)) ||
        (g.description && g.description.toLowerCase().includes(lowerQuery))
      )
    }

    if (activeCategory !== 'All') {
      result = result.filter(g => g.category === activeCategory)
      return [{ category: activeCategory, items: result }]
    }

    const categoriesMap = {}
    result.forEach(g => {
      const cat = g.category || 'Other'
      if (!categoriesMap[cat]) categoriesMap[cat] = []
      categoriesMap[cat].push(g)
    })

    const clampedGroups = []
    for (const cat of categories) {
      if (cat === 'All' || !categoriesMap[cat]) continue
      clampedGroups.push({
        category: cat,
        items: categoriesMap[cat],
        clamped: categoriesMap[cat].slice(0, 4)
      })
    }

    return clampedGroups
  }, [grouped, activeCategory, searchQuery, categories])

  const isSearchMode = searchQuery && searchQuery.trim()

  const handleCategorySelect = (cat) => {
    setActiveCategory(cat)
    // Scroll to product section
    setTimeout(() => {
      document.querySelector('.catalog-wrapper')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  return (
    <div className="catalog-page">

      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed', top: '80px', left: '50%',
              transform: 'translateX(-50%)', zIndex: 1000,
              background: toastMessage.includes('blocked') ? 'rgba(239, 68, 68, 0.95)' : 'rgba(245, 158, 11, 0.95)',
              color: 'white', padding: '12px 24px', borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)', fontSize: '14px',
              fontWeight: 600, textAlign: 'center', minWidth: '280px', maxWidth: '90%'
            }}
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Banner — only when not searching */}
      {!isSearchMode && <HeroBanner />}

      {/* Category Grid — only when not searching */}
      {!isSearchMode && (
        <CategoryGrid
          activeCategory={activeCategory}
          onSelect={handleCategorySelect}
        />
      )}

      {/* Smart Sections — only on "All" category, no search */}
      {!isSearchMode && activeCategory === 'All' && !loading && products.length > 0 && (
        <SmartSections
          products={grouped}
          onCardClick={setSelectedGroup}
          isLoggedIn={!!user}
        />
      )}

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
                <div className="sidebar-emoji">{CATEGORY_EMOJI[cat] || '📦'}</div>
                {cat}
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="main-content">

          {/* Loading Skeletons */}
          {loading && (
            <div className="product-grid product-grid-multi" style={{ marginTop: 16 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton-card">
                  <div className="skeleton skeleton-img" />
                  <div className="skeleton-body">
                    <div className="skeleton skeleton-line medium" />
                    <div className="skeleton skeleton-line short" />
                    <div className="skeleton skeleton-line medium" style={{ marginTop: 12 }} />
                  </div>
                </div>
              ))}
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
              <p>{searchQuery ? 'Try a different search term.' : 'Try a different category.'}</p>
            </div>
          )}

          {/* Product Sections */}
          {!loading && !error && filtered.length > 0 && (
            <div className="product-sections">
              {isSearchMode ? (
                /* Search results flat grid */
                <div style={{ marginTop: '16px' }}>
                  <p className="search-results-label">{filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{searchQuery}"</p>
                  <div className="product-grid product-grid-multi">
                    {filtered.map(groupObj => (
                      <div key={groupObj.base_name || groupObj.name}>
                        <ProductCard
                          product={groupObj}
                          onClick={() => setSelectedGroup({ ...groupObj, variants: groupObj.variants?.length ? groupObj.variants : [groupObj] })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                filtered.map((groupObj) => {
                  const hasMore = groupObj.items && groupObj.items.length > 4
                  const displayItems = activeCategory === 'All' ? groupObj.clamped : groupObj.items

                  return (
                    <div key={groupObj.category} className="category-section" style={{ marginBottom: '40px' }}>
                      {activeCategory === 'All' && (
                        <div className="section-header">
                          <h2 className="section-title">
                            {CATEGORY_EMOJI[groupObj.category] || '📦'} {groupObj.category}
                          </h2>
                          {hasMore && (
                            <button
                              onClick={() => setActiveCategory(groupObj.category)}
                              className="see-all-btn"
                            >
                              See All →
                            </button>
                          )}
                        </div>
                      )}

                      <div className={activeCategory !== 'All' ? 'product-grid product-grid-multi' : 'product-grid'}>
                        {displayItems.map(item => (
                          <div key={item.base_name || item.name}>
                            <ProductCard
                              product={item}
                              onClick={() => setSelectedGroup({ ...item, variants: item.variants?.length ? item.variants : [item] })}
                            />
                          </div>
                        ))}
                      </div>

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
                })
              )}
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
      {cartCount > 0 && !cartOpen && (
        <motion.div
          className="sticky-cart-bar"
          onClick={() => setCartOpen(true)}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 400 }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ fontSize: '13px', fontWeight: '800', opacity: 0.9 }}>
              {cartCount} item{cartCount > 1 ? 's' : ''}
            </div>
            <div style={{ fontWeight: '900', fontSize: '18px' }}>₹{cartTotal.toFixed(0)}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '16px' }}>
            View Cart
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </motion.div>
      )}
    </div>
  )
}
