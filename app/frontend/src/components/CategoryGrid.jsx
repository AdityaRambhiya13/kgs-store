import { motion } from 'framer-motion'

const CATEGORIES = [
  { label: 'All', emoji: '✨', color: '#6C63FF', bg: 'rgba(108,99,255,0.12)' },
  { label: 'Rice', emoji: '🍚', color: '#FF8C00', bg: 'rgba(255,140,0,0.12)' },
  { label: 'Wheat', emoji: '🌾', color: '#D4A017', bg: 'rgba(212,160,23,0.12)' },
  { label: 'Jowari', emoji: '🌽', color: '#E63946', bg: 'rgba(230,57,70,0.12)' },
  { label: 'Bajri', emoji: '🫘', color: '#1E40AF', bg: 'rgba(30,64,175,0.12)' },
  { label: 'Daals & Pulses', emoji: '🫛', color: '#E76F51', bg: 'rgba(231,111,81,0.12)' },
  { label: 'Dairy', emoji: '🥛', color: '#48CAE4', bg: 'rgba(72,202,228,0.12)' },
  { label: 'Snacks', emoji: '🍿', color: '#F72585', bg: 'rgba(247,37,133,0.12)' },
]

export default function CategoryGrid({ activeCategory, onSelect }) {
  return (
    <div className="category-grid-section">
      <div className="category-grid">
        {CATEGORIES.map((cat, i) => (
          <motion.button
            key={cat.label}
            className={`category-tile${activeCategory === cat.label ? ' active' : ''}`}
            style={{
              '--cat-color': cat.color,
              '--cat-bg': cat.bg,
            }}
            onClick={() => onSelect(cat.label)}
            whileTap={{ scale: 0.92 }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
          >
            <div
              className="category-icon"
              style={{ background: activeCategory === cat.label ? cat.color : cat.bg }}
            >
              <span>{cat.emoji}</span>
            </div>
            <span className="category-label">{cat.label.split(' ')[0]}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
