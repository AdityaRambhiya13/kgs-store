import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../AuthContext'
import { useFavorites } from '../FavoritesContext'
import { useCart } from '../CartContext'
import { getRecommendations, getTrending } from '../api'
import ProductDetailsModal from './ProductDetailsModal'
import { getMRP } from '../utils/pricing'

function getRating(id) {
  const seed = (id * 7 + 13) % 10
  return (3.8 + seed * 0.12).toFixed(1)
}

function RecommendationCard({ product, onDetailClick }) {
  const { cartItems, addToCart } = useCart()
  const { isFavorite, toggleFavorite } = useFavorites()
  const variants = product.variants ?? [product]
  const minPrice = Math.min(...variants.map(v => v.price))
  const mrp = getMRP(minPrice, product.id || 1)
  const cartItem = cartItems.find(item => item.id === product.id)
  const qtyInCart = cartItem?.quantity || 0
  const fav = isFavorite(product.id)
  const rating = getRating(product.id || 1)

  return (
    <motion.div
      className="rec-card"
      onClick={() => onDetailClick(product, mrp)}
      whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.15)' }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.2 }}
    >
      {/* Favorite */}
      <motion.button
        className={`rec-fav-btn ${fav ? 'active' : ''}`}
        onClick={e => { e.stopPropagation(); toggleFavorite(product) }}
        whileTap={{ scale: 0.75 }}
        animate={fav ? { scale: [1, 1.4, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        {fav ? '❤️' : '🤍'}
      </motion.button>

      <div className="rec-img-wrap">
        <img
          src={product.image_url}
          alt={product.base_name || product.name}
          className="rec-img"
          loading="lazy"
          onError={e => { e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmM2Y0ZjYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjgwIiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIj4/PC90ZXh0Pjwvc3ZnPg==' }}
        />
      </div>

      <div className="rec-body">
        <p className="rec-name">{product.base_name || product.name}</p>
        <div className="rec-rating-row">
          <span className="rec-star">★</span>
          <span className="rec-rating">{rating}</span>
          <span className="rec-rating-count">({((product.id * 13 + 7) % 89) + 8})</span>
        </div>
        <div className="rec-price-row">
          <span className="rec-price">₹{minPrice}</span>
          <span className="rec-mrp">₹{mrp}</span>
        </div>
        <div className="rec-add-zone" onClick={e => e.stopPropagation()}>
          <AnimatePresence mode="wait" initial={false}>
            {qtyInCart > 0 ? (
              <motion.div
                key="stepper"
                className="pc-stepper"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <button className="pc-step-btn" onClick={() => addToCart(product, -1)}>−</button>
                <span className="pc-step-count">{qtyInCart}</span>
                <button className="pc-step-btn" onClick={() => addToCart(product, 1)}>+</button>
              </motion.div>
            ) : (
              <motion.button
                key="add"
                className="pc-add-btn"
                style={{ width: '100%', fontSize: '12px', padding: '6px 0' }}
                onClick={() => addToCart(product, 1)}
                whileTap={{ scale: 0.88 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                ADD
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

export default function RecommendationsSection() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProductDetails, setSelectedProductDetails] = useState(null)
  const [label, setLabel] = useState('🔥 Trending Now')

  useEffect(() => {
    setLoading(true)
    if (user) {
      setLabel('✨ Just For You')
      getRecommendations()
        .then(data => {
          setProducts(Array.isArray(data) ? data : [])
          setLoading(false)
        })
        .catch(() => {
          // Fallback to trending on auth failure
          getTrending()
            .then(data => {
              setLabel('🔥 Trending Now')
              setProducts(Array.isArray(data) ? data : [])
              setLoading(false)
            })
            .catch(() => setLoading(false))
        })
    } else {
      setLabel('🔥 Trending Now')
      getTrending()
        .then(data => {
          setProducts(Array.isArray(data) ? data : [])
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [user])

  if (loading) {
    return (
      <section className="rec-section">
        <div className="rec-header">
          <div className="skeleton" style={{ width: 220, height: 24, borderRadius: 8 }} />
        </div>
        <div className="rec-scroll-track">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-card" style={{ minWidth: 160, height: 240 }} />
          ))}
        </div>
      </section>
    )
  }

  if (!products.length) return null

  return (
    <>
      <section className="rec-section">
        <div className="rec-header">
          <div className="rec-title-group">
            <h2 className="rec-title">{label}</h2>
            {user && (
              <span className="rec-subtitle">Based on your shopping history &amp; favorites</span>
            )}
          </div>
          <div className="rec-badge">
            {user ? '🤖 AI Picks' : '📈 Popular'}
          </div>
        </div>

        <div className="rec-scroll-outer">
          <div className="rec-scroll-track">
            {products.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <RecommendationCard
                  product={product}
                  onDetailClick={(prod, mrp) => setSelectedProductDetails({ product: prod, mrp })}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {selectedProductDetails && (
          <ProductDetailsModal
            product={selectedProductDetails.product}
            mrp={selectedProductDetails.mrp}
            onClose={() => setSelectedProductDetails(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
