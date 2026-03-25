import { useCart } from '../CartContext'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { getMRP } from '../utils/pricing'

const FREE_DELIVERY_THRESHOLD = 250

export default function CartPanel() {
  const { cartItems, cartOpen, setCartOpen, cartTotal, cartCount, addToCart, removeFromCart } = useCart()
  const navigate = useNavigate()

  const goCheckout = () => {
    setCartOpen(false)
    navigate('/confirm')
  }

  // Compute savings vs MRP
  const totalSavings = cartItems.reduce((acc, item) => {
    const mrp = getMRP(item.price, item.id || 1)
    return acc + (mrp - item.price) * item.quantity
  }, 0)

  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - cartTotal)
  const deliveryProgress = Math.min(100, (cartTotal / FREE_DELIVERY_THRESHOLD) * 100)

  return (
    <>
      {/* Backdrop */}
      {cartOpen && (
        <motion.div
          key="backdrop"
          className="cart-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          onClick={() => setCartOpen(false)}
        />
      )}

      {/* Panel */}
      {cartOpen && (
        <motion.div
          key="panel"
          className="cart-panel"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', ease: [0.22, 1, 0.36, 1], duration: 0.35 }}
        >
          {/* Header */}
          <div className="cart-header">
            <div>
              <h2 className="cart-title">🛒 My Cart</h2>
              {cartCount > 0 && (
                <p className="cart-delivery-eta">⚡ Delivers in 10 mins</p>
              )}
            </div>
            <button className="cart-close" onClick={() => setCartOpen(false)}>✕</button>
          </div>

          {/* Free delivery upsell bar */}
          {cartCount > 0 && remaining > 0 && (
            <div className="upsell-bar">
              <p className="upsell-text">
                🎁 Add <strong>₹{Math.ceil(remaining)}</strong> more for <strong>FREE delivery</strong>
              </p>
              <div className="upsell-progress-track">
                <motion.div
                  className="upsell-progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${deliveryProgress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}
          {cartCount > 0 && remaining === 0 && (
            <div className="upsell-bar upsell-success">
              🎉 You've unlocked <strong>FREE delivery!</strong>
            </div>
          )}

          {/* Items */}
          <div className="cart-items">
            {cartItems.length === 0 ? (
              <div className="cart-empty">
                <span className="emoji">🛍️</span>
                <p>Your cart is empty</p>
                <button className="btn btn-ghost" onClick={() => setCartOpen(false)}>Browse Products</button>
              </div>
            ) : (
              <>
                {cartItems.map(item => (
                  <motion.div
                    key={item.id}
                    className="cart-item"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30, height: 0, margin: 0, padding: 0 }}
                    transition={{ duration: 0.22 }}
                    layout
                  >
                    <img
                      className="cart-item-img"
                      src={item.image_url}
                      alt={item.name}
                      onError={e => e.target.src = 'https://via.placeholder.com/52x52?text=🛒'}
                    />
                    <div className="cart-item-info">
                      <div className="cart-item-name">{item.name}</div>
                      <div className="cart-item-price">₹{item.price.toFixed(0)} each</div>
                      <div className="cart-item-actions">
                        <div className="qty-stepper">
                          <button className="qty-btn qty-btn-minus" onClick={() => addToCart(item, -1)}>−</button>
                          <span className="qty-count">{item.quantity}</span>
                          <button className="qty-btn qty-btn-plus" onClick={() => addToCart(item, 1)}>+</button>
                        </div>
                        <span className="cart-item-subtotal">₹{(item.price * item.quantity).toFixed(0)}</span>
                      </div>
                    </div>
                    <motion.button
                      className="cart-remove"
                      whileTap={{ scale: 0.8 }}
                      onClick={() => removeFromCart(item.id)}
                      title="Remove"
                    >✕</motion.button>
                  </motion.div>
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          {cartItems.length > 0 && (
            <div className="cart-footer">
              {totalSavings > 0 && (
                <div className="cart-savings-row">
                  <span>🎉 Total Savings</span>
                  <span className="cart-savings-amount">−₹{totalSavings.toFixed(0)}</span>
                </div>
              )}
              <div className="cart-total-row">
                <span className="cart-total-label">To Pay</span>
                <span className="cart-total-amount">₹{cartTotal.toFixed(0)}</span>
              </div>
              <motion.button
                className="btn btn-primary cart-checkout-btn"
                whileTap={{ scale: 0.97 }}
                onClick={goCheckout}
              >
                Proceed to Checkout →
              </motion.button>
            </div>
          )}
        </motion.div>
      )}
    </>
  )
}
