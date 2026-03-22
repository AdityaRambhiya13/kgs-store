import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '../CartContext'

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

export default function ProductDetailsModal({ product, onClose, mrp }) {
  const { cart, addToCart, setQuantity } = useCart()
  
  if (!product) return null

  const metadata = getAiMetadata(product)
  const cartEntry = cart[product.id]
  const qty = cartEntry?.quantity || 0

  const handleAdd = () => addToCart(product, 1)
  const handleIncrease = () => setQuantity(product.id, qty + 1)
  const handleDecrease = () => {
    if (qty <= 1) setQuantity(product.id, 0)
    else setQuantity(product.id, qty - 1)
  }

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
              <img src={product.image_url} alt={product.name} className="pdm-img" />
            </div>
            <div className="pdm-main-info">
              <div className="pdm-eta">⚡ 10 mins</div>
              <h1 className="pdm-title">{product.base_name || product.name}</h1>
              <p className="pdm-subtitle">{product.category} · {product.unit || '1 unit'}</p>
              
              <div className="pdm-price-row">
                <div className="pdm-price-block">
                  <span className="pdm-price">₹{product.price}</span>
                  {mrp && <span className="pdm-mrp">₹{mrp}</span>}
                </div>

                <div className="pdm-add-action">
                  {qty > 0 ? (
                    <div className="pc-stepper">
                      <button className="pc-step-btn" onClick={handleDecrease}>−</button>
                      <span className="pc-step-count">{qty}</span>
                      <button className="pc-step-btn" onClick={handleIncrease}>+</button>
                    </div>
                  ) : (
                    <button className="btn btn-primary" onClick={handleAdd} style={{ padding: '8px 32px' }}>
                      ADD
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

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
