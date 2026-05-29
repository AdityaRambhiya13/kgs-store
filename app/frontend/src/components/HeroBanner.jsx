import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

const SLIDES = [
  {
    id: 1,
    image: '/banner-kgs.png',
    targetCategory: 'All',
    cta: 'Shop Now',
  },
  {
    id: 2,
    image: '/hero-banner.png',
    targetCategory: 'Parachute New',
    cta: 'Check Out Now',
  },
  {
    id: 3,
    image: '/dehaat-banner.png',
    targetCategory: 'Dehaat Products',
    cta: 'Check Out Now',
  },
  {
    id: 4,
    image: '/organic-india-banner.png',
    targetCategory: 'Organic India',
    cta: 'Check Out Now',
  }
]

export default function HeroBanner() {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const [direction, setDirection] = useState(1)
  const [searchParams, setSearchParams] = useSearchParams()
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)

  useEffect(() => {
    if (paused) return
    const timer = setInterval(() => {
      setDirection(1)
      setCurrent(c => (c + 1) % SLIDES.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [paused])

  const goTo = (idx) => {
    setDirection(idx > current ? 1 : -1)
    setCurrent(idx)
  }

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    setPaused(true)
  }

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    if (Math.abs(dx) > 50 && Math.abs(dx) > dy) {
      if (dx < 0) {
        setDirection(1)
        setCurrent(c => (c + 1) % SLIDES.length)
      } else {
        setDirection(-1)
        setCurrent(c => (c - 1 + SLIDES.length) % SLIDES.length)
      }
    }
    touchStartX.current = null
    touchStartY.current = null
    setPaused(false)
  }

  const handleBannerClick = (slide) => {
    if (slide.targetCategory) {
      if (slide.targetCategory === 'All') {
        setSearchParams({})
      } else {
        setSearchParams({ category: slide.targetCategory })
      }
      setTimeout(() => {
        const target = document.getElementById('catalog-main') || document.querySelector('.main-content')
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    }
  }

  const slide = SLIDES[current]

  return (
    <div
      className="hero-banner"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={slide.id}
          className="hero-slide"
          style={{
            background: slide.gradient || 'none',
            backgroundImage: slide.image ? `url(${slide.image})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center 20%', // Shorter concisely cropped view favoring the top branding/text
            cursor: 'pointer'
          }}
          onClick={() => handleBannerClick(slide)}
          custom={direction}
          variants={{
            enter: (d) => ({ opacity: 0, x: d > 0 ? 50 : -50 }),
            center: { opacity: 1, x: 0 },
            exit: (d) => ({ opacity: 0, x: d > 0 ? -50 : 50 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* For full image banners */}
          {slide.image && (
            <div className="hero-image-overlay">
              <motion.button
                className="hero-overlay-cta"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {slide.cta} →
              </motion.button>
            </div>
          )}

          {/* For designed banners like Ketan General Store */}
          {!slide.image && (
            <>
              <div className="hero-blob" />
              <div className="hero-content">
                <motion.div
                  className="hero-badge"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {slide.badge}
                </motion.div>

                <motion.h1
                  className="hero-heading"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 }}
                >
                  {slide.heading.split('\n').map((line, i) => (
                    <span key={i}>{line}<br /></span>
                  ))}
                </motion.h1>

                <motion.p
                  className="hero-sub"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.28 }}
                >
                  {slide.sub}
                </motion.p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
                  <motion.button
                    className="btn btn-secondary"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ fontSize: '13px', padding: '8px 18px' }}
                  >
                    {slide.cta}
                  </motion.button>
                  {slide.pill1 && (
                    <span className="hero-pill" style={{ opacity: 0.9, fontSize: '11px', padding: '4px 10px' }}>
                      {slide.pill1}
                    </span>
                  )}
                </div>
              </div>

              {slide.logo && (
                <motion.div
                  className="hero-logo-deco"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 0.18, scale: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 120 }}
                  style={{
                    position: 'absolute',
                    right: '24px',
                    bottom: '24px',
                    width: '120px',
                    height: '120px',
                    backgroundImage: `url(${slide.logo})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    pointerEvents: 'none',
                    borderRadius: '24px'
                  }}
                />
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="hero-dots">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            className={`hero-dot${i === current ? ' active' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              goTo(i)
            }}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
