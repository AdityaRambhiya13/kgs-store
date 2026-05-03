import { useState, useEffect, useRef } from 'react'
import { listOrders, updateStatus, listCustomers, adminLogin, getProducts, addProduct, updateProduct, deleteProduct } from '../api'
import { motion, AnimatePresence } from 'framer-motion'

export default function AdminPage() {
    // Privacy helper: show only last 4 digits
    const maskPhone = (phone = '') => {
        const digits = phone.replace(/\D/g, '')
        if (digits.length >= 4) return '+91 ****' + digits.slice(-4)
        return '****'
    }
    const [password, setPassword] = useState('')
    const [adminToken, setAdminToken] = useState(null)
    const [authed, setAuthed] = useState(false)
    const [activeTab, setActiveTab] = useState('orders') // 'orders' | 'customers' | 'products'
    const [orders, setOrders] = useState([])
    const [customers, setCustomers] = useState([])
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(false)
    const [loginError, setLoginError] = useState('')
    const [expanded, setExpanded] = useState({})
    const [togglingToken, setTogglingToken] = useState(null)
    const [cardError, setCardError] = useState({})   // per-token inline errors
    const [productForm, setProductForm] = useState(null) // null or { id?, name, price, ... }
    const intervalRef = useRef(null)

    // Poll data every 8s when authed
    useEffect(() => {
        if (!authed || !adminToken) return
        const fetchData = async () => {
            try {
                if (activeTab === 'orders') {
                    const data = await listOrders(adminToken)
                    setOrders(Array.isArray(data) ? data : [])
                } else if (activeTab === 'customers') {
                    const data = await listCustomers(adminToken)
                    setCustomers(Array.isArray(data) ? data : [])
                } else if (activeTab === 'products') {
                    const data = await getProducts()
                    setProducts(Array.isArray(data) ? data : [])
                }
            } catch (err) { }
        }
        fetchData()
        intervalRef.current = setInterval(fetchData, 8000)
        return () => clearInterval(intervalRef.current)
    }, [authed, adminToken, activeTab])

    const handleLogin = async () => {
        setLoginError('')
        setLoading(true)
        try {
            const res = await adminLogin(password.trim())
            const token = res.access_token
            setAdminToken(token)
            setAuthed(true)
            // Load initial view
            const data = await listOrders(token)
            setOrders(Array.isArray(data) ? data : [])
        } catch (e) {
            setLoginError(e.message || 'Invalid password')
        } finally {
            setLoading(false)
        }
    }

    const handleStatusAction = async (token, nextStatus, otp = null) => {
        setTogglingToken(token)
        setCardError(prev => ({ ...prev, [token]: '' }))
        try {
            await updateStatus(token, nextStatus, adminToken, otp)
            setOrders(prev => prev.map(o => o.token === token ? { ...o, status: nextStatus } : o))
        } catch (e) {
            setCardError(prev => ({ ...prev, [token]: e.message || 'Update failed' }))
        } finally {
            setTogglingToken(null)
        }
    }

    const toggleExpand = (token) => setExpanded(prev => ({ ...prev, [token]: !prev[token] }))

    // --- Product Handlers ---
    const handleSaveProduct = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            if (productForm.id) {
                await updateProduct(productForm.id, productForm, adminToken)
            } else {
                await addProduct(productForm, adminToken)
            }
            setProductForm(null)
            const data = await getProducts()
            setProducts(data)
        } catch (err) {
            alert(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteProduct = async (id) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return
        try {
            await deleteProduct(id, adminToken)
            setProducts(prev => prev.filter(p => p.id !== id))
        } catch (err) {
            alert(err.message)
        }
    }

    if (!authed) {
        return (
            <motion.div className="admin-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="admin-login">
                    <motion.div className="admin-login-card" initial={{ y: 20 }} animate={{ y: 0 }}>
                        <div className="admin-avatar">🔐</div>
                        <h2>Admin Portal</h2>
                        <input
                            className="input"
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        />
                        {loginError && <p className="error-msg">⚠️ {loginError}</p>}
                        <button className="btn btn-primary" onClick={handleLogin} disabled={loading} style={{ width: '100%', marginTop: 12 }}>
                            {loading ? 'Verifying...' : 'Login'}
                        </button>
                    </motion.div>
                </div>
            </motion.div>
        )
    }

    const processing = orders.filter(o => o.status === 'Processing')
    const ready = orders.filter(o => o.status === 'Ready for Pickup')
    const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)

    return (
        <motion.div className="admin-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Nav Header */}
            <div className="admin-header">
                <div>
                    <h1>🌾 KGS Admin</h1>
                    <p>Store Management System</p>
                </div>
                <div className="admin-nav-tabs">
                    {['orders', 'products', 'customers'].map(tab => (
                        <button
                            key={tab}
                            className={`nav-tab ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
                <button className="btn btn-ghost" onClick={() => setAuthed(false)} style={{ color: '#fff' }}>Sign Out</button>
            </div>

            <div className="admin-container">
                {activeTab === 'orders' && (
                    <>
                        <div className="admin-stats-grid">
                            <StatCard icon="📦" label="Total Orders" value={orders.length} color="var(--primary)" />
                            <StatCard icon="⏳" label="Processing" value={processing.length} color="var(--accent)" />
                            <StatCard icon="✅" label="Revenue" value={`₹${revenue.toFixed(0)}`} color="var(--secondary)" />
                        </div>

                        <div className="admin-lanes">
                            <OrderLane title="⏳ Processing" orders={processing} onAction={handleStatusAction} onExpand={toggleExpand} expanded={expanded} togglingToken={togglingToken} cardError={cardError} />
                            <OrderLane title="🟡 Ready for Pickup" orders={ready} onAction={handleStatusAction} onExpand={toggleExpand} expanded={expanded} togglingToken={togglingToken} cardError={cardError} />
                            <OrderLane title="✅ Delivered" orders={orders.filter(o => o.status === 'Delivered')} onAction={handleStatusAction} onExpand={toggleExpand} expanded={expanded} togglingToken={togglingToken} cardError={cardError} />
                        </div>
                    </>
                )}

                {activeTab === 'customers' && (
                    <div className="customers-view">
                        <div className="section-header">
                            <h3>Registered Customers ({customers.length})</h3>
                        </div>
                        <div className="customers-grid">
                            {customers.map(c => (
                                <div key={c.phone} className="customer-row card">
                                    <div className="customer-info">
                                        <span className="cust-phone">📱 {maskPhone(c.phone)}</span>
                                        <span className="cust-name">{c.name || 'Anonymous User'}</span>
                                    </div>
                                    <div className="cust-meta">Joined: {c.created_at}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'products' && (
                    <div className="products-view">
                        <div className="section-header">
                            <h3>Catalog Management ({products.length})</h3>
                            <button className="btn btn-primary" onClick={() => setProductForm({ name: '', price: 0, description: '', category: '', image_url: '', unit: 'kg' })}>
                                + Add New Product
                            </button>
                        </div>

                        <div className="products-grid">
                            {products.map(p => (
                                <div key={p.id} className="product-admin-card card">
                                    <img src={p.image_url} alt="" className="p-img" />
                                    <div className="p-info">
                                        <div className="p-cat">{p.category}</div>
                                        <div className="p-name">{p.name}</div>
                                        <div className="p-price">₹{p.price} / {p.unit}</div>
                                    </div>
                                    <div className="p-actions">
                                        <button className="btn-icon" onClick={() => setProductForm(p)}>✏️</button>
                                        <button className="btn-icon" onClick={() => handleDeleteProduct(p.id)} style={{ color: 'var(--danger)' }}>🗑️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Product Modal */}
            <AnimatePresence>
                {productForm && (
                    <div className="modal-overlay">
                        <motion.div className="modal-content" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                            <h3>{productForm.id ? 'Edit Product' : 'Add New Product'}</h3>
                            <form onSubmit={handleSaveProduct} className="admin-form">
                                <label>Name</label>
                                <input required value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} />
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label>Price (₹)</label>
                                        <input type="number" step="0.01" required value={productForm.price} onChange={e => setProductForm({ ...productForm, price: parseFloat(e.target.value) })} />
                                    </div>
                                    <div>
                                        <label>Unit</label>
                                        <input required value={productForm.unit} onChange={e => setProductForm({ ...productForm, unit: e.target.value })} />
                                    </div>
                                </div>

                                <label>Category</label>
                                <input required value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value })} />

                                <label>Description</label>
                                <textarea value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })} />

                                <label>Image URL</label>
                                <input value={productForm.image_url} onChange={e => setProductForm({ ...productForm, image_url: e.target.value })} />

                                <div className="modal-btns">
                                    <button type="button" className="btn btn-ghost" onClick={() => setProductForm(null)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={loading}>
                                        {loading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .admin-page { min-height: 100vh; background: #f8fafc; font-family: 'Inter', sans-serif; }
                .admin-header { background: #1e3a8a; color: white; padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; }
                .admin-header h1 { font-size: 24px; font-weight: 800; }
                .admin-header p { font-size: 13px; opacity: 0.8; }
                
                .admin-nav-tabs { display: flex; gap: 10px; }
                .nav-tab { background: rgba(255,255,255,0.1); border: none; color: #fff; padding: 10px 24px; border-radius: 99px; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s; }
                .nav-tab.active { background: #fff; color: #1e3a8a; }
                
                .admin-container { padding: 30px 40px; }
                .admin-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; margin-bottom: 30px; }
                .stat-card-inner { background: white; padding: 24px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 16px; }
                .stat-icon-bg { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; color: white; }
                
                .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
                .section-header h3 { font-size: 20px; font-weight: 800; color: #1e293b; }
                
                .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
                .product-admin-card { background: white; border-radius: 14px; padding: 16px; display: flex; gap: 16px; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
                .p-img { width: 70px; height: 70px; object-fit: cover; border-radius: 10px; background: #f1f5f9; }
                .p-info { flex: 1; }
                .p-cat { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; }
                .p-name { font-size: 15px; font-weight: 700; color: #1e293b; margin: 2px 0; }
                .p-price { font-size: 13px; color: #10b981; font-weight: 600; }
                .p-actions { display: flex; flex-direction: column; gap: 8px; }
                .btn-icon { background: none; border: none; font-size: 18px; cursor: pointer; padding: 4px; border-radius: 6px; transition: background 0.2s; }
                .btn-icon:hover { background: #f1f5f9; }
                
                .admin-lanes { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
                .order-lane-col h3 { font-size: 16px; margin-bottom: 16px; color: #475569; display: flex; align-items: center; gap: 8px; }
                
                .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
                .modal-content { background: white; width: 100%; max-width: 500px; border-radius: 20px; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
                .modal-content h3 { font-size: 22px; font-weight: 800; margin-bottom: 24px; color: #1e293b; }
                
                .admin-form label { display: block; font-size: 13px; font-weight: 600; color: #64748b; margin-bottom: 6px; margin-top: 16px; }
                .admin-form input, .admin-form textarea { width: 100%; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 14px; background: #f8fafc; }
                .admin-form input:focus { outline: none; border-color: #3b82f6; background: white; }
                .admin-form textarea { min-height: 80px; resize: vertical; }
                .modal-btns { display: flex; gap: 12px; margin-top: 28px; }
                .modal-btns .btn { flex: 1; padding: 12px; }

                .customer-row { display: flex; justify-content: space-between; padding: 16px 20px; margin-bottom: 12px; }
                .cust-phone { font-weight: 700; display: block; }
                .cust-name { font-size: 14px; color: #64748b; }
                .cust-meta { font-size: 12px; opacity: 0.6; }

                .admin-login { display: flex; align-items: center; justify-content: center; height: 100vh; }
                .admin-login-card { background: white; padding: 40px; border-radius: 24px; width: 340px; text-align: center; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
                .admin-avatar { font-size: 48px; margin-bottom: 16px; }
            `}</style>
        </motion.div>
    )
}

function StatCard({ icon, label, value, color }) {
    return (
        <div className="stat-card-inner">
            <div className="stat-icon-bg" style={{ background: color }}>{icon}</div>
            <div>
                <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b' }}>{value}</div>
            </div>
        </div>
    )
}

function OrderLane({ title, orders, onAction, onExpand, expanded, togglingToken, cardError }) {
    return (
        <div className="order-lane-col">
            <h3>{title} ({orders.length})</h3>
            <div style={{ display: 'grid', gap: 16 }}>
                {orders.map(o => (
                    <AdminOrderCard 
                        key={o.token} 
                        order={o} 
                        onAction={onAction} 
                        onExpand={onExpand} 
                        expanded={expanded[o.token]} 
                        toggling={togglingToken === o.token}
                        error={cardError[o.token]}
                    />
                ))}
            </div>
        </div>
    )
}

function AdminOrderCard({ order, onAction, onExpand, expanded, toggling, error }) {
    const isProcessing = order.status === 'Processing'
    const isReady = order.status === 'Ready for Pickup'
    const isDelivered = order.status === 'Delivered'
    const deliveryType = order.delivery_type || 'pickup'
    
    let items = []
    try { items = JSON.parse(order.items_json) } catch { }

    const [otpInput, setOtpInput] = useState('')
    const [showOtpInput, setShowOtpInput] = useState(false)
    const [otpError, setOtpError] = useState('')

    const handleAction = () => {
        if (isProcessing) {
            onAction(order.token, 'Ready for Pickup', null)
            return
        }
        if (isReady && deliveryType === 'delivery') {
            if (!showOtpInput) {
                setShowOtpInput(true)
                setOtpError('')
                return
            }
            if (otpInput.length !== 4) {
                setOtpError('Enter 4-digit OTP')
                return
            }
            onAction(order.token, 'Delivered', otpInput)
        } else {
            onAction(order.token, 'Delivered', null)
        }
    }

    // ── Bill Generator ─────────────────────────────────────────────
    const generateBill = () => {
        const now = new Date()
        const pad = (n) => String(n).padStart(2, '0')
        const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`
        const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

        const subtotal = items.reduce((s, it) => s + (it.price * it.quantity), 0)
        const deliveryFee = order.total - subtotal
        const totalQty = items.reduce((s, it) => s + it.quantity, 0)

        const rows = items.map((it, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${it.name}</td>
                <td>${Number(it.price).toFixed(2)}</td>
                <td>${Number(it.price).toFixed(2)}</td>
                <td>${Number(it.quantity).toFixed(3)}</td>
                <td>${(it.price * it.quantity).toFixed(2)}</td>
            </tr>
            <tr class="divider-row"><td colspan="6"><hr/></td></tr>
        `).join('')

        const deliveryRow = deliveryFee > 0 ? `
            <tr>
                <td>${items.length + 1}</td>
                <td>Delivery Charges</td>
                <td>${deliveryFee.toFixed(2)}</td>
                <td>${deliveryFee.toFixed(2)}</td>
                <td>1.000</td>
                <td>${deliveryFee.toFixed(2)}</td>
            </tr>
            <tr class="divider-row"><td colspan="6"><hr/></td></tr>
        ` : ''

        const billNo = order.token.replace(/-/g, '').slice(0, 10).toUpperCase()
        const customerName = order.customer_name || order.name || 'Customer'

        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Tax Invoice - ${billNo}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 13px;
            color: #000;
            background: #fff;
            width: 80mm;
            margin: 0 auto;
            padding: 15px 10px 30px;
        }
        .store-name {
            font-size: 20px;
            font-weight: 900;
            text-align: center;
            letter-spacing: 1.5px;
            margin-bottom: 10px;
        }
        .store-addr {
            text-align: center;
            font-size: 11px;
            line-height: 1.6;
            margin-bottom: 10px;
        }
        .store-meta {
            text-align: center;
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 12px;
        }
        .sep-dash { border: none; border-top: 1px dashed #000; margin: 10px 0; }
        .sep-eq   { border: none; border-top: 2px solid #000;   margin: 10px 0; }
        .title {
            text-align: center;
            font-size: 18px;
            font-weight: 900;
            letter-spacing: 4px;
            margin: 14px 0;
            text-decoration: underline;
        }
        .meta-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px; }
        .meta-label { font-weight: bold; }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin: 12px 0;
        }
        thead tr th {
            font-weight: 900;
            text-align: left;
            padding: 10px 2px;
            border-bottom: 1.5px dashed #000;
            border-top: 1.5px dashed #000;
            white-space: nowrap;
        }
        td { padding: 8px 2px; vertical-align: top; }
        td:nth-child(3), td:nth-child(4), td:nth-child(5), td:nth-child(6) { text-align: right; }
        th:nth-child(3), th:nth-child(4), th:nth-child(5), th:nth-child(6) { text-align: right; }
        .divider-row td { padding: 0; }
        .divider-row hr { border: none; border-top: 1px dashed #000; }
        .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; font-weight: bold; }
        .net-row   { display: flex; justify-content: space-between; padding: 12px 0; font-size: 20px; font-weight: 900; }
        .footer-meta { font-size: 12px; margin: 12px 0; font-weight: bold; }
        .footer-row { display: flex; justify-content: space-between; font-size: 13px; padding: 10px 0; font-weight: 900; border-top: 1px dashed #000; border-bottom: 1px dashed #000; }
        .thank { text-align: center; font-size: 14px; margin-top: 32px; font-weight: 900; letter-spacing: 1px; }
        @media print {
            body { width: 80mm; }
            @page { size: 80mm auto; margin: 0; }
        }
    </style>
</head>
<body>
    <div class="store-name">KETAN GENERAL STORES</div>
    <div class="store-addr">
        G3, G4, Vasant Chamber, Gupte Road,<br>
        Dombivali (West) - 421202
    </div>
    <div class="store-meta">Phone: 8879485171 &nbsp;&nbsp; GSTIN: 27AAAPF9753F2ZP</div>
    <hr class="sep-dash"/>

    <div class="title">TAX INVOICE</div>

    <hr class="sep-dash"/>
    <div class="meta-row"><span><span class="meta-label">Date</span> : ${dateStr}</span><span><span class="meta-label">Time</span> : ${timeStr}</span></div>
    <div class="meta-row"><span class="meta-label">Bill No</span> &nbsp;: ${billNo}</div>
    <div class="meta-row"><span class="meta-label">Billed By</span> : Ketan Furia</div>
    <hr class="sep-dash"/>

    <table>
        <thead>
            <tr>
                <th>S.NO</th>
                <th>HSN CODE/ITEM NAME</th>
                <th>MRP</th>
                <th>RATE</th>
                <th>QTY</th>
                <th>TOTAL</th>
            </tr>
        </thead>
        <tbody>
            ${rows}
            ${deliveryRow}
        </tbody>
    </table>

    <hr class="sep-dash"/>
    <div class="total-row"><span>Total :</span><span>${subtotal.toFixed(2)}</span></div>
    ${deliveryFee > 0 ? `<div class="total-row"><span>Delivery :</span><span>${deliveryFee.toFixed(2)}</span></div>` : ''}
    <div class="total-row"><span>Round Off :</span><span>0.00</span></div>
    <hr class="sep-eq"/>
    <div class="net-row"><span>Net Payable :</span><span>₹${Number(order.total).toFixed(2)}</span></div>
    <hr class="sep-eq"/>

    <div class="footer-meta">ITEM(S)/QTY: ${items.length}/${totalQty.toFixed(3)}</div>
    <hr class="sep-dash"/>
    <div class="footer-row"><span>PAYMENT MODE</span><span>${deliveryType === 'delivery' ? 'COD' : 'CASH'}</span></div>
    <hr class="sep-dash"/>
    <div class="thank">Thank you, Visit again!!!</div>
</body>
</html>`

        const win = window.open('', '_blank', 'width=400,height=700')
        win.document.write(html)
        win.document.close()
        win.focus()
        setTimeout(() => win.print(), 400)
    }

    return (
        <motion.div className="card admin-order-card" style={{ padding: 0, overflow: 'hidden', borderLeft: `5px solid ${isProcessing ? '#f59e0b' : isReady ? '#3b82f6' : '#10b981'}` }}>
            <div style={{ padding: 16, cursor: 'pointer' }} onClick={() => onExpand(order.token)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontWeight: 800, color: '#1e3a8a', fontSize: 16 }}>#{order.token}</div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>📱 +91 ****{order.phone.slice(-4)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, color: '#10b981' }}>₹{order.total}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>{deliveryType.toUpperCase()}</div>
                    </div>
                </div>
            </div>
            
            <AnimatePresence>
                {expanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden', background: '#f8fafc', padding: '0 16px' }}>
                        <div style={{ padding: '12px 0', borderTop: '1px solid #e2e8f0' }}>
                            {items.map((it, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                    <span>{it.name} x {it.quantity}</span>
                                    <span>₹{it.subtotal || it.price * it.quantity}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Generate Bill button — always visible */}
            <div style={{ padding: '8px 12px 0', borderTop: '1px solid #e2e8f0' }}>
                <button
                    onClick={generateBill}
                    style={{
                        width: '100%',
                        padding: '7px',
                        fontSize: 12,
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        letterSpacing: '0.5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                    }}
                >
                    🖨️ Generate Bill
                </button>
            </div>

            {!isDelivered && (
                <div style={{ padding: 12, borderTop: '1px solid #e2e8f0' }}>
                    <AnimatePresence>
                        {showOtpInput && isReady && deliveryType === 'delivery' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{ marginBottom: 10, background: 'rgba(30,58,138,0.05)', border: '1.5px solid #1e3a8a', borderRadius: 10, padding: '12px' }}
                            >
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e3a8a', marginBottom: 8, textAlign: 'center' }}>
                                    🔐 Enter OTP from Customer
                                </div>
                                <input
                                    className="input"
                                    type="tel"
                                    inputMode="numeric"
                                    placeholder="• • • •"
                                    maxLength={4}
                                    value={otpInput}
                                    onChange={e => { setOtpInput(e.target.value.replace(/\D/g, '')); setOtpError('') }}
                                    style={{ width: '100%', textAlign: 'center', fontSize: 24, letterSpacing: '10px', fontWeight: 800, padding: '8px', borderColor: otpError ? 'red' : '#1e3a8a' }}
                                    autoFocus
                                />
                                {otpError && <div style={{ color: 'red', fontSize: 11, marginTop: 4, textAlign: 'center' }}>{otpError}</div>}
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 6, textAlign: 'center' }}>
                                    Ask the customer for their 4-digit delivery OTP
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button 
                            className={`btn ${isProcessing ? 'btn-secondary' : 'btn-primary'}`} 
                            style={{ flex: 1, padding: '8px', fontSize: 13, fontWeight: 700 }} 
                            onClick={handleAction}
                            disabled={toggling}
                        >
                            {toggling ? '⏳ Updating...' : isProcessing ? '✅ Mark Ready' : showOtpInput ? '🎯 Confirm Delivery' : '🚀 Mark Delivered'}
                        </button>
                        {isReady && <button className="btn-icon" onClick={() => onAction(order.token, 'Processing')}>↩️</button>}
                    </div>
                </div>
            )}
            {error && <div style={{ padding: '4px 16px 8px', color: 'var(--danger)', fontSize: 12 }}>⚠️ {error}</div>}
        </motion.div>
    )
}
