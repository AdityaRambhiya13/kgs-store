import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { listOrders, updateStatus, listCustomers, adminLogin, getProducts, getAdminProducts, addProduct, updateProduct, deleteProduct, confirmPayment, rejectPayment, bulkReorderProducts, adminResetPin } from '../api'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ProductRenamer from './ProductRenamer'

const unescapeHTML = (str) => {
  if (!str) return ''
  const txt = document.createElement('textarea')
  txt.innerHTML = str
  let val = txt.value
  while (val.includes('&') && val !== str) {
    str = val
    txt.innerHTML = str
    val = txt.value
  }
  return val.trim()
}

const getWebsiteDisplayName = (name = '', base_name = '', unit = '') => {
  let base = base_name || name || ''
  let u = unit || ''
  
  if (u && base.toLowerCase().endsWith(u.toLowerCase().trim())) {
    u = ''
  }
  if (u && u.toLowerCase() === '1l' && base.toLowerCase().endsWith('1lit')) {
    u = ''
  }
  return u ? `${base} ${u}` : base
}

export default function AdminPage() {
    const navigate = useNavigate()
    // Privacy helper: show only last 4 digits
    const maskPhone = (phone = '') => {
        const digits = phone.replace(/\D/g, '')
        if (digits.length >= 4) return '+91 ****' + digits.slice(-4)
        return '****'
    }
    const [password, setPassword] = useState('')
    const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken'))
    const [authed, setAuthed] = useState(!!localStorage.getItem('adminToken'))
    const [activeTab, setActiveTab] = useState('orders') // 'orders' | 'customers' | 'products' | 'visibility' | 'inventory'
    const [orders, setOrders] = useState([])
    const [customers, setCustomers] = useState([])
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(false)
    const [loginError, setLoginError] = useState('')
    const [expanded, setExpanded] = useState({})
    const [togglingToken, setTogglingToken] = useState(null)
    const [cardError, setCardError] = useState({})   // per-token inline errors
    const [productForm, setProductForm] = useState(null) // null or { id?, name, price, ... }
    const [searchQuery, setSearchQuery] = useState('') // Search state for products
    const [pinnedSearchQuery, setPinnedSearchQuery] = useState('') // Search state for pinned products
    const [editingRanks, setEditingRanks] = useState({}) // Temporary input values for rank editing
    const [pinnedList, setPinnedList] = useState([])
    const [saveOrderingLoading, setSaveOrderingLoading] = useState(false)
    const [categoryFilter, setCategoryFilter] = useState('All')
    const [productLimit, setProductLimit] = useState(50)
    const [notifications, setNotifications] = useState([])
    const lastChimeTimeRef = useRef(0)

    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }, [])
    const [resetPinCustomer, setResetPinCustomer] = useState(null)
    const [newPinInput, setNewPinInput] = useState('')
    const [resetError, setResetError] = useState('')
    const [resetSuccess, setResetSuccess] = useState('')
    const [resetLoading, setResetLoading] = useState(false)
    const intervalRef = useRef(null)
    const orderingInitialisedRef = useRef(false) // tracks whether we've seeded pinnedList for this session

    // Reset product limit on filter, search, or tab changes to keep DOM lightweight
    useEffect(() => {
        setProductLimit(50)
    }, [searchQuery, categoryFilter, activeTab])

    // Reset pinned products search and editing ranks when changing categories or tabs
    useEffect(() => {
        setPinnedSearchQuery('')
        setEditingRanks({})
    }, [categoryFilter, activeTab])

    useEffect(() => {
        const handleAdminAuthError = () => {
            setAuthed(false)
            setAdminToken(null)
            localStorage.removeItem('adminToken')
        }
        window.addEventListener('admin-auth-error', handleAdminAuthError)
        return () => window.removeEventListener('admin-auth-error', handleAdminAuthError)
    }, [])

    // Seed pinnedList from DB ranks the FIRST time the ordering tab is opened.
    // We deliberately do NOT re-run this when `products` changes so that
    // switching the category filter (which resets productLimit and re-renders)
    // doesn't wipe the pins the admin has already selected in this session.
    useEffect(() => {
        if (activeTab === 'ordering' && products && products.length > 0 && !orderingInitialisedRef.current) {
            const initialPinned = products
                .filter(p => p.display_order > 0)
                .sort((a, b) => a.display_order - b.display_order)
            setPinnedList(initialPinned)
            orderingInitialisedRef.current = true
        }
        // Reset the flag when leaving the ordering tab so next visit re-seeds from DB
        if (activeTab !== 'ordering') {
            orderingInitialisedRef.current = false
        }
    }, [activeTab, products])

    // Load initial products list once when authed to avoid continuous slow fetches
    useEffect(() => {
        if (!authed || !adminToken) return
        const loadInitialProducts = async () => {
            try {
                const data = await getAdminProducts(adminToken)
                const cleanedData = (Array.isArray(data) ? data : []).map(p => ({
                    ...p,
                    category: unescapeHTML(p.category),
                    sub_category: unescapeHTML(p.sub_category)
                }))
                setProducts(cleanedData)
            } catch (err) {
                console.error("Failed to load initial products:", err)
            }
        }
        if (products.length === 0) {
            loadInitialProducts()
        }
    }, [authed, adminToken])

    // Poll orders/customers every 8s when authed (only poll orders in real-time)
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
                }
            } catch (err) { 
                console.error("Admin fetch error:", err)
            }
        }
        fetchData()
        if (activeTab === 'orders') {
            intervalRef.current = setInterval(fetchData, 8000)
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [authed, adminToken, activeTab])

    // Real-time WebSocket Order Notifications
    useEffect(() => {
        if (!authed || !adminToken) return

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        let host = window.location.host
        
        const envApiUrl = import.meta.env.VITE_API_URL
        if (envApiUrl) {
            try {
                host = envApiUrl.replace(/^https?:\/\//, '').split('/')[0]
            } catch (e) {
                console.error("Failed to parse VITE_API_URL for WebSocket:", e)
            }
        } else if (window.location.hostname === 'localhost') {
            host = 'localhost:8000'
        }

        let ws;
        let reconnectTimeout;

        const connectWS = () => {
            ws = new WebSocket(`${protocol}//${host}/ws/admin`)

            ws.onmessage = async (event) => {
                try {
                    const data = JSON.parse(event.data)
                    if (data.type === 'new_order') {
                        const newId = Date.now() + Math.random().toString(36).substr(2, 9)
                        setNotifications(prev => [
                            ...prev,
                            {
                                id: newId,
                                token: data.token,
                                customerName: data.customer_name,
                                phone: data.phone
                            }
                        ])

                        const now = Date.now()
                        if (now - lastChimeTimeRef.current > 1000) {
                            lastChimeTimeRef.current = now
                            // Play synthesised audio alert chime using Web Audio API
                            try {
                                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                                const gainNode = audioCtx.createGain();
                                const oscillator = audioCtx.createOscillator();
                                oscillator.connect(gainNode);
                                gainNode.connect(audioCtx.destination);
                                oscillator.type = 'sine';
                                oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
                                gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
                                oscillator.start();
                                oscillator.stop(audioCtx.currentTime + 0.12);
                                setTimeout(() => {
                                    const osc2 = audioCtx.createOscillator();
                                    osc2.connect(gainNode);
                                    osc2.type = 'sine';
                                    osc2.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
                                    osc2.start();
                                    osc2.stop(audioCtx.currentTime + 0.22);
                                }, 120);
                            } catch (soundErr) { }
                        }

                        setTimeout(() => {
                            removeNotification(newId)
                        }, 10000)

                        // Refresh orders list immediately if currently viewing orders
                        if (activeTab === 'orders') {
                            try {
                                const freshToken = localStorage.getItem('adminToken') || adminToken
                                const ordersData = await listOrders(freshToken)
                                setOrders(Array.isArray(ordersData) ? ordersData : [])
                            } catch (e) {
                                console.error("Error reloading orders on new order event:", e)
                            }
                        }
                    }
                } catch (err) {
                    console.error("Admin WebSocket message parse error:", err)
                }
            }

            ws.onclose = () => {
                reconnectTimeout = setTimeout(connectWS, 3000)
            }

            ws.onerror = (err) => {
                console.error("Admin WebSocket error:", err)
                ws.close()
            }
        }

        connectWS()

        return () => {
            if (ws) {
                ws.onclose = null // Prevent reconnect loop from firing on deliberate close
                ws.close()
            }
            if (reconnectTimeout) clearTimeout(reconnectTimeout)
        }
    }, [authed, adminToken, activeTab])

    const handleLogin = async () => {
        setLoginError('')
        setLoading(true)
        try {
            const res = await adminLogin(password.trim())
            const token = res.access_token
            setAdminToken(token)
            localStorage.setItem('adminToken', token)
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
            const data = await getAdminProducts(adminToken)
            const cleanedData = (Array.isArray(data) ? data : []).map(p => ({
                ...p,
                category: unescapeHTML(p.category),
                sub_category: unescapeHTML(p.sub_category)
            }))
            setProducts(cleanedData)
        } catch (err) {
            alert(err.message)
        } finally {
            setLoading(false)
        }
    }

    // --- Visual Ordering Handlers ---
    const handlePinProduct = (prod) => {
        setPinnedList(prev => [...prev, prod])
    }

    const handleUnpinProduct = (productId) => {
        setPinnedList(prev => prev.filter(p => p.id !== productId))
    }

    const handleMoveUp = (filteredIdx) => {
        if (filteredIdx === 0) return
        const itemA = displayedPinnedList[filteredIdx]
        const itemB = displayedPinnedList[filteredIdx - 1]
        setPinnedList(prev => {
            const next = [...prev]
            const idxA = next.findIndex(p => p.id === itemA.id)
            const idxB = next.findIndex(p => p.id === itemB.id)
            ;[next[idxA], next[idxB]] = [next[idxB], next[idxA]]
            return next
        })
    }

    const handleMoveDown = (filteredIdx) => {
        if (filteredIdx === displayedPinnedList.length - 1) return
        const itemA = displayedPinnedList[filteredIdx]
        const itemB = displayedPinnedList[filteredIdx + 1]
        setPinnedList(prev => {
            const next = [...prev]
            const idxA = next.findIndex(p => p.id === itemA.id)
            const idxB = next.findIndex(p => p.id === itemB.id)
            ;[next[idxA], next[idxB]] = [next[idxB], next[idxA]]
            return next
        })
    }

    const handleDirectRankSubmit = (productId, originalIdx) => {
        const typedVal = editingRanks[productId]
        if (typedVal === undefined) return
        
        const newRank = parseInt(typedVal)
        // Clean up editing state for this product
        setEditingRanks(prev => {
            const next = { ...prev }
            delete next[productId]
            return next
        })

        if (isNaN(newRank) || newRank < 1 || newRank > displayedPinnedList.length) {
            return
        }

        const targetIdx = newRank - 1
        if (targetIdx === originalIdx) return

        const itemA = displayedPinnedList[originalIdx]
        const itemB = displayedPinnedList[targetIdx]

        setPinnedList(prev => {
            const next = [...prev]
            const idxA = next.findIndex(p => p.id === itemA.id)
            const idxB = next.findIndex(p => p.id === itemB.id)
            if (idxA !== -1 && idxB !== -1) {
                ;[next[idxA], next[idxB]] = [next[idxB], next[idxA]]
            }
            return next
        })
    }

    const handleSaveOrdering = async () => {
        setSaveOrderingLoading(true)
        try {
            const previouslyPinnedIds = products.filter(p => p.display_order > 0).map(p => p.id)
            const currentlyPinnedIds = pinnedList.map(p => p.id)
            const clearIds = previouslyPinnedIds.filter(id => !currentlyPinnedIds.includes(id))

            await bulkReorderProducts(currentlyPinnedIds, adminToken, clearIds)
            
            // Update local products state with new display orders instead of full re-fetch to avoid timeouts
            const updatedProducts = products.map(p => {
                const pinIdx = currentlyPinnedIds.indexOf(p.id)
                if (pinIdx !== -1) {
                    return { ...p, display_order: pinIdx + 1 }
                } else if (p.display_order > 0 && clearIds.includes(p.id)) {
                    return { ...p, display_order: 0 }
                }
                return p
            })
            setProducts(updatedProducts)
            
            // Keep the initialised flag true so background fetches don't overwrite the state
            orderingInitialisedRef.current = true
            alert("✓ Custom display rankings saved successfully!")
        } catch (err) {
            alert("FAIL: " + (err.message || "Failed to save ranks"))
        } finally {
            setSaveOrderingLoading(false)
        }
    }

    const handleResetOrdering = async () => {
        const isCategoryScoped = categoryFilter && categoryFilter !== 'All'
        const scopeLabel = isCategoryScoped ? `"${categoryFilter}"` : 'ALL'
        if (!window.confirm(
            isCategoryScoped
                ? `Clear pinned rankings for category ${scopeLabel} only? Other categories will be untouched.`
                : `Clear ALL rankings across every category? This cannot be undone.`
        )) return

        setSaveOrderingLoading(true)
        try {
            // Determine which ranked products to zero out
            const rankedIdsToRemove = products
                .filter(p => p.display_order > 0 && (isCategoryScoped ? p.category === categoryFilter : true))
                .map(p => p.id)

            // Pass as clear_ids — backend zeros them without re-ranking
            await bulkReorderProducts([], adminToken, rankedIdsToRemove)

            // Remove cleared items from the local pinned list (keep others if category-scoped)
            setPinnedList(prev =>
                isCategoryScoped
                    ? prev.filter(p => p.category !== categoryFilter)
                    : []
            )

            // Update local products state with cleared display orders instead of full re-fetch to avoid timeouts
            const updatedProducts = products.map(p => {
                const shouldClear = isCategoryScoped ? (p.category === categoryFilter) : true
                if (shouldClear && p.display_order > 0) {
                    return { ...p, display_order: 0 }
                }
                return p
            })
            setProducts(updatedProducts)
            orderingInitialisedRef.current = true
            alert(`✓ Rankings cleared for ${scopeLabel}!`)
        } catch (err) {
            alert("FAIL: " + (err.message || "Failed to clear ranks"))
        } finally {
            setSaveOrderingLoading(false)
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

    const handleResetPinSubmit = async (e) => {
        e.preventDefault()
        if (!newPinInput || newPinInput.length !== 4 || !/^\d{4}$/.test(newPinInput)) {
            setResetError('PIN must be exactly 4 digits')
            return
        }
        setResetError('')
        setResetLoading(true)
        try {
            await adminResetPin(resetPinCustomer.phone, newPinInput, adminToken)
            setResetSuccess(`Successfully reset PIN for customer ${resetPinCustomer.phone} to ${newPinInput}`)
            setNewPinInput('')
            // Refresh customers list to ensure sync
            const data = await listCustomers(adminToken)
            setCustomers(Array.isArray(data) ? data : [])
            setTimeout(() => {
                setResetPinCustomer(null)
                setResetSuccess('')
            }, 2000)
        } catch (err) {
            setResetError(err.message || 'Failed to reset PIN')
        } finally {
            setResetLoading(false)
        }
    }

    // --- Derived / memoised values ---
    // IMPORTANT: all useMemo calls must be ABOVE any early return to satisfy React's Rules of Hooks
    const uniqueCategories = useMemo(() => {
        const cats = new Set(products.map(p => p.category));
        return ['All', ...Array.from(cats).sort()];
    }, [products]);

    const pinnedIds = useMemo(() => new Set(pinnedList.map(p => p.id)), [pinnedList]);

    // Right-panel view: when a specific category is active show only that category's pins
    // so ranks appear as 1, 2, 3… within the category instead of a global 116, 117…
    const displayedPinnedList = useMemo(() => {
        if (!categoryFilter || categoryFilter === 'All') return pinnedList
        return pinnedList.filter(p => p.category === categoryFilter)
    }, [pinnedList, categoryFilter]);

    // Filter displayed pinned list based on search query
    const filteredDisplayedPinnedList = useMemo(() => {
        const listWithIndices = displayedPinnedList.map((p, idx) => ({ p, originalIdx: idx }))
        if (!pinnedSearchQuery.trim()) return listWithIndices
        const term = pinnedSearchQuery.toLowerCase()
        return listWithIndices.filter(item => 
            item.p.name.toLowerCase().includes(term) ||
            item.p.category.toLowerCase().includes(term)
        )
    }, [displayedPinnedList, pinnedSearchQuery]);

    const availableProducts = useMemo(() => {
        return products.filter(p => {
            const matchSearch = !searchQuery ||
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.category.toLowerCase().includes(searchQuery.toLowerCase());
            const matchCat = categoryFilter === 'All' || p.category === categoryFilter;
            return matchSearch && matchCat;
        });
    }, [products, searchQuery, categoryFilter]);

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

    const filteredProducts = products.filter(p => {
        if (activeTab === 'new_products' && !p.is_newly_launched) return false;
        if (!searchQuery) return true;
        return p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <motion.div className="admin-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Real-time Order Popup Notifications */}
            <div style={{
                position: 'fixed',
                top: '24px',
                right: '24px',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                pointerEvents: 'none'
            }}>
                <AnimatePresence>
                    {notifications.map((notif) => (
                        <motion.div 
                            key={notif.id}
                            initial={{ opacity: 0, x: 50, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 100, scale: 0.9 }}
                            style={{
                                pointerEvents: 'auto',
                                background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
                                color: 'white',
                                padding: '16px 20px',
                                borderRadius: '16px',
                                boxShadow: '0 10px 25px -5px rgba(59,130,246,0.4)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                width: '320px',
                                border: '1px solid rgba(255,255,255,0.2)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>
                                    🔔 New Order Received!
                                </span>
                                <button 
                                    onClick={() => removeNotification(notif.id)}
                                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', padding: 0 }}
                                >
                                    ×
                                </button>
                            </div>
                            <div>
                                <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '2px' }}>
                                    #{notif.token.slice(0, 10).toUpperCase()}
                                </div>
                                <div style={{ fontSize: '13px', opacity: 0.9 }}>
                                    Customer: <strong>{notif.customerName}</strong>
                                </div>
                                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                                    Phone: {notif.phone}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                <button 
                                    onClick={() => {
                                        setActiveTab('orders');
                                        removeNotification(notif.id);
                                    }}
                                    style={{
                                        flex: 1,
                                        background: 'white',
                                        color: '#1e3a8a',
                                        fontSize: '11px',
                                        padding: '6px 12px',
                                        fontWeight: '800',
                                        borderRadius: '8px',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    View Order
                                </button>
                                <button 
                                    onClick={() => removeNotification(notif.id)}
                                    style={{
                                        background: 'rgba(255,255,255,0.2)',
                                        color: 'white',
                                        fontSize: '11px',
                                        padding: '6px 12px',
                                        fontWeight: '800',
                                        borderRadius: '8px',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Dismiss
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
            {/* Nav Header */}
            <div className="admin-header">
                <div>
                    <h1>🌾 KGS Admin <span style={{fontSize: '12px', opacity: 0.5, fontWeight: 400}}>v33</span></h1>
                    <p>Store Management System</p>
                </div>
                <div className="admin-nav-tabs">
                    {['orders', 'products', 'ordering', 'new_products', 'visibility', 'inventory', 'renamer', 'customers'].map(tab => (
                        <button
                            key={tab}
                            className={`nav-tab ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => { setActiveTab(tab); setSearchQuery(''); }}
                        >
                            {tab === 'ordering' ? 'Sort Display' : tab === 'visibility' ? 'Displayer' : tab === 'inventory' ? 'Stock' : tab === 'new_products' ? 'Newly Launched' : tab === 'renamer' ? 'Product Names' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
                <button className="btn btn-ghost" onClick={() => { setAuthed(false); setAdminToken(null); localStorage.removeItem('adminToken'); }} style={{ color: '#fff' }}>Sign Out</button>
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
                            <OrderLane title="⏳ Processing" orders={processing} onAction={handleStatusAction} onExpand={toggleExpand} expanded={expanded} togglingToken={togglingToken} cardError={cardError} adminToken={adminToken} setOrders={setOrders} />
                            <OrderLane title="🟡 Ready for Pickup" orders={ready} onAction={handleStatusAction} onExpand={toggleExpand} expanded={expanded} togglingToken={togglingToken} cardError={cardError} adminToken={adminToken} setOrders={setOrders} />
                            <OrderLane title="✅ Delivered" orders={orders.filter(o => o.status === 'Delivered')} onAction={handleStatusAction} onExpand={toggleExpand} expanded={expanded} togglingToken={togglingToken} cardError={cardError} adminToken={adminToken} setOrders={setOrders} />
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
                                <div key={c.phone} className="customer-row card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                                    <div className="customer-info" style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                            <span className="cust-phone" style={{ fontSize: '15.5px' }}>📱 {c.phone}</span>
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                <a href={`tel:${c.phone}`} className="admin-order-phone-btn" style={{ fontSize: '11px', padding: '3px 8px' }}>📞 Call</a>
                                                <a href={`https://wa.me/${c.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="admin-order-phone-btn" style={{ fontSize: '11px', padding: '3px 8px' }}>💬 WhatsApp</a>
                                                <button 
                                                    onClick={() => { setResetPinCustomer(c); setNewPinInput(''); setResetError(''); setResetSuccess('') }} 
                                                    className="admin-order-phone-btn" 
                                                    style={{ fontSize: '11px', padding: '3px 8px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', cursor: 'pointer' }}
                                                >
                                                    🔑 Reset PIN
                                                </button>
                                            </div>
                                        </div>
                                        <span className="cust-name" style={{ display: 'block', marginTop: '4px', fontWeight: 600, color: '#475569' }}>{c.name || 'Anonymous User'}</span>
                                    </div>
                                    <div className="cust-meta" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Joined: {c.created_at}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'products' && (
                    <div className="products-view">
                        <div className="section-header">
                            <h3>Catalog Management ({products.length})</h3>
                            <button className="btn btn-primary" onClick={() => setProductForm({ name: '', base_name: '', price: 0, description: '', category: '', image_url: '', unit: 'kg', is_visible: true, in_stock: true, is_newly_launched: false })}>
                                + Add New Product
                            </button>
                        </div>
                        <div style={{ position: 'sticky', top: 0, background: '#f8fafc', padding: '10px 0 20px', zIndex: 100 }}>
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="input search-bar"
                                style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', background: 'white' }}
                            />
                        </div>

                        <div className="products-grid">
                            {filteredProducts.slice(0, productLimit).map(p => (
                                <div key={p.id} className="product-admin-card card">
                                    <img src={p.image_url} alt="" className="p-img" onError={(e) => e.target.style.display='none'} />
                                    <div className="p-info">
                                        <div className="p-cat">{p.category}</div>
                                        <div className="p-name">{p.name}</div>
                                        <div className="p-price">₹{p.price} / {p.unit}</div>
                                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                            <span className={`badge ${p.is_visible ? 'success' : 'danger'}`} style={{ fontSize: 9 }}>{p.is_visible ? 'Visible' : 'Hidden'}</span>
                                            <span className={`badge ${p.in_stock ? 'success' : 'danger'}`} style={{ fontSize: 9 }}>{p.in_stock ? 'In Stock' : 'Out of Stock'}</span>
                                        </div>
                                    </div>
                                    <div className="p-actions">
                                        <button className="btn-icon" onClick={() => setProductForm(p)}>✏️</button>
                                        <button className="btn-icon" onClick={() => handleDeleteProduct(p.id)} style={{ color: 'var(--danger)' }}>🗑️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {filteredProducts.length > productLimit && (
                            <div style={{ textAlign: 'center', marginTop: 24, width: '100%', gridColumn: '1 / -1' }}>
                                <button className="btn btn-outline" onClick={() => setProductLimit(prev => prev + 50)} style={{ minWidth: 200, padding: '10px 20px', borderRadius: 10 }}>
                                    Load More Products ({filteredProducts.length - productLimit} left)
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'new_products' && (
                    <div className="products-view">
                        <div className="section-header">
                            <h3>Newly Launched ({filteredProducts.length})</h3>
                            <button className="btn btn-primary" onClick={() => setProductForm({ name: '', base_name: '', price: 0, description: '', category: '', image_url: '', unit: 'kg', is_visible: true, in_stock: true, is_newly_launched: true })}>
                                + Add New Product
                            </button>
                        </div>
                        <div style={{ position: 'sticky', top: 0, background: '#f8fafc', padding: '10px 0 20px', zIndex: 100 }}>
                            <input
                                type="text"
                                placeholder="Search newly launched..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="input search-bar"
                                style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', background: 'white' }}
                            />
                        </div>

                        <div className="products-grid">
                            {filteredProducts.map(p => (
                                <div key={p.id} className="product-admin-card card">
                                    <img src={p.image_url} alt="" className="p-img" onError={(e) => e.target.style.display='none'} />
                                    <div className="p-info">
                                        <div className="p-cat">{p.category}</div>
                                        <div className="p-name">{p.name}</div>
                                        <div className="p-price">₹{p.price} / {p.unit}</div>
                                    </div>
                                    <div className="p-actions">
                                        <button className="btn-icon" onClick={() => setProductForm(p)}>✏️</button>
                                        <button className="btn-icon" onClick={async () => {
                                            try {
                                                await updateProduct(p.id, { is_newly_launched: false }, adminToken);
                                                setProducts(prev => prev.map(item => item.id === p.id ? { ...item, is_newly_launched: false } : item));
                                            } catch (err) { alert(err.message) }
                                        }} style={{ fontSize: 12, padding: '4px 8px', background: '#fef3c7', color: '#b45309', borderRadius: 6, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                            Remove Star
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'visibility' && (
                    <div className="products-view">
                        <div className="section-header">
                            <h3>Product Displayer (Visibility)</h3>
                            <p style={{ fontSize: 13, color: '#64748b' }}>Choose which products are shown to customers</p>
                        </div>
                        <div style={{ position: 'sticky', top: 0, background: '#f8fafc', padding: '10px 0 20px', zIndex: 100 }}>
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="input search-bar"
                                style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', background: 'white' }}
                            />
                        </div>
                        <div className="products-grid">
                            {filteredProducts.slice(0, productLimit).map(p => (
                                <div key={p.id} className="product-admin-card card">
                                    <img src={p.image_url} alt="" className="p-img" onError={(e) => e.target.style.display='none'} />
                                    <div className="p-info">
                                        <div className="p-name">{p.name}</div>
                                        <div className="p-cat">{p.category}</div>
                                    </div>
                                    <div className="p-actions">
                                        <div className="toggle-container" onClick={async () => {
                                            try {
                                                await updateProduct(p.id, { is_visible: !p.is_visible }, adminToken);
                                                setProducts(prev => prev.map(item => item.id === p.id ? { ...item, is_visible: !item.is_visible } : item));
                                            } catch (err) { alert(err.message) }
                                        }}>
                                            <div className={`toggle-switch ${p.is_visible ? 'on' : 'off'}`}>
                                                <div className="toggle-handle"></div>
                                            </div>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: p.is_visible ? 'var(--secondary)' : 'var(--danger)' }}>
                                                {p.is_visible ? 'VISIBLE' : 'HIDDEN'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {filteredProducts.length > productLimit && (
                            <div style={{ textAlign: 'center', marginTop: 24, width: '100%', gridColumn: '1 / -1' }}>
                                <button className="btn btn-outline" onClick={() => setProductLimit(prev => prev + 50)} style={{ minWidth: 200, padding: '10px 20px', borderRadius: 10 }}>
                                    Load More Products ({filteredProducts.length - productLimit} left)
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'inventory' && (
                    <div className="products-view">
                        <div className="section-header">
                            <h3>Stock Inventory</h3>
                            <p style={{ fontSize: 13, color: '#64748b' }}>Manage product availability</p>
                        </div>
                        <div style={{ position: 'sticky', top: 0, background: '#f8fafc', padding: '10px 0 20px', zIndex: 100 }}>
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="input search-bar"
                                style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', background: 'white' }}
                            />
                        </div>
                        <div className="products-grid">
                            {filteredProducts.slice(0, productLimit).map(p => (
                                <div key={p.id} className="product-admin-card card">
                                    <img src={p.image_url} alt="" className="p-img" onError={(e) => e.target.style.display='none'} />
                                    <div className="p-info">
                                        <div className="p-name">{p.name}</div>
                                        <div className="p-cat">{p.category}</div>
                                    </div>
                                    <div className="p-actions" style={{ minWidth: 120 }}>
                                        <div className="stock-radio-group">
                                            <label className="stock-label">
                                                <input 
                                                    type="radio" 
                                                    checked={p.in_stock} 
                                                    onChange={async () => {
                                                        try {
                                                            await updateProduct(p.id, { in_stock: true }, adminToken);
                                                            setProducts(prev => prev.map(item => item.id === p.id ? { ...item, in_stock: true } : item));
                                                        } catch (err) { alert(err.message) }
                                                    }}
                                                />
                                                <span className="stock-text">In Stock</span>
                                            </label>
                                            <label className="stock-label">
                                                <input 
                                                    type="radio" 
                                                    checked={!p.in_stock} 
                                                    onChange={async () => {
                                                        try {
                                                            await updateProduct(p.id, { in_stock: false }, adminToken);
                                                            setProducts(prev => prev.map(item => item.id === p.id ? { ...item, in_stock: false } : item));
                                                        } catch (err) { alert(err.message) }
                                                    }}
                                                />
                                                <span className="stock-text out">Out of Stock</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {filteredProducts.length > productLimit && (
                            <div style={{ textAlign: 'center', marginTop: 24, width: '100%', gridColumn: '1 / -1' }}>
                                <button className="btn btn-outline" onClick={() => setProductLimit(prev => prev + 50)} style={{ minWidth: 200, padding: '10px 20px', borderRadius: 10 }}>
                                    Load More Products ({filteredProducts.length - productLimit} left)
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'ordering' && (
                    <div className="products-view">
                        <div className="section-header" style={{ marginBottom: 16 }}>
                            <div>
                                <h3>Visual Product Sorting</h3>
                                <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                                    Pin products from the left catalog. Drag or reorder them on the right. 
                                    Top products appear first on the customer side.
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button 
                                    className="btn btn-outline" 
                                    onClick={handleResetOrdering}
                                    disabled={saveOrderingLoading}
                                    style={{ padding: '10px 18px', borderRadius: '10px' }}
                                >
                                    {categoryFilter && categoryFilter !== 'All'
                                        ? `Clear "${categoryFilter}" Pins`
                                        : 'Clear All Pins'}
                                </button>
                                <button 
                                    className="btn btn-primary" 
                                    onClick={handleSaveOrdering}
                                    disabled={saveOrderingLoading}
                                    style={{ padding: '10px 24px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 8 }}
                                >
                                    {saveOrderingLoading ? 'Saving Ranks...' : 'Save Rankings ✓'}
                                </button>
                            </div>
                        </div>

                        <div className="ordering-dual-layout">
                            {/* LEFT COLUMN: Available Products */}
                            <div className="ordering-column">
                                <div className="ordering-column-title">
                                    <span>Available Catalog ({availableProducts.length})</span>
                                </div>
                                
                                <div className="ordering-search-row" style={{ position: 'sticky', top: 0, background: 'white', padding: '10px 0', zIndex: 10 }}>
                                    <input
                                        type="text"
                                        placeholder="Search products..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="input"
                                        style={{ flex: 1, padding: '10px 14px', borderRadius: '10px' }}
                                    />
                                    <select
                                        value={categoryFilter}
                                        onChange={e => setCategoryFilter(e.target.value)}
                                        className="input"
                                        style={{ width: '160px', padding: '10px 14px', borderRadius: '10px', cursor: 'pointer' }}
                                    >
                                        {uniqueCategories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="ordering-list">
                                    {availableProducts.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                                            <div style={{ fontSize: 32, marginBottom: 8 }}>🌾</div>
                                            <strong>No products match filters</strong>
                                            <p style={{ fontSize: 12, marginTop: 4 }}>Try adjusting your search terms or category selection.</p>
                                        </div>
                                    ) : (
                                        <>
                                            {availableProducts.slice(0, productLimit).map(p => (
                                                <div key={p.id} className="ordering-item-card">
                                                    <div className="ordering-item-details">
                                                        <img 
                                                            src={p.image_url} 
                                                            alt="" 
                                                            className="ordering-item-img" 
                                                            onError={e => e.target.style.display = 'none'} 
                                                        />
                                                        <div className="ordering-item-meta">
                                                            <span className="ordering-item-cat">{p.category}</span>
                                                            <span className="ordering-item-name">{p.name}</span>
                                                        </div>
                                                    </div>
                                                    {pinnedIds.has(p.id) ? (
                                                        <span style={{ color: '#059669', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, background: '#d1fae5', border: '1px solid #10b981' }}>
                                                            Pinned ✓
                                                        </span>
                                                    ) : (
                                                        <button 
                                                            className="btn btn-ghost"
                                                            onClick={() => handlePinProduct(p)}
                                                            style={{ color: 'var(--secondary)', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, background: '#ecfdf5' }}
                                                        >
                                                            Pin ➕
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            {availableProducts.length > productLimit && (
                                                <button 
                                                    className="btn btn-outline" 
                                                    onClick={() => setProductLimit(prev => prev + 50)} 
                                                    style={{ width: '100%', marginTop: 10, padding: 10, borderRadius: 10 }}
                                                >
                                                    Load More ({availableProducts.length - productLimit} left)
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Pinned / Ranked Display */}
                            <div className="ordering-column" style={{ borderLeft: '2px dashed #e2e8f0' }}>
                                <div className="ordering-column-title">
                                    <span>
                                        {categoryFilter && categoryFilter !== 'All'
                                            ? `"${categoryFilter}" Order (${displayedPinnedList.length})`
                                            : `Ranked Display Order (${pinnedList.length})`}
                                    </span>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', background: 'var(--primary-glow)', padding: '4px 8px', borderRadius: 6 }}>
                                        {categoryFilter && categoryFilter !== 'All' && pinnedList.length > displayedPinnedList.length
                                            ? `${displayedPinnedList.length} of ${pinnedList.length} total`
                                            : 'Ranked (1=Top)'}
                                    </span>
                                </div>

                                {displayedPinnedList.length > 0 && (
                                    <div className="ordering-search-row" style={{ position: 'sticky', top: 0, background: 'white', padding: '10px 0', zIndex: 10 }}>
                                        <input
                                            type="text"
                                            placeholder="Search pinned products..."
                                            value={pinnedSearchQuery}
                                            onChange={e => setPinnedSearchQuery(e.target.value)}
                                            className="input"
                                            style={{ flex: 1, padding: '10px 14px', borderRadius: '10px' }}
                                        />
                                    </div>
                                )}

                                <div className="ordering-list">
                                    {displayedPinnedList.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b' }}>
                                            <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
                                            <strong>No products pinned yet</strong>
                                            <p style={{ fontSize: 13, marginTop: 6, maxWidth: 260, margin: '6px auto 0' }}>
                                                {categoryFilter && categoryFilter !== 'All'
                                                    ? `Pin products from "${categoryFilter}" on the left to rank them here.`
                                                    : 'Select products from the left side. They will appear here in order, pinning them to the top of the store page.'}
                                            </p>
                                        </div>
                                    ) : filteredDisplayedPinnedList.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                                            <div style={{ fontSize: 32, marginBottom: 8 }}>🌾</div>
                                            <strong>No pinned products match search</strong>
                                            <p style={{ fontSize: 12, marginTop: 4 }}>Try adjusting your search terms.</p>
                                        </div>
                                    ) : (
                                        filteredDisplayedPinnedList.map(({ p, originalIdx }) => (
                                            <div key={p.id} className="ordering-item-card" style={{ border: '1px solid #cbd5e1', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                                <input 
                                                    type="text"
                                                    pattern="\d*"
                                                    className="ordering-rank-input"
                                                    value={editingRanks[p.id] !== undefined ? editingRanks[p.id] : String(originalIdx + 1)}
                                                    onChange={e => {
                                                        const val = e.target.value
                                                        if (/^\d*$/.test(val)) {
                                                            setEditingRanks(prev => ({ ...prev, [p.id]: val }))
                                                        }
                                                    }}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                            handleDirectRankSubmit(p.id, originalIdx)
                                                        }
                                                    }}
                                                    onBlur={() => {
                                                        handleDirectRankSubmit(p.id, originalIdx)
                                                    }}
                                                    min="1"
                                                    max={displayedPinnedList.length}
                                                    title={`Rank between 1 and ${displayedPinnedList.length}. Press Enter to swap.`}
                                                />
                                                <div className="ordering-item-details">
                                                    <img 
                                                        src={p.image_url} 
                                                        alt="" 
                                                        className="ordering-item-img" 
                                                        onError={e => e.target.style.display = 'none'} 
                                                    />
                                                    <div className="ordering-item-meta">
                                                        <span className="ordering-item-cat">{p.category}</span>
                                                        <span className="ordering-item-name">{p.name}</span>
                                                    </div>
                                                </div>
                                                <div className="ordering-actions">
                                                    <button 
                                                        className="btn-action-small"
                                                        onClick={() => handleMoveUp(originalIdx)}
                                                        disabled={originalIdx === 0}
                                                        style={{ opacity: originalIdx === 0 ? 0.3 : 1, cursor: originalIdx === 0 ? 'not-allowed' : 'pointer' }}
                                                        title="Move Up"
                                                    >
                                                        ▲
                                                    </button>
                                                    <button 
                                                        className="btn-action-small"
                                                        onClick={() => handleMoveDown(originalIdx)}
                                                        disabled={originalIdx === displayedPinnedList.length - 1}
                                                        style={{ opacity: originalIdx === displayedPinnedList.length - 1 ? 0.3 : 1, cursor: originalIdx === displayedPinnedList.length - 1 ? 'not-allowed' : 'pointer' }}
                                                        title="Move Down"
                                                    >
                                                        ▼
                                                    </button>
                                                    <button 
                                                        className="btn-action-small"
                                                        onClick={() => handleUnpinProduct(p.id)}
                                                        style={{ color: 'var(--danger)', borderColor: '#fee2e2', background: '#fef2f2' }}
                                                        title="Remove / Unpin"
                                                    >
                                                        ❌
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'renamer' && (
                    <div className="renamer-view" style={{ borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                        <ProductRenamer />
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
                                <div className="form-grid">
                                    <div>
                                        <label>Product Name (System)</label>
                                        <input required value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} placeholder="e.g. Parachute Coconut Oil 500ml" />
                                    </div>
                                    <div>
                                        <label>Base Name (Website Grouping)</label>
                                        <input value={productForm.base_name || ''} onChange={e => setProductForm({ ...productForm, base_name: e.target.value })} placeholder="e.g. Parachute Coconut Oil" />
                                    </div>
                                </div>

                                <div className="live-preview-box">
                                    <span className="live-preview-title">🌐 Website Display Preview:</span>
                                    <span className="live-preview-text">
                                        {getWebsiteDisplayName(productForm.name, productForm.base_name, productForm.unit)}
                                    </span>
                                </div>
                                
                                <div className="form-grid" style={{ marginTop: 12 }}>
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

                                <div className="form-grid" style={{ marginTop: 12 }}>
                                    <div className="form-check">
                                        <input type="checkbox" id="is_visible" checked={productForm.is_visible} onChange={e => setProductForm({ ...productForm, is_visible: e.target.checked })} />
                                        <label htmlFor="is_visible" style={{ marginTop: 0, marginLeft: 8, display: 'inline' }}>Visible in Store</label>
                                    </div>
                                    <div className="form-check">
                                        <input type="checkbox" id="in_stock" checked={productForm.in_stock} onChange={e => setProductForm({ ...productForm, in_stock: e.target.checked })} />
                                        <label htmlFor="in_stock" style={{ marginTop: 0, marginLeft: 8, display: 'inline' }}>In Stock</label>
                                    </div>
                                    <div className="form-check" style={{ gridColumn: 'span 2' }}>
                                        <input type="checkbox" id="is_newly_launched" checked={!!productForm.is_newly_launched} onChange={e => setProductForm({ ...productForm, is_newly_launched: e.target.checked })} />
                                        <label htmlFor="is_newly_launched" style={{ marginTop: 0, marginLeft: 8, display: 'inline' }}>⭐ Newly Launched</label>
                                    </div>
                                </div>

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

            {/* Reset PIN Modal */}
            <AnimatePresence>
                {resetPinCustomer && (
                    <div className="modal-overlay">
                        <motion.div className="modal-content" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                            <h3>Reset Customer PIN</h3>
                            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                                Resetting PIN for customer: <strong>{resetPinCustomer.name || 'Anonymous User'} ({resetPinCustomer.phone})</strong>
                            </p>
                            <form onSubmit={handleResetPinSubmit} className="admin-form">
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>New 4-Digit PIN</label>
                                    <input 
                                        type="password" 
                                        inputMode="numeric" 
                                        maxLength={4} 
                                        required 
                                        value={newPinInput} 
                                        onChange={e => setNewPinInput(e.target.value.replace(/\D/g, ''))} 
                                        placeholder="••••"
                                        className="input"
                                        style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', background: '#f8fafc' }}
                                    />
                                </div>

                                {resetError && <p className="error-msg" style={{ color: '#EF4444', fontSize: '13px', marginTop: 12, margin: '12px 0 0 0' }}>⚠️ {resetError}</p>}
                                {resetSuccess && <p style={{ color: '#10B981', fontSize: '13px', marginTop: 12, fontWeight: 500, margin: '12px 0 0 0' }}>{resetSuccess}</p>}

                                <div className="modal-btns" style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                    <button type="button" className="btn btn-ghost" onClick={() => { setResetPinCustomer(null); setNewPinInput(''); setResetError(''); setResetSuccess('') }}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={resetLoading}>
                                        {resetLoading ? 'Resetting...' : 'Reset PIN'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .admin-page { min-height: 100vh; background: #f8fafc; font-family: 'Inter', sans-serif; }
                
                /* Custom Ordering Dual Column Layout */
                .ordering-dual-layout {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 24px;
                    margin-top: 16px;
                }
                @media (max-width: 1024px) {
                    .ordering-dual-layout {
                        grid-template-columns: 1fr;
                    }
                }
                .ordering-column {
                    background: white;
                    border-radius: 16px;
                    padding: 20px;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                    border: 1px solid #e2e8f0;
                }
                .ordering-column-title {
                    font-size: 16px;
                    font-weight: 800;
                    color: #1e293b;
                    margin-bottom: 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .ordering-search-row {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 16px;
                }
                @media (max-width: 480px) {
                    .ordering-search-row {
                        flex-direction: column;
                        gap: 10px;
                    }
                    .ordering-search-row select {
                        width: 100% !important;
                    }
                }
                .ordering-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    max-height: 600px;
                    overflow-y: auto;
                    padding-right: 6px;
                }
                .ordering-item-card {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 10px 12px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    transition: all 0.2s;
                }
                .ordering-item-card:hover {
                    border-color: #cbd5e1;
                    background: #f1f5f9;
                }
                .ordering-rank-badge {
                    background: #1e3a8a;
                    color: white;
                    font-weight: 800;
                    font-size: 12px;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .ordering-rank-input {
                    background: #1e3a8a;
                    color: white;
                    font-weight: 800;
                    font-size: 12px;
                    width: 32px;
                    height: 24px;
                    border-radius: 6px;
                    border: 1px solid rgba(255,255,255,0.2);
                    text-align: center;
                    outline: none;
                    flex-shrink: 0;
                    transition: all 0.2s;
                }
                .ordering-rank-input:focus {
                    border-color: #60a5fa;
                    background: #2563eb;
                    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4);
                }
                /* Hide up/down arrows in number inputs */
                .ordering-rank-input::-webkit-outer-spin-button,
                .ordering-rank-input::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                .ordering-rank-input[type=number] {
                    -moz-appearance: textfield;
                }
                .ordering-item-details {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    overflow: hidden;
                }
                .ordering-item-img {
                    width: 40px;
                    height: 40px;
                    object-fit: cover;
                    border-radius: 8px;
                    background: #f1f5f9;
                    flex-shrink: 0;
                }
                .ordering-item-meta {
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .ordering-item-name {
                    font-size: 13.5px;
                    font-weight: 700;
                    color: #1e293b;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .ordering-item-cat {
                    font-size: 10px;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .ordering-actions {
                    display: flex;
                    gap: 6px;
                    flex-shrink: 0;
                }
                .btn-action-small {
                    background: white;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 10px;
                    transition: all 0.2s;
                }
                .btn-action-small:hover {
                    background: #f1f5f9;
                    border-color: #94a3b8;
                }
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

                /* Premium Admin Order Card styles */
                .admin-order-card {
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.06);
                    border: 1px solid #e2e8f0;
                    margin-bottom: 16px;
                    transition: all 0.25s ease;
                }
                .admin-order-card:hover {
                    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.08);
                    transform: translateY(-2px);
                }
                .admin-order-header {
                    padding: 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    border-bottom: 1px solid #f1f5f9;
                }
                .admin-order-token {
                    font-size: 15px;
                    font-weight: 800;
                    color: #1e3a8a;
                    word-break: break-all;
                }
                .admin-order-time {
                    font-size: 11px;
                    color: #94a3b8;
                    margin-top: 4px;
                }
                .admin-order-total {
                    font-size: 18px;
                    font-weight: 800;
                    color: #10b981;
                    text-align: right;
                }
                .admin-order-badge {
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 10px;
                    font-weight: 800;
                    text-transform: uppercase;
                    margin-top: 4px;
                }
                .admin-order-badge.delivery {
                    background: #dbeafe;
                    color: #1e40af;
                }
                .admin-order-badge.pickup {
                    background: #dcfce7;
                    color: #166534;
                }
                .admin-order-body {
                    padding: 16px;
                }
                .admin-order-phone {
                    font-size: 14px;
                    font-weight: 700;
                    color: #334155;
                    margin-bottom: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: #f8fafc;
                    padding: 8px 12px;
                    border-radius: 8px;
                    border: 1px solid #f1f5f9;
                }
                .admin-order-phone-link {
                    color: #3b82f6 !important;
                    text-decoration: none;
                    font-weight: 700;
                }
                .admin-order-phone-actions {
                    display: flex;
                    gap: 8px;
                }
                .admin-order-phone-btn {
                    padding: 4px 8px;
                    border-radius: 6px;
                    border: 1px solid #cbd5e1;
                    background: white;
                    font-size: 12px;
                    cursor: pointer;
                    text-decoration: none;
                    color: #475569;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    transition: all 0.2s;
                }
                .admin-order-phone-btn:hover {
                    background: #f1f5f9;
                    border-color: #94a3b8;
                    color: #1e293b;
                }
                .admin-order-address-box {
                    background: #f0f9ff;
                    border-left: 4px solid #0284c7;
                    padding: 12px;
                    border-radius: 8px;
                    font-size: 13px;
                    line-height: 1.5;
                    color: #0369a1;
                    margin-bottom: 12px;
                }
                .admin-order-pickup-box {
                    background: #f0fdf4;
                    border-left: 4px solid #16a34a;
                    padding: 10px 12px;
                    border-radius: 8px;
                    font-size: 13px;
                    line-height: 1.5;
                    color: #15803d;
                    margin-bottom: 12px;
                    font-weight: 600;
                }
                .admin-order-items-btn {
                    width: 100%;
                    background: #f1f5f9;
                    border: 1px solid #e2e8f0;
                    padding: 10px 12px;
                    border-radius: 8px;
                    color: #475569;
                    font-weight: 700;
                    font-size: 12px;
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    transition: all 0.2s;
                }
                .admin-order-items-btn:hover {
                    background: #e2e8f0;
                    color: #1e293b;
                }
                .admin-order-items-list {
                    padding: 12px;
                    background: #fafafa;
                    border: 1px solid #e2e8f0;
                    border-top: none;
                    border-radius: 0 0 8px 8px;
                }
                .admin-order-item-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 13px;
                    color: #334155;
                    padding: 6px 0;
                    border-bottom: 1px dashed #e2e8f0;
                }
                .admin-order-item-row:last-child {
                    border-bottom: none;
                }

                .admin-login { display: flex; align-items: center; justify-content: center; height: 100vh; }
                .admin-login-card { background: white; padding: 40px; border-radius: 24px; width: 340px; text-align: center; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
                .admin-avatar { font-size: 48px; margin-bottom: 16px; }

                .badge { padding: 4px 8px; border-radius: 6px; font-weight: 700; color: white; text-transform: uppercase; }
                .badge.success { background: #10b981; }
                .badge.danger { background: #ef4444; }

                .toggle-container { cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; }
                .toggle-switch { width: 44px; height: 22px; background: #e2e8f0; border-radius: 99px; position: relative; transition: background 0.3s; }
                .toggle-switch.on { background: #10b981; }
                .toggle-switch.off { background: #ef4444; }
                .toggle-handle { width: 18px; height: 18px; background: white; border-radius: 50%; position: absolute; top: 2px; left: 2px; transition: left 0.3s; }
                .toggle-switch.on .toggle-handle { left: 24px; }

                .stock-radio-group { display: flex; flex-direction: column; gap: 8px; }
                .stock-label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
                .stock-text { font-size: 13px; font-weight: 600; color: #10b981; }
                .stock-text.out { color: #ef4444; }
                .form-check { display: flex; align-items: center; }

                .live-preview-box {
                    background: #f0fdf4;
                    border: 1px solid #bbf7d0;
                    border-radius: 8px;
                    padding: 10px 14px;
                    margin-top: 14px;
                    margin-bottom: 8px;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    text-align: left;
                }
                .live-preview-title {
                    font-size: 10px;
                    font-weight: 800;
                    color: #166534;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .live-preview-text {
                    font-size: 14px;
                    font-weight: 700;
                    color: #14532d;
                }

                /* Responsive & Mobile-friendly overrides */
                .form-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }
                
                @media (max-width: 900px) {
                    .admin-header {
                        padding: 15px 20px;
                        flex-direction: column;
                        align-items: stretch;
                        gap: 15px;
                    }
                    .admin-header h1 {
                        font-size: 20px;
                        text-align: center;
                    }
                    .admin-header p {
                        text-align: center;
                    }
                    .admin-nav-tabs {
                        display: flex;
                        gap: 8px;
                        overflow-x: auto;
                        white-space: nowrap;
                        width: 100%;
                        padding-bottom: 8px;
                        -webkit-overflow-scrolling: touch;
                    }
                    .admin-nav-tabs::-webkit-scrollbar {
                        display: none;
                    }
                    .nav-tab {
                        padding: 8px 16px;
                        font-size: 13px;
                        flex-shrink: 0;
                    }
                    .admin-container {
                        padding: 16px;
                    }
                    .admin-lanes {
                        grid-template-columns: 1fr;
                        gap: 20px;
                    }
                }

                @media (max-width: 480px) {
                    .admin-stats-grid {
                        gap: 12px;
                        margin-bottom: 20px;
                    }
                    .stat-card-inner {
                        padding: 16px;
                        gap: 12px;
                    }
                    .stat-icon-bg {
                        width: 40px;
                        height: 40px;
                        font-size: 20px;
                    }
                    .products-grid {
                        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
                        gap: 12px;
                    }
                    .product-admin-card {
                        padding: 12px;
                        gap: 12px;
                    }
                    .p-img {
                        width: 56px;
                        height: 56px;
                    }
                    .p-name {
                        font-size: 13.5px;
                    }
                    .p-price {
                        font-size: 12px;
                    }
                    .modal-content {
                        padding: 20px;
                        border-radius: 16px;
                    }
                    .modal-content h3 {
                        margin-bottom: 16px;
                        font-size: 18px;
                    }
                    .admin-form label {
                        margin-top: 10px;
                    }
                    .modal-btns {
                        margin-top: 20px;
                    }
                    .form-grid {
                        grid-template-columns: 1fr;
                    }
                }
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

function OrderLane({ title, orders, onAction, onExpand, expanded, togglingToken, cardError, adminToken, setOrders }) {
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
                        adminToken={adminToken}
                        setOrders={setOrders}
                    />
                ))}
            </div>
        </div>
    )
}

function AdminOrderCard({ order, onAction, onExpand, expanded, toggling, error, adminToken, setOrders }) {
    const navigate = useNavigate()
    const isProcessing = order.status === 'Processing'
    const isReady = order.status === 'Ready for Pickup'
    const isDelivered = order.status === 'Delivered'
    const deliveryType = order.delivery_type || 'pickup'
    const paymentMethod = order.payment_method || 'cod'
    const paymentStatus = order.payment_status || 'cod'
    const isUpiPending = paymentMethod === 'upi' && paymentStatus !== 'paid'
    
    let items = []
    try { items = JSON.parse(order.items_json) } catch { }

    const [otpInput, setOtpInput] = useState('')
    const [showOtpInput, setShowOtpInput] = useState(false)
    const [otpError, setOtpError] = useState('')
    const [confirmingPayment, setConfirmingPayment] = useState(false)
    const [paymentConfirmMsg, setPaymentConfirmMsg] = useState('')

    const adminToken_unused = null  // received as prop

    const handleConfirmPayment = async () => {
        setConfirmingPayment(true)
        setPaymentConfirmMsg('')
        try {
            await confirmPayment(order.token, adminToken)
            setPaymentConfirmMsg('✅ Payment confirmed!')
            // Instead of reload, update orders state in parent
            setOrders(prev => prev.map(o => o.token === order.token ? { ...o, payment_status: 'paid', status: 'Ready for Pickup' } : o))
        } catch (e) {
            setPaymentConfirmMsg('❌ ' + (e.message || 'Failed'))
        } finally {
            setConfirmingPayment(false)
        }
    }

    const handleRejectPayment = async () => {
        if (!window.confirm('Mark this payment as NOT RECEIVED?')) return
        setConfirmingPayment(true)
        setPaymentConfirmMsg('')
        try {
            await rejectPayment(order.token, adminToken)
            setPaymentConfirmMsg('⚠️ Marked as NOT RECEIVED')
            setOrders(prev => prev.map(o => o.token === order.token ? { ...o, payment_status: 'rejected' } : o))
        } catch (e) {
            setPaymentConfirmMsg('❌ ' + (e.message || 'Failed'))
        } finally {
            setConfirmingPayment(false)
        }
    }

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
        const billNo = order.token.replace(/-/g, '').slice(0, 10).toUpperCase()
        const subtotal = items.reduce((s, it) => s + (it.price * it.quantity), 0)
        const deliveryFee = order.total - subtotal
        const totalQty = items.reduce((s, it) => s + it.quantity, 0)
        const dateStr = new Date().toLocaleDateString('en-GB')
        const timeStr = new Date().toLocaleTimeString('en-GB', { hour12: false })

        // Navigate to a dedicated print page that fetches its own data.
        // This is the ONLY 100% reliable way on mobile to ensure the dashboard
        // doesn't leak into the print preview, because the print page is fresh and isolated.
        window.location.href = `/admin/print/${order.token}`
    }

    let addressObj = null
    if (order.address) {
        try { addressObj = JSON.parse(order.address) } catch { addressObj = { raw: order.address } }
    }

    return (
        <motion.div className="admin-order-card" style={{ borderLeft: `6px solid ${isProcessing ? '#f59e0b' : isReady ? '#3b82f6' : '#10b981'}` }}>
            {/* Header section */}
            <div className="admin-order-header">
                <div>
                    <div className="admin-order-token">#{order.token}</div>
                    <div className="admin-order-time">⏱️ {order.timestamp || ''}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div className="admin-order-total">₹{order.total}</div>
                    <div className={`admin-order-badge ${deliveryType}`}>
                        {deliveryType === 'delivery' ? '🚚 Delivery' : '🏪 Pickup'}
                    </div>
                    {paymentMethod === 'upi' && (
                        <div style={{
                            display: 'inline-block', marginLeft: 6, padding: '2px 6px', borderRadius: 6,
                            background: isUpiPending ? '#fef3c7' : '#dcfce7',
                            color: isUpiPending ? '#b45309' : '#15803d',
                            fontSize: 10, fontWeight: 800, textTransform: 'uppercase'
                        }}>
                            {isUpiPending ? '⏳ UPI Pending' : '✅ UPI Paid'}
                        </div>
                    )}
                </div>
            </div>

            {/* Body Section */}
            <div className="admin-order-body">
                {/* Phone row with unmasked phone + WhatsApp and Call shortcuts */}
                <div className="admin-order-phone">
                    <span>📱 <a href={`tel:${order.phone}`} className="admin-order-phone-link">{order.phone}</a></span>
                    <div className="admin-order-phone-actions">
                        <a href={`tel:${order.phone}`} className="admin-order-phone-btn" title="Call Customer">📞 Call</a>
                        <a href={`https://wa.me/${order.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="admin-order-phone-btn" title="WhatsApp Customer">💬 WhatsApp</a>
                    </div>
                </div>

                {/* Address block */}
                {deliveryType === 'delivery' ? (
                    addressObj ? (
                        <div className="admin-order-address-box">
                            <strong style={{ display: 'block', marginBottom: 4 }}>📍 Delivery Address:</strong>
                            {addressObj.raw ? addressObj.raw : (
                                <>
                                    <strong>{addressObj.flat_no}, {addressObj.building_name}</strong><br />
                                    <span>{addressObj.road_name}, {addressObj.area_name}</span><br />
                                    {addressObj.landmark && <span style={{ fontStyle: 'italic', fontSize: 11 }}>Landmark: {addressObj.landmark}<br /></span>}
                                    <strong>PIN: {addressObj.pincode}</strong>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="admin-order-address-box" style={{ background: '#fee2e2', color: '#b91c1c', borderLeftColor: '#ef4444' }}>
                            ⚠️ Delivery requested but no address provided.
                        </div>
                    )
                ) : (
                    <div className="admin-order-pickup-box">
                        🏪 Store Pickup Order
                    </div>
                )}

                {/* Item List Toggle Accordion */}
                <div style={{ marginBottom: 12 }}>
                    <button className="admin-order-items-btn" onClick={() => onExpand(order.token)}>
                        <span>📦 View Items ({items.length})</span>
                        <span>{expanded ? '▲ Hide Details' : '▼ Show Details'}</span>
                    </button>
                    
                    <AnimatePresence>
                        {expanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                                <div className="admin-order-items-list">
                                    {items.map((it, i) => (
                                        <div key={i} className="admin-order-item-row">
                                            <span>{it.name} <strong style={{ color: '#64748b' }}>x{it.quantity}</strong></span>
                                            <span style={{ fontWeight: 600 }}>₹{it.subtotal || it.price * it.quantity}</span>
                                        </div>
                                    ))}
                                    {/* Cost breakdown */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginTop: 10, paddingTop: 6, borderTop: '1px solid #e2e8f0' }}>
                                        <span>Items Subtotal:</span>
                                        <span>₹{items.reduce((s, it) => s + (it.price * it.quantity), 0)}</span>
                                    </div>
                                    {deliveryType === 'delivery' && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                            <span>Delivery Charge:</span>
                                            <span>₹{order.total - items.reduce((s, it) => s + (it.price * it.quantity), 0) > 0 ? (order.total - items.reduce((s, it) => s + (it.price * it.quantity), 0)) : 0}</span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#1e3a8a', marginTop: 4, paddingTop: 4, borderTop: '1px dotted #cbd5e1' }}>
                                        <span>Grand Total:</span>
                                        <span>₹{order.total}</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Generate Bill button */}
                <button
                    onClick={generateBill}
                    style={{
                        width: '100%',
                        padding: '10px',
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
                        marginBottom: isDelivered ? 0 : 12
                    }}
                >
                    🖨️ Generate Bill
                </button>
            </div>

            {!isDelivered && (
                <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>

                    {/* Payment Received button for UPI orders */}
                    {isProcessing && isUpiPending && (
                        <div style={{ marginBottom: 10 }}>
                            {paymentConfirmMsg && (
                                <div style={{ padding: '8px 12px', borderRadius: 8, background: paymentConfirmMsg.startsWith('✅') ? '#dcfce7' : '#fee2e2', color: paymentConfirmMsg.startsWith('✅') ? '#15803d' : '#dc2626', fontSize: 13, fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>
                                    {paymentConfirmMsg}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    onClick={handleConfirmPayment}
                                    disabled={confirmingPayment}
                                    style={{
                                        flex: 2, padding: '10px', borderRadius: 10, border: 'none',
                                        background: 'linear-gradient(135deg, #10b981, #059669)',
                                        color: 'white', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
                                    }}
                                >
                                    {confirmingPayment ? '⏳ ...' : '💰 Payment Received'}
                                </button>
                                <button
                                    onClick={handleRejectPayment}
                                    disabled={confirmingPayment}
                                    style={{
                                        flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #ef4444',
                                        background: '#fff',
                                        color: '#ef4444', fontWeight: 700, fontSize: 11, cursor: 'pointer'
                                    }}
                                >
                                    Not Received
                                </button>
                            </div>
                            <div style={{ fontSize: 10, color: '#64748b', textAlign: 'center', marginTop: 8 }}>
                                Verify UPI receipt before clicking.
                            </div>
                        </div>
                    )}

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
                            style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: 700 }} 
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
