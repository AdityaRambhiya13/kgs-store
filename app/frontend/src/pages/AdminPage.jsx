import { useState, useEffect, useRef } from 'react'
import { listOrders, updateStatus, listCustomers } from '../api'
import { motion, AnimatePresence } from 'framer-motion'

export default function AdminPage() {
    const [password, setPassword] = useState('')
    const [authed, setAuthed] = useState(false)
    const [activeTab, setActiveTab] = useState('orders') // 'orders' | 'customers'
    const [orders, setOrders] = useState([])
    const [customers, setCustomers] = useState([])
    const [loading, setLoading] = useState(false)
    const [loginError, setLoginError] = useState('')
    const [expanded, setExpanded] = useState({})
    const [togglingToken, setTogglingToken] = useState(null)
    const [cardError, setCardError] = useState({})   // per-token inline errors
    const intervalRef = useRef(null)

    // Poll orders every 8s when authed
    useEffect(() => {
        if (!authed) return
        const fetchData = async () => {
            try {
                if (activeTab === 'orders') {
                    const data = await listOrders(password)
                    setOrders(Array.isArray(data) ? data : [])
                } else if (activeTab === 'customers') {
                    const data = await listCustomers(password)
                    setCustomers(Array.isArray(data) ? data : [])
                }
            } catch (err) { }
        }
        fetchData()
        intervalRef.current = setInterval(fetchData, 8000)
        return () => clearInterval(intervalRef.current)
    }, [authed, password, activeTab])

    const handleLogin = async () => {
        setLoginError('')
        setLoading(true)
        try {
            const data = await listOrders(password)
            setOrders(Array.isArray(data) ? data : [])
            setAuthed(true)
        } catch (e) {
            setLoginError(e.message || 'Invalid password')
        } finally {
            setLoading(false)
        }
    }

    const handleStatusAction = async (token, nextStatus) => {
        setTogglingToken(token)
        setCardError(prev => ({ ...prev, [token]: '' }))
        try {
            await updateStatus(token, nextStatus, password)
            setOrders(prev => prev.map(o => o.token === token ? { ...o, status: nextStatus } : o))
        } catch (e) {
            setCardError(prev => ({ ...prev, [token]: e.message || 'Update failed' }))
        } finally {
            setTogglingToken(null)
        }
    }

    const toggleExpand = (token) => setExpanded(prev => ({ ...prev, [token]: !prev[token] }))

    const processing = orders.filter(o => o.status === 'Processing')
    const ready = orders.filter(o => o.status === 'Ready for Pickup')
    const delivered = orders.filter(o => o.status === 'Delivered')

    const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)

    if (!authed) {
        return (
            <motion.div
                className="admin-page"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
            >
                <div className="admin-login">
                    <motion.div
                        className="admin-login-card"
                        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <div className="admin-avatar">🔐</div>
                        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Admin Login</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 }}>KGS Grain Store Dashboard</p>

                        <input
                            className="input"
                            type="password"
                            placeholder="Enter admin password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleLogin()}
                            style={{ marginBottom: 12 }}
                        />
                        {loginError && <p className="error-msg" style={{ marginBottom: 8 }}>⚠️ {loginError}</p>}
                        <motion.button
                            className="btn btn-primary"
                            style={{ width: '100%', justifyContent: 'center', padding: '13px' }}
                            onClick={handleLogin}
                            disabled={loading || !password}
                            whileTap={{ scale: 0.97 }}
                        >
                            {loading ? <><span className="spinner spinner-sm" /> Signing in...</> : '🔓 Sign In'}
                        </motion.button>
                    </motion.div>
                </div>
            </motion.div>
        )
    }

    return (
        <motion.div
            className="admin-page"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* Header */}
            <div className="admin-header">
                <div>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>🌾 KGS Admin Dashboard</div>
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>Grain Store Management</div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end' }}>
                    <button
                        className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-ghost'}`}
                        style={activeTab !== 'orders' ? { background: 'rgba(255,255,255,0.1)', color: '#fff' } : {}}
                        onClick={() => setActiveTab('orders')}
                    >
                        📦 Orders
                    </button>
                    <button
                        className={`btn ${activeTab === 'customers' ? 'btn-primary' : 'btn-ghost'}`}
                        style={activeTab !== 'customers' ? { background: 'rgba(255,255,255,0.1)', color: '#fff' } : {}}
                        onClick={() => setActiveTab('customers')}
                    >
                        👥 Customers
                    </button>
                </div>

                <button
                    className="btn btn-ghost"
                    style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', fontSize: 13 }}
                    onClick={() => { setAuthed(false); setOrders([]); setCustomers([]); clearInterval(intervalRef.current) }}
                >
                    Sign Out
                </button>
            </div>

            {activeTab === 'orders' ? (
                <>
                    {/* Stats */}
                    <div className="admin-stats">
                        <div className="stat-card">
                            <div className="stat-icon">📦</div>
                            <div className="stat-value">{orders.length}</div>
                            <div className="stat-label">Total Orders</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">⏳</div>
                            <div className="stat-value">{processing.length}</div>
                            <div className="stat-label">Processing</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">🟡</div>
                            <div className="stat-value">{ready.length}</div>
                            <div className="stat-label">Ready</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">✅</div>
                            <div className="stat-value">{delivered.length}</div>
                            <div className="stat-label">Delivered</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">💰</div>
                            <div className="stat-value">₹{revenue.toFixed(0)}</div>
                            <div className="stat-label">Revenue</div>
                        </div>
                    </div>

                    {/* Orders — 3 lanes */}
                    <div className="orders-list">
                        {/* Lane 1: Processing */}
                        <OrderLane
                            title="⏳ Processing"
                            count={processing.length}
                            orders={processing}
                            expanded={expanded}
                            togglingToken={togglingToken}
                            cardError={cardError}
                            onExpand={toggleExpand}
                            onAction={handleStatusAction}
                            password={password}
                        />

                        {/* Lane 2: Ready for Pickup */}
                        <OrderLane
                            title="🟡 Ready for Pickup"
                            count={ready.length}
                            orders={ready}
                            expanded={expanded}
                            togglingToken={togglingToken}
                            cardError={cardError}
                            onExpand={toggleExpand}
                            onAction={handleStatusAction}
                            password={password}
                        />

                        {/* Lane 3: Delivered */}
                        <OrderLane
                            title="✅ Delivered"
                            count={delivered.length}
                            orders={delivered}
                            expanded={expanded}
                            togglingToken={togglingToken}
                            cardError={cardError}
                            onExpand={toggleExpand}
                            onAction={handleStatusAction}
                            password={password}
                        />
                    </div>
                </>
            ) : (
                <div className="customers-list" style={{ marginTop: '20px' }}>
                    <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>
                        Registered Customers ({customers.length})
                    </h3>
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {customers.length === 0 && (
                            <p style={{ color: 'var(--text-muted)' }}>No customers found.</p>
                        )}
                        {customers.map((c, i) => (
                            <motion.div
                                key={i}
                                className="order-card"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                layout
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}
                            >
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)' }}>📱 {c.phone}</div>
                                </div>
                                <div style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '12px' }}>
                                    <div style={{ marginBottom: 2 }}>Joined</div>
                                    <div style={{ fontWeight: 600, color: 'var(--secondary)' }}>{c.created_at}</div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    )
}

