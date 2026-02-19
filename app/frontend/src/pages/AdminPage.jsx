import { useState, useEffect } from 'react'
import { listOrders, updateStatus } from '../api'
import Navbar from '../components/Navbar'
import { motion, AnimatePresence } from 'framer-motion'

export default function AdminPage() {
    const [password, setPassword] = useState('')
    const [authed, setAuthed] = useState(false)
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [expanded, setExpanded] = useState({})
    const [togglingToken, setTogglingToken] = useState(null)

    // Poll orders every 8s when authed
    useEffect(() => {
        if (!authed) return
        const fetchOrders = () => {
            listOrders(password)
                .then(data => setOrders(Array.isArray(data) ? data : []))
                .catch(() => { })
        }
        fetchOrders()
        const iv = setInterval(fetchOrders, 8000)
        return () => clearInterval(iv)
    }, [authed, password])

    const handleLogin = async () => {
        setError('')
        setLoading(true)
        try {
            const data = await listOrders(password)
            setOrders(Array.isArray(data) ? data : [])
            setAuthed(true)
        } catch (e) {
            setError(e.message || 'Invalid password')
        } finally {
            setLoading(false)
        }
    }

    const handleToggleStatus = async (token, currentStatus) => {
        const next = currentStatus === 'Processing' ? 'Ready for Pickup' : 'Processing'
        setTogglingToken(token)
        try {
            await updateStatus(token, next, password)
            setOrders(prev => prev.map(o => o.token === token ? { ...o, status: next } : o))
        } catch (e) {
            alert(e.message)
        } finally {
            setTogglingToken(null)
        }
    }

    const toggleExpand = (token) => {
        setExpanded(prev => ({ ...prev, [token]: !prev[token] }))
    }

    const processing = orders.filter(o => o.status === 'Processing')
    const ready = orders.filter(o => o.status === 'Ready for Pickup')

    if (!authed) {
        return (
            <div className="admin-page">
                <Navbar searchQuery="" onSearchChange={() => { }} />
                <div className="admin-login">
                    <motion.div
                        className="admin-login-card"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <div className="admin-avatar">🔐</div>
                        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Admin Login</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 }}>
                            Quick Shop Dashboard
                        </p>
                        <input
                            className="input"
                            type="password"
                            placeholder="Enter admin password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleLogin()}
                            style={{ marginBottom: 12 }}
                        />
                        {error && <p className="error-msg" style={{ marginBottom: 8 }}>⚠️ {error}</p>}
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
            </div>
        )
    }

    return (
        <div className="admin-page">
            {/* Header */}
            <div className="admin-header">
                <div>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>🏪 Admin Dashboard</div>
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>Quick Shop</div>
                </div>
                <button
                    className="btn btn-ghost"
                    style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', fontSize: 13 }}
                    onClick={() => { setAuthed(false); setOrders([]) }}
                >
                    Sign Out
                </button>
            </div>

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
                    <div className="stat-icon">✅</div>
                    <div className="stat-value">{ready.length}</div>
                    <div className="stat-label">Ready</div>
                </div>
            </div>

            {/* Orders */}
            <div className="orders-list">
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
                    ⏳ Processing ({processing.length})
                </h3>
                {processing.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>No pending orders</p>
                )}
                <AnimatePresence>
                    {processing.map(order => (
                        <OrderCard key={order.token} order={order} onToggle={handleToggleStatus}
                            toggling={togglingToken === order.token}
                            expanded={expanded[order.token]} onExpand={toggleExpand} />
                    ))}
                </AnimatePresence>

                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4, marginTop: 20 }}>
                    ✅ Ready for Pickup ({ready.length})
                </h3>
                {ready.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No completed orders</p>
                )}
                <AnimatePresence>
                    {ready.map(order => (
                        <OrderCard key={order.token} order={order} onToggle={handleToggleStatus}
                            toggling={togglingToken === order.token}
                            expanded={expanded[order.token]} onExpand={toggleExpand} />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    )
}

function OrderCard({ order, onToggle, toggling, expanded, onExpand }) {
    const isReady = order.status === 'Ready for Pickup'
    let items = []
    try { items = JSON.parse(order.items_json) } catch { }

    return (
        <motion.div
            className={`order-card ${isReady ? 'ready' : 'processing'}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            layout
        >
            <div className="order-card-header" onClick={() => onExpand(order.token)}>
                <div>
                    <div className="order-token">{order.token}</div>
                    <div className="order-meta">📱 {order.phone}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div className="order-amount">₹{order.total?.toFixed(0)}</div>
                    <span className={`status-pill ${isReady ? 'ready' : 'processing'}`}>
                        {isReady ? '✅ Ready' : '⏳ Processing'}
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
                                    <span>{item.name} × {item.quantity}</span>
                                    <span>₹{(item.subtotal || item.price * item.quantity)?.toFixed(0)}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="order-actions">
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {items.length} item{items.length !== 1 ? 's' : ''}
                </span>
                <motion.button
                    className={`btn ${isReady ? 'btn-ghost' : 'btn-secondary'}`}
                    style={{ padding: '7px 16px', fontSize: 13 }}
                    onClick={() => onToggle(order.token, order.status)}
                    disabled={toggling}
                    whileTap={{ scale: 0.95 }}
                >
                    {toggling
                        ? <span className="spinner spinner-sm" />
                        : isReady
                            ? '↩ Mark Processing'
                            : '✅ Mark Ready'}
                </motion.button>
            </div>
        </motion.div>
    )
}
