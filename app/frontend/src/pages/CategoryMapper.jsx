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
  const [sourceCategory, setSourceCategory] = useState('ALL')

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

  const sourceProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = sourceCategory === 'ALL' || 
                             (sourceCategory === 'UNASSIGNED' ? !p.category : p.category === sourceCategory)
      return matchesSearch && matchesCategory
    })
  }, [products, search, sourceCategory])

  async function assignCategory(productIds, category) {
    const targetCategory = category === 'UNASSIGNED' ? '' : category
    setStatus({ type: 'loading', msg: `Moving to ${category}...` })
    try {
      await Promise.all(productIds.map(id => updateProduct(id, { category: targetCategory }, token)))
      
      setProducts(prev => prev.map(p => 
        productIds.includes(p.id) ? { ...p, category: targetCategory } : p
      ))
      
      setSelectedIds(new Set())
      setStatus({ type: 'success', msg: `Moved ${productIds.length} items!` })
      setTimeout(() => setStatus({ type: '', msg: '' }), 2000)
    } catch (err) {
      setStatus({ type: 'error', msg: err.message })
    }
  }

  const toggleSelect = (id, shiftKey) => {
    const newSelected = new Set(selectedIds)
    if (shiftKey && lastClickedId) {
      const startIdx = sourceProducts.findIndex(p => p.id === lastClickedId)
      const endIdx = sourceProducts.findIndex(p => p.id === id)
      if (startIdx !== -1 && endIdx !== -1) {
        const [start, end] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx]
        for (let i = start; i <= end; i++) {
          newSelected.add(sourceProducts[i].id)
        }
      }
    } else {
      if (newSelected.has(id)) newSelected.delete(id)
      else newSelected.add(id)
      setLastClickedId(id)
    }
    setSelectedIds(newSelected)
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
          <h1>Category Mapper</h1>
          <p>Drag products from the left and drop them into categories on the right.</p>
        </div>
        <div className="header-right">
          <button onClick={loadData} className="refresh-btn">Refresh Data</button>
          <button onClick={() => { setToken(''); localStorage.removeItem('adminToken'); }} className="logout-btn">Logout</button>
        </div>
      </header>

      {status.msg && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className={`floating-status ${status.type}`}>
          {status.msg}
        </motion.div>
      )}

      <div className="mapper-layout">
        {/* Left Column: Source Products */}
        <div className="mapper-column source-column">
          <div className="col-header-area">
            <div className="selector-group">
              <label>View Category:</label>
              <select 
                value={sourceCategory} 
                onChange={e => { setSourceCategory(e.target.value); setSelectedIds(new Set()); }}
                className="category-selector"
              >
                <option value="ALL">All Products</option>
                <option value="UNASSIGNED">Unassigned</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="search-group">
              <input 
                type="text" 
                placeholder="Search products..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="product-search"
              />
            </div>
          </div>

          <div className="product-list-scroll">
            <div className="product-grid">
              {sourceProducts.map(p => (
                <DraggableProduct 
                  key={p.id} 
                  product={p} 
                  isSelected={selectedIds.has(p.id)}
                  onClick={(e) => toggleSelect(p.id, e.shiftKey)}
                  selectedCount={selectedIds.size}
                  selectedIds={selectedIds}
                />
              ))}
              {sourceProducts.length === 0 && (
                <div className="empty-state">No products found in this category.</div>
              )}
            </div>
          </div>

          {selectedIds.size > 0 && (
            <div className="selection-overlay">
              <span>{selectedIds.size} products selected</span>
              <button onClick={() => setSelectedIds(new Set())}>Clear</button>
            </div>
          )}
        </div>

        {/* Right Column: Target Categories */}
        <div className="mapper-column target-column">
          <div className="col-header-area">
            <h3>Target Categories</h3>
            <p>Drop here to reassign</p>
          </div>
          
          <div className="target-list-scroll">
            <div className="target-grid">
              <CategoryDropZone 
                name="UNASSIGNED" 
                onDrop={(ids) => assignCategory(ids, 'UNASSIGNED')}
                isSpecial
              />
              {categories.map(cat => (
                <CategoryDropZone 
                  key={cat} 
                  name={cat} 
                  onDrop={(ids) => assignCategory(ids, cat)}
                  isActive={sourceCategory === cat}
                />
              ))}
              <AddCategoryDropZone onAdd={(name, ids) => assignCategory(ids, name)} selectedIds={selectedIds} />
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .category-mapper-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #0b0f1a;
          color: white;
          font-family: 'Outfit', sans-serif;
          padding: 24px;
          overflow: hidden;
        }
        .mapper-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .header-left h1 { 
          margin: 0; 
          font-size: 1.8rem; 
          font-weight: 800; 
          background: linear-gradient(135deg, #60a5fa 0%, #c084fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .header-left p { color: #64748b; margin: 4px 0 0; font-size: 0.9rem; }
        .header-right { display: flex; gap: 12px; }

        .refresh-btn, .logout-btn {
          padding: 10px 20px;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.3s;
          border: none;
        }
        .refresh-btn { background: rgba(59, 130, 246, 0.1); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.2); }
        .refresh-btn:hover { background: rgba(59, 130, 246, 0.2); }
        .logout-btn { background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); }
        .logout-btn:hover { background: rgba(239, 68, 68, 0.2); }

        .mapper-layout {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 24px;
          flex: 1;
          overflow: hidden;
        }
        .mapper-column {
          background: rgba(30, 41, 59, 0.3);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          backdrop-filter: blur(20px);
        }
        .col-header-area {
          padding: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(255,255,255,0.02);
        }
        .col-header-area h3 { margin: 0; font-size: 1.1rem; }
        .col-header-area p { margin: 4px 0 0; font-size: 0.8rem; color: #64748b; }

        /* Left Column Styles */
        .selector-group { margin-bottom: 16px; display: flex; align-items: center; gap: 12px; }
        .selector-group label { font-size: 0.85rem; color: #94a3b8; font-weight: 500; }
        .category-selector {
          background: #1e293b;
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          padding: 8px 16px;
          border-radius: 10px;
          font-weight: 600;
          outline: none;
          flex: 1;
        }
        .product-search {
          width: 100%;
          background: #0f172a;
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 0.9rem;
          outline: none;
          transition: 0.3s;
        }
        .product-search:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }

        .product-list-scroll { flex: 1; overflow-y: auto; padding: 20px; }
        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }

        .draggable-product-card {
          background: #1e293b;
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 16px;
          padding: 12px;
          cursor: grab;
          transition: 0.2s;
          user-select: none;
          position: relative;
        }
        .draggable-product-card:hover { transform: translateY(-2px); background: #2d3748; border-color: rgba(255,255,255,0.1); }
        .draggable-product-card.is-selected { 
          border-color: #3b82f6; 
          background: rgba(59, 130, 246, 0.15);
          box-shadow: 0 0 0 1px #3b82f6;
        }
        .p-card-image { width: 100%; aspect-ratio: 1; border-radius: 12px; object-fit: cover; margin-bottom: 10px; }
        .p-card-name { font-size: 0.85rem; font-weight: 600; margin: 0; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .p-card-mrp { font-size: 0.75rem; color: #64748b; margin-top: 2px; }

        .selection-overlay {
          padding: 12px 20px;
          background: #3b82f6;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 700;
          font-size: 0.9rem;
        }
        .selection-overlay button {
          background: white;
          color: #3b82f6;
          border: none;
          padding: 4px 12px;
          border-radius: 6px;
          font-weight: 800;
          cursor: pointer;
        }

        /* Right Column Styles */
        .target-list-scroll { flex: 1; overflow-y: auto; padding: 16px; }
        .target-grid { display: flex; flex-direction: column; gap: 10px; }

        .category-drop-zone {
          background: rgba(255,255,255,0.03);
          border: 1.5px solid rgba(255,255,255,0.05);
          border-radius: 14px;
          padding: 14px 18px;
          transition: 0.3s;
          cursor: default;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .category-drop-zone.is-special { border-style: dashed; border-color: rgba(239, 68, 68, 0.3); color: #f87171; }
        .category-drop-zone.is-active { opacity: 0.5; border-color: #3b82f6; background: rgba(59, 130, 246, 0.05); }
        .category-drop-zone.drag-over { 
          background: rgba(59, 130, 246, 0.2); 
          border-color: #3b82f6; 
          transform: scale(1.02);
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.2);
        }
        .drop-zone-name { font-weight: 700; font-size: 0.9rem; }
        .drop-icon { opacity: 0.3; font-size: 1.2rem; }

        .add-category-zone {
          margin-top: 10px;
          background: rgba(16, 185, 129, 0.05);
          border: 1.5px dashed rgba(16, 185, 129, 0.2);
          border-radius: 14px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .add-category-zone input {
          background: #0f172a;
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: white;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 0.85rem;
          outline: none;
        }
        .add-category-zone button {
          background: #10b981;
          color: white;
          border: none;
          padding: 8px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
        }

        /* Generic UI */
        .empty-state { grid-column: 1/-1; text-align: center; padding: 40px; color: #475569; font-style: italic; }
        .floating-status {
          position: fixed;
          top: 32px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 24px;
          border-radius: 40px;
          z-index: 1000;
          font-weight: 700;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .floating-status.success { background: #059669; border: 1px solid #10b981; }
        .floating-status.error { background: #dc2626; border: 1px solid #ef4444; }
        .floating-status.loading { background: #2563eb; border: 1px solid #3b82f6; }

        .mapper-login { height: 100vh; display: flex; align-items: center; justify-content: center; background: #0b0f1a; }
        .login-card { background: #1e293b; padding: 48px; border-radius: 32px; width: 420px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
        .login-card h2 { margin: 0 0 32px; font-weight: 800; font-size: 2rem; }
        .login-card input { width: 100%; padding: 14px; background: #0f172a; border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 12px; margin-bottom: 20px; font-size: 1rem; }
        .login-card button { width: 100%; padding: 14px; background: #3b82f6; color: white; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; font-size: 1rem; }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  )
}

function DraggableProduct({ product, isSelected, onClick, selectedCount, selectedIds }) {
  const handleDragStart = (e) => {
    let idsToDrag = [product.id]
    if (isSelected && selectedCount > 1) {
      idsToDrag = Array.from(selectedIds)
    }
    e.dataTransfer.setData('productIds', JSON.stringify(idsToDrag))
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div 
      className={`draggable-product-card ${isSelected ? 'is-selected' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
    >
      <img src={product.image_url || 'https://via.placeholder.com/100'} className="p-card-image" alt="" />
      <h4 className="p-card-name">{product.name}</h4>
      <div className="p-card-mrp">₹{product.mrp || product.price}</div>
    </div>
  )
}

function CategoryDropZone({ name, onDrop, isSpecial, isActive }) {
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
      className={`category-drop-zone ${isOver ? 'drag-over' : ''} ${isSpecial ? 'is-special' : ''} ${isActive ? 'is-active' : ''}`}
      onDragOver={(e) => { e.preventDefault(); if (!isActive) setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={handleDrop}
    >
      <span className="drop-zone-name">{name}</span>
      <span className="drop-icon">📥</span>
    </div>
  )
}

function AddCategoryDropZone({ onAdd, selectedIds }) {
  const [newCat, setNewCat] = useState('')
  const [isOver, setIsOver] = useState(false)

  const handleAdd = () => {
    if (newCat && selectedIds.size > 0) {
      onAdd(newCat, Array.from(selectedIds))
      setNewCat('')
    }
  }

  return (
    <div 
      className={`add-category-zone ${isOver ? 'drag-over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsOver(false)
        const rawIds = e.dataTransfer.getData('productIds')
        if (rawIds) {
          const ids = JSON.parse(rawIds)
          const name = prompt("Enter new category name:")
          if (name) onAdd(name, ids)
        }
      }}
    >
      <input 
        type="text" 
        placeholder="New Category Name..." 
        value={newCat} 
        onChange={e => setNewCat(e.target.value)} 
      />
      <button onClick={handleAdd} disabled={!newCat || selectedIds.size === 0}>
        Move Selected to New
      </button>
    </div>
  )
}

