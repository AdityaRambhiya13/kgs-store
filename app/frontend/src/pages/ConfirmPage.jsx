import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../CartContext'
import { placeOrder } from '../api'
import Navbar from '../components/Navbar'
import { motion } from 'framer-motion'

export default function ConfirmPage() {
    const { cartItems, cartTotal, clearCart } = useCart()
    const navigate = useNavigate()
    const [phone, setPhone] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [apiError, setApiError] = useState('')
    const [orderPlaced, setOrderPlaced] = useState(false)

    // If cart is empty, redirect home (unless order was just placed)
    useEffect(() => {
        if (cartItems.length === 0 && !orderPlaced) navigate('/')
    }, [cartItems, navigate, orderPlaced])

    const isValidPhone = /^[6-9]\d{9}$/.test(phone)

    const handleSubmit = async () => {
        if (!isValidPhone) {
            setError('Please enter a valid 10-digit mobile number (starting with 6-9)')
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
            const result = await placeOrder({ phone: `+91${phone}`, items, total: cartTotal })
            setOrderPlaced(true)
            clearCart()
            navigate(`/status/${result.token}`)
        } catch (err) {
            setApiError(err.message || 'Something went wrong. Please try again.')
            setLoading(false)
        }
    }

    return (
        <div>
            <Navbar searchQuery="" onSearchChange={() => { }} />
            <div className="confirm-page">
                <motion.div
                    className="confirm-card"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
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
                                <span>{item.name} × {item.quantity}</span>
                                <span style={{ fontWeight: 600, color: 'var(--secondary)' }}>₹{(item.price * item.quantity).toFixed(0)}</span>
                            </div>
                        ))}
                        <div className="confirm-total">
                            <span>Total</span>
                            <span style={{ color: 'var(--primary)' }}>₹{cartTotal.toFixed(0)}</span>
                        </div>
                    </div>

                    {/* Phone Input */}
                    <div className="confirm-phone-group">
                        <label htmlFor="phone-input">Mobile Number</label>
                        <div className="phone-input-row">
                            <span className="phone-prefix">🇮🇳 +91</span>
                            <input
                                id="phone-input"
                                className={`input ${error ? 'error' : ''}`}
                                type="tel"
                                inputMode="numeric"
                                placeholder="9876543210"
                                maxLength={10}
                                value={phone}
                                onChange={e => {
                                    const v = e.target.value.replace(/\D/g, '')
                                    setPhone(v)
                                    if (error) setError('')
                                }}
                                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                            />
                        </div>
                        {error && <p className="error-msg">⚠️ {error}</p>}
                    </div>

                    {/* Submit */}
                    <motion.button
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', fontSize: 16, padding: '15px', marginBottom: 12 }}
                        onClick={handleSubmit}
                        disabled={loading || !isValidPhone}
                        whileTap={{ scale: 0.97 }}
                    >
                        {loading ? (
                            <><span className="spinner spinner-sm" /> Placing Order...</>
                        ) : (
                            '🎉 Place Order'
                        )}
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
            </div>
        </div>
    )
}
