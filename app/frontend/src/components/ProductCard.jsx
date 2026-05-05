import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '../CartContext'
import { useFavorites } from '../FavoritesContext'
import { getMRP, getDiscount } from '../utils/pricing'

// Seeded pseudo-random rating based on product id
function getRating(id) {
  const seed = (id * 7 + 13) % 10
  return (3.8 + seed * 0.12).toFixed(1)
}

export default function ProductCard({ product, onDetailClick, onVariantClick }) {
  const { cartItems, addToCart, removeFromCart } = useCart()
  const { isFavorite, toggleFavorite } = useFavorites()
  const variants = product.variants ?? [product]
  const minPrice = Math.min(...variants.map(v => v.price))
  const variantCount = variants.length

  const cartItem = variantCount === 1 ? cartItems.find(item => item.id === variants[0].id) : null
  const qtyInCart = cartItem ? cartItem.quantity : 0

  const rating = getRating(product.id || 1)
  const mrp = getMRP(minPrice, product.id || 1)
  const discount = getDiscount(minPrice, mrp)
  const fav = isFavorite(product.id)
  const isOutOfStock = product.in_stock === false

  const handleAddClick = (e) => {
    e.stopPropagation()
    if (isOutOfStock) return
    if (variantCount === 1) {
      addToCart(variants[0])
    } else {
      onVariantClick(product, mrp)
    }
  }

  const handleMinusClick = (e) => {
    e.stopPropagation()
    if (variantCount === 1 && qtyInCart > 0) {
      addToCart(variants[0], -1)
    }
  }

  const handleCardClick = () => {
    onDetailClick(product, mrp)
  }

  const handleFavClick = (e) => {
    e.stopPropagation()
    toggleFavorite(product)
  }

  const displayName = product.displayName || product.base_name || product.name
  const displayPrice = product.displayPrice || minPrice
  const displayMrp = product.displayPrice ? getMRP(product.displayPrice, product.id || 1) : mrp

  return (
    <motion.div
      className="product-card"
      style={{ cursor: 'pointer', position: 'relative' }}
      whileTap={{ scale: 0.98 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      onClick={handleCardClick}
    >


      {/* Favorite Button */}
      <motion.button
        className={`pc-fav-btn ${fav ? 'active' : ''}`}
        onClick={handleFavClick}
        whileTap={{ scale: 0.8 }}
        animate={fav ? { scale: [1, 1.35, 1] } : { scale: 1 }}
        transition={{ duration: 0.3, type: 'spring', stiffness: 400 }}
        title={fav ? 'Remove from Favorites' : 'Add to Favorites'}
        aria-label={fav ? 'Remove from Favorites' : 'Add to Favorites'}
      >
        {fav ? '❤️' : '🤍'}
      </motion.button>

      {/* Product Image */}
      <div className="pc-img-wrap">
        <img
          src={product.image_url?.includes('supabase.co') ? `${product.image_url}?width=300` : product.image_url}
          alt={displayName}
          loading="lazy"
          className="pc-img"
          onError={e => {
            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmM2Y0ZjYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjgwIiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIj4/PC90ZXh0Pjwvc3ZnPg=='
          }}
        />
        {variantCount > 1 && (
          <div className="pc-variants-badge">{variantCount} options</div>
        )}
        {isOutOfStock && (
          <div className="pc-out-of-stock-label">Item Unavailable</div>
        )}
      </div>

      {/* Card Body */}
      <div className="pc-body">
        <p className="pc-name">{displayName}</p>

        {/* Rating */}
        <div className="pc-rating-row">
          <span className="pc-stars">★</span>
          <span className="pc-rating-val">{rating}</span>
          <span className="pc-rating-sep">·</span>
          <span className="pc-category">{product.category}</span>
        </div>

        <div className="pc-footer-row">
          <div className="pc-price-block">
            <span className="pc-price">₹{displayPrice}</span>
            <span className="pc-mrp">₹{displayMrp}</span>
          </div>

          <div className="pc-add-zone" onClick={e => e.stopPropagation()}>
            <AnimatePresence mode="wait" initial={false}>
              {qtyInCart > 0 && variantCount === 1 ? (
                <motion.div
                  key="stepper"
                  className="pc-stepper"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.18 }}
                >
                  <button className="pc-step-btn" onClick={handleMinusClick}>−</button>
                  <span className="pc-step-count">{qtyInCart}</span>
                  <button className="pc-step-btn" onClick={handleAddClick}>+</button>
                </motion.div>
              ) : (
                <motion.button
                  key="add"
                  className={`pc-add-btn ${isOutOfStock ? 'disabled' : ''}`}
                  onClick={handleAddClick}
                  whileTap={isOutOfStock ? {} : { scale: 0.88 }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.18 }}
                  disabled={isOutOfStock}
                >
                  {isOutOfStock ? 'NA' : 'ADD'}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
