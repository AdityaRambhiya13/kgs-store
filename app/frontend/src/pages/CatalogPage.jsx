import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import HeroBanner from '../components/HeroBanner'
import RecommendationsSection from '../components/RecommendationsSection'
import { useCart } from '../CartContext'
import { useAuth } from '../AuthContext'
import { getProducts } from '../api'
import ProductDetailsModal from '../components/ProductDetailsModal'

// ── Zepto category definitions ──────────────────────────────────
const CATEGORY_CONFIG = [
  { name: 'Atta, Rice & Dal',           emoji: '🌾', color: '#f59e0b' },
  { name: 'Masala & Dry Fruits',        emoji: '🌶️', color: '#ef4444' },
  { name: 'Snacks & Munchies',          emoji: '🍿', color: '#8b5cf6' },
  { name: 'Sweet Tooth',                emoji: '🍭', color: '#ec4899' },
  { name: 'Cleaning Essentials',        emoji: '🧼', color: '#06b6d4' },
  { name: 'Instant & Frozen Food',      emoji: '🍜', color: '#f97316' },
  { name: 'Dairy & Bread',              emoji: '🥛', color: '#3b82f6' },
  { name: 'Personal Care',              emoji: '💄', color: '#d946ef' },
  { name: 'Cold Drinks & Juices',       emoji: '🥤', color: '#22c55e' },
  { name: 'Wellness',                   emoji: '💊', color: '#14b8a6' },
  { name: 'Tea, Coffee & Health Drinks',emoji: '☕', color: '#92400e' },
  { name: 'Home & Lifestyle',           emoji: '🏠', color: '#0ea5e9' },
  { name: 'Pooja Needs',                emoji: '🪔', color: '#eab308' },
  { name: 'Miscellaneous',              emoji: '📦', color: '#64748b' },
]

const CATEGORY_MAP = Object.fromEntries(CATEGORY_CONFIG.map(c => [c.name, c]))

// ── Blocked categories ───────────────────────────────────────────
const BLOCKED_CATEGORIES = new Set([
  'Pet Supplies', 'Books & Media', 'Stationery', 'Packaging & Carry Bags'
])

// ── Hybrid Search Helper ────────────────────────────────────────
const fuzzyMatch = (query, text) => {
  if (!query) return true
  if (!text) return false
  
  const q = String(query).toLowerCase().trim()
  const t = String(text).toLowerCase().trim()
  
  // 1. Exact substring match (Highest precision)
  if (t.includes(q)) return true
  
  // 2. Word-start match (High precision: e.g. "mag" matches "Maggi")
  const words = t.split(/\s+/)
  const queryWords = q.split(/\s+/)
  
  // If query is multiple words, check if they all exist in text
  if (queryWords.length > 1) {
    return queryWords.every(qw => words.some(w => w.startsWith(qw) || w.includes(qw)))
  }
  
  // Single word query: check if any word starts with query
  if (words.some(w => w.startsWith(q))) return true
  
  // 3. Typo tolerance (Only for queries >= 3 chars, and with strict rules)
  if (q.length < 3) return false // No fuzzy for tiny queries
  
  // Allow 1 char omission/typo ONLY if it's a long enough word
  // This prevents "maggi" matching "mataki" because "magi" vs "mataki" is too different
  const qNoSpaces = q.replace(/\s+/g, '')
  const tNoSpaces = t.replace(/\s+/g, '')
  
  for (let i = 0; i < qNoSpaces.length; i++) {
    const sub = qNoSpaces.slice(0, i) + qNoSpaces.slice(i + 1)
    if (tNoSpaces.includes(sub)) return true
  }

  return false
}

