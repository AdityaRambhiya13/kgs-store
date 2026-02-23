import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signup } from '../api'
import { motion } from 'framer-motion'

export default function SignupPage() {
    const [formData, setFormData] = useState({ name: '', phone: '', pin: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        if (formData.phone.length !== 10) { setError('Valid 10-digit phone required'); return }
        if (formData.pin.length !== 4) { setError('PIN must be exactly 4 digits'); return }

        setLoading(true)
        try {
            await signup(formData.phone, formData.pin, formData.name)
            // Redirect to login
            navigate('/login')
        } catch (err) {
            setError(err.message || 'Signup failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="catalog-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '90vh', padding: '20px 0' }}>
            <motion.div
                className="confirm-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ width: '100%', maxWidth: '450px' }}
            >
                <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: 'var(--primary)' }}>Create Account</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
                    Join Ketch General Stores today
                </p>

                {error && <p className="error-msg" style={{ marginBottom: 16 }}>⚠️ {error}</p>}

                <form onSubmit={handleSubmit}>
                    <div className="confirm-phone-group" style={{ marginBottom: 16 }}>
                        <label>Full Name</label>
                        <input type="text" name="name" className="input" value={formData.name} onChange={handleChange} required placeholder="John Doe" />
                    </div>



                    <div className="confirm-phone-group" style={{ marginBottom: 16 }}>
                        <label>Phone Number</label>
                        <div className="phone-input-row" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                            <span className="phone-prefix" style={{ padding: '0 12px' }}>🇮🇳 +91</span>
                            <input
                                className="input" type="tel" inputMode="numeric" maxLength={10} name="phone"
                                value={formData.phone}
                                onChange={e => handleChange({ target: { name: 'phone', value: e.target.value.replace(/\D/g, '') } })}
                                placeholder="9876543210" required
                                style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}
                            />
                        </div>
                    </div>



                    <div className="confirm-phone-group" style={{ marginBottom: 24 }}>
                        <label>Set 4-Digit PIN</label>
                        <input
                            type="password" inputMode="numeric" className="input" maxLength={4} name="pin"
                            value={formData.pin}
                            onChange={e => handleChange({ target: { name: 'pin', value: e.target.value.replace(/\D/g, '') } })}
                            placeholder="••••" required
                        />
                    </div>

                    <motion.button
                        type="submit" className="btn btn-primary" disabled={loading} whileTap={{ scale: 0.98 }}
                        style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 16 }}
                    >
                        {loading ? 'Creating...' : 'Sign up'}
                    </motion.button>
                </form>

                <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Already have an account? </span>
                    <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Log in</Link>
                </div>
            </motion.div>
        </div>
    )
}
