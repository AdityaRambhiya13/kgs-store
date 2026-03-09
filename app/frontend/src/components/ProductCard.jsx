import { motion } from 'framer-motion'
import { useCart } from '../CartContext'

export default function ProductCard({ product, onClick }) {
    const { cartItems, addToCart, removeFromCart } = useCart()
    const variants = product.variants ?? [product]
    const minPrice = Math.min(...variants.map(v => v.price))
    const variantCount = variants.length

    // Quick +/- only for single-variant products
    const cartItem = variantCount === 1 ? cartItems.find(item => item.product_id === variants[0].id) : null
    const qtyInCart = cartItem ? cartItem.quantity : 0

    const handleAddClick = (e) => {
        e.stopPropagation()
        if (variantCount === 1) {
            addToCart(variants[0])
        } else {
            onClick()
        }
    }

    const handleMinusClick = (e) => {
        e.stopPropagation()
        if (variantCount === 1 && qtyInCart > 0) {
            removeFromCart(variants[0].id)
        }
    }

    return (
        <motion.div
            className="product-card"
            onClick={onClick}
            style={{ cursor: 'pointer' }}
            whileTap={{ scale: 0.97 }}
        >
            {/* Product Image */}
            <div className="pc-img-wrap">
                <img
                    src={product.image_url}
                    alt={product.base_name || product.name}
                    loading="lazy"
                    className="pc-img"
                    onError={e => {
                        e.target.src = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop'
                    }}
                />
                {variantCount > 1 && (
                    <div className="pc-variants-badge">{variantCount} options</div>
                )}
            </div>

            {/* Card Body */}
            <div className="pc-body">
                <p className="pc-name">{product.base_name || product.name}</p>
                <p className="pc-category">{product.category}</p>

                <div className="pc-footer-row">
                    <span className="pc-price">₹{minPrice}</span>
                    <div className="pc-add-zone" onClick={e => e.stopPropagation()}>
                        {qtyInCart > 0 && variantCount === 1 ? (
                            <div className="pc-stepper">
                                <button className="pc-step-btn" onClick={handleMinusClick}>−</button>
                                <span className="pc-step-count">{qtyInCart}</span>
                                <button className="pc-step-btn" onClick={handleAddClick}>+</button>
                            </div>
                        ) : (
                            <motion.button
                                className="pc-add-btn"
                                onClick={handleAddClick}
                                whileTap={{ scale: 0.9 }}
                            >
                                +
                            </motion.button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
