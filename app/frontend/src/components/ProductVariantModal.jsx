import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '../CartContext'
import { useNavigate } from 'react-router-dom'

export default function ProductVariantModal({ group, onClose }) {
    const { cart, addToCart, setQuantity, cartCount, setCartOpen } = useCart()
    const [addedId, setAddedId] = useState(null)
    const navigate = useNavigate()

    if (!group) return null

    const handleAdd = (variant) => {
        const existing = cart[variant.id]
        if (existing) {
            setQuantity(variant.id, existing.quantity + 1)
        } else {
            addToCart(variant, 1)
        }
        setAddedId(variant.id)
        setTimeout(() => setAddedId(null), 1500)
    }

    const handleIncrease = (variant) => {
        const existing = cart[variant.id]
        if (existing) setQuantity(variant.id, existing.quantity + 1)
    }

    const handleDecrease = (variant) => {
        const existing = cart[variant.id]
        if (!existing) return
        if (existing.quantity <= 1) setQuantity(variant.id, 0)
        else setQuantity(variant.id, existing.quantity - 1)
    }

    const handleViewCart = () => {
        onClose()
        setCartOpen(true)
    }

    return (
        <AnimatePresence>
            {group && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Bottom sheet */}
                    <motion.div
                        className="variant-modal"
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                        role="dialog"
                        aria-modal="true"
                        aria-label={`Select price for ${group.base_name}`}
                    >
                        <div className="variant-modal-handle" />

                        {/* Header */}
                        <div className="variant-modal-header">
                            <div className="vm-img-wrap">
                                <img
                                    src={group.image_url}
                                    alt={group.base_name}
                                    className="variant-modal-img"
                                    onError={e => {
                                        e.target.src = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop'
                                    }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div className="variant-modal-title">{group.base_name}</div>
                                <div className="variant-modal-category">{group.category}</div>
                                <div className="vm-desc">
                                    {group.variants?.length} price{group.variants?.length !== 1 ? 's' : ''} available · per kg
                                </div>
                            </div>
                            <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
                        </div>

                        <p className="variant-modal-hint">Select quantity & price per kg</p>

                        {/* Variants list */}
                        <div className="variant-list">
                            {group.variants.map(variant => {
                                const cartEntry = cart[variant.id]
                                const qty = cartEntry?.quantity || 0
                                const justAdded = addedId === variant.id

                                return (
                                    <motion.div
                                        key={variant.id}
                                        className={`variant-row ${justAdded ? 'just-added' : ''}`}
                                        animate={justAdded ? { backgroundColor: ['rgba(16,185,129,0.12)', 'rgba(16,185,129,0)'] } : {}}
                                        transition={{ duration: 1 }}
                                    >
                                        <div className="variant-info">
                                            <div className="variant-price">
                                                ₹{variant.price}<span>/kg</span>
                                            </div>
                                            <div className="variant-grade">{variant.name}</div>
                                        </div>

                                        <div className="variant-actions">
                                            {qty > 0 ? (
                                                <div className="qty-stepper">
                                                    <motion.button
                                                        className="qty-btn"
                                                        onClick={() => handleDecrease(variant)}
                                                        whileTap={{ scale: 0.82 }}
                                                    >
                                                        −
                                                    </motion.button>
                                                    <span className="qty-label">{qty} kg</span>
                                                    <motion.button
                                                        className="qty-btn qty-btn-plus"
                                                        onClick={() => handleIncrease(variant)}
                                                        whileTap={{ scale: 0.82 }}
                                                    >
                                                        +
                                                    </motion.button>
                                                </div>
                                            ) : (
                                                <motion.button
                                                    className={`btn ${justAdded ? 'btn-added' : 'btn-primary'} variant-add-btn`}
                                                    onClick={() => handleAdd(variant)}
                                                    whileTap={{ scale: 0.88 }}
                                                    animate={justAdded ? { scale: [1, 1.14, 1] } : {}}
                                                    transition={{ duration: 0.3 }}
                                                >
                                                    {justAdded ? (
                                                        <motion.span
                                                            initial={{ opacity: 0, y: -8 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                        >
                                                            ✓ Added!
                                                        </motion.span>
                                                    ) : '+ Add'}
                                                </motion.button>
                                            )}
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>

                        {/* View Cart shortcut */}
                        <AnimatePresence>
                            {cartCount > 0 && (
                                <motion.div
                                    className="vm-footer"
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 16 }}
                                    transition={{ duration: 0.25 }}
                                >
                                    <button className="btn btn-secondary vm-view-cart" onClick={handleViewCart}>
                                        🛒 View Cart ({cartCount} kg) →
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
