import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

export default function UPIPaymentPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const { orderToken, total, paymentMethod } = location.state || {}

    const [step, setStep] = useState('pay')   // 'pay' | 'standby'
    const [timeLeft, setTimeLeft] = useState(900) // 15 min QR expiry
    const timerRef = useRef(null)

    useEffect(() => {
        if (!orderToken) {
            navigate('/', { replace: true })
            return
        }
        timerRef.current = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    clearInterval(timerRef.current)
                    return 0
                }
                return t - 1
            })
        }, 1000)
        return () => clearInterval(timerRef.current)
    }, [orderToken, navigate])

    const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
    const isExpired = timeLeft === 0

    const upiDeepLink = total
        ? `upi://pay?pa=7710888765@ibl&pn=KGS+Store&am=${total.toFixed(2)}&tr=${orderToken}&cu=INR&tn=KGS+Order+${orderToken}`
        : null

    const handleIPaid = () => {
        clearInterval(timerRef.current)
        setStep('standby')
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f2f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ background: 'white', borderRadius: 24, padding: '32px 28px', maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }}
            >
                <AnimatePresence mode="wait">
                    {step === 'pay' && (
                        <motion.div key="pay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            {/* Header */}
                            <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                <div style={{ fontSize: 36, marginBottom: 8 }}>📱</div>
                                <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#1c1c1c' }}>Pay via UPI</h2>
                                <p style={{ color: '#6b7280', fontSize: 14, margin: '6px 0 0' }}>
                                    Scan the QR code or tap the button to pay
                                </p>
                            </div>

                            {/* Amount */}
                            <div style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)', borderRadius: 16, padding: '16px', textAlign: 'center', marginBottom: 20 }}>
                                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Total to Pay</div>
                                <div style={{ color: 'white', fontSize: 40, fontWeight: 900, lineHeight: 1.2 }}>₹{total?.toFixed(0)}</div>
                                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>Order #{orderToken}</div>
                            </div>

                            {/* QR Code */}
                            <div style={{ position: 'relative', textAlign: 'center', marginBottom: 16 }}>
                                <div style={{
                                    background: '#f8fafc',
                                    border: isExpired ? '3px solid #ef4444' : '3px solid #2563eb',
                                    borderRadius: 20,
                                    padding: '12px',
                                    display: 'inline-block',
                                    position: 'relative'
                                }}>
                                    <img
                                        src="/kgs-qr.jpeg"
                                        alt="KGS UPI QR Code"
                                        style={{ width: 220, height: 220, objectFit: 'contain', display: 'block', borderRadius: 12 }}
                                    />
                                    {isExpired && (
                                        <div style={{
                                            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)',
                                            borderRadius: 17, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexDirection: 'column', gap: 8, color: 'white'
                                        }}>
                                            <span style={{ fontSize: 32 }}>⏱️</span>
                                            <span style={{ fontWeight: 800, fontSize: 16 }}>QR Expired</span>
                                            <button onClick={() => navigate('/')} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, padding: '6px 16px', fontWeight: 700, cursor: 'pointer' }}>
                                                Restart Order
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {/* Timer */}
                                {!isExpired && (
                                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 13, color: timeLeft < 120 ? '#ef4444' : '#6b7280', fontWeight: 600 }}>
                                            ⏱️ QR valid for: <strong style={{ color: timeLeft < 120 ? '#ef4444' : '#2563eb' }}>{formatTime(timeLeft)}</strong>
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* UPI Deep Link Button */}
                            {!isExpired && upiDeepLink && (
                                <a href={upiDeepLink} style={{ textDecoration: 'none' }}>
                                    <motion.div
                                        whileTap={{ scale: 0.97 }}
                                        style={{
                                            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                                            color: 'white', borderRadius: 14, padding: '14px', textAlign: 'center',
                                            fontWeight: 800, fontSize: 15, marginBottom: 12, cursor: 'pointer',
                                            boxShadow: '0 8px 20px rgba(37,99,235,0.3)'
                                        }}
                                    >
                                        📲 Open UPI App to Pay
                                    </motion.div>
                                </a>
                            )}

                            {/* UPI ID Text */}
                            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px', textAlign: 'center', marginBottom: 20, border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>UPI ID (manual entry)</div>
                                <div style={{ fontWeight: 800, fontSize: 16, color: '#1c1c1c', letterSpacing: '0.5px' }}>7710888765@ibl</div>
                                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>KGS Store</div>
                            </div>

                            {/* I Paid Button */}
                            {!isExpired && (
                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={handleIPaid}
                                    style={{
                                        width: '100%', padding: '16px', borderRadius: 14, border: 'none',
                                        background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white',
                                        fontWeight: 800, fontSize: 16, cursor: 'pointer',
                                        boxShadow: '0 8px 20px rgba(16,185,129,0.35)'
                                    }}
                                >
                                    ✅ I've Paid — Done!
                                </motion.button>
                            )}

                            <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 12 }}>
                                Only click after completing your UPI payment
                            </p>
                        </motion.div>
                    )}

                    {step === 'standby' && (
                        <motion.div
                            key="standby"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{ textAlign: 'center', padding: '20px 0' }}
                        >
                            {/* Animated clock */}
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                                style={{ fontSize: 72, display: 'inline-block', marginBottom: 16 }}
                            >
                                ⏳
                            </motion.div>
                            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1c1c1c', marginBottom: 12 }}>
                                Payment Submitted!
                            </h2>
                            <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.6, marginBottom: 20 }}>
                                Please standby while we verify your payment.<br />
                                <strong>This usually takes 2–5 minutes.</strong>
                            </p>
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(99,102,241,0.08))',
                                border: '2px solid rgba(37,99,235,0.25)', borderRadius: 16,
                                padding: '20px', marginBottom: 24
                            }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Order Details</div>
                                <div style={{ fontWeight: 800, fontSize: 20, color: '#1c1c1c' }}>₹{total?.toFixed(0)}</div>
                                <div style={{ color: '#6b7280', fontSize: 13 }}>Order #{orderToken}</div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => navigate(`/status/${orderToken}`)}
                                    style={{
                                        width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                                        background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                                        color: 'white', fontWeight: 800, fontSize: 15, cursor: 'pointer'
                                    }}
                                >
                                    🎯 Track My Order
                                </motion.button>
                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => navigate('/')}
                                    style={{
                                        width: '100%', padding: '14px', borderRadius: 12,
                                        border: '2px solid #e2e8f0', background: 'white',
                                        color: '#374151', fontWeight: 700, fontSize: 15, cursor: 'pointer'
                                    }}
                                >
                                    🛒 Continue Shopping
                                </motion.button>
                            </div>

                            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 16 }}>
                                You'll be notified once your order is confirmed
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    )
}
