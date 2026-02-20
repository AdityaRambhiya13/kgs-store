---
phase: 5
plan: 2
wave: 1
---

# Plan 5.2: Customer Frontend — Variant Modal + PIN Auth + Order History

## Objective
Build the Blinkit/Instamart-style product variant modal, the customer PIN setup flow (after order placement), a secure Order History page (phone + PIN), and update the Status page for delivery badge and Delivered state.

## Context
- app/frontend/src/pages/CatalogPage.jsx
- app/frontend/src/pages/ConfirmPage.jsx
- app/frontend/src/pages/StatusPage.jsx
- app/frontend/src/pages/OrderHistoryPage.jsx (NEW)
- app/frontend/src/components/ProductCard.jsx
- app/frontend/src/components/ProductVariantModal.jsx (NEW)
- app/frontend/src/components/Navbar.jsx
- app/frontend/src/App.jsx
- app/frontend/src/api.js
- app/frontend/src/index.css

## Tasks

<task type="auto">
  <name>Build ProductVariantModal + update CatalogPage grouping</name>
  <files>
    app/frontend/src/components/ProductVariantModal.jsx,
    app/frontend/src/components/ProductCard.jsx,
    app/frontend/src/pages/CatalogPage.jsx,
    app/frontend/src/index.css
  </files>
  <action>
    **CatalogPage.jsx — group by base_name:**
    Replace the `filtered` memo to return grouped products (one entry per base_name):
    ```jsx
    const grouped = useMemo(() => {
        const groups = {}
        products.forEach(p => {
            const key = p.base_name || p.name
            if (!groups[key]) groups[key] = { ...p, variants: [] }
            groups[key].variants.push(p)
        })
        return Object.values(groups)
    }, [products])

    const filtered = useMemo(() => {
        return grouped.filter(g => {
            const matchSearch = !search ||
                g.base_name.toLowerCase().includes(search.toLowerCase()) ||
                g.category.toLowerCase().includes(search.toLowerCase())
            const matchCat = activeCategory === 'All' || g.category === activeCategory
            return matchSearch && matchCat
        })
    }, [grouped, search, activeCategory])
    ```
    Add state: `const [selectedGroup, setSelectedGroup] = useState(null)`
    Render `<ProductVariantModal group={selectedGroup} onClose={() => setSelectedGroup(null)} />` below the grid.
    In the grid, render `<ProductCard product={g} onClick={() => setSelectedGroup(g)} />` — pass `onClick`.
    Remove the `delay: i * 0.03` stagger (replace with `delay: Math.min(i * 0.04, 0.6)`).

    **ProductCard.jsx — simplified card:**
    Updated card layout — shows: variety name, category badge, price range (e.g., "₹44–₹80/kg"), and a "Choose" button.
    ```jsx
    export default function ProductCard({ product, onClick }) {
        const minPrice = Math.min(...(product.variants?.map(v => v.price) ?? [product.price]))
        const maxPrice = Math.max(...(product.variants?.map(v => v.price) ?? [product.price]))
        const priceLabel = minPrice === maxPrice ? `₹${minPrice}/kg` : `₹${minPrice}–₹${maxPrice}/kg`

        return (
            <motion.div
                className="product-card"
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ duration: 0.2 }}
                onClick={onClick}
                style={{ cursor: 'pointer' }}
            >
                <div className="product-img-wrap">
                    <img src={product.image_url} alt={product.base_name} loading="lazy"
                        onError={e => { e.target.src = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop' }} />
                    <span className="product-category-badge">{product.category}</span>
                </div>
                <div className="product-info">
                    <div className="product-name">{product.base_name || product.name}</div>
                    <div className="product-price">{priceLabel}</div>
                    <div className="product-variants-hint">
                        {product.variants?.length > 1 ? `${product.variants.length} price options` : '1 option'}
                    </div>
                    <button className="btn btn-primary product-choose-btn" onClick={e => { e.stopPropagation(); onClick() }}>
                        Choose →
                    </button>
                </div>
            </motion.div>
        )
    }
    ```

    **ProductVariantModal.jsx (NEW FILE):**
    ```jsx
    import { useState } from 'react'
    import { useCart } from '../CartContext'
    import { motion, AnimatePresence } from 'framer-motion'

    export default function ProductVariantModal({ group, onClose }) {
        const { cart, addToCart } = useCart()
        const [addedId, setAddedId] = useState(null)

        if (!group) return null

        const handleAdd = (variant) => {
            addToCart(variant, 1)
            setAddedId(variant.id)
            setTimeout(() => setAddedId(null), 1200)
        }

        return (
            <AnimatePresence>
                {group && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            className="modal-backdrop"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={onClose}
                        />
                        {/* Bottom sheet */}
                        <motion.div
                            className="variant-modal"
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        >
                            <div className="variant-modal-handle" />
                            <div className="variant-modal-header">
                                <img src={group.image_url} alt={group.base_name} className="variant-modal-img" />
                                <div>
                                    <div className="variant-modal-title">{group.base_name}</div>
                                    <div className="variant-modal-category">{group.category}</div>
                                </div>
                                <button className="modal-close-btn" onClick={onClose}>✕</button>
                            </div>

                            <p className="variant-modal-hint">Select pack size (price per kg)</p>

                            <div className="variant-list">
                                {group.variants.map(variant => {
                                    const cartQty = cart[variant.id]?.quantity || 0
                                    const justAdded = addedId === variant.id
                                    return (
                                        <div key={variant.id} className="variant-row">
                                            <div className="variant-info">
                                                <div className="variant-price">₹{variant.price}<span>/kg</span></div>
                                                <div className="variant-name">{variant.name}</div>
                                            </div>
                                            <div className="variant-actions">
                                                {cartQty > 0 && (
                                                    <span className="variant-in-cart">{cartQty} kg in cart</span>
                                                )}
                                                <motion.button
                                                    className={`btn ${justAdded ? 'btn-secondary' : 'btn-primary'} variant-add-btn`}
                                                    onClick={() => handleAdd(variant)}
                                                    whileTap={{ scale: 0.92 }}
                                                >
                                                    {justAdded ? '✓ Added' : '+ Add'}
                                                </motion.button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        )
    }
    ```

    **index.css — add modal + card styles:**
    ```css
    /* Product card updates */
    .product-category-badge { position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.6); color:#fff; font-size:11px; padding:3px 8px; border-radius:20px; font-weight:600; }
    .product-variants-hint { font-size: 12px; color: var(--text-muted); margin: 2px 0 10px; }
    .product-choose-btn { width: 100%; justify-content: center; padding: 10px; font-size: 14px; margin-top: 4px; }
    .product-img-wrap { position: relative; }

    /* Modal */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; backdrop-filter: blur(4px); }
    .variant-modal { position: fixed; bottom: 0; left: 0; right: 0; z-index: 101; background: var(--surface); border-radius: 24px 24px 0 0; padding: 0 0 32px; max-height: 85vh; overflow-y: auto; box-shadow: 0 -8px 40px rgba(0,0,0,0.4); }
    .variant-modal-handle { width: 40px; height: 4px; background: var(--border); border-radius: 4px; margin: 12px auto 0; }
    .variant-modal-header { display: flex; align-items: center; gap: 14px; padding: 16px 20px; border-bottom: 1px solid var(--border); position: relative; }
    .variant-modal-img { width: 56px; height: 56px; border-radius: 12px; object-fit: cover; }
    .variant-modal-title { font-size: 18px; font-weight: 800; }
    .variant-modal-category { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .modal-close-btn { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); background: var(--border); border: none; color: var(--text); width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; }
    .variant-modal-hint { font-size: 13px; color: var(--text-muted); padding: 12px 20px 4px; font-weight: 500; }
    .variant-list { padding: 0 20px; }
    .variant-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid var(--border); }
    .variant-row:last-child { border-bottom: none; }
    .variant-price { font-size: 20px; font-weight: 800; color: var(--primary); }
    .variant-price span { font-size: 13px; font-weight: 500; color: var(--text-muted); }
    .variant-name { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .variant-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .variant-in-cart { font-size: 11px; color: var(--secondary); font-weight: 600; }
    .variant-add-btn { padding: 8px 20px; font-size: 14px; min-width: 80px; justify-content: center; }

    /* Delivery Toggle */
    .delivery-toggle { margin-bottom: 20px; }
    .delivery-toggle > label { display: block; font-size: 13px; font-weight: 600; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
    .delivery-options { display: flex; gap: 10px; }
    .delivery-option { flex: 1; padding: 12px 10px; border-radius: 12px; border: 1.5px solid var(--border); background: var(--surface); color: var(--text); font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .delivery-option.active { border-color: var(--primary); background: rgba(30,58,138,0.15); color: var(--primary); }

    /* Delivery Badge */
    .delivery-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; background: rgba(255,255,255,0.08); border: 1px solid var(--border); font-size: 13px; font-weight: 600; margin: 12px auto 0; }

    /* Order History Card */
    .order-history-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 16px; margin-bottom: 10px; transition: all 0.2s; }
    .order-history-card:hover { border-color: var(--primary); background: rgba(30,58,138,0.08); }

    /* PIN input */
    .pin-input { letter-spacing: 0.4em; text-align: center; font-size: 24px; font-weight: 800; }
    ```
  </action>
  <verify>cd app/frontend && npm run build 2>&1 | tail -8</verify>
  <done>Build passes 0 errors. ProductVariantModal.jsx and updated ProductCard.jsx exist.</done>
