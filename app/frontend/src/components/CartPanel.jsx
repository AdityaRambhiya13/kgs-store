import { useCart } from '../CartContext'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function CartPanel() {
    const { cartItems, cartOpen, setCartOpen, cartTotal, cartCount, addToCart, removeFromCart } = useCart()
    const navigate = useNavigate()

    const goCheckout = () => {
        setCartOpen(false)
        navigate('/confirm')
    }

    return (
        <AnimatePresence>
            {cartOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="cart-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setCartOpen(false)}
                    />

                    {/* Panel */}
                    <motion.div
                        className="cart-panel"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                    >
                        {/* Header */}
                        <div className="cart-header">
                            <h2>🛒 Your Cart {cartCount > 0 && `(${cartCount})`}</h2>
                            <button className="cart-close" onClick={() => setCartOpen(false)}>✕</button>
                        </div>

                        {/* Items */}
                        <div className="cart-items">
                            {cartItems.length === 0 ? (
                                <div className="cart-empty">
                                    <span className="emoji">🛍️</span>
                                    <p>Your cart is empty</p>
                                    <button className="btn btn-ghost" onClick={() => setCartOpen(false)}>Browse Products</button>
                                </div>
                            ) : (
                                <AnimatePresence initial={false}>
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
                                            <img className="cart-item-img" src={item.image_url} alt={item.name} onError={e => e.target.src = 'https://via.placeholder.com/52x52?text=🛒'} />
                                            <div className="cart-item-info">
                                                <div className="cart-item-name">{item.name}</div>
                                                <div className="cart-item-price">₹{item.price.toFixed(0)} each</div>
                                                <div className="cart-item-actions">
                                                    <div className="qty-stepper" style={{ gap: 4 }}>
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
                                </AnimatePresence>
                            )}
                        </div>

                        {/* Footer */}
                        {cartItems.length > 0 && (
                            <div className="cart-footer">
                                <div className="cart-total-row">
                                    <span className="cart-total-label">Total</span>
                                    <span className="cart-total-amount">₹{cartTotal.toFixed(0)}</span>
                                </div>
                                <motion.button
                                    className="btn btn-primary"
                                    style={{ width: '100%', justifyContent: 'center', fontSize: 16, padding: '14px' }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={goCheckout}
                                >
                                    Proceed to Checkout →
                                </motion.button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
