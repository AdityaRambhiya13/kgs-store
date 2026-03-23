import { useCart } from '../CartContext'
import { motion, AnimatePresence } from 'framer-motion'

export default function MobileCartBar() {
  const { cartCount, cartTotal, setCartOpen, cartOpen } = useCart()

  if (cartCount === 0 || cartOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        className="mobile-cart-bar-wrap"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        <div className="mobile-cart-bar" onClick={() => setCartOpen(true)}>
          <div className="mcb-left">
            <span className="mcb-count-badge">{cartCount} items</span>
            <div className="mcb-total-info">
              <span className="mcb-total">₹{cartTotal.toFixed(0)}</span>
              <span className="mcb-label">Total Amount</span>
            </div>
          </div>
          <div className="mcb-right">
            <span>View Cart</span>
            <span className="mcb-chevron">›</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
