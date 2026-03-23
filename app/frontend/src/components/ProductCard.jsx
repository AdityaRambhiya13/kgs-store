import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '../CartContext'

// Seeded pseudo-random rating based on product id
function getRating(id) {
  const seed = (id * 7 + 13) % 10
  return (3.8 + seed * 0.12).toFixed(1)
}

// Fake MRP: 10–35% above price
function getMRP(price, id) {
  const pct = 10 + ((id * 3 + 7) % 26)
  return Math.ceil(price * (1 + pct / 100) / 5) * 5
}

function getDiscount(price, mrp) {
  return Math.round(((mrp - price) / mrp) * 100)
}

export default function ProductCard({ product, onDetailClick, onVariantClick }) {
  const { cartItems, addToCart, removeFromCart } = useCart()
  const variants = product.variants ?? [product]
  const minPrice = Math.min(...variants.map(v => v.price))
  const variantCount = variants.length

  const cartItem = variantCount === 1 ? cartItems.find(item => item.id === variants[0].id) : null
  const qtyInCart = cartItem ? cartItem.quantity : 0

  const rating = getRating(product.id || 1)
  const mrp = getMRP(minPrice, product.id || 1)
  const discount = getDiscount(minPrice, mrp)

  const handleAddClick = (e) => {
    e.stopPropagation()
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

  return (
    <motion.div
      className="product-card"
      style={{ cursor: 'pointer' }}
      whileTap={{ scale: 0.98 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      onClick={handleCardClick}
    >
      {/* Discount Badge */}
      {discount > 0 && (
        <div className="pc-discount-badge">{discount}% OFF</div>
      )}

      {/* Product Image */}
      <div className="pc-img-wrap">
        <img
          src={product.image_url}
          alt={product.base_name || product.name}
          loading="lazy"
          className="pc-img"
          onError={e => {
            e.target.src = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop'
          }}
        />
        {variantCount > 1 && (
          <div className="pc-variants-badge">{variantCount} options</div>
        )}
        {/* Delivery time badge */}
        <div className="pc-delivery-badge">⚡ 10 mins</div>
      </div>

      {/* Card Body */}
      <div className="pc-body">
        <p className="pc-name">{product.base_name || product.name}</p>

        {/* Rating */}
        <div className="pc-rating-row">
          <span className="pc-stars">★</span>
          <span className="pc-rating-val">{rating}</span>
          <span className="pc-rating-sep">·</span>
          <span className="pc-category">{product.category}</span>
        </div>

        <div className="pc-footer-row">
          <div className="pc-price-block">
            <span className="pc-price">₹{minPrice}</span>
            <span className="pc-mrp">₹{mrp}</span>
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
                  className="pc-add-btn"
                  onClick={handleAddClick}
                  whileTap={{ scale: 0.88 }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.18 }}
                >
                  ADD
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
