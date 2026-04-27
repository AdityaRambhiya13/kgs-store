import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useFavorites } from '../FavoritesContext'
import { useCart } from '../CartContext'
import { useAuth } from '../AuthContext'
import { getFavorites } from '../api'
import { getMRP } from '../utils/pricing'
import ProductDetailsModal from '../components/ProductDetailsModal'

export default function FavoritesPage() {
  const { user } = useAuth()
  const { favorites, toggleFavorite, isFavorite } = useFavorites()
  const { addToCart, cartItems } = useCart()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProductDetails, setSelectedProductDetails] = useState(null)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    setLoading(true)
    getFavorites()
      .then(data => {
        setProducts(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [user])

  // Remove un-favorited products from the list with animation
  const visibleProducts = products.filter(p => isFavorite(p.id))

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06 } }
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, scale: 0.85, transition: { duration: 0.2 } }
  }

  if (loading) {
    return (
      <div className="fav-page">
        <div className="fav-header">
          <h1 className="fav-title">❤️ My Favorites</h1>
        </div>
        <div className="product-grid product-grid-multi" style={{ padding: '0 16px' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton skeleton-img" />
              <div className="skeleton-body">
                <div className="skeleton skeleton-line medium" />
                <div className="skeleton skeleton-line short" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="fav-page">
      {/* Header */}
      <div className="fav-header">
        <button className="fav-back-btn" onClick={() => navigate('/')}>
          ← Back
        </button>
        <h1 className="fav-title">❤️ My Favorites</h1>
        <span className="fav-count">{visibleProducts.length} item{visibleProducts.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Empty State */}
      <AnimatePresence>
        {visibleProducts.length === 0 && (
          <motion.div
            className="fav-empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="fav-empty-heart"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            >
              🤍
            </motion.div>
            <h2 className="fav-empty-title">No favorites yet</h2>
            <p className="fav-empty-sub">Tap the ❤️ on any product to save it here</p>
            <motion.button
              className="btn btn-primary"
              style={{ marginTop: 24, padding: '12px 32px' }}
              onClick={() => navigate('/')}
              whileTap={{ scale: 0.95 }}
            >
              🛒 Browse Products
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      {visibleProducts.length > 0 && (
        <motion.div
          className="product-grid product-grid-multi fav-grid"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{ padding: '0 16px', marginTop: 8 }}
        >
          <AnimatePresence>
            {visibleProducts.map(product => {
              const mrp = getMRP(product.price, product.id)
              const cartItem = cartItems.find(i => i.id === product.id)
              const qty = cartItem?.quantity || 0

              return (
                <motion.div
                  key={product.id}
                  variants={itemVariants}
                  exit="exit"
                  layout
                >
                  <div
                    className="product-card"
                    style={{ position: 'relative', cursor: 'pointer' }}
                    onClick={() => setSelectedProductDetails({ product, mrp })}
                  >
                    {/* Remove from favorites */}
                    <motion.button
                      className="pc-fav-btn active"
                      onClick={e => {
                        e.stopPropagation()
                        toggleFavorite(product)
                        setProducts(prev => prev.filter(p => p.id !== product.id))
                      }}
                      whileTap={{ scale: 0.75 }}
                      title="Remove from Favorites"
                    >
                      ❤️
                    </motion.button>

                    <div className="pc-img-wrap">
                      <img
                        src={product.image_url}
                        alt={product.base_name || product.name}
                        className="pc-img"
                        onError={e => {
                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmM2Y0ZjYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjgwIiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIj4/PC90ZXh0Pjwvc3ZnPg=='
                        }}
                      />
                    </div>

                    <div className="pc-body">
                      <p className="pc-name">{product.base_name || product.name}</p>
                      <div className="pc-footer-row">
                        <div className="pc-price-block">
                          <span className="pc-price">₹{product.price}</span>
                          <span className="pc-mrp">₹{mrp}</span>
                        </div>
                        <div className="pc-add-zone" onClick={e => e.stopPropagation()}>
                          <AnimatePresence mode="wait" initial={false}>
                            {qty > 0 ? (
                              <motion.div key="stepper" className="pc-stepper" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                                <button className="pc-step-btn" onClick={() => addToCart(product, -1)}>−</button>
                                <span className="pc-step-count">{qty}</span>
                                <button className="pc-step-btn" onClick={() => addToCart(product, 1)}>+</button>
                              </motion.div>
                            ) : (
                              <motion.button key="add" className="pc-add-btn" onClick={() => addToCart(product, 1)} whileTap={{ scale: 0.88 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                ADD
                              </motion.button>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}

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