export default function CatalogPage({ searchQuery = '', onSearchFocus, navCategory }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeSubCategory, setActiveSubCategory] = useState('All')
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [selectedProductDetails, setSelectedProductDetails] = useState(null)
  const [filterDrawerSection, setFilterDrawerSection] = useState(null)
  const { cartCount } = useCart()
  const { user } = useAuth()
  const [productLimit, setProductLimit] = useState(40)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setProductLimit(40) // Reset limit on search
    }, 200) // Faster response
    return () => clearTimeout(timer)
  }, [searchQuery])

  const abortRef = useRef(null)
  const prevCartCount = useRef(cartCount)
  const location = useLocation()
  const navigate = useNavigate()
  const [toastMessage, setToastMessage] = useState('')
  const categoryBarRef = useRef(null)

  // React to navCategory from Navbar dropdown
  useEffect(() => {
    if (navCategory) {
      setActiveCategory(navCategory)
      setActiveSubCategory('All')
    }
  }, [navCategory])

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

  // All unique top-level categories that have products
  const availableCategories = useMemo(() => {
    const set = new Set()
    products.forEach(p => {
      if (!p.category) return
      const cat = p.category.trim()
      if (!BLOCKED_CATEGORIES.has(cat)) set.add(cat)
    })
    
    // Robust matching: handle potential name changes (e.g. Dairy, Bread & Eggs -> Dairy & Bread)
    return CATEGORY_CONFIG.filter(c => {
      if (set.has(c.name)) return true
      // Fallbacks for common renames
      if (c.name === 'Dairy & Bread' && set.has('Dairy, Bread & Eggs')) return true
      if (c.name === 'Wellness' && set.has('Pharma & Wellness')) return true
      if (c.name === 'Wellness' && set.has('& Wellness')) return true
      return false
    })
  }, [products])

  // Sub-categories for the active category
  const subCategories = useMemo(() => {
    if (activeCategory === 'All') return []
    const subs = new Set()
    products.forEach(p => {
      if (p.category === activeCategory && p.sub_category) subs.add(p.sub_category)
    })
    return ['All', ...Array.from(subs).sort()]
  }, [products, activeCategory])

  // Grouped products (base_name collapsing)
  const grouped = useMemo(() => {
    const groups = {}
    products.forEach(p => {
      if (!p.category || BLOCKED_CATEGORIES.has(p.category)) return
      
      // Standardize category name for grouping
      let cat = p.category
      if (cat === 'Dairy, Bread & Eggs') cat = 'Dairy & Bread'
      if (cat === 'Pharma & Wellness' || cat === '& Wellness') cat = 'Wellness'

      const key = (p.base_name || p.name) + '|' + cat
      if (!groups[key]) {
        groups[key] = { ...p, category: cat, variants: [] }
      }
      groups[key].variants.push(p)
      groups[key].variants.sort((a, b) => a.price - b.price)
    })
    
    // Ensure all variants in a group share the group's main image
    return Object.values(groups).map(group => {
      const mainImage = group.image_url
      group.variants = group.variants.map(v => ({
        ...v,
        image_url: mainImage // Force same image for all variants as requested
      }))
      return group
    })
  }, [products])

  // Filtered products by search / category / sub-category
  const filtered = useMemo(() => {
    if (!products || !Array.isArray(products)) return []

    // Search mode: show all individual matching products but keep variant groups for modal
    if (debouncedSearch && typeof debouncedSearch === 'string' && debouncedSearch.trim()) {
      const lq = debouncedSearch.toLowerCase().trim()
      
      // Map for easy group lookup to get variants
      const groupMap = {}
      if (Array.isArray(grouped)) {
        grouped.forEach(g => {
          if (!g) return
          const key = (g.base_name || g.name || 'unknown') + '|' + (g.category || 'Other')
          groupMap[key] = g
        })
      }

      return products
        .filter(p => {
          if (!p) return false
          if (!p.category || BLOCKED_CATEGORIES.has(p.category)) return false
          const nameMatch = p.name ? fuzzyMatch(lq, p.name) : false
          const baseMatch = p.base_name ? fuzzyMatch(lq, p.base_name) : false
          return nameMatch || baseMatch
        })
        .map(p => {
          // Standardize category name for matching group key
          let cat = p.category || 'Other'
          if (cat === 'Dairy, Bread & Eggs') cat = 'Dairy & Bread'
          if (cat === 'Pharma & Wellness' || cat === '& Wellness') cat = 'Wellness'
          
          const key = (p.base_name || p.name || 'unknown') + '|' + cat
          const group = groupMap[key]
          // Title Standardization with cleaning
          let base = p.base_name || p.name
          let unit = p.unit || ''
          
          // Clean redundant unit mentions (e.g. "Gulab Oil 1L" + "1L" -> "Gulab Oil 1L")
          if (unit && base.toLowerCase().endsWith(unit.toLowerCase().trim())) {
            unit = ''
          }
          // Handle common overlaps like "1Lit" vs "1L"
          if (unit && unit.toLowerCase() === '1l' && base.toLowerCase().endsWith('1lit')) {
            unit = ''
          }

          return {
            ...p,
            displayName: unit ? `${base} ${unit}` : base,
            displayPrice: p.price || 0,
            category: cat,
            variants: (group && group.variants) ? group.variants : [p]
          }
        })
        .sort((a, b) => {
          const aName = String(a.name || a.displayName || '').toLowerCase()
          const bName = String(b.name || b.displayName || '').toLowerCase()
          const aStarts = aName.startsWith(lq)
          const bStarts = bName.startsWith(lq)
          if (aStarts && !bStarts) return -1
          if (!aStarts && bStarts) return 1
          return 0
        })
    }

    let result = Array.isArray(grouped) ? [...grouped] : []

    // Category filter
    if (activeCategory !== 'All') {
      result = result.filter(g => g && g.category === activeCategory)
      // Sub-category filter
      if (activeSubCategory !== 'All') {
        result = result.filter(g => g && g.sub_category === activeSubCategory)
      }
    }

    return result
  }, [grouped, products, activeCategory, activeSubCategory, debouncedSearch])

  // When "All" selected, group for section display
  const sectionedData = useMemo(() => {
    if (activeCategory !== 'All' || (debouncedSearch && debouncedSearch.trim())) return null
    const catMap = {}
    filtered.forEach(g => {
      const cat = g.category || 'Other'
      if (!catMap[cat]) catMap[cat] = []
      catMap[cat].push(g)
    })
    return availableCategories
      .filter(c => catMap[c.name] && catMap[c.name].length > 0)
      .map(c => ({ ...c, items: catMap[c.name] }))
  }, [filtered, activeCategory, searchQuery, availableCategories])


  const isSearchMode = !!(debouncedSearch && debouncedSearch.trim())

  // ── Dynamic Metadata ──────────────────────────────────────────
  useEffect(() => {
    let title = 'Ketan Stores — Fresh Groceries in Dombivali'
    let desc = 'Get fresh groceries, snacks, and essentials delivered fast in Dombivali from Ketan Stores.'
    
    if (isSearchMode) {
      title = `Search: ${debouncedSearch} | Ketan Stores`
    } else if (activeCategory !== 'All') {
      title = `${activeCategory} | Best Prices in Dombivali`
      desc = `Save big on ${activeCategory} at Ketan Stores. Quality products, fast delivery in Dombivali.`
    }

    document.title = title
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) metaDesc.setAttribute('content', desc)
  }, [activeCategory, debouncedSearch, isSearchMode])

  const handleCategorySelect = (catName) => {
    setActiveCategory(catName)
    setActiveSubCategory('All')
    setProductLimit(40) // Reset limit on category change
    
    // Scroll to top of content
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
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
              background: toastMessage.includes('blocked') ? 'rgba(239,68,68,0.95)' : 'rgba(245,158,11,0.95)',
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

      {/* ── Recommendations / Trending Section ── */}
      {!isSearchMode && <RecommendationsSection />}

      {/* ── Zepto Category Icon Grid ─────────────────────── */}
      {!isSearchMode && (
        <section className="zepto-cat-grid-section">
          <div className="zepto-cat-grid">
            <div
              className={`zepto-cat-tile ${activeCategory === 'All' ? 'active' : ''}`}
              onClick={() => handleCategorySelect('All')}
            >
              <div className="zepto-cat-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>✨</div>
              <span>All</span>
            </div>
            {availableCategories.map(cat => (
              <div
                key={cat.name}
                className={`zepto-cat-tile ${activeCategory === cat.name ? 'active' : ''}`}
                onClick={() => handleCategorySelect(cat.name)}
              >
                <div
                  className="zepto-cat-icon"
                  style={{ background: `linear-gradient(135deg, ${cat.color}cc, ${cat.color})` }}
                >
                  {cat.emoji}
                </div>
                <span>{cat.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Horizontal Category Pill Bar (sticky, shows when category selected) ── */}
      {!isSearchMode && activeCategory !== 'All' && (
        <div className="zepto-sticky-cat-bar" ref={categoryBarRef}>
          <div className="zepto-cat-pills-wrap">
            {availableCategories.map(cat => (
              <button
                key={cat.name}
                className={`zepto-cat-pill ${activeCategory === cat.name ? 'active' : ''}`}
                onClick={() => handleCategorySelect(cat.name)}
                style={activeCategory === cat.name ? { borderColor: cat.color, color: cat.color } : {}}
              >
                <span>{cat.emoji}</span> {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Sub-category filter bar ──────────────────────── */}
      {!isSearchMode && activeCategory !== 'All' && subCategories.length > 1 && (
        <div className="zepto-subcat-bar">
          <div className="zepto-subcat-pills">
            {subCategories.map(sub => (
              <button
                key={sub}
                className={`zepto-subcat-pill ${activeSubCategory === sub ? 'active' : ''}`}
                onClick={() => setActiveSubCategory(sub)}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────── */}
      <div className="catalog-main-content">

        {/* Loading Skeletons */}
        {loading && (
          <div className="product-grid product-grid-multi" style={{ marginTop: 16, padding: '0 16px' }}>
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

        {/* Search Mode: flat grid */}
        {!loading && !error && isSearchMode && filtered.length > 0 && (
          <div style={{ padding: '0 16px', marginTop: '8px' }}>
            <p className="search-results-label">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &quot;{debouncedSearch}&quot;
              {searchQuery !== debouncedSearch && <span style={{ marginLeft: '8px', opacity: 0.5, fontSize: '0.8em' }}>(updating...)</span>}
            </p>
            <div className="product-grid product-grid-multi">
              {filtered.slice(0, productLimit).map(g => (
                <div key={g.id + (g.displayName || g.name)}>
                  <ProductCard
                    product={g}
                    onDetailClick={(prod, mrp) => setSelectedProductDetails({ product: prod, mrp })}
                    onVariantClick={(prod, mrp) => setSelectedProductDetails({ product: prod, mrp })}
                  />
                </div>
              ))}
            </div>
            {filtered.length > productLimit && (
              <div style={{ textAlign: 'center', marginTop: '24px', paddingBottom: '40px' }}>
                <button
                  className="btn btn-outline"
                  onClick={() => setProductLimit(prev => prev + 40)}
                  style={{ maxWidth: '300px', width: '100%' }}
                >
                  Load More Results ({filtered.length - productLimit} left)
                </button>
              </div>
            )}
          </div>
        )}

        {/* All-categories section view (not searching, showing All) */}
        {!loading && !error && !isSearchMode && activeCategory === 'All' && sectionedData && (
          <div className="product-sections" style={{ padding: '0 16px' }}>
            {sectionedData.map(section => {
              const preview = section.items.slice(0, 6)
              const hasMore = section.items.length > 6
              return (
                <div key={section.name} className="category-section">
                  <div className="section-header">
                    <h2 className="section-title" style={{ color: section.color }}>
                      {section.emoji} {section.name}
                    </h2>
                    {hasMore && (
                      <button
                        onClick={() => handleCategorySelect(section.name)}
                        className="see-all-btn"
                      >
                        See All →
                      </button>
                    )}
                  </div>
                  <div className="product-grid zepto-product-scroll">
                    {preview.map(item => (
                      <div key={(item.base_name || item.name) + item.category}>
                        <ProductCard
                          product={item}
                          onDetailClick={(prod, mrp) => setSelectedProductDetails({ product: prod, mrp })}
                          onVariantClick={(prod, mrp) => setSelectedProductDetails({ product: prod, mrp })}
                        />
                      </div>
                    ))}
                  </div>
                  {hasMore && (
                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                      <button
                        className="btn btn-outline"
                        onClick={() => setFilterDrawerSection(section)}
                        style={{ maxWidth: '300px', padding: '12px 24px', width: '100%', borderRadius: '12px' }}
                      >
                        View {section.items.length - preview.length} more in {section.name}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Filter Drawer (Task: "See All" Logic) ────────────────── */}
        <AnimatePresence>
          {filterDrawerSection && (
            <motion.div 
              className="drawer-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFilterDrawerSection(null)}
            >
              <motion.div 
                className="bottom-drawer"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={e => e.stopPropagation()}
              >
                <div className="drawer-handle" />
                <div className="drawer-header">
                  <div className="drawer-header-left">
                    <span className="drawer-emoji">{filterDrawerSection.emoji}</span>
                    <h3>{filterDrawerSection.name}</h3>
                  </div>
                  <button className="drawer-close" onClick={() => setFilterDrawerSection(null)}>✕</button>
                </div>
                <div className="drawer-content">
                  <p className="drawer-label">Quick Filter</p>
                  <div className="drawer-grid">
                    <button 
                      className="drawer-tile active-all" 
                      onClick={() => { handleCategorySelect(filterDrawerSection.name); setFilterDrawerSection(null); }}
                    >
                      <div className="drawer-tile-icon">✨</div>
                      <span>View All</span>
                    </button>
                    {[...new Set(filterDrawerSection.items.filter(i => i.sub_category).map(i => i.sub_category))].sort().map(sub => (
                      <button 
                        key={sub}
                        className="drawer-tile"
                        onClick={() => { 
                          handleCategorySelect(filterDrawerSection.name); 
                          setActiveSubCategory(sub);
                          setFilterDrawerSection(null);
                        }}
                      >
                        <div className="drawer-tile-icon">🎯</div>
                        <span>{sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Single category selected — full grid */}
        {!loading && !error && !isSearchMode && activeCategory !== 'All' && filtered.length > 0 && (
          <div style={{ padding: '0 16px', marginTop: '8px' }}>
            <div className="section-header" style={{ marginBottom: '16px' }}>
              <h2 className="section-title" style={{ color: CATEGORY_MAP[activeCategory]?.color }}>
                {CATEGORY_MAP[activeCategory]?.emoji} {activeCategory}
                {activeSubCategory !== 'All' && <span style={{ fontSize: '0.8em', marginLeft: '8px', opacity: 0.7 }}>› {activeSubCategory}</span>}
              </h2>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{filtered.length} items</span>
            </div>
            <div className="product-grid product-grid-multi">
              {filtered.slice(0, productLimit).map(g => (
                <div key={(g.base_name || g.name) + g.category}>
                  <ProductCard
                    product={g}
                    onDetailClick={(prod, mrp) => setSelectedProductDetails({ product: prod, mrp })}
                    onVariantClick={(prod, mrp) => setSelectedProductDetails({ product: prod, mrp })}
                  />
                </div>
              ))}
            </div>
            {filtered.length > productLimit && (
              <div style={{ textAlign: 'center', marginTop: '16px', paddingBottom: '24px', gridColumn: '1 / -1' }}>
                <button
                  className="btn btn-outline"
                  onClick={() => setProductLimit(prev => prev + 40)}
                  style={{ maxWidth: '320px', width: '100%', borderRadius: '12px' }}
                >
                  Load More in {activeCategory} ({filtered.length - productLimit} left)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Variant modal - Removed in favor of unified ProductDetailsModal */}
      {/* <ProductVariantModal
        group={selectedGroup}
        onClose={() => setSelectedGroup(null)}
      /> */}

      {/* Product Details Modal */}
      <AnimatePresence>
        {selectedProductDetails && (
          <ProductDetailsModal
            product={selectedProductDetails.product}
            mrp={selectedProductDetails.mrp}
            onClose={() => setSelectedProductDetails(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
