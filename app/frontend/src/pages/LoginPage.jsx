import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { motion } from 'framer-motion'
import Navbar from '../components/Navbar'

export default function LoginPage() {
    const [identifier, setIdentifier] = useState('')
    const [pin, setPin] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const { login } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const from = location.state?.from?.pathname || '/'

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            await login(identifier, pin)
            navigate(from, { replace: true })
        } catch (err) {
            setError(err.message || 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <div className="catalog-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
                <motion.div
                    className="confirm-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ width: '100%', maxWidth: '400px' }}
                >
                    <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: 'var(--primary)' }}>Welcome Back</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
                        Log in to access Ketan General Stores
                    </p>

                    {error && <p className="error-msg" style={{ marginBottom: 16 }}>⚠️ {error}</p>}

                    <form onSubmit={handleSubmit}>
                        <div className="confirm-phone-group" style={{ marginBottom: 16 }}>
                            <label>Phone Number</label>
                            <input
                                type="text"
                                className="input"
                                value={identifier}
                                onChange={e => setIdentifier(e.target.value)}
                                placeholder="Enter 10-digit number"
                                required
                            />
                        </div>
                        <div className="confirm-phone-group" style={{ marginBottom: 16 }}>
                            <label>4-Digit PIN</label>
                            <input
                                type="password"
                                inputMode="numeric"
                                className="input"
                                maxLength={4}
                                value={pin}
                                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                                placeholder="••••"
                                required
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
                            <Link to="/forgot-pin" style={{ color: 'var(--secondary)', fontSize: 13, textDecoration: 'none' }}>Forgot PIN?</Link>
                        </div>
                        <motion.button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            whileTap={{ scale: 0.98 }}
                            style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 16 }}
                        >
                            {loading ? 'Logging in...' : 'Login'}
                        </motion.button>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Don't have an account? </span>
                        <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Sign up</Link>
                    </div>
                </motion.div>
            </div>
        </>
    )
}
