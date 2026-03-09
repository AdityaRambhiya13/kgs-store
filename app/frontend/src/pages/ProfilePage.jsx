import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../AuthContext'
import { updateProfile, getOrderHistory } from '../api'

function getInitials(name, phone) {
    if (name && name.trim()) {
        const parts = name.trim().split(' ')
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
        return parts[0].slice(0, 2).toUpperCase()
    }
    const digits = (phone || '').replace(/\D/g, '')
    return digits.slice(-2) || 'KG'
}

function maskPhone(phone = '') {
    const digits = phone.replace(/\D/g, '')
    if (digits.length >= 10) return '+91 \u2022\u2022\u2022\u2022 \u2022\u2022' + digits.slice(-4)
    return '\u2022\u2022\u2022\u2022\u2022\u2022'
}

const statusColor = s => s === 'Delivered' ? '#10B981' : s === 'Ready for Pickup' ? '#F59E0B' : s === 'Cancelled' ? '#EF4444' : 'var(--primary)'
const statusEmoji = s => s === 'Delivered' ? '✅' : s === 'Ready for Pickup' ? '🟡' : s === 'Cancelled' ? '❌' : '⏳'

export default function ProfilePage() {
    const { user, logout, updateName } = useAuth()
    const navigate = useNavigate()

    const [editing, setEditing] = useState(false)
    const [nameInput, setNameInput] = useState(user?.name || '')
    const [saving, setSaving] = useState(false)
    const [saveErr, setSaveErr] = useState('')
    const [saveSuccess, setSaveSuccess] = useState(false)

    const [orders, setOrders] = useState([])
    const [ordersLoading, setOrdersLoading] = useState(true)

    useEffect(() => {
        if (!user) { navigate('/login'); return }
        setNameInput(user.name || '')
        getOrderHistory(user.token)
            .then(data => setOrders(Array.isArray(data) ? data : []))
            .catch(() => setOrders([]))
            .finally(() => setOrdersLoading(false))
    }, [user, navigate])

    const totalSpend = orders.reduce((acc, o) => acc + (o.total || 0), 0)

    const handleSaveName = async () => {
        const trimmed = nameInput.trim()
        if (!trimmed || trimmed.length < 2) { setSaveErr('Name must be at least 2 characters'); return }
        setSaveErr('')
        setSaving(true)
        try {
            await updateProfile(trimmed)
            updateName(trimmed)
            setEditing(false)
            setSaveSuccess(true)
            setTimeout(() => setSaveSuccess(false), 2500)
        } catch (e) {
            setSaveErr(e.message || 'Failed to update name')
        } finally {
            setSaving(false)
        }
    }

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const initials = getInitials(user?.name, user?.phone)

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="profile-page"
        >
            {/* ── Header Card ── */}
            <div className="profile-header-card">
                {/* Avatar */}
                <motion.div
                    className="profile-avatar"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
                >
                    {initials}
                </motion.div>

                {/* Name */}
                <AnimatePresence mode="wait">
                    {editing ? (
                        <motion.div
                            key="edit"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="profile-name-edit"
                        >
                            <input
                                autoFocus
                                className="input profile-name-input"
                                value={nameInput}
                                onChange={e => { setNameInput(e.target.value); setSaveErr('') }}
                                onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                                maxLength={60}
                            />
                            {saveErr && <p className="profile-save-err">{saveErr}</p>}
                            <div className="profile-name-actions">
                                <motion.button
                                    className="btn btn-primary"
                                    style={{ padding: '8px 20px', fontSize: 14 }}
                                    onClick={handleSaveName}
                                    disabled={saving}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {saving ? 'Saving…' : 'Save'}
                                </motion.button>
                                <motion.button
                                    className="btn btn-ghost"
                                    style={{ padding: '8px 16px', fontSize: 14 }}
                                    onClick={() => { setEditing(false); setNameInput(user?.name || ''); setSaveErr('') }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Cancel
                                </motion.button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="display"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="profile-name-display"
                            onClick={() => setEditing(true)}
                        >
                            <h2 className="profile-name">{user?.name || 'Set your name'}</h2>
                            <span className="profile-edit-badge">
                                ✏️ Edit
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {saveSuccess && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="profile-save-toast"
                        >
                            ✅ Name updated!
                        </motion.div>
                    )}
                </AnimatePresence>

                <p className="profile-phone">{maskPhone(user?.phone)}</p>

                {/* Stats Row */}
                <div className="profile-stats-row">
                    <div className="profile-stat">
                        <div className="profile-stat-value">{ordersLoading ? '–' : orders.length}</div>
                        <div className="profile-stat-label">Orders</div>
                    </div>
                    <div className="profile-stat-divider" />
                    <div className="profile-stat">
                        <div className="profile-stat-value">₹{ordersLoading ? '–' : Math.round(totalSpend)}</div>
                        <div className="profile-stat-label">Total Spent</div>
                    </div>
                    <div className="profile-stat-divider" />
                    <div className="profile-stat">
                        <div className="profile-stat-value">
                            {ordersLoading ? '–' : orders.filter(o => o.status === 'Delivered').length}
                        </div>
                        <div className="profile-stat-label">Delivered</div>
                    </div>
                </div>
            </div>

            {/* ── Recent Orders ── */}
            <div className="profile-section">
                <div className="profile-section-header">
                    <h3 className="profile-section-title">📋 My Orders</h3>
                    {orders.length > 5 && (
                        <button
                            className="btn btn-ghost"
                            style={{ padding: '6px 12px', fontSize: 13 }}
                            onClick={() => navigate('/orders')}
                        >
                            View all
                        </button>
                    )}
                </div>

                {ordersLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} className="skeleton" style={{ height: 70, borderRadius: 12 }} />
                        ))}
                    </div>
                ) : orders.length === 0 ? (
                    <div className="profile-empty-orders">
                        <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
                        <p>No orders yet. Start shopping!</p>
                        <motion.button
                            className="btn btn-primary"
                            style={{ marginTop: 12 }}
                            onClick={() => navigate('/')}
                            whileTap={{ scale: 0.95 }}
                        >
                            🛒 Browse Products
                        </motion.button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {orders.slice(0, 5).map((order, i) => (
                            <motion.div
                                key={order.token}
                                className="profile-order-card"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                                onClick={() => navigate(`/status/${order.token}`)}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="profile-order-left">
                                    <div className="profile-order-token">{order.token}</div>
                                    <div className="profile-order-meta">
                                        {order.delivery_type === 'delivery' ? '🚚' : '🏪'}{' '}
                                        {order.timestamp?.split(' ')[0] || ''}
                                    </div>
                                </div>
                                <div className="profile-order-right">
                                    <div className="profile-order-amount">₹{Math.round(order.total || 0)}</div>
                                    <div className="profile-order-status" style={{ color: statusColor(order.status) }}>
                                        {statusEmoji(order.status)} {order.status}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Account Actions ── */}
            <div className="profile-section">
                <h3 className="profile-section-title" style={{ marginBottom: 12 }}>⚙️ Account</h3>

                <div className="profile-action-list">
                    <motion.button
                        className="profile-action-row"
                        onClick={() => navigate('/forgot-pin')}
                        whileTap={{ scale: 0.98 }}
                    >
                        <span>🔑 Change PIN</span>
                        <span className="profile-action-chevron">›</span>
                    </motion.button>

                    <motion.button
                        className="profile-action-row"
                        onClick={() => navigate('/orders')}
                        whileTap={{ scale: 0.98 }}
                    >
                        <span>📋 Full Order History</span>
                        <span className="profile-action-chevron">›</span>
                    </motion.button>

                    <motion.button
                        className="profile-action-row profile-action-danger"
                        onClick={handleLogout}
                        whileTap={{ scale: 0.98 }}
                    >
                        <span>🚪 Sign Out</span>
                        <span className="profile-action-chevron">›</span>
                    </motion.button>
                </div>
            </div>

            <div style={{ height: 80 }} />
        </motion.div>
    )
}
