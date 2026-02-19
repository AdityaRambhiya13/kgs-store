import { useCart } from '../CartContext'
import { motion } from 'framer-motion'

export default function ProductCard({ product }) {
    const { cart, addToCart } = useCart()
    const qty = cart[product.id]?.quantity || 0

    return (
        <motion.div
            className="product-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            layout
        >
            <img
                className="product-card-img"
                src={product.image_url}
                alt={product.name}
                loading="lazy"
                onError={e => { e.target.src = `https://picsum.photos/seed/${product.id}/200/130` }}
            />
            <div className="product-card-body">
                <div className="product-card-name">{product.name}</div>
                <div className="product-card-desc">{product.description || ''}</div>
                <div className="product-card-footer">
                    <span className="product-price">₹{product.price.toFixed(0)}</span>
                    <span className="badge badge-primary">{product.category}</span>
                </div>
                <div className="qty-stepper">
                    <motion.button
                        className="qty-btn qty-btn-minus"
                        whileTap={{ scale: 0.8 }}
                        onClick={() => addToCart(product, -1)}
                        disabled={qty === 0}
                        style={{ opacity: qty === 0 ? 0.35 : 1 }}
                    >−</motion.button>
                    <motion.span
                        key={qty}
                        className="qty-count"
                        initial={{ scale: 1.35 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                    >
                        {qty}
                    </motion.span>
                    <motion.button
                        className="qty-btn qty-btn-plus"
                        whileTap={{ scale: 0.8 }}
                        onClick={() => addToCart(product, 1)}
                    >+</motion.button>
                </div>
            </div>
        </motion.div>
    )
}
