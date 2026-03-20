import { motion } from 'framer-motion'

const CATEGORIES = [
  { label: 'All', emoji: '✨', color: '#2563EB', bg: 'rgba(37,99,235,0.12)' },
  { label: 'Grains & Staples', emoji: '🌾', color: '#D4A017', bg: 'rgba(212,160,23,0.12)' },
  { label: 'Dairy & Eggs', emoji: '🥛', color: '#48CAE4', bg: 'rgba(72,202,228,0.12)' },
  { label: 'Snacks & Sweets', emoji: '🍿', color: '#F72585', bg: 'rgba(247,37,133,0.12)' },
  { label: 'Beverages', emoji: '🥤', color: '#00B4D8', bg: 'rgba(0,180,216,0.12)' },
  { label: 'Essentials & Spices', emoji: '🌶️', color: '#E76F51', bg: 'rgba(231,111,81,0.12)' },
  { label: 'Instant Foods', emoji: '🍜', color: '#FFB703', bg: 'rgba(255,183,3,0.12)' },
  { label: 'Home & Hygiene', emoji: '🧼', color: '#06D6A0', bg: 'rgba(6,214,160,0.12)' },
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