</task>

<task type="auto">
  <name>Build secure Order History page + PIN setup flow + update api.js, ConfirmPage, StatusPage, App</name>
  <files>
    app/frontend/src/api.js,
    app/frontend/src/pages/ConfirmPage.jsx,
    app/frontend/src/pages/StatusPage.jsx,
    app/frontend/src/pages/OrderHistoryPage.jsx,
    app/frontend/src/components/Navbar.jsx,
    app/frontend/src/App.jsx
  </files>
  <action>
    **api.js — add auth calls:**
    ```js
    export const getOrderHistory = (phone, pin) =>
        request('GET', `/api/orders/history?phone=${encodeURIComponent(phone)}&pin=${encodeURIComponent(pin)}`)

    export const setupPin = (phone, pin) =>
        request('POST', '/api/auth/setup-pin', { phone: `+91${phone}`, pin })

    export const verifyPin = (phone, pin) =>
        request('POST', '/api/auth/verify', { phone: `+91${phone}`, pin })
    ```

    **ConfirmPage.jsx — add delivery toggle + PIN setup step:**
    1. Add `deliveryType` state (`'pickup'`), `pin` state (`''`), `pinConfirm` state (`''`), `step` state (`'form'` | `'pin'`).
    2. In the form, add delivery toggle ABOVE phone input (same as Plan 5.2 original).
    3. In `handleSubmit`, after order placed (`result.token`):
       - Set `step = 'pin'` to show a "Secure Your Account" screen (PIN setup).
       - Store `result.token` in state.
    4. Add PIN setup screen (shown when `step === 'pin'`):
       ```jsx
       {step === 'pin' && (
           <motion.div className="confirm-card" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}>
               <div style={{textAlign:'center', marginBottom:20}}>
                   <div style={{fontSize:40}}>🔐</div>
                   <h2 style={{fontWeight:800}}>Secure Your Account</h2>
                   <p style={{color:'var(--text-muted)',fontSize:14,marginTop:8}}>
                       Set a 4-digit PIN to access your order history securely.
                   </p>
               </div>
               <div className="confirm-phone-group">
                   <label>Create 4-digit PIN</label>
                   <input className="input pin-input" type="password" inputMode="numeric"
                       maxLength={4} value={pin}
                       onChange={e => setPin(e.target.value.replace(/\D/g,''))}
                       placeholder="••••" />
               </div>
               <div className="confirm-phone-group" style={{marginTop:12}}>
                   <label>Confirm PIN</label>
                   <input className="input pin-input" type="password" inputMode="numeric"
                       maxLength={4} value={pinConfirm}
                       onChange={e => setPinConfirm(e.target.value.replace(/\D/g,''))}
                       placeholder="••••" />
               </div>
               {pin.length===4 && pinConfirm.length===4 && pin!==pinConfirm && (
                   <p className="error-msg">⚠️ PINs don't match</p>
               )}
               <motion.button className="btn btn-primary"
                   style={{width:'100%',justifyContent:'center',padding:'15px',marginTop:16}}
                   disabled={pin.length!==4 || pin!==pinConfirm || loading}
                   onClick={async () => {
                       setLoading(true)
                       try {
                           await setupPin(phone, pin)
                           navigate(`/status/${token}`)
                       } catch {
                           navigate(`/status/${token}`) // proceed even if PIN setup fails
                       }
                   }}
                   whileTap={{scale:0.97}}
               >
                   {loading ? <><span className="spinner spinner-sm"/> Saving...</> : '✅ Save PIN & Continue'}
               </motion.button>
               <button className="btn btn-ghost" style={{width:'100%',marginTop:8,justifyContent:'center'}}
                   onClick={() => navigate(`/status/${token}`)}>
                   Skip for now
               </button>
           </motion.div>
       )}
       ```
    5. Store `token` in state (`const [token, setToken] = useState('')`) and set it from `result.token`.

    **StatusPage.jsx:**
    1. Add `const isDelivered = order?.status === 'Delivered'`
    2. Stop polling when Delivered: in `fetchOrder`, after `setOrder(data)`, check `if (data.status==='Delivered' || data.status==='Ready for Pickup') clearInterval(intervalRef.current)`
    3. Add delivery badge after ProgressSteps.
    4. Update status message card to handle isDelivered (show "✅ Delivered! Thank you for shopping!" — fire confetti same as isReady).

    **OrderHistoryPage.jsx (NEW):**
    ```jsx
    import { useState, useRef, useEffect } from 'react'
    import { useNavigate } from 'react-router-dom'
    import Navbar from '../components/Navbar'
    import { getOrderHistory } from '../api'
    import { motion, AnimatePresence } from 'framer-motion'

    export default function OrderHistoryPage() {
        const [phone, setPhone] = useState('')
        const [pin, setPin] = useState('')
        const [orders, setOrders] = useState(null)
        const [loading, setLoading] = useState(false)
        const [error, setError] = useState('')
        const mountedRef = useRef(true)
        const navigate = useNavigate()

        useEffect(() => () => { mountedRef.current = false }, [])

        const isValidPhone = /^[6-9]\d{9}$/.test(phone)
        const isValidPin = pin.length === 4

        const handleSearch = async () => {
            if (!isValidPhone || !isValidPin) { setError('Enter phone and 4-digit PIN'); return }
            setError(''); setLoading(true)
            try {
                const data = await getOrderHistory(phone, pin)
                if (mountedRef.current) setOrders(Array.isArray(data) ? data : [])
            } catch (e) {
                if (mountedRef.current) setError(e.message || 'Invalid phone or PIN')
            } finally {
                if (mountedRef.current) setLoading(false)
            }
        }

        const statusColor = s => s==='Delivered' ? 'var(--secondary)' : s==='Ready for Pickup' ? '#F59E0B' : 'var(--primary)'
        const statusEmoji = s => s==='Delivered' ? '✅' : s==='Ready for Pickup' ? '🟡' : '⏳'

        return (
            <div>
                <Navbar searchQuery="" onSearchChange={() => {}} />
                <div className="confirm-page">
                    <motion.div className="confirm-card" initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:0.4}}>
                        <div className="back-link" onClick={() => navigate('/')}>← Back to Shop</div>
                        <div style={{textAlign:'center',marginBottom:20}}>
                            <div style={{fontSize:36}}>📋</div>
                            <h2 style={{fontSize:24,fontWeight:800,marginBottom:4}}>My Orders</h2>
                            <p style={{color:'var(--text-muted)',fontSize:14}}>Enter your mobile & PIN to view order history</p>
                        </div>

                        <div className="confirm-phone-group">
                            <label>Mobile Number</label>
                            <div className="phone-input-row">
                                <span className="phone-prefix">🇮🇳 +91</span>
                                <input className={`input ${error ? 'error' : ''}`} type="tel" inputMode="numeric"
                                    placeholder="9876543210" maxLength={10} value={phone}
                                    onChange={e => { setPhone(e.target.value.replace(/\D/g,'')); setError('') }}
                                    onKeyDown={e => e.key==='Enter' && handleSearch()} />
                            </div>
                        </div>

                        <div className="confirm-phone-group" style={{marginTop:12}}>
                            <label>Security PIN</label>
                            <input className={`input pin-input ${error ? 'error' : ''}`} type="password"
                                inputMode="numeric" maxLength={4} placeholder="••••" value={pin}
                                onChange={e => { setPin(e.target.value.replace(/\D/g,'')); setError('') }}
                                onKeyDown={e => e.key==='Enter' && handleSearch()} />
                        </div>

                        {error && <p className="error-msg" style={{marginTop:8}}>⚠️ {error}</p>}

                        <motion.button className="btn btn-primary"
                            style={{width:'100%',justifyContent:'center',fontSize:16,padding:'15px',marginTop:16,marginBottom:24}}
                            onClick={handleSearch} disabled={loading || !isValidPhone || !isValidPin}
                            whileTap={{scale:0.97}}>
                            {loading ? <><span className="spinner spinner-sm"/> Verifying...</> : '🔍 View My Orders'}
                        </motion.button>

                        <AnimatePresence>
                            {orders !== null && (
                                <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                                    {orders.length === 0 ? (
                                        <div className="empty-state" style={{marginTop:0}}>
                                            <div className="emoji">📭</div>
                                            <h3>No orders found</h3>
                                            <p>No orders placed with this number yet.</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:12}}>
                                                {orders.length} order{orders.length!==1?'s':''} found
                                            </p>
                                            {orders.map(order => (
                                                <motion.div key={order.token} className="order-history-card"
                                                    whileHover={{scale:1.01}} onClick={() => navigate(`/status/${order.token}`)}
                                                    style={{cursor:'pointer'}}>
                                                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                                                        <div>
                                                            <div style={{fontWeight:700,fontSize:15}}>{order.token}</div>
                                                            <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>
                                                                {order.timestamp} · {order.delivery_type==='delivery'?'🚚 Delivery':'🏪 Pickup'}
                                                            </div>
                                                        </div>
                                                        <div style={{textAlign:'right'}}>
                                                            <div style={{fontWeight:700,color:'var(--primary)'}}>₹{order.total?.toFixed(0)}</div>
                                                            <div style={{fontSize:12,color:statusColor(order.status),marginTop:2}}>
                                                                {statusEmoji(order.status)} {order.status}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>
        )
    }
    ```

    **Navbar.jsx:** Add "📋 My Orders" ghost button that navigates to `/orders`.

    **App.jsx:** Add `<Route path="/orders" element={<OrderHistoryPage />} />`.

    **CartContext.jsx — update display label:**
    In `addToCart`, the product stored in cart already has all fields. No change needed.
    The cart panel and confirm page should show quantity as "X kg":
    In `CartPanel.jsx` and `ConfirmPage.jsx`, find quantity display and change `× {item.quantity}` to `× {item.quantity} kg`.
  </action>
  <verify>cd app/frontend && npm run build 2>&1 | tail -8</verify>
  <done>Build passes. OrderHistoryPage.jsx exists with PIN input. ConfirmPage has PIN setup flow. Navbar has My Orders link.</done>
</task>

## Success Criteria
- [ ] Catalog shows grouped cards (one card per variety, shows price range)
- [ ] Clicking a product card opens the variant bottom sheet modal
- [ ] Modal shows all price variants with Add buttons
- [ ] ConfirmPage has delivery type toggle AND PIN setup step after order
- [ ] OrderHistoryPage requires phone + PIN (returns 401 on wrong PIN)
- [ ] Cart and Confirm show "× 3 kg" not "× 3"
- [ ] StatusPage shows delivery badge + handles Delivered status
- [ ] `npm run build` passes with 0 errors
