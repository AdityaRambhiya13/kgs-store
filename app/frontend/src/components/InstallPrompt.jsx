import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function InstallPrompt() {
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  useEffect(() => {
    // 1. Capture the install prompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    })

    // 2. Check logic for showing the prompt
    const status = localStorage.getItem('pwa_install_status')
    const lastPrompt = localStorage.getItem('pwa_last_prompt')
    
    if (status === 'installed') return

    const now = Date.now()
    const fourDays = 4 * 24 * 60 * 60 * 1000

    if (status === 'remind_later' && lastPrompt) {
      if (now - parseInt(lastPrompt) < fourDays) return
    }

    // 3. Wait 2 minutes (120,000 ms)
    const timer = setTimeout(() => {
      setShow(true)
    }, 120000)

    return () => clearTimeout(timer)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        localStorage.setItem('pwa_install_status', 'installed')
      }
      setDeferredPrompt(null)
    } else {
      // Fallback for iOS/Other: Just record success or show instruction
      localStorage.setItem('pwa_install_status', 'installed')
      alert("To add to home screen:\n1. Tap 'Share' (bottom center)\n2. Scroll down and tap 'Add to Home Screen'")
    }
    setShow(false)
  }

  const handleRemindLater = () => {
    localStorage.setItem('pwa_install_status', 'remind_later')
    localStorage.setItem('pwa_last_prompt', Date.now().toString())
    setShow(false)
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
            <div className="pwa-icon">🛍️</div>
            <div className="pwa-content">
              <h3>Install KGS App</h3>
              <p>Add KGS to your home screen for a faster and smoother shopping experience!</p>
            </div>
            <div className="pwa-actions">
              <button className="pwa-btn-later" onClick={handleRemindLater}>Remind Later</button>
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
