import { useMemo } from 'react'
import { motion } from 'framer-motion'
import ProductCard from './ProductCard'

const FREE_DELIVERY_THRESHOLD = 299

const SECTIONS = [
  {
    id: 'trending',
    title: '🔥 Trending Near You',
    filter: (products) => products.slice().sort((a, b) => (b.id % 7) - (a.id % 7)).slice(0, 8),
  },
  {
    id: 'deals',
    title: '💥 Deals of the Day',
    filter: (products) => products.filter((_, i) => i % 3 === 0).slice(0, 8),
  },
  {
    id: 'under99',
    title: '💸 Under ₹99',
    filter: (products) =>
      products.filter(p => {
        const minPrice = Math.min(...(p.variants ?? [p]).map(v => v.price))
        return minPrice < 99
      }).slice(0, 8),
  },
  {
    id: 'buyagain',
    title: '🔁 Buy Again',
    filter: (products) => products.slice().reverse().slice(0, 8),
  },
]

export default function SmartSections({ products, onCardClick }) {
  const sectionsWithData = useMemo(() =>
    SECTIONS.map(s => ({ ...s, items: s.filter(products) })).filter(s => s.items.length > 0),
    [products]
  )

  if (!products.length) return null

  return (
    <div className="smart-sections">
      {sectionsWithData.map((section, si) => (
        <div key={section.id} className="smart-section">
          <div className="smart-section-header">
            <h2 className="smart-section-title">{section.title}</h2>
          </div>
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
                  onClick={() => onCardClick?.({ ...product, variants: product.variants?.length ? product.variants : [product] })}
                />
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
