import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '../CartContext'
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

export default function ProductDetailsModal({ product, onClose, mrp }) {
  const { cart, addToCart } = useCart()
  
  if (!product) return null

  // Ensure we have a variants array (handle single product case)
  const variants = product.variants && product.variants.length > 0 ? product.variants : [product]
  const hasMultipleVariants = variants.length > 1
  
  // For metadata, use the first variant or the group itself
  const metadata = getAiMetadata(product)

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
        </div>

        <div className="pdm-content">
          <div className="pdm-hero">
            <div className="pdm-img-wrap">
              <img src={product.image_url} alt={product.base_name || product.name} className="pdm-img" />
            </div>
            <div className="pdm-main-info">
              <div className="pdm-eta">⚡ 10 mins</div>
              <h1 className="pdm-title">{product.base_name || product.name}</h1>
              <p className="pdm-subtitle">{product.category} · {variants[0]?.unit || product.unit}</p>
              
              {/* If single choice, show price prominently. If multiple, it's shown in the list below. */}
              {!hasMultipleVariants && (
                <div className="pdm-price-row">
                  <div className="pdm-price-block">
                    <span className="pdm-price">₹{product.price}</span>
                    <span className="pdm-mrp">₹{getMRP(product.price, product.id || 1)}</span>
                  </div>

                  <div className="pdm-add-action">
                    {getQty(product.id) > 0 ? (
                      <div className="pc-stepper">
                        <button className="pc-step-btn" onClick={() => addToCart(product, -1)}>−</button>
                        <span className="pc-step-count">{getQty(product.id)}</span>
                        <button className="pc-step-btn" onClick={() => addToCart(product, 1)}>+</button>
                      </div>
                    ) : (
                      <button className="btn btn-primary" onClick={() => addToCart(product, 1)} style={{ padding: '8px 32px' }}>
                        ADD
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
                    <div key={variant.id} className="pdm-variant-row">
                      <div className="pdm-vr-img-wrap">
                        <img src={variant.image_url || product.image_url} alt={variant.name} />
                      </div>
                      <div className="pdm-vr-info">
                        <div className="pdm-vr-name">{variant.unit || variant.name}</div>
                        {unitPrice && <div className="pdm-vr-unit-price">{unitPrice}</div>}
                      </div>
                      <div className="pdm-vr-price-col">
                        <div className="pdm-vr-price">₹{variant.price}</div>
                        <div className="pdm-vr-mrp">₹{variant.mrp || getMRP(variant.price, variant.id)}</div>
                      </div>
                      <div className="pdm-vr-action">
                        {qty > 0 ? (
                          <div className="pc-stepper small">
                            <button className="pc-step-btn" onClick={() => addToCart(variant, -1)}>−</button>
                            <span className="pc-step-count">{qty}</span>
                            <button className="pc-step-btn" onClick={() => addToCart(variant, 1)}>+</button>
                          </div>
                        ) : (
                          <button className="pdm-vr-add-btn" onClick={() => addToCart(variant, 1)}>
                            ADD
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
