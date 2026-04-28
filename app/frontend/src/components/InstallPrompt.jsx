import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function InstallPrompt() {
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    setIsIOS(ios)

    // Read status from localStorage (bug fix: was reading window.status before)
    const installStatus = localStorage.getItem('pwa_install_status')

    // 1. Capture the install prompt event (always do this regardless of status)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    })

    // 2. Don't show if already installed
    if (installStatus === 'installed') {
      const handleManualTrigger = () => setShow(true)
      window.addEventListener('pwa-manual-prompt', handleManualTrigger)
      return () => window.removeEventListener('pwa-manual-prompt', handleManualTrigger)
    }

    // 3. Show after 1 second delay unless dismissed recently
    const timer = setTimeout(() => {
      if (installStatus !== 'dismissed') {
        setShow(true)
      }
    }, 1000)

    // Listen for manual trigger from Profile (works even if dismissed)
    const handleManualTrigger = () => setShow(true)
    window.addEventListener('pwa-manual-prompt', handleManualTrigger)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('pwa-manual-prompt', handleManualTrigger)
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        localStorage.setItem('pwa_install_status', 'installed')
      }
      setDeferredPrompt(null)
      setShow(false)
    } else if (isIOS) {
      alert("To install on iOS:\n1. Tap the Share button (bottom of screen)\n2. Select 'Add to Home Screen'")
      localStorage.setItem('pwa_install_status', 'installed')
      setShow(false)
    } else {
      localStorage.setItem('pwa_install_status', 'installed')
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
