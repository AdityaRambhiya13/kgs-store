import { useState, useEffect, useRef, Suspense, lazy } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getOrder, cancelOrder } from '../api'
import ProgressSteps from '../components/ProgressSteps'
import { motion, AnimatePresence } from 'framer-motion'

const Token3D = lazy(() => import('../components/Token3D'))

// ── Confetti burst ───────────────────────────────────────────
function fireConfetti() {
    const colors = ['#1E3A8A', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899']
    for (let i = 0; i < 80; i++) {
        const el = document.createElement('div')
        el.className = 'confetti-piece'
        el.style.left = Math.random() * 100 + 'vw'
        el.style.background = colors[Math.floor(Math.random() * colors.length)]
        el.style.width = (Math.random() * 10 + 6) + 'px'
        el.style.height = (Math.random() * 10 + 6) + 'px'
        el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px'
        el.style.animationDuration = (Math.random() * 2 + 2) + 's'
        el.style.animationDelay = Math.random() * 0.8 + 's'
        document.body.appendChild(el)
        setTimeout(() => el.remove(), 4000)
    }
}

export default function StatusPage() {
    const { token } = useParams()
    const navigate = useNavigate()
    const [order, setOrder] = useState(null)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [expanded, setExpanded] = useState(false)
    const celebratedRef = useRef(false)
    const intervalRef = useRef(null)
    const [cancelLoading, setCancelLoading] = useState(false)
    const [cancelMsg, setCancelMsg] = useState('')

    const fetchOrder = async (signal) => {
        try {
            const data = await getOrder(token, signal)
            if (signal?.aborted) return
            setOrder(data)
            const isDone = data.status === 'Ready for Pickup' || data.status === 'Delivered'
            if (isDone && !celebratedRef.current) {
                celebratedRef.current = true
                fireConfetti()
                clearInterval(intervalRef.current)
            }
        } catch (err) {
            if (err?.name === 'AbortError') return
            setNotFound(true)
            clearInterval(intervalRef.current)
        } finally {
            if (!signal?.aborted) setLoading(false)
        }
    }

    useEffect(() => {
        const controller = new AbortController()
        fetchOrder(controller.signal)
        intervalRef.current = setInterval(() => fetchOrder(controller.signal), 5000)
        return () => {
            clearInterval(intervalRef.current)
            controller.abort()
        }
    }, [token])

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

    const isReady = order?.status === 'Ready for Pickup'
    const isDelivered = order?.status === 'Delivered'
    const deliveryType = order?.delivery_type || 'pickup'
    const deliveryTime = order?.delivery_time || 'same_day'
    let addressObj = null
    if (order?.address) {
        try { addressObj = JSON.parse(order.address) } catch { addressObj = { raw: order.address } }
    }

    if (loading) {
        return (
            <div className="status-page">
                <div className="status-center" style={{ margin: '80px auto', display: 'flex', justifyContent: 'center' }}>
                    <div className="spinner" style={{ width: 48, height: 48, borderWidth: 4 }} />
                </div>
            </div>
        )
    }

    if (notFound) {
        return (
            <div className="status-page">
                <div className="status-center">
                    <div className="empty-state card" style={{ marginTop: 60 }}>
                        <div className="emoji">😕</div>
                        <h3>Order Not Found</h3>
                        <p>Token <strong>{token}</strong> doesn't exist.</p>
                        <button className="btn btn-primary" onClick={() => navigate('/')} style={{ marginTop: 20 }}>
                            🛍️ Back to Shop
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="status-page" style={{ padding: '0 16px 60px' }}>
                <div className="status-center" style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Order Status Card */}
                    <div className="card" style={{ padding: '32px 20px', textAlign: 'center' }}>
                        <ProgressSteps status={order.status} deliveryType={deliveryType} />

                        <motion.div className="status-message" style={{ marginTop: 32 }} layout transition={{ duration: 0.4 }}>
                            <h3 style={{ fontSize: 22, marginBottom: 8, color: isDelivered ? 'var(--secondary)' : 'var(--text)' }}>
                                {isDelivered ? 'Delivered!' : isReady ? (deliveryType === 'delivery' ? 'Out for Delivery!' : 'Ready for Pickup!') : 'Preparing'}
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.5 }}>
                                {isDelivered
                                    ? 'Thanks for choosing KGS!'
                                    : isReady
                                        ? (deliveryType === 'delivery' ? "We'll be at your doorstep shortly." : 'Please collect your items at the counter.')
                                        : "We're packing your items. You'll be notified when ready."}
                            </p>
                        </motion.div>
                    </div>

                    {/* Order Summary Card */}
                    <div className="card" style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: 16, marginBottom: 20, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>Order Summary</h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                            <div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Order ID</div>
                                <div className="badge badge-primary" style={{ fontSize: 14, padding: '4px 10px', letterSpacing: '1px' }}>{token}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Date</div>
                                <div style={{ fontWeight: 600 }}>{order?.timestamp?.split(' ')[0] || '-'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Amount</div>
                                <div style={{ fontWeight: 700, color: 'var(--secondary)', fontSize: 16 }}>₹{order?.total?.toFixed(0)}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Payment Mode</div>
                                <div style={{ fontWeight: 600 }}>Pay at {deliveryType === 'delivery' ? 'Delivery' : 'Store'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Delivery Details Card */}
                    <div className="card" style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: 16, marginBottom: 16, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>Delivery Details</h3>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: addressObj ? 16 : 0 }}>
                            <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, fontSize: 15 }}>
                                {deliveryType === 'delivery' ? '🚚 Home Delivery' : '🏪 Store Pickup'}
                                <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>({deliveryTime === 'next_day' ? 'Next Day' : 'Same Day'})</span>
                            </span>

                            {order?.delivery_otp && (
                                <span className="badge badge-accent" style={{ padding: '6px 12px', fontSize: 15, letterSpacing: '1px' }}>
                                    OTP: {order.delivery_otp}
                                </span>
                            )}
                        </div>

                        {deliveryType === 'delivery' && addressObj && (
                            <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, background: 'var(--bg-surface)', padding: 12, borderRadius: 8 }}>
                                {addressObj.raw ? addressObj.raw : (
                                    <>
                                        <strong>{addressObj.flat_no}, {addressObj.building_name}</strong><br />
                                        {addressObj.road_name}, {addressObj.area_name}<br />
                                        {addressObj.landmark && <span>Landmark: {addressObj.landmark}<br /></span>}
                                        PIN: {addressObj.pincode}
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                        {items.length > 0 && (
                            <div style={{ marginBottom: 4 }}>
                                <motion.button className="btn btn-primary" onClick={() => setExpanded(e => !e)} style={{ width: '100%', justifyContent: 'center', minHeight: '44px' }}>
                                    {expanded ? 'Hide Details' : 'View Order Details'}
                                </motion.button>
                                <AnimatePresence>
                                    {expanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            style={{ overflow: 'hidden' }}
                                        >
                                            <div className="card" style={{ marginTop: 16, padding: 16, textAlign: 'left' }}>
                                                {items.map((item, i) => (
                                                    <div key={i} className="confirm-item-row" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                                                        <span>{item.name} × {item.quantity}</span>
                                                        <span style={{ fontWeight: 600, color: 'var(--secondary)' }}>
                                                            ₹{(item.subtotal || item.price * item.quantity).toFixed(0)}
                                                        </span>
                                                    </div>
                                                ))}
                                                <div className="confirm-total" style={{ paddingTop: 12, marginTop: 4 }}>
                                                    <span style={{ fontWeight: 600 }}>Total</span>
                                                    <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 16 }}>₹{order.total?.toFixed(0)}</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {order?.status === 'Processing' && (
                            <>
                                {cancelMsg && (
                                    <div style={{ padding: '12px', background: cancelMsg.includes('blocked') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', color: cancelMsg.includes('blocked') ? 'var(--danger)' : 'var(--accent)', fontSize: '13px', textAlign: 'center' }}>
                                        {cancelMsg}
                                    </div>
                                )}
                                <motion.button
                                    className="btn btn-danger"
                                    onClick={handleCancel}
                                    disabled={cancelLoading}
                                    whileTap={{ scale: 0.98 }}
                                    style={{ width: '100%', padding: '14px', fontSize: 15, justifyContent: 'center', minHeight: '44px' }}
                                >
                                    {cancelLoading ? 'Cancelling...' : 'Cancel Order'}
                                </motion.button>
                            </>
                        )}

                        <motion.button
                            className="btn btn-outline"
                            onClick={() => navigate('/')}
                            whileTap={{ scale: 0.98 }}
                            style={{ width: '100%', padding: '14px', fontSize: 15, justifyContent: 'center', minHeight: '44px' }}
                        >
                            Start New Order
                        </motion.button>
                    </div>

                </div>
            </div>
        </motion.div>
    )
}
