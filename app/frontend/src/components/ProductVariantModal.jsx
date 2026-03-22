import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '../CartContext'
import { useNavigate } from 'react-router-dom'

export default function ProductVariantModal({ group, onClose }) {
    const { cart, addToCart, setQuantity, cartCount, setCartOpen } = useCart()
    const [addedId, setAddedId] = useState(null)
    const navigate = useNavigate()

    if (!group) return null

    // Defensive: ensure variants is always a non-empty array
    const safeVariants = group.variants?.length ? group.variants : [group]
    const safeGroup = { ...group, variants: safeVariants }

    const handleAdd = (variant) => {
        const existing = cart[variant.id]
        if (existing) {
            setQuantity(variant.id, existing.quantity + 1)
        } else {
            addToCart(variant, 1)
        }
        setAddedId(variant.id)
        setTimeout(() => setAddedId(null), 1500)
    }

    const handleIncrease = (variant) => {
        const existing = cart[variant.id]
        if (existing) setQuantity(variant.id, existing.quantity + 1)
    }

    const handleDecrease = (variant) => {
        const existing = cart[variant.id]
        if (!existing) return
        if (existing.quantity <= 1) setQuantity(variant.id, 0)
        else setQuantity(variant.id, existing.quantity - 1)
    }

    const handleViewCart = () => {
        onClose()
        setCartOpen(true)
    }

  return (
    <div className="pvm-wrapper">
      <AnimatePresence>
        {safeGroup && (
          <>
            {/* Backdrop */}
            <motion.div
              className="pvm-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />

            {/* Bottom sheet */}
            <motion.div
              className="pvm-container"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              role="dialog"
              aria-modal="true"
              aria-label={`Select price for ${safeGroup.base_name || safeGroup.name}`}
            >
              <div className="pvm-handle" />

              {/* Header */}
              <div className="pvm-header">
                <div className="pvm-img-wrap">
                  <img
                    src={safeGroup.image_url}
                    alt={safeGroup.base_name || safeGroup.name}
                    className="pvm-img"
                    onError={e => {
                      e.target.src = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop'
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="pvm-title">{safeGroup.base_name || safeGroup.name}</div>
                  <div className="pvm-category">{safeGroup.category}</div>
                  <div className="pvm-desc">
                    {safeVariants.length} price{safeVariants.length !== 1 ? 's' : ''} available · per {safeVariants[0]?.unit || 'kg'}
                  </div>
                </div>
                <button className="pvm-close" onClick={onClose} aria-label="Close">✕</button>
              </div>

              <p className="pvm-hint">Select pack size & price</p>

              {/* Variants list */}
              <div className="pvm-list">
                {safeVariants.map(variant => {
                  const cartEntry = cart[variant.id]
                  const qty = cartEntry?.quantity || 0
                  const justAdded = addedId === variant.id

                  return (
                    <motion.div
                      key={variant.id}
                      className={`pvm-row ${justAdded ? 'just-added' : ''}`}
                      animate={justAdded ? { backgroundColor: ['rgba(16,185,129,0.12)', 'rgba(16,185,129,0)'] } : {}}
                      transition={{ duration: 1 }}
                    >
                      <div className="pvm-info">
                        <div className="pvm-price">
                          ₹{variant.price}<span>/{variant.unit || 'kg'}</span>
                        </div>
                        <div className="pvm-grade">{variant.name}</div>
                      </div>

                      <div className="pvm-actions">
                        {qty > 0 ? (
                          <div className="pc-stepper">
                            <button className="pc-step-btn" onClick={() => handleDecrease(variant)}>−</button>
                            <span className="pc-step-count">{qty}</span>
                            <button className="pc-step-btn" onClick={() => handleIncrease(variant)}>+</button>
                          </div>
                        ) : (
                          <motion.button
                            className={`btn ${justAdded ? 'btn-added' : 'btn-primary'} pvm-add-btn`}
                            onClick={() => handleAdd(variant)}
                            whileTap={{ scale: 0.88 }}
                          >
                            {justAdded ? '✓ Added!' : '+ Add'}
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* View Cart shortcut */}
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.div
                    className="pvm-footer"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 16 }}
                  >
                    <button className="btn btn-secondary pvm-view-cart" onClick={handleViewCart}>
                      🛒 View Cart ({cartCount} items) →
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
