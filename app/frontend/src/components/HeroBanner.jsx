import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const SLIDES = [
  {
    id: 1,
    gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 50%, #60A5FA 100%)',
    badge: '⚡ 10-Min Delivery',
    heading: 'Fresh Groceries,\nIn Minutes',
    sub: 'Order before 10 PM — delivered to your door blazing fast',
    cta: 'Shop Now',
    pill1: '🎉 ₹50 OFF',
    pill2: '🚚 Free Delivery',
    emoji: '🥬',
  },
  {
    id: 2,
    gradient: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 60%, #FFD700 100%)',
    badge: '🔥 Deals of the Day',
    heading: 'Staples &\nGrain Goodness',
    sub: 'Best quality rice, wheat, daals — straight from the source',
    cta: 'Explore Deals',
    pill1: '💸 Up to 30% Off',
    pill2: '⭐ Top Rated',
    emoji: '🌾',
  },
  {
    id: 3,
    gradient: 'linear-gradient(135deg, #6C63FF 0%, #a855f7 60%, #ec4899 100%)',
    badge: '✨ New Arrivals',
    heading: 'Premium\nOrganic Range',
    sub: 'Handpicked organic products for a healthier lifestyle',
    cta: 'Discover',
    pill1: '🌿 100% Organic',
    pill2: '📦 Free Box',
    emoji: '🍎',
  },
]

export default function HeroBanner() {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const timer = setInterval(() => {
      setCurrent(c => (c + 1) % SLIDES.length)
    }, 3500)
    return () => clearInterval(timer)
  }, [paused])

  const slide = SLIDES[current]

  return (
    <div
      className="hero-banner"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          className="hero-slide"
          style={{ background: slide.gradient }}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Glow blob */}
          <div className="hero-blob" />

          <div className="hero-content">
            {/* Badge */}
            <motion.div
              className="hero-badge"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {slide.badge}
            </motion.div>

            {/* Heading */}
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

            {/* Pills */}
            <motion.div
              className="hero-pills"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <span className="hero-pill">{slide.pill1}</span>
              <span className="hero-pill">{slide.pill2}</span>
            </motion.div>
          </div>

          {/* Big emoji decoration */}
          <motion.div
            className="hero-emoji-deco"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
          >
            {slide.emoji}
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Dot navigation */}
      <div className="hero-dots">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            className={`hero-dot${i === current ? ' active' : ''}`}
            onClick={() => setCurrent(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
