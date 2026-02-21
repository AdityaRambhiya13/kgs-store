import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../CartContext'
import { placeOrder } from '../api'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../AuthContext'

export default function ConfirmPage() {
    const { cartItems, cartTotal, clearCart } = useCart()
    const { user } = useAuth()
    const navigate = useNavigate()
    const [address, setAddress] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [apiError, setApiError] = useState('')
    const [orderPlaced, setOrderPlaced] = useState(false)
    const [deliveryType, setDeliveryType] = useState('pickup')

    const [step, setStep] = useState('form')   // 'form' | 'success'
    const [token, setToken] = useState('')
    const [deliveryOtp, setDeliveryOtp] = useState('')

    // If cart is empty, redirect home (unless order was just placed)
    useEffect(() => {
        if (cartItems.length === 0 && !orderPlaced) navigate('/')
    }, [cartItems, navigate, orderPlaced])

    const handleSubmit = async () => {
        if (!user || (!user.phone)) {
            setError('User not authenticated')
            return
        }
        if (deliveryType === 'delivery' && !address.trim()) {
            setError('Please provide a delivery address.')
            return
        }
        setError('')
        setApiError('')
        setLoading(true)

        try {
            const items = cartItems.map(item => ({
                product_id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
            }))
            const payload = {
                phone: `+91${user.phone}`,
                items,
                total: cartTotal,
                delivery_type: deliveryType
            }
            if (deliveryType === 'delivery') {
                payload.address = address
            }

            const result = await placeOrder(payload)
            setToken(result.token)
            if (result.delivery_otp) {
                setDeliveryOtp(result.delivery_otp)
            }
            setOrderPlaced(true)
            clearCart()
            setStep('success')
        } catch (err) {
            setApiError(err.message || 'Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>

            <div className="confirm-page">

                {/* ── Step 1: Order Form ── */}
                <AnimatePresence mode="wait">
                    {step === 'form' && (
                        <motion.div
                            key="form"
                            className="confirm-card"
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.35 }}
                        >
                            <div className="back-link" onClick={() => navigate('/')}>← Back to Shop</div>

                            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>📋 Confirm Your Order</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
                                Review your items and place your order
                            </p>

                            {/* Order Summary */}
                            <div className="confirm-order-summary">
                                <h3>Order Summary</h3>
                                {cartItems.map(item => (
                                    <div key={item.id} className="confirm-item-row">
                                        <span>{item.name} × {item.quantity} kg</span>
                                        <span style={{ fontWeight: 600, color: 'var(--secondary)' }}>
                                            ₹{(item.price * item.quantity).toFixed(0)}
                                        </span>
                                    </div>
                                ))}
                                <div className="confirm-total">
                                    <span>Total</span>
                                    <span style={{ color: 'var(--primary)' }}>₹{cartTotal.toFixed(0)}</span>
                                </div>
                            </div>

                            {/* Delivery Type Toggle */}
                            <div className="delivery-toggle">
                                <label>Delivery Method</label>
                                <div className="delivery-options">
                                    <button
                                        className={`delivery-option ${deliveryType === 'pickup' ? 'active' : ''}`}
                                        onClick={() => setDeliveryType('pickup')}
                                        type="button"
                                    >
                                        🏪 Store Pickup
                                    </button>
                                    <button
                                        className={`delivery-option ${deliveryType === 'delivery' ? 'active' : ''}`}
                                        onClick={() => setDeliveryType('delivery')}
                                        type="button"
                                    >
                                        🚚 Home Delivery
                                    </button>
                                </div>
                            </div>

                            <div className="confirm-phone-group">
                                <label>Mobile Number</label>
                                <div className="phone-input-row" style={{ opacity: 0.7 }}>
                                    <span className="phone-prefix">🇮🇳 +91</span>
                                    <input
                                        className="input"
                                        type="tel"
                                        value={user?.phone || ''}
                                        disabled
                                        style={{ backgroundColor: 'var(--bg-card)' }}
                                    />
                                </div>
                            </div>

                            {/* Address Input */}
                            <AnimatePresence>
                                {deliveryType === 'delivery' && (
                                    <motion.div
                                        className="confirm-phone-group"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        style={{ overflow: 'hidden' }}
                                    >
                                        <label htmlFor="address-input">Delivery Address</label>
                                        <textarea
                                            id="address-input"
                                            className={`input ${error && !address.trim() ? 'error' : ''}`}
                                            placeholder="Enter your full address"
                                            value={address}
                                            onChange={e => {
                                                setAddress(e.target.value)
                                                if (error) setError('')
                                            }}
                                            rows={3}
                                            style={{ resize: 'vertical' }}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {error && <p className="error-msg">⚠️ {error}</p>}

                            {/* Submit */}
                            <motion.button
                                className="btn btn-primary"
                                style={{ width: '100%', justifyContent: 'center', fontSize: 16, padding: '15px', marginBottom: 12 }}
                                onClick={handleSubmit}
                                disabled={loading || (deliveryType === 'delivery' && !address.trim())}
                                whileTap={{ scale: 0.97 }}
                            >
                                {loading ? (
                                    <><span className="spinner spinner-sm" /> Placing Order...</>
                                ) : '🎉 Place Order'}
                            </motion.button>

                            {apiError && (
                                <motion.div
                                    className="toast error"
                                    style={{ position: 'static', margin: '0 0 16px' }}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    ❌ {apiError}
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {/* ── Step 2: Success Step ── */}
                    {step === 'success' && (
                        <motion.div
                            key="success"
                            className="confirm-card"
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.35 }}
                        >
                            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
                                <h2 style={{ fontWeight: 800, fontSize: 24, marginBottom: 6, color: 'var(--primary)' }}>
                                    Order Placed!
                                </h2>
                                <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'inline-block' }}>
                                    <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block' }}>Your Order Token</span>
                                    <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--text)' }}>{token}</span>
                                </div>
                                {deliveryOtp && (
                                    <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px dashed rgba(56, 189, 248, 0.4)', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'inline-block', marginLeft: '12px' }}>
                                        <span style={{ fontSize: 13, color: 'var(--primary)', display: 'block' }}>Delivery OTP</span>
                                        <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)', letterSpacing: '2px' }}>{deliveryOtp}</span>
                                    </div>
                                )}
                                <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.5 }}>
                                    You can track your order status anytime from the 'My Orders' section.
                                </p>
                            </div>

                            <motion.button
                                className="btn btn-primary"
                                style={{ width: '100%', justifyContent: 'center', padding: '15px', marginTop: 20 }}
                                onClick={() => navigate(`/status/${token}`)}
                                whileTap={{ scale: 0.97 }}
                            >
                                🎯 Track Order Now
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
