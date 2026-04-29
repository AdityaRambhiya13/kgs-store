import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getProducts, updateProduct, adminLogin } from '../api'

export default function CategoryMapper() {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ type: '', msg: '' })
  const [token, setToken] = useState(localStorage.getItem('adminToken') || '')
  const [password, setPassword] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [lastClickedId, setLastClickedId] = useState(null)

  useEffect(() => {
    if (token) {
      loadData()
    }
  }, [token])

  async function loadData() {
    setLoading(true)
    try {
      const data = await getProducts(null, token)
      setProducts(Array.isArray(data) ? data : [])
    } catch (err) {
      if (err.message.includes('Unauthorized') || err.message.includes('401')) {
        setToken('')
        localStorage.removeItem('adminToken')
        setStatus({ type: 'error', msg: 'Session expired. Please login again.' })
      } else {
        setStatus({ type: 'error', msg: err.message })
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setStatus({ type: '', msg: '' })
    try {
      const data = await adminLogin(password.trim())
      localStorage.setItem('adminToken', data.access_token)
      setToken(data.access_token)
      setStatus({ type: 'success', msg: 'Logged in!' })
    } catch (err) {
      setStatus({ type: 'error', msg: err.message || 'Login failed' })
    }
  }

  const categories = useMemo(() => {
    const cats = new Set()
    products.forEach(p => { if (p.category) cats.add(p.category) })
    return Array.from(cats).sort()
  }, [products])

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
    )
  }, [products, search])

  const toggleSelect = (id, shiftKey) => {
    const newSelected = new Set(selectedIds)
    if (shiftKey && lastClickedId) {
      const startIdx = filteredProducts.findIndex(p => p.id === lastClickedId)
      const endIdx = filteredProducts.findIndex(p => p.id === id)
      const [start, end] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx]
      for (let i = start; i <= end; i++) {
        newSelected.add(filteredProducts[i].id)
      }
    } else {
      if (newSelected.has(id)) newSelected.delete(id)
      else newSelected.add(id)
      setLastClickedId(id)
    }
    setSelectedIds(newSelected)
  }

  async function assignCategory(productIds, category) {
    setStatus({ type: 'loading', msg: `Assigning to ${category}...` })
    try {
      await Promise.all(productIds.map(id => updateProduct(id, { category }, token)))
      
      setProducts(prev => prev.map(p => 
        productIds.includes(p.id) ? { ...p, category } : p
      ))
      
      setSelectedIds(new Set())
      setStatus({ type: 'success', msg: `Updated ${productIds.length} products!` })
      setTimeout(() => setStatus({ type: '', msg: '' }), 2000)
    } catch (err) {
      setStatus({ type: 'error', msg: err.message })
    }
  }

  if (!token) {
    return (
      <div className="mapper-login">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="login-card">
          <h2>Category Manager</h2>
          <form onSubmit={handleLogin}>
            <input 
              type="password" 
              placeholder="Admin Password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              autoFocus
            />
            <button type="submit">Access Manager</button>
          </form>
          {status.msg && <p className={`status ${status.type}`}>{status.msg}</p>}
        </motion.div>
      </div>
    )
  }

  return (
    <div className="category-mapper-container">
      <header className="mapper-header">
        <div className="header-left">
          <h1>Product Category Manager</h1>
          <p>Drag products between categories to reassign them.</p>
        </div>
        <div className="header-right">
          <input 
            type="text" 
            placeholder="Search products..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="col-search"
            style={{ marginTop: 0, width: '300px' }}
          />
          <button onClick={loadData} className="refresh-btn">Refresh</button>
          <button onClick={() => { setToken(''); localStorage.removeItem('adminToken'); }} className="logout-btn">Logout</button>
        </div>
      </header>

      {status.msg && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className={`floating-status ${status.type}`}>
          {status.msg}
        </motion.div>
      )}

      <div className="mapper-layout">
        {/* Main View: Category Drop Zones */}
        <div className="mapper-column categories-grid-col">
          <div className="categories-grid">
            {/* Unassigned Category */}
            {products.some(p => !p.category) && (
              <CategoryBox 
                key="unassigned" 
                name="Unassigned" 
                products={products.filter(p => !p.category && (search === '' || p.name.toLowerCase().includes(search.toLowerCase())))}
                onDrop={(ids) => assignCategory(ids, '')}
                isUnassigned
              />
            )}
            {categories.map(cat => (
              <CategoryBox 
                key={cat} 
                name={cat} 
                products={products.filter(p => p.category === cat && (search === '' || p.name.toLowerCase().includes(search.toLowerCase())))}
                onDrop={(ids) => assignCategory(ids, cat)}
              />
            ))}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .category-mapper-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #0f172a;
          color: white;
          font-family: 'Inter', sans-serif;
          padding: 20px;
          overflow: hidden;
        }
        .mapper-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 20px;
          border-bottom: 1px solid #334155;
          margin-bottom: 20px;
        }
        .header-left h1 { font-size: 1.5rem; margin: 0; background: linear-gradient(to right, #60a5fa, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .header-left p { color: #94a3b8; font-size: 0.9rem; margin: 5px 0 0; }
        .header-right { display: flex; gap: 10px; }
        
        .refresh-btn, .logout-btn, .secondary-btn {
          border: none;
          color: white;
          padding: 8px 15px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.85rem;
          transition: 0.2s;
        }
        .secondary-btn { background: #334155; }
        .secondary-btn:hover { background: #475569; }
        .refresh-btn { background: #3b82f6; }
        .logout-btn { background: #ef4444; }

        .mapper-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          flex: 1;
          overflow: hidden;
        }
        .mapper-column {
          display: flex;
          flex-direction: column;
          background: rgba(30, 41, 59, 0.5);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 20px;
          overflow: hidden;
        }
        .products-sidebar { position: relative; }
        .product-selection-list {
          flex: 1;
          overflow-y: auto;
          margin-top: 15px;
          padding-right: 5px;
        }
        .product-selection-list::-webkit-scrollbar { width: 6px; }
        .product-selection-list::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }

        .col-header h3 { font-size: 1rem; margin: 0; color: #f1f5f9; }
        .col-search {
          background: #0f172a;
          border: 1px solid #334155;
          color: white;
          padding: 10px 15px;
          border-radius: 10px;
          font-size: 0.9rem;
        }

        .draggable-product {
          background: #1e293b;
          padding: 10px;
          border-radius: 10px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: grab;
          user-select: none;
          transition: 0.2s;
          border: 1px solid transparent;
        }
        .draggable-product:hover { background: #334155; }
        .draggable-product.selected {
          background: #1e3a8a;
          border-color: #3b82f6;
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.3);
        }
        .p-thumb { width: 40px; height: 40px; border-radius: 6px; object-fit: cover; }
        .p-info { flex: 1; min-width: 0; }
        .p-info p { margin: 0; font-size: 0.85rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .p-info span { font-size: 0.7rem; color: #94a3b8; }

        .categories-grid-col { background: transparent; border: none; padding: 0; overflow-x: auto; }
        .categories-grid {
          display: grid;
          grid-template-rows: repeat(2, 400px);
          grid-auto-flow: column;
          gap: 20px;
          padding-bottom: 40px;
          padding-right: 40px;
        }

        .category-box {
          background: #1e293b;
          border-radius: 16px;
          padding: 15px;
          height: 400px;
          min-width: 300px;
          display: flex;
          flex-direction: column;
          border: 2px solid #334155;
          transition: 0.3s;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .category-box.unassigned-box {
          border-color: #ef4444;
          background: rgba(239, 68, 68, 0.05);
        }
        .category-box.drag-over {
          background: #1e3a8a;
          border-color: #3b82f6;
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.3);
        }
        .cat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #334155;
        }
        .cat-header h4 { margin: 0; font-size: 0.95rem; color: #60a5fa; font-weight: 700; }
        .cat-count { font-size: 0.7rem; background: #334155; padding: 2px 8px; border-radius: 20px; color: #94a3b8; }
        
        .cat-products-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
          overflow-y: auto;
          padding-right: 5px;
        }
        .cat-products-list::-webkit-scrollbar { width: 4px; }
        .cat-products-list::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }

        .empty-cat {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #475569;
          font-size: 0.75rem;
          font-style: italic;
          text-align: center;
        }

        .add-category-box {
          background: rgba(30, 41, 59, 0.3);
          border: 2px dashed #334155;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 15px;
        }
        .add-category-box input {
          background: #0f172a;
          border: 1px solid #334155;
          color: white;
          padding: 8px 12px;
          border-radius: 8px;
          width: 100%;
          text-align: center;
        }
        .add-cat-btn {
          background: #10b981;
          border: none;
          color: white;
          padding: 8px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 700;
          font-size: 0.8rem;
        }

        .selection-badge {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #3b82f6;
          color: white;
          padding: 8px 20px;
          border-radius: 30px;
          font-weight: 800;
          font-size: 0.9rem;
          box-shadow: 0 10px 20px rgba(59, 130, 246, 0.4);
          z-index: 10;
        }

        .mapper-login {
          height: 100vh;
          background: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .login-card {
          background: #1e293b;
          padding: 40px;
          border-radius: 20px;
          width: 400px;
          text-align: center;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        }
        .login-card input {
          width: 100%;
          padding: 12px;
          background: #0f172a;
          border: 1px solid #334155;
          color: white;
          border-radius: 8px;
          margin: 20px 0;
        }
        .login-card button {
          width: 100%;
          padding: 12px;
          background: #3b82f6;
          border: none;
          color: white;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
        }
        .status.error { color: #f87171; }
        .status.success { color: #4ade80; }
        .floating-status {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 20px;
          border-radius: 30px;
          z-index: 100;
          font-weight: 600;
          box-shadow: 0 10px 15px rgba(0,0,0,0.3);
        }
        .floating-status.success { background: #059669; color: white; }
        .floating-status.error { background: #dc2626; color: white; }
        .floating-status.loading { background: #3b82f6; color: white; }
      `}} />
    </div>
  )
}

function DraggableProduct({ product }) {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('productIds', JSON.stringify([product.id]))
  }

  return (
    <div 
      className="draggable-product"
      draggable
      onDragStart={handleDragStart}
    >
      <img src={product.image_url || 'https://via.placeholder.com/40'} className="p-thumb" alt="" />
      <div className="p-info">
        <p>{product.name}</p>
        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>MRP: ₹{product.mrp || 'N/A'}</span>
      </div>
    </div>
  )
}

function CategoryBox({ name, products, onDrop, isUnassigned }) {
  const [isOver, setIsOver] = useState(false)

  const handleDrop = (e) => {
    e.preventDefault()
    setIsOver(false)
    const rawIds = e.dataTransfer.getData('productIds')
    if (rawIds) {
      const ids = JSON.parse(rawIds)
      onDrop(ids)
    }
  }

  return (
    <div 
      className={`category-box ${isOver ? 'drag-over' : ''} ${isUnassigned ? 'unassigned-box' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={handleDrop}
    >
      <div className="cat-header">
        <h4>{name}</h4>
        <span className="cat-count">{products.length} products</span>
      </div>
      <div className="cat-products-list">
        {products.length > 0 ? (
          products.map(p => (
            <DraggableProduct key={p.id} product={p} />
          ))
        ) : (
          <div className="empty-cat">Empty category - drop here</div>
        )}
      </div>
    </div>
  )
}

function AddCategoryBox({ onAdd }) {
  const [newCat, setNewCat] = useState('')

  return (
    <div className="add-category-box">
      <h4>Create New Category</h4>
      <input 
        type="text" 
        placeholder="Category Name" 
        value={newCat} 
        onChange={e => setNewCat(e.target.value)} 
      />
      <button 
        className="add-cat-btn"
        onClick={() => {
          if (newCat) {
            onAdd(newCat)
            setNewCat('')
          }
        }}
      >
        Assign Selected Here
      </button>
      <p style={{ fontSize: '0.7rem', color: '#64748b', textAlign: 'center' }}>
        Type name and click to move selected products to a new category
      </p>
    </div>
  )
}
