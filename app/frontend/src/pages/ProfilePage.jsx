import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../AuthContext'
import { updateProfile, getOrderHistory, getProfile } from '../api'

const SECURITY_QUESTIONS = [
    "What was the name of your first pet?",
    "What is your mother's maiden name?",
    "What was the name of your first school?",
    "In which city were you born?",
    "What is your favorite food?"
]

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

const statusColor = s => s === 'Delivered' ? '#2563EB' : s === 'Ready for Pickup' ? '#F59E0B' : s === 'Cancelled' ? '#EF4444' : 'var(--primary)'
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

    const [hasSecurityQuestion, setHasSecurityQuestion] = useState(true)
    const [securityQuestion, setSecurityQuestion] = useState('')
    const [securityAnswer, setSecurityAnswer] = useState('')
    const [securityError, setSecurityError] = useState('')
    const [securitySuccess, setSecuritySuccess] = useState(false)
    const [securitySaving, setSecuritySaving] = useState(false)

    useEffect(() => {
        if (!user) { navigate('/login'); return }
        setNameInput(user.name || '')

        getProfile()
            .then(data => {
                if (data) {
                    setHasSecurityQuestion(!!data.has_security_question)
                }
            })
            .catch(() => {})

        getOrderHistory()
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

    const handleSaveSecurity = async () => {
        if (!securityQuestion) {
            setSecurityError('Please select a security question')
            return
        }
        if (!securityAnswer.trim()) {
            setSecurityError('Please provide an answer')
            return
        }
        setSecurityError('')
        setSecuritySaving(true)
        try {
            await updateProfile(user?.name || '', securityQuestion, securityAnswer.trim())
            setSecuritySuccess(true)
            setHasSecurityQuestion(true)
            setSecurityAnswer('')
            setTimeout(() => setSecuritySuccess(false), 3000)
        } catch (e) {
            setSecurityError(e.message || 'Failed to update security question')
        } finally {
            setSecuritySaving(false)
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
            {/* ── In-app Back Button ── */}
            <div className="profile-page-header">
                <button
                    className="profile-back-btn"
                    onClick={() => navigate(-1)}
                    aria-label="Go back"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    Back
                </button>
            </div>

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

            {!hasSecurityQuestion && (
                <div className="profile-warning-banner" style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: 16,
                    padding: 16,
                    margin: '16px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>⚠️</span>
                        <span style={{ fontWeight: 600, color: '#EF4444' }}>Action Required</span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                        Please set a security question to enable self-service PIN recovery in the future.
                    </p>
                </div>
            )}

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
                                    <div className="profile-order-status" style={{ color: statusColor(order.status), marginBottom: order.status === 'Delivered' ? 4 : 0 }}>
                                        {statusEmoji(order.status)} {order.status}
                                    </div>
                                    {order.status === 'Delivered' && (
                                        <button
                                            className="btn btn-primary"
                                            style={{ fontSize: 10, padding: '4px 8px', height: 'auto', background: '#10B981', boxShadow: 'none' }}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                navigate(`/admin/print/${order.token}`)
                                            }}
                                        >
                                            📄 Bill
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Security Configuration ── */}
            <div className="profile-section">
                <h3 className="profile-section-title" style={{ marginBottom: 12 }}>🔐 Security Settings</h3>
                <div style={{
                    background: 'var(--card-bg, var(--surface))',
                    border: '1px solid var(--border)',
                    borderRadius: 16,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16
                }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                        {hasSecurityQuestion 
                            ? "✔️ A security question is currently set for your account. You can update it by selecting a new question and answer below."
                            : "⚠️ You have not set a security question yet. Please configure one below to enable self-service PIN recovery."
                        }
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Security Question</label>
                        <select
                            value={securityQuestion}
                            onChange={e => setSecurityQuestion(e.target.value)}
                            className="input"
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                background: 'var(--surface)',
                                color: 'var(--text)'
                            }}
                        >
                            <option value="">Select a security question</option>
                            {SECURITY_QUESTIONS.map(q => (
                                <option key={q} value={q}>{q}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Security Answer</label>
                        <input
                            type="text"
                            value={securityAnswer}
                            onChange={e => { setSecurityAnswer(e.target.value); setSecurityError('') }}
                            placeholder="Enter your secret answer"
                            className="input"
                            style={{ width: '100%' }}
                        />
                    </div>

                    {securityError && (
                        <p style={{ color: '#EF4444', fontSize: 13, margin: 0 }}>{securityError}</p>
                    )}

                    {securitySuccess && (
                        <p style={{ color: '#10B981', fontSize: 13, margin: 0, fontWeight: 500 }}>
                            ✅ Security question updated successfully!
                        </p>
                    )}

                    <motion.button
                        className="btn btn-primary"
                        onClick={handleSaveSecurity}
                        disabled={securitySaving || !securityQuestion || !securityAnswer.trim()}
                        whileTap={{ scale: 0.98 }}
                        style={{ alignSelf: 'flex-start' }}
                    >
                        {securitySaving ? 'Saving...' : 'Update Security Question'}
                    </motion.button>
                </div>
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

                    {(() => {
                        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
                        if (isStandalone) return null
                        
                        return (
                            <motion.button
                                className="profile-action-row"
                                onClick={() => window.dispatchEvent(new Event('pwa-manual-prompt'))}
                                whileTap={{ scale: 0.98 }}
                                style={{ color: '#3b82f6', fontWeight: 600 }}
                            >
                                <span>📲 Install Ketan Stores App</span>
                                <span className="profile-action-chevron">›</span>
                            </motion.button>
                        )
                    })()}

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
