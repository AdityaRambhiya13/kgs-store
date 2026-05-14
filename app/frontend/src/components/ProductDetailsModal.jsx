import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '../CartContext'
import { useFavorites } from '../FavoritesContext'
import { getMRP } from '../utils/pricing'

// Helper to generate AI-style metadata if missing
function getAiMetadata(product) {
  const name = product.base_name || product.name
  const category = product.category?.toLowerCase() || ''
  
  let highlights = [
    { label: 'Pack Size', value: product.unit || '1 unit' },
    { label: 'Shelf Life', value: '6 - 12 Months' },
    { label: 'Storage', value: 'Store in a cool & dry place' }
  ]

  let description = [
    `${name} is carefully sourced to ensure premium quality and freshness.`,
    `Undergoes multi-stage quality checks before reaching your doorstep.`,
    `Perfectly packaged to retain aroma and nutritional value.`
  ]

  if (category.includes('grain') || category.includes('rice') || category.includes('staple')) {
    highlights.unshift({ label: 'Health Benefits', value: 'High in fiber, supports healthy digestion and sustained energy.' })
    description.push('A staple for every kitchen, ideal for daily nutritious meals.')
  } else if (category.includes('dairy') || category.includes('milk') || category.includes('egg')) {
    highlights.splice(1, 1, { label: 'Freshness', value: 'Delivered fresh within 24 hours of sourcing.' })
    highlights.push({ label: 'Veg/Non-Veg', value: category.includes('egg') ? 'Non-Vegetarian' : 'Vegetarian' })
    description.push('Keep refrigerated to maintain its natural taste and nutrients.')
  } else if (category.includes('snack') || category.includes('munch')) {
    highlights.unshift({ label: 'Taste Profile', value: 'Crispy, crunchy and bursting with authentic flavors.' })
    description.push('The perfect companion for your tea-time or mid-day cravings.')
  } else {
    highlights.unshift({ label: 'Quality', value: 'Handpicked selection of the finest grade ingredients.' })
  }

  return { highlights, description }
}

// Helper to calculate price per 100g/100ml
function getPricePerUnit(price, unit) {
  if (!unit || !price) return null
  
  // Extract number and unit (e.g., "500 ml" -> [500, "ml"])
  const match = unit.match(/(\d+(\.\d+)?)\s*([a-zA-Z]+)/)
  if (!match) return null

  const value = parseFloat(match[1])
  const unitStr = match[3].toLowerCase()

  if (isNaN(value) || value === 0) return null

  let pricePer100 = 0
  let label = "100g"

  if (unitStr === 'g') {
    pricePer100 = (price / value) * 100
    label = "100g"
  } else if (unitStr === 'kg') {
    pricePer100 = (price / (value * 1000)) * 100
    label = "100g"
  } else if (unitStr === 'ml') {
    pricePer100 = (price / value) * 100
    label = "100ml"
  } else if (unitStr === 'l' || unitStr === 'ltr' || unitStr === 'litre') {
    pricePer100 = (price / (value * 1000)) * 100
    label = "100ml"
  } else {
    return null
  }

  return `₹${pricePer100.toFixed(1)} / ${label}`
}

const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmM2Y0ZjYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjgwIiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIj4/PC90ZXh0Pjwvc3ZnPg==';

