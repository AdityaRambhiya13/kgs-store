import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getOrderHistory } from '../api'
import { motion, AnimatePresence } from 'framer-motion'

export default function OrderHistoryPage() {
    const [phone, setPhone] = useState('')
    const [pin, setPin] = useState('')
    const [orders, setOrders] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const mountedRef = useRef(true)
    const navigate = useNavigate()

    useEffect(() => {
        mountedRef.current = true
        return () => { mountedRef.current = false }
    }, [])

    const isValidPhone = /^[6-9]\d{9}$/.test(phone)
    const isValidPin = pin.length === 4

    const handleSearch = async () => {
        if (!isValidPhone || !isValidPin) { setError('Enter phone and 4-digit PIN'); return }
        setError('')
        setLoading(true)
        try {
            const data = await getOrderHistory(phone, pin)
            if (mountedRef.current) setOrders(Array.isArray(data) ? data : [])
        } catch (e) {
            if (mountedRef.current) setError(e.message || 'Invalid phone or PIN')
        } finally {
            if (mountedRef.current) setLoading(false)
        }
    }

    const statusColor = s => s === 'Delivered' ? '#10B981' : s === 'Ready for Pickup' ? '#F59E0B' : 'var(--primary)'
    const statusEmoji = s => s === 'Delivered' ? '✅' : s === 'Ready for Pickup' ? '🟡' : '⏳'

    return (
        <div>
            <Navbar searchQuery="" onSearchChange={() => { }} />
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
                            Enter your mobile & PIN to view past orders
                        </p>
                    </div>

                    {/* Phone */}
                    <div className="confirm-phone-group">
                        <label>Mobile Number</label>
                        <div className="phone-input-row">
                            <span className="phone-prefix">🇮🇳 +91</span>
                            <input
                                className={`input ${error ? 'error' : ''}`}
                                type="tel"
                                inputMode="numeric"
                                placeholder="9876543210"
                                maxLength={10}
                                value={phone}
                                onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setError('') }}
                                onKeyDown={e => e.key === 'Enter' && isValidPhone && handleSearch()}
                            />
                        </div>
                    </div>

                    {/* PIN */}
                    <div className="confirm-phone-group" style={{ marginTop: 12 }}>
                        <label>Security PIN</label>
                        <input
                            className={`input pin-input ${error ? 'error' : ''}`}
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="••••"
                            value={pin}
                            onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError('') }}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        />
                    </div>

                    {error && <p className="error-msg" style={{ marginTop: 8 }}>⚠️ {error}</p>}

                    <motion.button
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', fontSize: 16, padding: '15px', marginTop: 16, marginBottom: 24 }}
                        onClick={handleSearch}
                        disabled={loading || !isValidPhone || !isValidPin}
                        whileTap={{ scale: 0.97 }}
                    >
                        {loading ? <><span className="spinner spinner-sm" /> Verifying...</> : '🔍 View My Orders'}
                    </motion.button>

                    <AnimatePresence>
                        {orders !== null && (
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
