import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../CartContext'
import { placeOrder, setupPin } from '../api'
import { motion, AnimatePresence } from 'framer-motion'

export default function ConfirmPage() {
    const { cartItems, cartTotal, clearCart } = useCart()
    const navigate = useNavigate()
    const [phone, setPhone] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [apiError, setApiError] = useState('')
    const [orderPlaced, setOrderPlaced] = useState(false)
    const [deliveryType, setDeliveryType] = useState('pickup')

    // PIN setup step
    const [step, setStep] = useState('form')   // 'form' | 'pin'
    const [token, setToken] = useState('')
    const [pin, setPin] = useState('')
    const [pinConfirm, setPinConfirm] = useState('')

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
            const result = await placeOrder({ phone: `+91${phone}`, items, total: cartTotal, delivery_type: deliveryType })
            setToken(result.token)
            setOrderPlaced(true)
            clearCart()
            setStep('pin')
        } catch (err) {
            setApiError(err.message || 'Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handlePinSetup = async () => {
        setLoading(true)
        try {
            await setupPin(phone, pin)
        } catch {
            // Non-blocking — proceed even if PIN setup fails
        } finally {
            setLoading(false)
            navigate(`/status/${token}`)
        }
    }

    const pinValid = pin.length === 4 && pinConfirm.length === 4 && pin === pinConfirm

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
                                            setPhone(e.target.value.replace(/\D/g, ''))
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

                    {/* ── Step 2: PIN Setup ── */}
                    {step === 'pin' && (
                        <motion.div
                            key="pin"
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
                                <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>Secure Your Account</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.5 }}>
                                    Set a 4-digit PIN to securely view your order history anytime.
                                </p>
                            </div>

                            <div className="confirm-phone-group">
                                <label>Create 4-digit PIN</label>
                                <input
                                    className="input pin-input"
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={4}
                                    value={pin}
                                    onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                                    placeholder="••••"
                                    autoFocus
                                />
                            </div>

                            <div className="confirm-phone-group" style={{ marginTop: 12 }}>
                                <label>Confirm PIN</label>
                                <input
                                    className="input pin-input"
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={4}
                                    value={pinConfirm}
                                    onChange={e => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                                    placeholder="••••"
                                    onKeyDown={e => e.key === 'Enter' && pinValid && handlePinSetup()}
                                />
                            </div>

                            {pin.length === 4 && pinConfirm.length === 4 && pin !== pinConfirm && (
                                <p className="error-msg" style={{ marginTop: 6 }}>⚠️ PINs don't match</p>
                            )}

                            <motion.button
                                className="btn btn-primary"
                                style={{ width: '100%', justifyContent: 'center', padding: '15px', marginTop: 20 }}
                                disabled={!pinValid || loading}
                                onClick={handlePinSetup}
                                whileTap={{ scale: 0.97 }}
                            >
                                {loading ? (
                                    <><span className="spinner spinner-sm" /> Saving...</>
                                ) : '✅ Save PIN & Track Order'}
                            </motion.button>

                            <button
                                className="btn btn-ghost"
                                style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
                                onClick={() => navigate(`/status/${token}`)}
                            >
                                Skip for now
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