export default function ProductDetailsModal({ product, onClose, mrp }) {
  const { cart, addToCart } = useCart()
  const { isFavorite, toggleFavorite } = useFavorites()
  
  // Ensure we have a variants array (handle single product case)
  const variants = product.variants && product.variants.length > 0 ? product.variants : [product]
  const [activeVariant, setActiveVariant] = useState(variants[0] || product)
  const hasMultipleVariants = variants.length > 1
  
  if (!product) return null

  // For metadata, use the active variant
  const metadata = getAiMetadata(activeVariant)

  const getQty = (id) => cart[id]?.quantity || 0

  return (
    <div className="pdm-wrapper">
      <motion.div
        className="pdm-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="pdm-container"
        initial={{ y: '100%', opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: '100%', opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div className="pdm-header">
          <button className="pdm-close" onClick={onClose}>✕</button>
          <motion.button
            className={`pdm-fav-btn ${isFavorite(product.id) ? 'active' : ''}`}
            onClick={() => toggleFavorite(product)}
            whileTap={{ scale: 0.8 }}
            animate={isFavorite(product.id) ? { scale: [1, 1.3, 1] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
            title={isFavorite(product.id) ? 'Remove from Favorites' : 'Save to Favorites'}
          >
            <span className="pdm-fav-icon">{isFavorite(product.id) ? '❤️' : '🤍'}</span>
            <span className="pdm-fav-label">{isFavorite(product.id) ? 'Saved' : 'Save'}</span>
          </motion.button>
        </div>

        <div className="pdm-content">
          <div className="pdm-hero">
            <div className="pdm-img-wrap">
              <AnimatePresence mode="wait">
                <motion.img 
                  key={activeVariant.image_url || activeVariant.id}
                  src={activeVariant.image_url || PLACEHOLDER_IMAGE} 
                  alt={activeVariant.name} 
                  className="pdm-img" 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  onError={e => { e.target.src = PLACEHOLDER_IMAGE }}
                />
              </AnimatePresence>
              <div className="pc-return-badge" style={{ position: 'absolute', top: 12, left: 12 }}>
                <span className="pc-return-badge-icon">🔄</span>
                <span>Easy Return</span>
              </div>
            </div>
            <div className="pdm-main-info">
              <h1 className="pdm-title">
                {activeVariant.base_name 
                  ? `${activeVariant.base_name}${activeVariant.unit ? ' ' + activeVariant.unit : ''}` 
                  : activeVariant.name}
              </h1>
              <p className="pdm-subtitle">{product.category} · {activeVariant.unit}</p>
              
              {/* If single choice, show price prominently. If multiple, it's shown in the list below. */}
              {!hasMultipleVariants && (
                <div className="pdm-price-row">
                  <div className="pdm-price-block">
                    <span className="pdm-price">₹{activeVariant.price}</span>
                    <span className="pdm-mrp">₹{getMRP(activeVariant.price, activeVariant.id || 1)}</span>
                  </div>

                  <div className="pdm-add-action">
                    {getQty(activeVariant.id) > 0 ? (
                      <div className="pc-stepper">
                        <button className="pc-step-btn" onClick={() => addToCart(activeVariant, -1)}>−</button>
                        <span className="pc-step-count">{getQty(activeVariant.id)}</span>
                        <button className="pc-step-btn" onClick={() => addToCart(activeVariant, 1)}>+</button>
                      </div>
                    ) : (
                      <button 
                        className={`btn btn-primary ${activeVariant.in_stock === false ? 'disabled' : ''}`} 
                        onClick={() => activeVariant.in_stock !== false && addToCart(activeVariant, 1)} 
                        style={{ padding: '8px 32px' }}
                        disabled={activeVariant.in_stock === false}
                      >
                        {activeVariant.in_stock === false ? 'OUT OF STOCK' : 'ADD'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Variants Section (Horizontal List / Vertical List) ── */}
          {hasMultipleVariants && (
            <div className="pdm-section pdm-options-section">
              <h2 className="pdm-section-title">Select Unit</h2>
              <div className="pdm-variant-list">
                {variants.map(variant => {
                  const qty = getQty(variant.id)
                  const unitPrice = getPricePerUnit(variant.price, variant.unit)
                  
                  return (
                    <div 
                      key={variant.id} 
                      className={`pdm-variant-row ${activeVariant.id === variant.id ? 'active' : ''}`}
                      onClick={() => setActiveVariant(variant)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="pdm-vr-img-wrap">
                        <img 
                          src={variant.image_url || PLACEHOLDER_IMAGE} 
                          alt={variant.name} 
                          onError={e => { e.target.src = PLACEHOLDER_IMAGE }}
                        />
                      </div>
                      <div className="pdm-vr-info">
                        <div className="pdm-vr-name">{variant.unit || variant.name}</div>
                        {unitPrice && <div className="pdm-vr-unit-price">{unitPrice}</div>}
                      </div>
                      <div className="pdm-vr-price-col">
                        <div className="pdm-vr-price">₹{variant.price}</div>
                        <div className="pdm-vr-mrp">₹{variant.mrp || getMRP(variant.price, variant.id)}</div>
                      </div>
                      <div className="pdm-vr-action" onClick={e => e.stopPropagation()}>
                        {qty > 0 ? (
                          <div className="pc-stepper small">
                            <button className="pc-step-btn" onClick={() => addToCart(variant, -1)}>−</button>
                            <span className="pc-step-count">{qty}</span>
                            <button className="pc-step-btn" onClick={() => addToCart(variant, 1)}>+</button>
                          </div>
                        ) : (
                          <button 
                            className={`pdm-vr-add-btn ${variant.in_stock === false ? 'disabled' : ''}`} 
                            onClick={() => variant.in_stock !== false && addToCart(variant, 1)}
                            disabled={variant.in_stock === false}
                          >
                            {variant.in_stock === false ? 'NA' : 'ADD'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="pdm-section">
            <h2 className="pdm-section-title">Highlights</h2>
            <table className="pdm-highlights-table">
              <tbody>
                {metadata.highlights.map((h, i) => (
                  <tr key={i}>
                    <td className="pdm-highlights-label">{h.label}</td>
                    <td className="pdm-highlights-value">{h.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pdm-section">
            <h2 className="pdm-section-title">Description</h2>
            <ul className="pdm-desc-list">
              {metadata.description.map((d, i) => (
                <li key={i} className="pdm-desc-item">{d}</li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
