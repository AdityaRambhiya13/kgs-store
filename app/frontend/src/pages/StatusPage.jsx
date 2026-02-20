import { useState, useEffect, useRef, Suspense, lazy } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getOrder } from '../api'
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

    const isReady = order?.status === 'Ready for Pickup'
    const isDelivered = order?.status === 'Delivered'
    const deliveryType = order?.delivery_type || 'pickup'
    let items = []
    try { items = order ? JSON.parse(order.items_json) : [] } catch { }

    if (loading) {
        return (
            <div>

                <div className="status-page">
                    <div className="status-center">
                        <div style={{ margin: '80px auto', display: 'flex', justifyContent: 'center' }}>
                            <div className="spinner" style={{ width: 48, height: 48, borderWidth: 4 }} />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (notFound) {
        return (
            <div>

                <div className="status-page">
                    <div className="status-center">
                        <div className="empty-state" style={{ marginTop: 60 }}>
                            <div className="emoji">😕</div>
                            <h3>Order Not Found</h3>
                            <p>Token <strong>{token}</strong> doesn't exist.</p>
                            <button className="btn btn-primary" onClick={() => navigate('/')} style={{ marginTop: 20 }}>
                                🛍️ Back to Shop
                            </button>
                        </div>
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
            <div className="status-page">
                <div className="status-center">
                    {/* Token card (3D) */}
                    <motion.div
                        className="token-card"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                        style={{
                            height: 300,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'radial-gradient(circle at center, rgba(255,255,255,0.1), transparent)',
                            border: 'none',
                            boxShadow: 'none',
                            padding: 0,
                            position: 'relative'
                        }}
                    >
                        <div style={{ position: 'absolute', top: 10, background: 'rgba(255,255,255,0.9)', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700, color: 'var(--text)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                            Token: {token}
                        </div>
                        <Suspense fallback={<div style={{ width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>}>
                            <Token3D token={token} isReady={isReady || isDelivered} />
                        </Suspense>
                    </motion.div>

                    {/* Progress steps */}
                    <ProgressSteps status={order.status} />

                    {/* Delivery badge */}
                    <div className="delivery-badge">
                        {deliveryType === 'delivery' ? '🚚 Home Delivery' : '🏪 Store Pickup'}
                    </div>

                    {/* Status message */}
                    <motion.div
                        className={`status-message-card ${isReady || isDelivered ? 'ready' : ''}`}
                        layout
                        transition={{ duration: 0.4 }}
                    >
                        <div className="status-emoji">
                            {isDelivered ? '✅' : isReady ? '🎉' : '⏳'}
                        </div>
                        <h3>
                            {isDelivered ? 'Order Delivered!' : isReady ? 'Order Ready!' : 'Preparing Your Order'}
                        </h3>
                        <p>
                            {isDelivered
                                ? 'Your order has been delivered. Thank you for shopping with us!'
                                : isReady
                                    ? 'Please collect your order from the counter. Thanks for shopping!'
                                    : "We're preparing your items. You'll be notified automatically when ready."}
                        </p>
                    </motion.div>

                    {/* Order accordion */}
                    {items.length > 0 && (
                        <div style={{ marginBottom: 24, width: '100%' }}>
                            <button className="accordion-toggle" onClick={() => setExpanded(e => !e)}>
                                {expanded ? '▲' : '▼'} {expanded ? 'Hide' : 'View'} Order Details
                            </button>
                            <AnimatePresence>
                                {expanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        style={{ overflow: 'hidden' }}
                                    >
                                        <div className="confirm-order-summary">
                                            {items.map((item, i) => (
                                                <div key={i} className="confirm-item-row">
                                                    <span>{item.name} × {item.quantity} kg</span>
                                                    <span style={{ fontWeight: 600, color: 'var(--secondary)' }}>
                                                        ₹{(item.subtotal || item.price * item.quantity).toFixed(0)}
                                                    </span>
                                                </div>
                                            ))}
                                            <div className="confirm-total">
                                                <span>Total</span>
                                                <span style={{ color: 'var(--primary)' }}>₹{order.total?.toFixed(0)}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* New order button */}
                    <motion.button
                        className="btn btn-primary"
                        onClick={() => navigate('/')}
                        whileTap={{ scale: 0.96 }}
                        style={{ padding: '14px 40px', fontSize: 15 }}
                    >
                        🛍️ New Order
                    </motion.button>
                </div>
            </div>
        </motion.div>
    )
}
