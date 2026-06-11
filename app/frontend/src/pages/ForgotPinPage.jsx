import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getSecurityQuestion, verifySecurityAnswer, resetPin } from '../api'
import { motion } from 'framer-motion'


export default function ForgotPinPage() {
    const navigate = useNavigate()
    const [step, setStep] = useState(1) // 1 = Phone, 2 = Question Answer, 3 = New PIN
    const [phone, setPhone] = useState('')
    const [securityQuestion, setSecurityQuestion] = useState('')
    const [securityAnswer, setSecurityAnswer] = useState('')
    const [userData, setUserData] = useState(null)
    const [newPin, setNewPin] = useState('')

    const [msg, setMsg] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleVerifyPhone = async (e) => {
        e.preventDefault()
        setError(''); setMsg(''); setLoading(true)
        try {
            const res = await getSecurityQuestion(phone)
            setSecurityQuestion(res.security_question)
            setStep(2)
        } catch (err) {
            setError(err.message || 'Phone not registered or security questions not set')
        } finally {
            setLoading(false)
        }
    }

    const handleVerifyAnswer = async (e) => {
        e.preventDefault()
        setError(''); setMsg(''); setLoading(true)
        try {
            const res = await verifySecurityAnswer(phone, securityAnswer)
            if (res.verified) {
                setUserData({ name: res.name, token: res.token })
                setStep(3)
            }
        } catch (err) {
            setError(err.message || 'Incorrect answer to security question')
        } finally {
            setLoading(false)
        }
    }

    const handleResetPin = async (e) => {
        e.preventDefault()
        setError(''); setMsg(''); setLoading(true)
        if (newPin.length < 4) {
            setError("PIN must be at least 4 digits")
            setLoading(false)
            return
        }

        try {
            await resetPin(userData.token, newPin)
            setMsg('PIN updated successfully! Redirecting...')
            setTimeout(() => navigate('/login'), 2000)
        } catch (err) {
            setError(err.message || 'Failed to update PIN')
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
                <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: 'var(--primary)' }}>
                    {step === 1 ? 'Reset PIN' : step === 2 ? 'Security Verification' : 'Create New PIN'}
                </h2>

                {step === 1 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>Enter your registered mobile number</p>
                )}
                {step === 2 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>Answer the security question to continue</p>
                )}
                {step === 3 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>Hey <strong style={{ color: 'var(--text)' }}>{userData?.name}</strong>, set your new security PIN.</p>
                )}

                {error && <p className="error-msg" style={{ marginBottom: 16 }}>⚠️ {error}</p>}
                {msg && <p style={{ color: 'var(--secondary)', marginBottom: 16, fontSize: 14, padding: '12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>✅ {msg}</p>}

                {step === 1 && (
                    <form onSubmit={handleVerifyPhone}>
                        <div className="confirm-phone-group" style={{ marginBottom: 24 }}>
                            <span className="phone-prefix">+91</span>
                            <input
                                type="tel"
                                className="input"
                                value={phone}
                                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                required
                                placeholder="10-digit number"
                            />
                        </div>
                        <motion.button type="submit" className="btn btn-primary" disabled={loading || phone.length !== 10} whileTap={{ scale: 0.98 }} style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 16 }}>
                            {loading ? 'Verifying...' : 'Continue'}
                        </motion.button>

                        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14 }}>
                            <Link to="/login" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>← Back to login</Link>
                        </div>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyAnswer}>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>Question</label>
                            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '8px 0 20px 0', padding: '12px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                {securityQuestion}
                            </p>
                        </div>
                        <div className="confirm-phone-group" style={{ marginBottom: 24 }}>
                            <label>Security Answer</label>
                            <input
                                type="text"
                                className="input"
                                value={securityAnswer}
                                onChange={e => setSecurityAnswer(e.target.value)}
                                required
                                placeholder="Enter answer"
                            />
                        </div>
                        <motion.button type="submit" className="btn btn-primary" disabled={loading || !securityAnswer.trim()} whileTap={{ scale: 0.98 }} style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 16 }}>
                            {loading ? 'Verifying Answer...' : 'Verify Answer'}
                        </motion.button>

                        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14 }}>
                            <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px' }}>
                                ← Use different number
                            </button>
                        </div>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleResetPin}>
                        <div className="confirm-phone-group" style={{ marginBottom: 24 }}>
                            <input
                                type="password"
                                className="input"
                                value={newPin}
                                onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                required
                                placeholder="Enter 4-digit PIN"
                                style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '18px' }}
                            />
                        </div>
                        <motion.button type="submit" className="btn btn-primary" disabled={loading || newPin.length !== 4} whileTap={{ scale: 0.98 }} style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 16 }}>
                            {loading ? 'Updating...' : 'Update PIN & Login'}
                        </motion.button>
                    </form>
                )}
            </motion.div>
        </div>
    )
}
