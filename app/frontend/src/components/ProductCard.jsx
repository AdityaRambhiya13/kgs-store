import { motion } from 'framer-motion'
import { useCart } from '../CartContext'

const CATEGORY_EMOJI = {
    Rice: '🍚',
    Wheat: '🌾',
    Jowari: '🌽',
    Bajri: '🫘',
}

export default function ProductCard({ product, onClick }) {
    const { cartItems, addToCart, removeFromCart } = useCart()
    const variants = product.variants ?? [product]
    const unit = variants[0].unit || 'kg'
    const minPrice = Math.min(...variants.map(v => v.price))
    const variantCount = variants.length
    const emoji = CATEGORY_EMOJI[product.category] || '🌾'

    // Check if the exact item variant is in cart (only used for single variant items for quick + / -)
    const cartItem = variantCount === 1 ? cartItems.find(item => item.product_id === variants[0].id) : null;
    const qtyInCart = cartItem ? cartItem.quantity : 0;

    const handleAddClick = (e) => {
        e.stopPropagation();
        if (variantCount === 1) {
            addToCart(variants[0]);
        } else {
            onClick(); // Open modal for variants
        }
    }

    const handleMinusClick = (e) => {
        e.stopPropagation();
        if (variantCount === 1 && qtyInCart > 0) {
            removeFromCart(variants[0].id);
        }
    }

    return (
        <motion.div
            className="product-card"
            whileHover="hover"
            onClick={onClick}
            style={{ cursor: 'pointer' }}
        >
            {/* Image with gradient overlay */}
            <div className="pc-img-wrap">
                <motion.img
                    src={product.image_url}
                    alt={product.base_name || product.name}
                    loading="lazy"
                    className="pc-img"
                    variants={{ hover: { scale: 1.07 } }}
                    transition={{ duration: 0.38 }}
                    onError={e => {
                        e.target.src = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop'
                    }}
                />
                <div className="pc-overlay" />
            </div>

            {/* Body */}
            <div className="product-card-body">
                <div className="product-card-title-row">
                    <span className="product-card-emoji">{emoji}</span>
                    <h3 className="product-card-name">{product.base_name || product.name}</h3>
                </div>
                <div className="product-card-subtitle">{product.category}</div>

                <div className="product-card-bottom-row">
                    <div className="product-price">
                        <span>₹{minPrice}</span>
                    </div>
                    <div className="btn-add-container">
                        {qtyInCart > 0 && variantCount === 1 ? (
                            <div className="qty-stepper" onClick={e => e.stopPropagation()}>
                                <button className="qty-btn" onClick={handleMinusClick}>−</button>
                                <span className="qty-count">{qtyInCart}</span>
                                <button className="qty-btn" onClick={handleAddClick}>+</button>
                            </div>
                        ) : (
                            <motion.button
                                className="product-add-btn"
                                onClick={handleAddClick}
                                whileTap={{ scale: 0.95 }}
                            >
                                {variantCount > 1 ? `ADD (+${variantCount})` : 'ADD'}
                            </motion.button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
