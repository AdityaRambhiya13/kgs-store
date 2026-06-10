import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAdminProducts, updateProduct, adminLogin, getCategories, makeCategoryOfficial, renameCategory } from '../api'

const DEFAULT_VALID_CATEGORIES = [
  'Atta, Rice & Dal',
  'Masala & Dry Fruits',
  'Snacks & Munchies',
  'Sweet Tooth',
  'Cleaning Essentials',
  'Instant & Frozen Food',
  'Dairy & Bread',
  'Personal Care',
  'Cold Drinks & Juices',
  'Wellness',
  'Tea, Coffee & Health Drinks',
  'Home & Lifestyle',
  'Pooja Needs',
  'Miscellaneous'
];

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

  const [officialCategories, setOfficialCategories] = useState(
    DEFAULT_VALID_CATEGORIES.map(name => ({ name }))
  )
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false)
  const [renameOldName, setRenameOldName] = useState('')
  const [renameNewName, setRenameNewName] = useState('')

  const officialNames = useMemo(() => new Set(officialCategories.map(c => c.name)), [officialCategories])

  useEffect(() => {
    if (token) {
      loadData()
      loadCategories()
    }
  }, [token])

  async function loadCategories() {
    try {
      const cats = await getCategories()
      if (Array.isArray(cats) && cats.length > 0) {
        setOfficialCategories(cats)
      }
    } catch (err) {
      console.error("Error loading categories:", err)
    }
  }

  async function loadData() {
    setLoading(true)
    try {
      const data = await getAdminProducts(token)
      // Unescape all product categories and sub-categories immediately when loaded
      const cleanedData = (Array.isArray(data) ? data : []).map(p => ({
        ...p,
        category: unescapeHTML(p.category),
        sub_category: unescapeHTML(p.sub_category)
      }))
      setProducts(cleanedData)
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
      const BATCH_SIZE = 5;
      for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
        const batch = productIds.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(id => updateProduct(id, { category: targetCategory }, token)));
      }
      
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

  async function handleMakeOfficial(catName) {
    const emoji = prompt(`Enter emoji for "${catName}" category:`, "📦") || "📦"
    const color = prompt(`Enter color/gradient for "${catName}" (e.g. #3b82f6):`, "#64748b") || "#64748b"
    setStatus({ type: 'loading', msg: `Making "${catName}" official...` })
    try {
      await makeCategoryOfficial(catName, emoji, color, token)
      setStatus({ type: 'success', msg: `"${catName}" is now official!` })
      await loadCategories()
      setTimeout(() => setStatus({ type: '', msg: '' }), 2000)
    } catch (err) {
      setStatus({ type: 'error', msg: err.message })
    }
  }

  async function handleMakeOfficialAndAssign(catName, productIds) {
    const emoji = prompt(`Enter emoji for "${catName}" category:`, "📦") || "📦"
    const color = prompt(`Enter color/gradient for "${catName}" (e.g. #3b82f6):`, "#64748b") || "#64748b"
    setStatus({ type: 'loading', msg: `Making "${catName}" official and assigning products...` })
    try {
      await makeCategoryOfficial(catName, emoji, color, token)
      await loadCategories()
      await assignCategory(productIds, catName)
    } catch (err) {
      setStatus({ type: 'error', msg: err.message })
    }
  }

  async function handleRenameCategory(e) {
    e.preventDefault()
    if (!renameOldName || !renameNewName.trim()) {
      setStatus({ type: 'error', msg: 'Please select a category and enter a new name.' })
      return
    }
    const oldN = renameOldName
    const newN = renameNewName.trim()
    
    setStatus({ type: 'loading', msg: `Renaming "${oldN}" to "${newN}"...` })
    try {
      await renameCategory(oldN, newN, token)
      setStatus({ type: 'success', msg: `Renamed "${oldN}" to "${newN}" successfully!` })
      setIsRenameModalOpen(false)
      setRenameOldName('')
      setRenameNewName('')
      
      // Reload both products and categories
      await loadData()
      await loadCategories()
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

  const handleSelectAll = () => {
    if (sourceProducts.length === 0) return
    const allVisibleSelected = sourceProducts.every(p => selectedIds.has(p.id))
    
    if (allVisibleSelected) {
      // Unselect only those in the current view
      const newSelected = new Set(selectedIds)
      sourceProducts.forEach(p => newSelected.delete(p.id))
      setSelectedIds(newSelected)
    } else {
      // Select all in current view
      const newSelected = new Set(selectedIds)
      sourceProducts.forEach(p => newSelected.add(p.id))
      setSelectedIds(newSelected)
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
          <h1>Category Mapper</h1>
          <p>Drag products from the left and drop them into categories on the right.</p>
        </div>
        <div className="header-right">
          <button onClick={() => setIsRenameModalOpen(true)} className="rename-cat-btn">🏷️ Rename Category</button>
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
            <div className="search-group" style={{ display: 'flex', gap: 12 }}>
              <input 
                type="text" 
                placeholder="Search products..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="product-search"
              />
              <button 
                onClick={handleSelectAll}
                className="select-all-btn"
                title="Select all filtered products"
              >
                {sourceProducts.length > 0 && sourceProducts.every(p => selectedIds.has(p.id)) ? 'Deselect All' : 'Select All'}
              </button>
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
                onClick={() => { if (selectedIds.size > 0) assignCategory(Array.from(selectedIds), 'UNASSIGNED') }}
                hasSelection={selectedIds.size > 0}
              />
              
              {/* Standard visible categories */}
              <div className="target-section-title">Standard Categories (Visible on Website)</div>
              {officialCategories.map(c => c.name).map(cat => (
                <CategoryDropZone 
                  key={cat} 
                  name={cat} 
                  onDrop={(ids) => assignCategory(ids, cat)}
                  isActive={sourceCategory === cat}
                  onClick={() => { if (selectedIds.size > 0) assignCategory(Array.from(selectedIds), cat) }}
                  hasSelection={selectedIds.size > 0}
                />
              ))}

              {/* Custom / Non-standard categories with warnings */}
              {categories.filter(cat => !officialNames.has(cat)).length > 0 && (
                <>
                  <div className="target-section-title warning-title">⚠️ Custom Categories (Hidden from Website)</div>
                  {categories.filter(cat => !officialNames.has(cat)).map(cat => (
                    <CategoryDropZone 
                      key={cat} 
                      name={cat} 
                      onDrop={(ids) => assignCategory(ids, cat)}
                      isActive={sourceCategory === cat}
                      isWarning
                      onMakeOfficial={handleMakeOfficial}
                      onClick={() => { if (selectedIds.size > 0) assignCategory(Array.from(selectedIds), cat) }}
                      hasSelection={selectedIds.size > 0}
                    />
                  ))}
                </>
              )}
              
              <AddCategoryDropZone 
                onAdd={(name, ids) => {
                  const cleanName = name.trim()
                  if (!officialNames.has(cleanName)) {
                    const makeOfficial = window.confirm(`"${cleanName}" is not an official category and won't be shown on the website. Would you like to make it official?`);
                    if (makeOfficial) {
                      handleMakeOfficialAndAssign(cleanName, ids);
                    } else {
                      assignCategory(ids, cleanName);
                    }
                  } else {
                    assignCategory(ids, cleanName);
                  }
                }} 
                selectedIds={selectedIds} 
              />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isRenameModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="modal-overlay"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 20 }} 
              className="rename-modal"
            >
              <h3>Rename Category</h3>
              <p className="modal-subtitle">
                This will safely update all products in this category without harming them.
              </p>
              <form onSubmit={handleRenameCategory}>
                <div className="form-group">
                  <label>Select Category to Rename:</label>
                  <select 
                    value={renameOldName} 
                    onChange={e => setRenameOldName(e.target.value)}
                    className="modal-select"
                    required
                  >
                    <option value="">-- Select Category --</option>
                    {Array.from(new Set([...categories, ...officialCategories.map(c => c.name)])).sort().map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>New Category Name:</label>
                  <input 
                    type="text" 
                    value={renameNewName} 
                    onChange={e => setRenameNewName(e.target.value)}
                    placeholder="Enter new name..."
                    className="modal-input"
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button 
                    type="button" 
                    onClick={() => { setIsRenameModalOpen(false); setRenameOldName(''); setRenameNewName(''); }}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="confirm-btn">
                    Confirm Rename
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .rename-cat-btn {
          padding: 10px 20px;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.3s;
          border: none;
          background: rgba(192, 132, 252, 0.1);
          color: #c084fc;
          border: 1px solid rgba(192, 132, 252, 0.2);
        }
        .rename-cat-btn:hover {
          background: rgba(192, 132, 252, 0.2);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .rename-modal {
          background: #1e293b;
          border: 1px solid rgba(255,255,255,0.1);
          padding: 32px;
          border-radius: 24px;
          width: 440px;
          max-width: 90%;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .rename-modal h3 {
          margin-top: 0;
          font-size: 1.4rem;
          font-weight: 800;
          background: linear-gradient(135deg, #60a5fa 0%, #c084fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 8px;
        }
        .modal-subtitle {
          color: #94a3b8;
          font-size: 0.85rem;
          margin-bottom: 24px;
          line-height: 1.4;
          text-align: left;
        }
        .form-group {
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-align: left;
        }
        .form-group label {
          font-size: 0.85rem;
          color: #94a3b8;
          font-weight: 600;
        }
        .modal-select, .modal-input {
          background: #0f172a;
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 0.95rem;
          outline: none;
          transition: 0.3s;
          width: 100%;
        }
        .modal-select:focus, .modal-input:focus {
          border-color: #3b82f6;
        }
        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 28px;
        }
        .cancel-btn, .confirm-btn {
          padding: 12px 20px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: 0.2s;
          border: none;
        }
        .cancel-btn {
          background: rgba(255,255,255,0.05);
          color: #94a3b8;
        }
        .cancel-btn:hover {
          background: rgba(255,255,255,0.1);
        }
        .confirm-btn {
          background: #3b82f6;
          color: white;
        }
        .confirm-btn:hover {
          background: #2563eb;
        }

        .make-official-inline-btn {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
        }
        .make-official-inline-btn:hover {
          background: rgba(16, 185, 129, 0.25);
          transform: translateY(-1px);
        }

        .target-section-title {
          font-size: 0.8rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 16px;
          margin-bottom: 8px;
          padding-left: 4px;
        }
        .target-section-title.warning-title {
          color: #f97316;
        }
        .category-drop-zone.is-warning {
          border-color: rgba(249, 115, 22, 0.4);
          background: rgba(249, 115, 22, 0.03);
        }
        .category-drop-zone.is-warning:hover {
          background: rgba(249, 115, 22, 0.08);
          border-color: rgba(249, 115, 22, 0.6);
        }
        .category-drop-zone.is-warning.drag-over {
          background: rgba(249, 115, 22, 0.2);
          border-color: #f97316;
          box-shadow: 0 4px 20px rgba(249, 115, 22, 0.2);
        }
        .warning-badge {
          font-size: 0.7rem;
          font-weight: 600;
          color: #f97316;
          background: rgba(249, 115, 22, 0.1);
          padding: 2px 8px;
          border-radius: 4px;
          display: inline-block;
          width: fit-content;
        }

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
          flex: 1;
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

        .select-all-btn {
          background: rgba(59, 130, 246, 0.1);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.2);
          padding: 0 16px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          white-space: nowrap;
          transition: 0.3s;
        }
        .select-all-btn:hover { background: rgba(59, 130, 246, 0.2); }

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

function CategoryDropZone({ name, onDrop, isSpecial, isActive, isWarning, onClick, hasSelection, onMakeOfficial }) {
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
      className={`category-drop-zone ${isOver ? 'drag-over' : ''} ${isSpecial ? 'is-special' : ''} ${isActive ? 'is-active' : ''} ${isWarning ? 'is-warning' : ''} ${hasSelection ? 'has-selection' : ''}`}
      onDragOver={(e) => { e.preventDefault(); if (!isActive) setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={handleDrop}
      onClick={onClick}
      style={hasSelection ? { cursor: 'pointer', borderColor: 'rgba(96, 165, 250, 0.4)' } : {}}
      title={hasSelection ? "Click to assign selected products here" : ""}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="drop-zone-name">{name}</span>
        {isWarning && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            <span className="warning-badge">⚠️ Non-standard: won't show on website</span>
            <button 
              className="make-official-inline-btn"
              onClick={(e) => { e.stopPropagation(); onMakeOfficial(name); }}
              title="Make this category official"
            >
              ✨ Make Official
            </button>
          </div>
        )}
      </div>
      <span className="drop-icon">{hasSelection ? '👈' : '📥'}</span>
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

