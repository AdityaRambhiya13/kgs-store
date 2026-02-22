import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOrderHistory, cancelOrder } from '../api'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../AuthContext'

export default function OrderHistoryPage() {
    const { user } = useAuth()
    const [orders, setOrders] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const navigate = useNavigate()
    const [cancelLoading, setCancelLoading] = useState(null) // store token being cancelled
    const [cancelMsg, setCancelMsg] = useState('')

    useEffect(() => {
        if (!user) {
            navigate('/')
            return
        }

        const fetchHistory = async () => {
            setLoading(true)
            try {
                const data = await getOrderHistory(user.token)
                setOrders(Array.isArray(data) ? data : [])
            } catch (e) {
                setError(e.message || 'Failed to load order history')
            } finally {
                setLoading(false)
            }
        }

        fetchHistory()
    }, [user, navigate])

    const handleCancel = async (e, token) => {
        e.stopPropagation() // prevent navigating
        setCancelLoading(token)
        try {
            const res = await cancelOrder(token)
            setCancelMsg(res.message)
            // update local state
            setOrders(prev => prev.map(o => o.token === token ? { ...o, status: 'Cancelled' } : o))
        } catch (err) {
            setCancelMsg(err.message || 'Failed to cancel order')
        } finally {
            setCancelLoading(null)
        }
    }

    const statusColor = s => s === 'Delivered' ? '#10B981' : s === 'Ready for Pickup' ? '#F59E0B' : 'var(--primary)'
    const statusEmoji = s => s === 'Delivered' ? '✅' : s === 'Ready for Pickup' ? '🟡' : '⏳'

    return (
        <div>
            <div className="confirm-page">
                <motion.div
                    className="confirm-card"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <div className="back-link" onClick={() => navigate('/')}>← Back to Shop</div>

                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                        <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
                        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>My Orders</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                            {user?.phone ? `Orders for +91 ${user.phone}` : ''}
                        </p>
                    </div>

                    {error && <p className="error-msg" style={{ marginTop: 8 }}>⚠️ {error}</p>}
                    {cancelMsg && (
                        <div style={{ padding: '12px', background: cancelMsg.includes('blocked') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', marginBottom: '16px', color: cancelMsg.includes('blocked') ? 'var(--danger)' : 'var(--accent)', fontSize: '13px', textAlign: 'center' }}>
                            {cancelMsg}
                        </div>
                    )}
                    {loading && <div style={{ textAlign: 'center', margin: '20px 0' }}><span className="spinner spinner-sm" /> Loading orders...</div>}

                    <AnimatePresence>
                        {orders !== null && !loading && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                {orders.length === 0 ? (
                                    <div className="empty-state" style={{ marginTop: 0 }}>
                                        <div className="emoji">📭</div>
                                        <h3>No orders found</h3>
                                        <p>No orders placed with this number yet.</p>
                                    </div>
                                ) : (
                                    <div>
                                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                                            {orders.length} order{orders.length !== 1 ? 's' : ''} found
                                        </p>
                                        {orders.map(order => (
                                            <motion.div
                                                key={order.token}
                                                className="order-history-card"
                                                whileHover={{ scale: 1.01 }}
                                                onClick={() => navigate(`/status/${order.token}`)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: 15 }}>{order.token}</div>
                                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                                            {order.timestamp} · {order.delivery_type === 'delivery' ? '🚚 Delivery' : '🏪 Pickup'}
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
                                                            ₹{order.total?.toFixed(0)}
                                                        </div>
                                                        <div style={{ fontSize: 12, color: statusColor(order.status), marginTop: 2 }}>
                                                            {statusEmoji(order.status)} {order.status}
                                                        </div>
                                                    </div>
                                                </div>
                                                {order.status === 'Processing' && (
                                                    <div style={{ marginTop: 12, textAlign: 'right' }}>
                                                        <button
                                                            className="btn btn-danger"
                                                            style={{ fontSize: 12, padding: '6px 12px' }}
                                                            onClick={(e) => handleCancel(e, order.token)}
                                                            disabled={cancelLoading === order.token}
                                                        >
                                                            {cancelLoading === order.token ? 'Cancelling...' : 'Cancel Order'}
                                                        </button>
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    )
}
