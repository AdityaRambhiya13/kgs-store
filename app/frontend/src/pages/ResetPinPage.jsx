import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { resetPin } from '../api'
import { motion } from 'framer-motion'

export default function ResetPinPage() {
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token')
    const navigate = useNavigate()

    const [newPin, setNewPin] = useState('')
    const [msg, setMsg] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!token) {
            setError('Invalid or missing reset token.')
        }
    }, [token])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (newPin.length !== 4) { setError('PIN must be 4 digits'); return }

        setError(''); setMsg(''); setLoading(true)
        try {
            const res = await resetPin(token, newPin)
            setMsg(res.message)
            setTimeout(() => navigate('/login'), 2500)
        } catch (err) {
            setError(err.message || 'Reset failed')
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
                <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: 'var(--primary)' }}>Reset PIN</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>Enter your new 4-digit security PIN</p>

                {error && <p className="error-msg" style={{ marginBottom: 16 }}>⚠️ {error}</p>}
                {msg && <p style={{ color: 'var(--secondary)', marginBottom: 16, fontSize: 14, padding: '12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>✅ {msg}</p>}

                <form onSubmit={handleSubmit}>
                    <div className="confirm-phone-group" style={{ marginBottom: 24 }}>
                        <label>New 4-Digit PIN</label>
                        <input
                            type="password" inputMode="numeric" className="input" maxLength={4}
                            value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                            required placeholder="••••" disabled={!token || msg}
                        />
                    </div>
                    <motion.button type="submit" className="btn btn-primary" disabled={loading || !token || msg} whileTap={{ scale: 0.98 }} style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 16 }}>
                        {loading ? 'Resetting...' : 'Reset PIN'}
                    </motion.button>
                </form>

                <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14 }}>
                    <Link to="/login" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>← Back to login</Link>
                </div>
            </motion.div>
        </div>
    )
}
