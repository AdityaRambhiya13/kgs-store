import { useMemo } from 'react'
import { motion } from 'framer-motion'
import ProductCard from './ProductCard'

const SECTIONS = [
  {
    id: 'trending',
    title: 'Trending Near You',
    badge: { label: 'Hot', color: 'var(--accent)', bg: 'rgba(255,107,53,0.12)' },
    filter: (products) => products.slice().sort((a, b) => (b.id % 7) - (a.id % 7)).slice(0, 8),
  },
  {
    id: 'deals',
    title: 'Deals of the Day',
    badge: { label: 'Sale', color: '#D97706', bg: 'rgba(245,158,11,0.12)' },
    filter: (products) => products.filter((_, i) => i % 3 === 0).slice(0, 8),
  },
  {
    id: 'under99',
    title: 'Under ₹99',
    badge: { label: 'Value', color: '#059669', bg: 'rgba(5,150,105,0.10)' },
    filter: (products) =>
      products.filter(p => {
        const minPrice = Math.min(...(p.variants ?? [p]).map(v => v.price))
        return minPrice < 99
      }).slice(0, 8),
  },
  {
    id: 'buyagain',
    title: 'Buy Again',
    badge: { label: 'Recent', color: 'var(--primary)', bg: 'var(--primary-glow)' },
    filter: (products) => products.slice().reverse().slice(0, 8),
  },
]

export default function SmartSections({ products, onDetailClick, onVariantClick, isLoggedIn }) {
  const sectionsWithData = useMemo(() =>
    SECTIONS
      .filter(s => isLoggedIn || s.id !== 'buyagain')
      .map(s => ({ ...s, items: s.filter(products) }))
      .filter(s => s.items.length > 0),
    [products, isLoggedIn]
  )

  if (!products.length) return null

  return (
    <div className="smart-sections">
      {sectionsWithData.map((section, si) => (
        <div key={section.id} className="smart-section">
          <div className="smart-section-header">
            <h2 className="smart-section-title">{section.title}</h2>
            {section.badge && (
              <span
                className="smart-section-badge"
                style={{
                  color: section.badge.color,
                  background: section.badge.bg,
                  border: `1px solid ${section.badge.color}33`,
                }}
              >
                {section.badge.label}
              </span>
            )}
          </div>
          {/* Scroll container with right-edge gradient mask for scroll affordance */}
          <div className="smart-section-scroll-outer">
            <div className="smart-section-scroll">
              {section.items.map((product, i) => (
                <motion.div
                  key={product.base_name || product.name}
                  className="smart-card-wrap"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 + si * 0.02 }}
                >
                  <ProductCard
                    product={product}
                    onDetailClick={onDetailClick}
                    onVariantClick={onVariantClick}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
