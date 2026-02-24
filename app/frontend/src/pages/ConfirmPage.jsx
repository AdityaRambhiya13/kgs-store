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
    const [deliveryTime, setDeliveryTime] = useState('same_day')

    const [step, setStep] = useState('form')   // 'form' | 'success'
    const [token, setToken] = useState('')
    const [deliveryOtp, setDeliveryOtp] = useState('')
    const [cancelLoading, setCancelLoading] = useState(false)
    const [cancelMsg, setCancelMsg] = useState('')

    const [addressForm, setAddressForm] = useState({
        flat_no: '',
        building_name: '',
        road_name: '',
        area_name: '',
        landmark: '',
        pincode: ''
    })
    const [saveAsHome, setSaveAsHome] = useState(true)

    useEffect(() => {
        if (user?.address) {
            setAddressForm(prev => ({ ...prev, ...user.address }))
        }
    }, [user])

    const handleAddressChange = (e) => {
        const { name, value } = e.target
        setAddressForm(prev => ({ ...prev, [name]: value }))
    }

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
                unit: item.unit || 'kg'
            }))
            const payload = {
                items,
                total: cartTotal,
                delivery_type: deliveryType,
                delivery_time: deliveryTime
            }

            if (deliveryType === 'delivery') {
                if (!addressForm.flat_no || !addressForm.building_name || !addressForm.road_name || !addressForm.area_name || !addressForm.pincode) {
                    setError('Please fill in all required address fields.')
                    setLoading(false)
                    return
                }
                if (addressForm.pincode.length !== 6) {
                    setError('Pincode must be exactly 6 digits.')
                    setLoading(false)
                    return
                }
                payload.address = addressForm
                payload.save_as_home = saveAsHome
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
            navigate('/', { state: { cancelMessage: res.message } })
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
                                        <span>{item.name} × {item.quantity} {item.unit || 'kg'}</span>
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

                            <div className="delivery-toggle" style={{ marginTop: '16px' }}>
                                <label>Schedule Time</label>
                                <div className="delivery-options">
                                    <button
                                        className={`delivery-option ${deliveryTime === 'same_day' ? 'active' : ''}`}
                                        onClick={() => setDeliveryTime('same_day')}
                                        type="button"
                                        style={{ fontSize: 14 }}
                                    >
                                        ⚡ Same Day
                                    </button>
                                    <button
                                        className={`delivery-option ${deliveryTime === 'next_day' ? 'active' : ''}`}
                                        onClick={() => setDeliveryTime('next_day')}
                                        type="button"
                                        style={{ fontSize: 14 }}
                                    >
                                        📅 Next Day
                                    </button>
                                </div>
                            </div>

                            <div className="confirm-phone-group" style={{ marginBottom: 16 }}>
                                <label>Customer Details</label>
                                <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '8px', fontSize: 14 }}>
                                    <strong>{user.name || 'User'}</strong>
                                    <br />
                                    📞 {user.phone}
                                </div>
                            </div>

                            {deliveryType === 'delivery' && (
                                <div className="address-form-group" style={{ marginBottom: 16 }}>
                                    <h3 style={{ fontSize: 16, marginBottom: 12 }}>Delivery Address</h3>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                        <div>
                                            <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Flat/House No. *</label>
                                            <input type="text" className="input" name="flat_no" value={addressForm.flat_no} onChange={handleAddressChange} style={{ padding: '10px' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Building/Apartment *</label>
                                            <input type="text" className="input" name="building_name" value={addressForm.building_name} onChange={handleAddressChange} style={{ padding: '10px' }} />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                        <div>
                                            <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Road/Street *</label>
                                            <input type="text" className="input" name="road_name" value={addressForm.road_name} onChange={handleAddressChange} style={{ padding: '10px' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Area/Locality *</label>
                                            <input type="text" className="input" name="area_name" value={addressForm.area_name} onChange={handleAddressChange} style={{ padding: '10px' }} />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                        <div>
                                            <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Landmark (Optional)</label>
                                            <input type="text" className="input" name="landmark" value={addressForm.landmark} onChange={handleAddressChange} style={{ padding: '10px' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Pincode *</label>
                                            <input type="text" inputMode="numeric" maxLength={6} className="input" name="pincode" value={addressForm.pincode} onChange={e => setAddressForm(prev => ({ ...prev, pincode: e.target.value.replace(/\D/g, '') }))} style={{ padding: '10px' }} />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                                        <input type="checkbox" id="saveAsHome" checked={saveAsHome} onChange={(e) => setSaveAsHome(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }} />
                                        <label htmlFor="saveAsHome" style={{ fontSize: 14, cursor: 'pointer', margin: 0 }}>Save as Home Address</label>
                                    </div>
                                </div>
                            )}

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
