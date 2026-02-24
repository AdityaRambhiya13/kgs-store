import { motion } from 'framer-motion'

const CATEGORY_EMOJI = {
    Rice: '🍚',
    Wheat: '🌾',
    Jowari: '🌽',
    Bajri: '🫘',
}

export default function ProductCard({ product, onClick }) {
    const variants = product.variants ?? [product]
    const unit = variants[0].unit || 'kg'
    const minPrice = Math.min(...variants.map(v => v.price))
    const maxPrice = Math.max(...variants.map(v => v.price))
    const priceLabel = minPrice === maxPrice
        ? `₹${minPrice} / ${unit}`
        : `₹${minPrice} – ₹${maxPrice} / ${unit}`
    const variantCount = variants.length
    const emoji = CATEGORY_EMOJI[product.category] || '🌾'

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

                <div className="product-card-footer">
                    <div className="product-price">
                        {priceLabel}
                    </div>
                </div>

                <motion.button
                    className="btn btn-primary"
                    onClick={e => { e.stopPropagation(); onClick() }}
                    whileTap={{ scale: 0.95 }}
                >
                    {variantCount > 1 ? `Choose options (${variantCount})` : 'Select'}
                </motion.button>
            </div>
        </motion.div>
    )
}
