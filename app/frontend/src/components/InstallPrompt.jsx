import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function InstallPrompt() {
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isIOS, setIsIOS] = useState(false)

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
    // Read status from localStorage
    const installStatus = localStorage.getItem('pwa_install_status')

    // Check if already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    
    // If we are in standalone, definitely mark as installed
    if (isStandalone) {
      localStorage.setItem('pwa_install_status', 'installed')
      return
    } else {
      // If NOT in standalone but marked as installed, it might be a mistake (e.g. user clicked but didn't finish)
      // Or it's a different session. Let's allow manual trigger from Profile regardless.
      if (installStatus === 'installed') {
        // We'll leave it as 'installed' but ProfilePage will show it if not in standalone
      }
    }

    // Don't show automatic prompt if already marked as installed or dismissed
    if (installStatus === 'installed' || installStatus === 'dismissed') {
      const handleManualTrigger = () => setShow(true)
      window.addEventListener('pwa-manual-prompt', handleManualTrigger)
      return () => window.removeEventListener('pwa-manual-prompt', handleManualTrigger)
    }

    // Show after delay ONLY IF we have a prompt or are on iOS
    const timer = setTimeout(() => {
      if (deferredPrompt || isIOS) {
        setShow(true)
      }
    }, 3000)

    const handleManualTrigger = () => setShow(true)
    window.addEventListener('pwa-manual-prompt', handleManualTrigger)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('pwa-manual-prompt', handleManualTrigger)
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
      // If no prompt and not iOS, we can't do much, but let's not mark as installed
      alert("Installation is not supported in this browser. Try using Chrome or Safari.")
      setShow(false)
    }
  }

  const handleNotNow = () => {
    if (window.confirm("Are you sure? Installing the app gives you a much better experience and offline access.")) {
      localStorage.setItem('pwa_install_status', 'dismissed')
      setShow(false)
    }
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div 
          className="pwa-prompt-overlay"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
        >
          <div className="pwa-prompt-card">
            <div className="pwa-icon">🏪</div>
            <div className="pwa-content">
              <h3>Install Ketan Stores App</h3>
              <p>Add Ketan Stores to your home screen for a faster and smoother shopping experience!</p>
            </div>
            <div className="pwa-actions">
              <button className="pwa-btn-later" onClick={handleNotNow}>Not Now</button>
              <button className="pwa-btn-yes" onClick={handleInstall}>Yes, Install</button>
            </div>
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
              padding: 20px;
              border-radius: 20px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
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
            .pwa-content h3 {
              margin: 0 0 8px;
              font-size: 1.2rem;
              color: #111827;
            }
            .pwa-content p {
              margin: 0 0 20px;
              font-size: 0.9rem;
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
              padding: 12px;
              border-radius: 12px;
              font-weight: 600;
              cursor: pointer;
              transition: 0.2s;
              border: none;
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
