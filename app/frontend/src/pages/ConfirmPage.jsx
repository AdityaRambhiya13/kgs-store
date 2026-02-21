import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../CartContext'
import { placeOrder, checkPhone } from '../api'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../AuthContext'

export default function ConfirmPage() {
    const { cartItems, cartTotal, clearCart } = useCart()
    const { user, login } = useAuth()
    const navigate = useNavigate()

    const [phone, setPhone] = useState(user?.phone || '')
    const [name, setName] = useState(user?.name || '')
    const [pin, setPin] = useState('')
    const [isExistingUser, setIsExistingUser] = useState(false)

    const [address, setAddress] = useState(user?.address || '')
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

    // Sync user data if they log in or load late
    useEffect(() => {
        if (user) {
            if (!phone) setPhone(user.phone)
            if (user.name && !name) setName(user.name)
            if (user.address && !address) setAddress(user.address)
        }
    }, [user])

    // Check if phone belongs to an existing user dynamically
    useEffect(() => {
        if (!user && phone.length === 10) {
            checkPhone(phone).then(res => setIsExistingUser(res.exists)).catch(() => { })
        } else {
            setIsExistingUser(false)
        }
    }, [phone, user])

    const handleSubmit = async () => {
        if (!user) {
            if (phone.length !== 10) { setError('Valid 10-digit phone required'); return }
            if (!isExistingUser && pin.length !== 4) { setError('4-digit Security PIN required for new accounts'); return }
        }
        if (deliveryType === 'delivery' && !address.trim()) {
            setError('Please provide a delivery address.')
            return
        }
        setError('')
        setApiError('')
        setLoading(true)

        try {
            if (!user) {
                await login(phone, pin, name, address)
            }

            const items = cartItems.map(item => ({
                product_id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
            }))
            const payload = {
                phone: `+91${user?.phone || phone}`,
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

                            {!user ? (
                                <>
                                    <div className="confirm-phone-group">
                                        <label>Mobile Number</label>
                                        <div className="phone-input-row" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                                            <span className="phone-prefix" style={{ padding: '0 12px' }}>🇮🇳 +91</span>
                                            <input
                                                className="input"
                                                type="tel"
                                                inputMode="numeric"
                                                maxLength={10}
                                                value={phone}
                                                onChange={e => {
                                                    setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                                                    if (error) setError('')
                                                }}
                                                placeholder="9876543210"
                                                style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}
                                            />
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {!isExistingUser && phone.length === 10 && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                            >
                                                <div className="confirm-phone-group" style={{ marginTop: 12 }}>
                                                    <label>Name (Optional)</label>
                                                    <input
                                                        className="input"
                                                        type="text"
                                                        value={name}
                                                        onChange={e => {
                                                            setName(e.target.value)
                                                            if (error) setError('')
                                                        }}
                                                        placeholder="John Doe"
                                                    />
                                                </div>

                                                <div className="confirm-phone-group" style={{ marginTop: 12 }}>
                                                    <label>Set Security PIN (4-digits)</label>
                                                    <input
                                                        className="input"
                                                        type="password"
                                                        inputMode="numeric"
                                                        maxLength={4}
                                                        value={pin}
                                                        onChange={e => {
                                                            setPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                                                            if (error) setError('')
                                                        }}
                                                        placeholder="••••"
                                                    />
                                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                                        Used to secure your orders. Creating a new account automatically.
                                                    </p>
                                                </div>
                                            </motion.div>
                                        )}
                                        {isExistingUser && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                            >
                                                <div style={{ marginTop: 12, padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', color: 'var(--primary)', fontSize: 13, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                                    ✅ Account detected. You can proceed with your order immediately.
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </>
                            ) : (
                                <div className="confirm-phone-group">
                                    <label>Logged in as</label>
                                    <div className="phone-input-row" style={{ opacity: 0.7 }}>
                                        <span className="phone-prefix">🇮🇳 +91</span>
                                        <input
                                            className="input"
                                            type="tel"
                                            value={user.phone}
                                            disabled
                                            style={{ backgroundColor: 'var(--bg-card)' }}
                                        />
                                    </div>
                                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                                        Welcome back, {user.name || 'User'}!
                                    </p>
                                </div>
                            )}

                            {/* Address Input */}
                            <AnimatePresence>
                                {deliveryType === 'delivery' && (
                                    <motion.div
                                        className="confirm-phone-group"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        style={{ overflow: 'hidden', marginTop: 12 }}
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
                                            rows={2}
                                            autoComplete="off"
                                            style={{ resize: 'vertical' }}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {error && <p className="error-msg" style={{ marginTop: 12 }}>⚠️ {error}</p>}

                            {/* Submit */}
                            <motion.button
                                className="btn btn-primary"
                                style={{ width: '100%', justifyContent: 'center', fontSize: 16, padding: '15px', marginBottom: 12, marginTop: 16 }}
                                onClick={handleSubmit}
                                disabled={loading}
                                whileTap={{ scale: 0.97 }}
                            >
                                {loading ? (
                                    <><span className="spinner spinner-sm" /> Processing...</>
                                ) : '🎉 Proceed with Order'}
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
