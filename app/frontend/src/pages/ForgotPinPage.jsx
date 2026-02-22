import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPin } from '../api'
import { motion } from 'framer-motion'

export default function ForgotPinPage() {
    const [email, setEmail] = useState('')
    const [msg, setMsg] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(''); setMsg(''); setLoading(true)
        try {
            const res = await forgotPin(email)
            setMsg(res.message)
        } catch (err) {
            setError(err.message || 'Request failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="catalog-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
            <motion.div
                className="confirm-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                style={{ width: '100%', maxWidth: '400px' }}
            >
                <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: 'var(--primary)' }}>Forgot PIN?</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>Enter your registered email address</p>

                {error && <p className="error-msg" style={{ marginBottom: 16 }}>⚠️ {error}</p>}
                {msg && <p style={{ color: 'var(--secondary)', marginBottom: 16, fontSize: 14, padding: '12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>✅ {msg}</p>}

                <form onSubmit={handleSubmit}>
                    <div className="confirm-phone-group" style={{ marginBottom: 24 }}>
                        <label>Email Address</label>
                        <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} required placeholder="john@example.com" />
                    </div>
                    <motion.button type="submit" className="btn btn-primary" disabled={loading} whileTap={{ scale: 0.98 }} style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 16 }}>
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </motion.button>
                </form>

                <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14 }}>
                    <Link to="/login" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>← Back to login</Link>
                </div>
            </motion.div>
        </div>
    )
}
