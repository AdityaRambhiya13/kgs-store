import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../CartContext'
import { placeOrder, cancelOrder } from '../api'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../AuthContext'

export default function ConfirmPage() {
    const { cartItems, cartTotal, clearCart } = useCart()
    const { user } = useAuth()
    const navigate = useNavigate()

    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [apiError, setApiError] = useState('')
    const [orderPlaced, setOrderPlaced] = useState(false)
    const [deliveryType, setDeliveryType] = useState('pickup')

    const [step, setStep] = useState('form')   // 'form' | 'success'
    const [token, setToken] = useState('')
    const [deliveryOtp, setDeliveryOtp] = useState('')
    const [cancelLoading, setCancelLoading] = useState(false)
    const [cancelMsg, setCancelMsg] = useState('')

    // If cart is empty, redirect home (unless order was just placed)
    useEffect(() => {
        if (cartItems.length === 0 && !orderPlaced) navigate('/')
    }, [cartItems, navigate, orderPlaced])

    const handleSubmit = async () => {
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
                items,
                total: cartTotal,
                delivery_type: deliveryType
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

    const handleCancel = async () => {
        setCancelLoading(true)
        try {
            const res = await cancelOrder(token)
            setCancelMsg(res.message)
        } catch (err) {
            setCancelMsg(err.message || 'Failed to cancel order')
        } finally {
            setCancelLoading(false)
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

                            <div className="confirm-phone-group" style={{ marginBottom: 16 }}>
                                <label>Delivering To</label>
                                <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '8px', fontSize: 14 }}>
                                    <strong>{user.name || 'User'}</strong>
                                    <br />
                                    📞 {user.phone}
                                    {deliveryType === 'delivery' && (
                                        <>
                                            <br />
                                            📍 {user.address || 'No address registered'}
                                        </>
                                    )}
                                </div>
                                {deliveryType === 'delivery' && !user.address && (
                                    <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>
                                        ⚠️ Please update your address in profile to use home delivery.
                                    </p>
                                )}
                            </div>

                            {error && <p className="error-msg" style={{ marginTop: 12 }}>⚠️ {error}</p>}

                            {/* Submit */}
                            <motion.button
                                className="btn btn-primary"
                                style={{ width: '100%', justifyContent: 'center', fontSize: 16, padding: '15px', marginBottom: 12, marginTop: 16 }}
                                onClick={handleSubmit}
                                disabled={loading || (deliveryType === 'delivery' && !user.address)}
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

                            {cancelMsg && (
                                <div style={{ padding: '12px', background: cancelMsg.includes('blocked') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', marginBottom: '16px', color: cancelMsg.includes('blocked') ? 'var(--danger)' : 'var(--accent)', fontSize: '14px', textAlign: 'center' }}>
                                    {cancelMsg}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <motion.button
                                    className="btn btn-danger"
                                    style={{ flex: 1, justifyContent: 'center', padding: '15px' }}
                                    onClick={handleCancel}
                                    disabled={cancelLoading || cancelMsg.includes('cancelled')}
                                    whileTap={{ scale: 0.97 }}
                                >
                                    {cancelLoading ? 'Cancelling...' : 'Cancel Order'}
                                </motion.button>
                                <motion.button
                                    className="btn btn-primary"
                                    style={{ flex: 1, justifyContent: 'center', padding: '15px' }}
                                    onClick={() => navigate(`/status/${token}`)}
                                    whileTap={{ scale: 0.97 }}
                                >
                                    🎯 Track Order
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
