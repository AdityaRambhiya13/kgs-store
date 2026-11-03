import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

export default function ShutdownPage({ status, onCheckAgain, isChecking = false }) {
  const [countdown, setCountdown] = useState(20)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (onCheckAgain) onCheckAgain()
          return 20
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [onCheckAgain])

  const title = status?.title || "Currently in Maintenance"
  const message = status?.message || "Sorry for the inconvenience. We'll be back shortly!"

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '24px 16px',
      background: 'radial-gradient(circle at 50% 15%, #1e293b 0%, #0f172a 60%, #020617 100%)',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative background glow circles */}
      <div style={{
        position: 'absolute',
        top: '-120px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0) 70%)',
        pointerEvents: 'none',
        filter: 'blur(40px)'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-100px',
        right: '10%',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0) 70%)',
        pointerEvents: 'none',
        filter: 'blur(40px)'
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'rgba(30, 41, 59, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '28px',
          padding: '44px 32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1
        }}
      >
        {/* Brand Header */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '999px',
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          marginBottom: '28px'
        }}>
          <span style={{ fontSize: '18px' }}>🌾</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#fbbf24', letterSpacing: '0.5px' }}>
            KETAN STORES • FRESH & FAST
          </span>
        </div>

        {/* Animated Maintenance Icon */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '28px' }}>
          <motion.div
            animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.04, 1] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '42px',
              margin: '0 auto',
              boxShadow: '0 12px 28px -4px rgba(245, 158, 11, 0.45)'
            }}
          >
            🛠️
          </motion.div>
          <motion.span
            animate={{ scale: [1, 1.25, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-6px',
              fontSize: '22px'
            }}
          >
            ✨
          </motion.span>
        </div>

        {/* Main Title */}
        <h1 style={{
          fontSize: '28px',
          fontWeight: 800,
          color: '#ffffff',
          lineHeight: 1.3,
          marginBottom: '16px',
          letterSpacing: '-0.5px'
        }}>
          {title}
        </h1>

        {/* Maintenance Message */}
        <p style={{
          fontSize: '16px',
          lineHeight: '1.6',
          color: '#cbd5e1',
          maxWidth: '440px',
          margin: '0 auto 32px auto'
        }}>
          {message}
        </p>

        {/* Check Status Action Button */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <button
            onClick={() => {
              setCountdown(20)
              if (onCheckAgain) onCheckAgain()
            }}
            disabled={isChecking}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '14px 28px',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              border: 'none',
              fontSize: '15px',
              fontWeight: 700,
              cursor: isChecking ? 'default' : 'pointer',
              boxShadow: '0 8px 20px -4px rgba(37, 99, 235, 0.5)',
              transition: 'all 0.2s',
              opacity: isChecking ? 0.75 : 1
            }}
          >
            <motion.span
              animate={isChecking ? { rotate: 360 } : {}}
              transition={isChecking ? { repeat: Infinity, duration: 1, ease: 'linear' } : {}}
              style={{ display: 'inline-block' }}
            >
              🔄
            </motion.span>
            <span>{isChecking ? 'Checking Store Status...' : "Check If We're Back"}</span>
          </button>

          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
            Auto-checking in <strong style={{ color: '#94a3b8' }}>{countdown}s</strong>
          </span>
        </div>
      </motion.div>
    </div>
  )
}
