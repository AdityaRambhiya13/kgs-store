import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext(null)

const STORAGE_KEY = 'qs_cart'

function loadCart() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : {}
    } catch {
        return {}
    }
}

export function CartProvider({ children }) {
    const [cart, setCart] = useState(loadCart)
    const [cartOpen, setCartOpen] = useState(false)

    // Persist to localStorage any time cart changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
    }, [cart])

    const addToCart = (product, delta = 1) => {
        setCart(prev => {
            const current = prev[product.id]?.quantity || 0
            const next = Math.max(0, Math.min(100, current + delta))
            if (next === 0) {
                const { [product.id]: _, ...rest } = prev
                return rest
            }
            return {
                ...prev,
                [product.id]: {
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image_url: product.image_url,
                    quantity: next,
                },
            }
        })
    }

    const setQuantity = (productId, qty) => {
        if (qty <= 0) {
            setCart(prev => {
                const { [productId]: _, ...rest } = prev
                return rest
            })
        } else {
            setCart(prev => ({ ...prev, [productId]: { ...prev[productId], quantity: qty } }))
        }
    }

    const removeFromCart = (productId) => {
        setCart(prev => {
            const { [productId]: _, ...rest } = prev
            return rest
        })
    }

    const clearCart = () => setCart({})

    const cartItems = Object.values(cart)
    const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0)
    const cartTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)

    return (
        <CartContext.Provider value={{
            cart, cartItems, cartCount, cartTotal,
            addToCart, setQuantity, removeFromCart, clearCart,
            cartOpen, setCartOpen,
        }}>
            {children}
        </CartContext.Provider>
    )
}

export const useCart = () => {
    const ctx = useContext(CartContext)
    if (!ctx) throw new Error('useCart must be used within CartProvider')
    return ctx
}
