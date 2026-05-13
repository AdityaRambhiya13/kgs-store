import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function InstallPrompt() {
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isIOS, setIsIOS] = useState(false)
  const [secondaryMessage, setSecondaryMessage] = useState(false)

  useEffect(() => {
    // 1. Capture the install prompt event
    const handlePrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handlePrompt)

    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    setIsIOS(ios)

    return () => window.removeEventListener('beforeinstallprompt', handlePrompt)
  }, [])

  useEffect(() => {
    const isDismissed = sessionStorage.getItem('pwa_install_dismissed') === 'true'

    // Check if actually running as installed PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    
    if (isStandalone) {
      localStorage.setItem('pwa_install_status', 'installed')
      return
    } else {
      if (localStorage.getItem('pwa_install_status') === 'installed') {
        localStorage.removeItem('pwa_install_status')
      }
    }

    // Manual trigger (from profile page)
    const handleManualTrigger = () => setShow(true)
    window.addEventListener('pwa-manual-prompt', handleManualTrigger)

    // Don't auto-show if already dismissed this session
    if (isDismissed) {
      return () => window.removeEventListener('pwa-manual-prompt', handleManualTrigger)
    }

    // SMART TIMING: Show after first cart add — not on page load
    const cartAddCount = parseInt(localStorage.getItem('kgs_cart_add_count') || '0', 10)
    
    const handleCartAdd = () => {
      const newCount = parseInt(localStorage.getItem('kgs_cart_add_count') || '0', 10) + 1
      localStorage.setItem('kgs_cart_add_count', String(newCount))
      
      // Show prompt after 3rd item add (user is engaged, not just browsing)
      if (newCount >= 3 && (deferredPrompt || isIOS)) {
        setTimeout(() => setShow(true), 800)
        window.removeEventListener('kgs-cart-add', handleCartAdd)
      }
    }
    window.addEventListener('kgs-cart-add', handleCartAdd)

    return () => {
      window.removeEventListener('pwa-manual-prompt', handleManualTrigger)
      window.removeEventListener('kgs-cart-add', handleCartAdd)
    }
  }, [deferredPrompt, isIOS])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        localStorage.setItem('pwa_install_status', 'installed')
        setShow(false)
      }
      setDeferredPrompt(null)
    } else if (isIOS) {
      alert("To install on iOS:\n1. Tap the Share button (bottom of screen)\n2. Select 'Add to Home Screen'")
      localStorage.setItem('pwa_install_status', 'installed')
      setShow(false)
    } else {
      alert("Installation is not supported in this browser. Try using Chrome or Safari.")
      setShow(false)
    }
  }

  const handleNotNow = () => {
    sessionStorage.setItem('pwa_install_dismissed', 'true')
    setSecondaryMessage(true)
    setTimeout(() => {
      setSecondaryMessage(false)
      setShow(false)
    }, 3000)
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div 
          className="pwa-prompt-overlay no-print"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
        >
          <div className="pwa-prompt-card">
            {secondaryMessage ? (
              <motion.div 
                className="pwa-secondary-msg"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="pwa-icon">💡</div>
                <h3>No problem!</h3>
                <p>You can install the app anytime from your <b>Profile</b> section.</p>
              </motion.div>
            ) : (
              <>
                <img 
                  src="/icon-512.png" 
                  alt="Ketan Stores" 
                  style={{ width: 80, height: 80, borderRadius: 20, marginBottom: 16, objectFit: 'cover', border: '1px solid #f3f4f6' }} 
                />
                <div className="pwa-content">
                  <h3>Install Ketan Stores App</h3>
                  <p>Add Ketan Stores to your home screen for a faster and smoother shopping experience!</p>
                </div>
                <div className="pwa-actions">
                  <button className="pwa-btn-later" onClick={handleNotNow}>Not Now</button>
                  <button className="pwa-btn-yes" onClick={handleInstall}>Yes, Install</button>
                </div>
              </>
            )}
          </div>

          <style dangerouslySetInnerHTML={{ __html: `
            .pwa-prompt-overlay {
              position: fixed;
              bottom: 20px;
              left: 20px;
              right: 20px;
              z-index: 9999;
              display: flex;
              justify-content: center;
              pointer-events: none;
            }
            .pwa-prompt-card {
              background: rgba(255, 255, 255, 0.95);
              backdrop-filter: blur(10px);
              padding: 24px;
              border-radius: 24px;
              box-shadow: 0 15px 50px rgba(0,0,0,0.2);
              display: flex;
              flex-direction: column;
              align-items: center;
              max-width: 400px;
              width: 100%;
              text-align: center;
              pointer-events: auto;
              border: 1px solid rgba(0,0,0,0.05);
            }
            .pwa-icon {
              font-size: 40px;
              margin-bottom: 15px;
              background: #f3f4f6;
              width: 70px;
              height: 70px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 20px;
            }
            .pwa-secondary-msg {
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .pwa-content h3, .pwa-secondary-msg h3 {
              margin: 0 0 8px;
              font-size: 1.3rem;
              font-weight: 700;
              color: #111827;
            }
            .pwa-content p, .pwa-secondary-msg p {
              margin: 0 0 20px;
              font-size: 0.95rem;
              color: #4b5563;
              line-height: 1.5;
            }
            .pwa-actions {
              display: flex;
              gap: 12px;
              width: 100%;
            }
            .pwa-actions button {
              flex: 1;
              padding: 14px;
              border-radius: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: 0.2s;
              border: none;
              font-size: 1rem;
            }
            .pwa-btn-later {
              background: #f3f4f6;
              color: #4b5563;
            }
            .pwa-btn-later:hover { background: #e5e7eb; }
            .pwa-btn-yes {
              background: #3b82f6;
              color: white;
            }
            .pwa-btn-yes:hover { background: #2563eb; }
          `}} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