function OrderLane({ title, count, orders, expanded, togglingToken, cardError, onExpand, onAction }) {
    return (
        <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>
                {title} ({count})
            </h3>
            {count === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 8 }}>No orders in this lane</p>
            )}
            <AnimatePresence>
                {orders.map(order => (
                    <OrderCard
                        key={order.token}
                        order={order}
                        onAction={onAction}
                        toggling={togglingToken === order.token}
                        expanded={expanded[order.token]}
                        onExpand={onExpand}
                        inlineError={cardError[order.token]}
                    />
                ))}
            </AnimatePresence>
        </div>
    )
}

function OrderCard({ order, onAction, toggling, expanded, onExpand, inlineError }) {
    const status = order.status
    const isProcessing = status === 'Processing'
    const isReady = status === 'Ready for Pickup'
    const isDelivered = status === 'Delivered'
    const deliveryType = order.delivery_type || 'pickup'

    let items = []
    try { items = JSON.parse(order.items_json) } catch { }

    return (
        <motion.div
            className={`order-card ${isReady ? 'ready' : isDelivered ? 'delivered' : 'processing'}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            layout
        >
            <div className="order-card-header" onClick={() => onExpand(order.token)}>
                <div>
                    <div className="order-token">{order.token}</div>
                    <div className="order-meta">📱 {order.phone}</div>
                    {/* Delivery badge */}
                    <span className={`admin-delivery-badge ${deliveryType}`}>
                        {deliveryType === 'delivery' ? '🚚 Home Delivery' : '🏪 Store Pickup'}
                    </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div className="order-amount">₹{order.total?.toFixed(0)}</div>
                    <span className={`status-pill ${isReady ? 'ready' : isDelivered ? 'delivered' : 'processing'}`}>
                        {isDelivered ? '✅ Delivered' : isReady ? (deliveryType === 'delivery' ? '🚚 Out for Delivery' : '🟡 Ready') : '⏳ Processing'}
                    </span>
                </div>
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className="order-items-detail">
                            {items.map((item, i) => (
                                <div key={i} className="order-item-row">
                                    <span>{item.name} × {item.quantity} kg</span>
                                    <span>₹{(item.subtotal || item.price * item.quantity)?.toFixed(0)}</span>
                                </div>
                            ))}
                            {order.address && (
                                <div style={{ fontSize: 13, background: 'rgba(56, 189, 248, 0.1)', color: 'var(--primary)', padding: '8px 12px', borderRadius: '6px', marginTop: 12, border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                                    <strong>📍 Delivery Address:</strong>
                                    <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{order.address}</div>
                                </div>
                            )}
                            {order.delivered_at && (
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                                    Delivered at: {order.delivered_at}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Inline error */}
            {inlineError && (
                <motion.div
                    className="admin-card-error"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                >
                    ⚠️ {inlineError}
                </motion.div>
            )}

            {!isDelivered && (
                <div className="order-actions">
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {items.length} item{items.length !== 1 ? 's' : ''}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {isReady && (
                            <motion.button
                                className="btn btn-ghost"
                                style={{ padding: '7px 14px', fontSize: 12 }}
                                onClick={() => onAction(order.token, 'Processing')}
                                disabled={toggling}
                                whileTap={{ scale: 0.95 }}
                            >
                                {toggling ? <span className="spinner spinner-sm" /> : '↩ Processing'}
                            </motion.button>
                        )}

                        <motion.button
                            className={`btn ${isProcessing ? 'btn-secondary' : 'btn-primary'}`}
                            style={{ padding: '7px 16px', fontSize: 13 }}
                            onClick={() => onAction(order.token, isProcessing ? 'Ready for Pickup' : 'Delivered')}
                            disabled={toggling}
                            whileTap={{ scale: 0.95 }}
                        >
                            {toggling
                                ? <span className="spinner spinner-sm" />
                                : isProcessing
                                    ? (deliveryType === 'delivery' ? '🚚 Out for Delivery' : '✅ Mark Ready')
                                    : '📦 Mark Delivered'}
                        </motion.button>
                    </div>
                </div>
            )}

            {isDelivered && (
                <div className="order-actions" style={{ justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 12, color: 'var(--secondary)', fontWeight: 700 }}>
                        ✅ Order Completed
                    </span>
                </div>
            )}
        </motion.div>
    )
}
