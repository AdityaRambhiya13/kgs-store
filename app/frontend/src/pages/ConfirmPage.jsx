import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../CartContext'
import { placeOrder, cancelOrder } from '../api'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../AuthContext'

// ── Confetti burst ──────────────────────────────────────────────
function fireConfetti() {
    const colors = ['#1E3A8A', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899', '#38BDF8']
    for (let i = 0; i < 90; i++) {
        const el = document.createElement('div')
        el.className = 'confetti-piece'
        el.style.left = Math.random() * 100 + 'vw'
        el.style.background = colors[Math.floor(Math.random() * colors.length)]
        el.style.width = (Math.random() * 10 + 5) + 'px'
        el.style.height = (Math.random() * 10 + 5) + 'px'
        el.style.borderRadius = Math.random() > 0.5 ? '50%' : '3px'
        el.style.animationDuration = (Math.random() * 2 + 2.2) + 's'
        el.style.animationDelay = Math.random() * 0.6 + 's'
        document.body.appendChild(el)
        setTimeout(() => el.remove(), 5000)
    }
}

function CheckmarkSVG() {
    return (
        <motion.svg
            width="80" height="80" viewBox="0 0 80 80" fill="none"
            xmlns="http://www.w3.org/2000/svg"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
        >
            <motion.circle
                cx="40" cy="40" r="38"
                stroke="#10B981" strokeWidth="4" fill="rgba(16,185,129,0.1)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
            />
            <motion.path
                d="M22 40L35 53L58 28"
                stroke="#10B981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: 0.5 }}
            />
        </motion.svg>
    )
}

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

    const FREE_DELIVERY_THRESHOLD = 250
    const DELIVERY_FEE = 250

    const isFreeDelivery = cartTotal >= FREE_DELIVERY_THRESHOLD
    const activeDeliveryFee = (deliveryType === 'delivery' && !isFreeDelivery) ? DELIVERY_FEE : 0
    const finalTotal = cartTotal + activeDeliveryFee

    const [step, setStep] = useState('form')
    const [token, setToken] = useState('')
    const [deliveryOtp, setDeliveryOtp] = useState('')
    const [cancelLoading, setCancelLoading] = useState(false)
    const [cancelMsg, setCancelMsg] = useState('')
    const [copied, setCopied] = useState(false)
    const confettiFired = useRef(false)

    const [addressForm, setAddressForm] = useState({
        flat_no: '', building_name: '', road_name: '', area_name: '', landmark: '', pincode: ''
    })
    const [saveAsHome, setSaveAsHome] = useState(true)

    useEffect(() => {
        if (user?.address) setAddressForm(prev => ({ ...prev, ...user.address }))
    }, [user])

    const handleAddressChange = (e) => {
        const { name, value } = e.target
        setAddressForm(prev => ({ ...prev, [name]: value }))
    }

    useEffect(() => {
        if (cartItems.length === 0 && !orderPlaced) navigate('/')
    }, [cartItems, navigate, orderPlaced])

    useEffect(() => {
        if (step === 'success' && !confettiFired.current) {
            confettiFired.current = true
            setTimeout(fireConfetti, 250)
        }
    }, [step])

    const handleSubmit = async () => {
        setError('')
        setApiError('')
        setLoading(true)
        try {
            const items = cartItems.map(item => ({
                product_id: item.id, name: item.name, price: item.price,
                quantity: item.quantity, unit: item.unit || 'kg'
            }))
            const payload = { 
                items, 
                total: finalTotal, 
                delivery_type: deliveryType, 
                delivery_time: deliveryTime,
                delivery_fee: activeDeliveryFee 
            }

            if (deliveryType === 'delivery') {
                if (!addressForm.flat_no || !addressForm.building_name || !addressForm.road_name || !addressForm.area_name || !addressForm.pincode) {
                    setError('Please fill in all required address fields.')
                    setLoading(false); return
                }
                if (addressForm.pincode.length !== 6) {
                    setError('Pincode must be exactly 6 digits.')
                    setLoading(false); return
                }
                payload.address = addressForm
                payload.save_as_home = saveAsHome
            }

            const result = await placeOrder(payload, user.token)
            setToken(result.token)
            if (result.delivery_otp) setDeliveryOtp(result.delivery_otp)
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

    const handleCopyToken = () => {
        navigator.clipboard?.writeText(token).catch(() => { })
        setCopied(true)
        setTimeout(() => setCopied(false), 2200)
    }

    const etaText = deliveryTime === 'next_day'
        ? '📅 Delivered tomorrow by 10 AM'
        : deliveryType === 'pickup'
            ? '⚡ Ready for pickup in 60 mins'
            : '🚚 Delivered in 60–90 mins'

    const whatsappMsg = encodeURIComponent(
        `Hi KGS! My order token is *${token}*. Please confirm my ${deliveryType === 'delivery' ? 'home delivery' : 'store pickup'} order.`
    )
    const whatsappUrl = `https://wa.me/?text=${whatsappMsg}`

    return (
        <div>
            <div className="confirm-page">
                <AnimatePresence mode="wait">
                    {step === 'form' && (
                        <motion.div
                            key="form"
                            className="confirm-card"
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <div className="back-link" onClick={() => navigate('/')}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                                Back to Shop
                            </div>
                            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>📋 Confirm Your Order</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>Review your items and place your order</p>

                            {/* Order Summary */}
                            <div className="confirm-order-summary">
                                <h3>Order Summary</h3>
                                {cartItems.map(item => (
                                    <div key={item.id} className="confirm-item-row">
                                        <span>{item.name} × {item.quantity}</span>
                                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                                            ₹{(item.price * item.quantity).toFixed(0)}
                                        </span>
                                    </div>
                                ))}
                                
                                {deliveryType === 'delivery' && (
                                    <div className="confirm-item-row delivery-fee-row" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--border)' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Delivery Fee</span>
                                        <span style={{ fontWeight: 600, color: activeDeliveryFee > 0 ? 'var(--text)' : 'var(--primary)' }}>
                                            {activeDeliveryFee > 0 ? `₹${activeDeliveryFee}` : 'FREE'}
                                        </span>
                                    </div>
                                )}

                                <div className="confirm-total">
                                    <span>To Pay</span>
                                    <span style={{ color: 'var(--primary)', fontSize: '24px' }}>₹{finalTotal.toFixed(0)}</span>
                                </div>
                            </div>

                            {/* Delivery Type */}
                            <div className="delivery-toggle">
                                <label>Delivery Method</label>
                                <div className="delivery-options">
                                    <button className={`delivery-option ${deliveryType === 'pickup' ? 'active' : ''}`} onClick={() => { setDeliveryType('pickup'); setError('') }} type="button">
                                        🏪 Store Pickup
                                    </button>
                                    <button className={`delivery-option ${deliveryType === 'delivery' ? 'active' : ''}`} onClick={() => { setDeliveryType('delivery'); setError('') }} type="button">
                                        🚚 Home Delivery
                                    </button>
                                </div>
                            </div>

                            <div className="delivery-toggle" style={{ marginTop: '16px' }}>
                                <label>Schedule Time</label>
                                <div className="delivery-options">
                                    <button className={`delivery-option ${deliveryTime === 'same_day' ? 'active' : ''}`} onClick={() => setDeliveryTime('same_day')} type="button" style={{ fontSize: 14 }}>
                                        ⚡ Same Day
                                    </button>
                                    <button className={`delivery-option ${deliveryTime === 'next_day' ? 'active' : ''}`} onClick={() => setDeliveryTime('next_day')} type="button" style={{ fontSize: 14 }}>
                                        📅 Next Day
                                    </button>
                                </div>
                            </div>

                            <div className="confirm-phone-group" style={{ marginBottom: 16 }}>
                                <label>Customer Details</label>
                                <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '8px', fontSize: 14 }}>
                                    <strong>{user.name || 'User'}</strong><br />
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

                            <motion.button
                                className="btn btn-primary"
                                style={{ width: '100%', justifyContent: 'center', fontSize: 16, padding: '15px', marginBottom: 12, marginTop: 16 }}
                                onClick={handleSubmit}
                                disabled={loading}
                                whileTap={{ scale: 0.97 }}
                            >
                                {loading ? (<><span className="spinner spinner-sm" /> Processing...</>) : '🎉 Proceed with Order'}
                            </motion.button>

                            {apiError && (
                                <motion.div className="toast error" style={{ position: 'static', margin: '0 0 16px' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    ❌ {apiError}
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {/* ── Success Step ── */}
                    {step === 'success' && (
                        <motion.div
                            key="success"
                            className="confirm-card order-success-card"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* Animated Checkmark */}
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                                <CheckmarkSVG />
                            </div>

                            <motion.h2
                                className="order-success-title"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.2 }}
                            >
                                Order Confirmed! 🎉
                            </motion.h2>

                            <motion.p
                                style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 24, textAlign: 'center' }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                Your order has been placed successfully
                            </motion.p>

                            {/* Token Box */}
                            <motion.div
                                className="order-token-box"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="order-token-label">Order Token</div>
                                <div className="order-token-value">{token}</div>
                                <motion.button
                                    className="order-token-copy"
                                    onClick={handleCopyToken}
                                    whileTap={{ scale: 0.88 }}
                                    animate={copied ? { backgroundColor: '#10B981', color: '#fff', borderColor: '#10B981' } : {}}
                                >
                                    {copied ? '✓ Copied!' : '📋 Copy'}
                                </motion.button>
                            </motion.div>

                            {/* Delivery OTP */}
                            {deliveryOtp && (
                                <div className="order-otp-box">
                                    <span style={{ fontSize: 13, color: 'var(--primary)' }}>Delivery OTP</span>
                                    <span className="order-otp-value">{deliveryOtp}</span>
                                </div>
                            )}

                            {/* ETA Chip */}
                            <div className="order-eta-chip" style={{ marginTop: '12px', marginBottom: '16px' }}>
                                {etaText}
                            </div>

                            {cancelMsg && (
                                <div style={{ padding: '12px', background: cancelMsg.includes('blocked') ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', borderRadius: '8px', marginBottom: '16px', color: cancelMsg.includes('blocked') ? 'var(--danger)' : 'var(--accent)', fontSize: '14px', textAlign: 'center' }}>
                                    {cancelMsg}
                                </div>
                            )}

                            {/* Buttons */}
                            <motion.div
                                style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 8 }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.2 }}
                            >
                                <motion.a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn order-whatsapp-btn"
                                    style={{ justifyContent: 'center', textDecoration: 'none', padding: '13px' }}
                                    whileTap={{ scale: 0.97 }}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                    Share on WhatsApp
                                </motion.a>

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <motion.button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: '14px' }} onClick={() => navigate('/')} whileTap={{ scale: 0.97 }}>
                                        🛒 Shop More
                                    </motion.button>
                                    <motion.button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '14px' }} onClick={() => navigate(`/status/${token}`)} whileTap={{ scale: 0.97 }}>
                                        🎯 Track Order
                                    </motion.button>
                                </div>

                                <motion.button
                                    className="btn btn-danger"
                                    style={{ width: '100%', justifyContent: 'center', padding: '14px', marginTop: '4px' }}
                                    onClick={handleCancel}
                                    disabled={cancelLoading || !!cancelMsg}
                                    whileTap={{ scale: 0.97 }}
                                >
                                    {cancelLoading ? 'Cancelling...' : 'Cancel Order'}
                                </motion.button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
