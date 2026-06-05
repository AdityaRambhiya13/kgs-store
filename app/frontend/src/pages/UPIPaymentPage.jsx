import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeCanvas } from 'qrcode.react'
import { getOrder } from '../api'

export default function UPIPaymentPage() {
    const navigate = useNavigate()
    const location = useLocation()
    
    // Recover state from sessionStorage if page is refreshed
    const { orderToken: stateToken, total: stateTotal } = location.state || {}
    
    const [orderToken] = useState(() => {
        const t = stateToken || sessionStorage.getItem('pendingUpiToken')
        if (stateToken) sessionStorage.setItem('pendingUpiToken', stateToken)
        return t
    })
    
    const [total] = useState(() => {
        const amt = stateTotal || Number(sessionStorage.getItem('pendingUpiTotal') || 0)
        if (stateTotal) sessionStorage.setItem('pendingUpiTotal', String(stateTotal))
        return amt
    })

    const [step, setStep] = useState('pay')   // 'pay' | 'confirmed'
    const [orderData, setOrderData] = useState(null)
    const [timeLeft, setTimeLeft] = useState(900) // 15 min QR expiry
    const timerRef = useRef(null)

    useEffect(() => {
        if (!orderToken) {
            navigate('/', { replace: true })
            return
        }

        const controller = new AbortController()

        // Function to fetch order details and check status
        const checkStatus = async () => {
            try {
                const data = await getOrder(orderToken, controller.signal)
                setOrderData(data)
                
                // If payment is confirmed (paid) or order is ready/delivered, transition
                if (data.payment_status === 'paid' || data.status === 'Ready for Pickup' || data.status === 'Delivered') {
                    setStep('confirmed')
                    clearInterval(timerRef.current)
                }
            } catch (err) {
                if (err?.name !== 'AbortError') {
                    console.error("Failed to fetch order details:", err)
                }
            }
        }

        // Initial fetch
        checkStatus()

        // 15-minute QR Code timer
        timerRef.current = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    clearInterval(timerRef.current)
                    return 0
                }
                return t - 1
            })
        }, 1000)

        // Polling interval (every 4 seconds) as robust fallback
        const pollInterval = setInterval(() => {
            checkStatus()
        }, 4000)

        // WebSocket for real-time updates
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        let host = window.location.host
        
        const envApiUrl = import.meta.env.VITE_API_URL
        if (envApiUrl) {
            try {
                host = envApiUrl.replace(/^https?:\/\//, '').split('/')[0]
            } catch (e) {
                console.error("Failed to parse VITE_API_URL for WebSocket:", e)
            }
        } else if (window.location.hostname === 'localhost') {
            host = 'localhost:8000'
        }

        const wsUrl = `${protocol}//${host}/ws/customer`
        const ws = new WebSocket(wsUrl)

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                if ((data.type === 'status_update' || data.type === 'payment_confirmed' || data.type === 'payment_rejected') && data.token === orderToken) {
                    checkStatus()
                }
            } catch (err) {
                console.error("WS message parse error:", err)
            }
        }

        ws.onclose = () => console.log("UPI Page WebSocket closed")
        ws.onerror = (err) => console.error("UPI Page WebSocket error:", err)

        return () => {
            controller.abort()
            clearInterval(timerRef.current)
            clearInterval(pollInterval)
            ws.close()
        }
    }, [orderToken, navigate])

    const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
    const isExpired = timeLeft === 0

    const upiDeepLink = total
        ? `upi://pay?pa=paytmqr6iswg6@ptys&pn=KGS%20Store&am=${total.toFixed(2)}&cu=INR&tn=Order%20${orderToken}`
        : null

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
                                    background: 'white',
                                    border: isExpired ? '3px solid #ef4444' : '3px solid #2563eb',
                                    borderRadius: 20,
                                    padding: '12px',
                                    display: 'inline-block',
                                    position: 'relative',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.05)'
                                }}>
                                    <QRCodeCanvas
                                        value={upiDeepLink}
                                        size={220}
                                        level="M"
                                        includeMargin={false}
                                        style={{ display: 'block', borderRadius: 8 }}
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
                                <div style={{ fontWeight: 800, fontSize: 16, color: '#1c1c1c', letterSpacing: '0.5px' }}>paytmqr6iswg6@ptys</div>
                                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>KGS Store</div>
                            </div>

                            {/* Verification Animation and Message */}
                            {!isExpired && (
                                <div style={{
                                    marginTop: 16,
                                    padding: '20px 16px',
                                    background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05), rgba(99, 102, 241, 0.05))',
                                    border: '1.5px solid rgba(37, 99, 235, 0.15)',
                                    borderRadius: 16,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 12,
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: 44, height: 44 }}>
                                        {/* Pulsing outer ring */}
                                        <motion.div
                                            animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0.2, 0.6] }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                borderRadius: '50%',
                                                border: '2px solid #3b82f6'
                                            }}
                                        />
                                        {/* Spinning inner circle */}
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                            style={{
                                                width: 24,
                                                height: 24,
                                                borderRadius: '50%',
                                                border: '2.5px solid #e2e8f0',
                                                borderTopColor: '#3b82f6'
                                            }}
                                        />
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: '#1e293b' }}>
                                            Your payment is being verified
                                        </h4>
                                        <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.4, fontWeight: 500 }}>
                                            Do not close this page or click back. We will automatically redirect you once confirmed.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {step === 'confirmed' && (
                        <motion.div
                            key="confirmed"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            style={{ textAlign: 'center', padding: '10px 0' }}
                        >
                            {!orderData ? (
                                <div style={{ padding: '40px 0' }}>
                                    <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }} />
                                    <p style={{ color: '#64748b', fontSize: 14 }}>Fetching confirmation details...</p>
                                </div>
                            ) : (
                                <div>
                                    {/* Success Icon Animation */}
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                                        <motion.div
                                            initial={{ scale: 0.3, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                                            style={{
                                                width: 72,
                                                height: 72,
                                                borderRadius: '50%',
                                                background: '#dcfce7',
                                                color: '#15803d',
                                                fontSize: 36,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: '0 8px 20px rgba(22,101,52,0.15)'
                                            }}
                                        >
                                            🎉
                                        </motion.div>
                                    </div>

                                    <h2 style={{ fontSize: 24, fontWeight: 900, color: '#111827', marginBottom: 6 }}>
                                        Payment Confirmed!
                                    </h2>
                                    <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 24px' }}>
                                        Your order is confirmed and is now being prepared.
                                    </p>

                                    {/* Delivery OTP Card */}
                                    {orderData.delivery_otp && (
                                        <div style={{
                                            background: 'linear-gradient(135deg, rgba(37,99,235,0.06), rgba(99,102,241,0.06))',
                                            border: '2.5px solid #2563eb',
                                            borderRadius: 20,
                                            padding: '20px',
                                            marginBottom: 24,
                                            textAlign: 'center',
                                            boxShadow: '0 10px 25px rgba(37,99,235,0.08)'
                                        }}>
                                            <div style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 6 }}>
                                                🔐 Your Delivery PIN / OTP
                                            </div>
                                            <div style={{ fontSize: 40, fontWeight: 900, color: '#2563eb', letterSpacing: '8px', margin: '8px 0', textIndent: '8px' }}>
                                                {orderData.delivery_otp}
                                            </div>
                                            <div style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.5, fontWeight: 500 }}>
                                                Please share this PIN with the delivery person when they arrive. <strong>Do not share it before delivery.</strong>
                                            </div>
                                        </div>
                                    )}

                                    {/* Order Summary Details */}
                                    <div style={{
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: 16,
                                        padding: '18px',
                                        textAlign: 'left',
                                        marginBottom: 24
                                    }}>
                                        <h3 style={{ fontSize: 14, fontWeight: 800, color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: 10, margin: '0 0 12px' }}>
                                            Order Summary
                                        </h3>
                                        
                                        {/* Items List */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                                            {(() => {
                                                let items = []
                                                try {
                                                    items = typeof orderData.items_json === 'string' 
                                                        ? JSON.parse(orderData.items_json) 
                                                        : (orderData.items_json || [])
                                                } catch (e) {
                                                    console.error("Error parsing items_json:", e)
                                                }
                                                return items.map((item, idx) => (
                                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#475569' }}>
                                                        <span>{item.name} <strong style={{ color: '#64748b' }}>x{item.quantity}</strong></span>
                                                        <span style={{ fontWeight: 600, color: '#1e293b' }}>
                                                            ₹{(item.subtotal || (item.price * item.quantity)).toFixed(0)}
                                                        </span>
                                                    </div>
                                                ))
                                            })()}
                                        </div>

                                        {/* Cost Summary & Address */}
                                        <div style={{ borderTop: '1px dotted #cbd5e1', paddingTop: 12, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                                                <span>Total Paid</span>
                                                <span style={{ color: '#10b981' }}>₹{orderData.total?.toFixed(0)}</span>
                                            </div>
                                            <div style={{ fontSize: 11, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Order ID:</span>
                                                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{orderToken}</span>
                                            </div>
                                            {orderData.address && (
                                                <div style={{ marginTop: 8, padding: '10px', background: '#fafafa', borderRadius: 8, fontSize: 12, color: '#475569', lineHeight: 1.5, borderLeft: '3px solid #cbd5e1' }}>
                                                    <strong style={{ display: 'block', marginBottom: 2 }}>📍 Delivery Address:</strong>
                                                    {(() => {
                                                        try {
                                                            const addr = typeof orderData.address === 'string' ? JSON.parse(orderData.address) : orderData.address
                                                            if (addr && typeof addr === 'object' && !addr.raw) {
                                                                return `${addr.flat_no || ''}, ${addr.building_name || ''}, ${addr.road_name || ''}, ${addr.area_name || ''}${addr.landmark ? ` (Landmark: ${addr.landmark})` : ''}, PIN: ${addr.pincode || ''}`
                                                            }
                                                            return addr.raw || orderData.address
                                                        } catch (e) {
                                                            return orderData.address
                                                        }
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <motion.button
                                            whileTap={{ scale: 0.97 }}
                                            onClick={() => navigate(`/status/${orderToken}`)}
                                            style={{
                                                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                                                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                                                color: 'white', fontWeight: 800, fontSize: 15, cursor: 'pointer',
                                                boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
                                            }}
                                        >
                                            🎯 Track Live Status
                                        </motion.button>
                                        <motion.button
                                            whileTap={{ scale: 0.97 }}
                                            onClick={() => {
                                                sessionStorage.removeItem('pendingUpiToken')
                                                sessionStorage.removeItem('pendingUpiTotal')
                                                navigate('/')
                                            }}
                                            style={{
                                                width: '100%', padding: '14px', borderRadius: 12,
                                                border: '2px solid #e2e8f0', background: 'white',
                                                color: '#374151', fontWeight: 700, fontSize: 15, cursor: 'pointer'
                                            }}
                                        >
                                            🛒 Shop More
                                        </motion.button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    )
}
