import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getProducts, updateProduct, adminLogin } from '../api'

export default function ProductRenamer() {
  const [token, setToken] = useState(localStorage.getItem('adminToken') || '')
  const [password, setPassword] = useState('')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState({ type: '', msg: '' })
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [limit, setLimit] = useState(100)
  
  // Bulk Replace State
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (token) loadData()
  }, [token])

  async function loadData() {
    setLoading(true)
    try {
      const data = await getProducts(null, token)
      setProducts(data)
    } catch (err) {
      if (err.message.includes('401')) {
        setToken('')
        localStorage.removeItem('adminToken')
      }
      setStatus({ type: 'error', msg: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await adminLogin(password.trim())
      localStorage.setItem('adminToken', data.access_token)
      setToken(data.access_token)
      setStatus({ type: 'success', msg: 'Logged in!' })
    } catch (err) {
      setStatus({ type: 'error', msg: err.message })
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const lq = debouncedSearch.toLowerCase()
    return products.filter(p => 
      p.name.toLowerCase().includes(lq) || 
      (p.base_name && p.base_name.toLowerCase().includes(lq)) ||
      p.category.toLowerCase().includes(lq)
    )
  }, [products, debouncedSearch])

  const handleUpdate = async (productId, field, value) => {
    try {
      await updateProduct(productId, { [field]: value }, token)
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, [field]: value } : p))
      // Success feedback is silent unless error to keep it fast
    } catch (err) {
      setStatus({ type: 'error', msg: `Failed to update: ${err.message}` })
    }
  }

  const bulkReplace = async () => {
    if (!findText) return
    const targets = filtered.filter(p => p.name.includes(findText))
    if (!targets.length) return
    
    if (!confirm(`Are you sure you want to replace "${findText}" with "${replaceText}" in ${targets.length} products?`)) return
    
    setLoading(true)
    let successCount = 0
    for (const p of targets) {
      try {
        const newName = p.name.replace(new RegExp(findText, 'g'), replaceText)
        await updateProduct(p.id, { name: newName }, token)
        successCount++
      } catch (err) {
        console.error(`Failed to update ${p.id}`, err)
      }
    }
    await loadData()
    setLoading(false)
    setStatus({ type: 'success', msg: `Successfully updated ${successCount} products!` })
  }

  if (!token) {
    return (
      <div className="renamer-login">
        <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleLogin} className="login-card">
          <h2>Admin Renamer</h2>
          <input 
            type="password" 
            placeholder="Admin Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>{loading ? 'Checking...' : 'Login'}</button>
          {status.msg && <p className={`status ${status.type}`}>{status.msg}</p>}
        </motion.form>
      </div>
    )
  }

  return (
    <div className="renamer-container">
      <header className="renamer-header">
        <div className="header-left">
          <h1>Product Renamer</h1>
          <p>{products.length} Products Loaded</p>
        </div>
        <div className="header-right">
          <input 
            type="text" 
            placeholder="Search products..." 
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn-refresh" onClick={loadData}>Refresh</button>
        </div>
      </header>

      {/* Bulk Tools */}
      <section className="bulk-tools">
        <h3>Bulk Find & Replace</h3>
        <div className="tools-row">
          <input type="text" placeholder="Find text..." value={findText} onChange={e => setFindText(e.target.value)} />
          <span className="arrow">→</span>
          <input type="text" placeholder="Replace with..." value={replaceText} onChange={e => setReplaceText(e.target.value)} />
          <button className="btn-bulk" onClick={bulkReplace} disabled={loading}>
            Replace in {filtered.filter(p => p.name.includes(findText)).length} items
          </button>
        </div>
      </section>

      <div className="renamer-main">
        <table className="renamer-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Current Name</th>
              <th>Base Name (Grouping)</th>
              <th>Category</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, limit).map(p => (
              <tr key={p.id}>
                <td className="td-id">{p.id}</td>
                <td>
                  <input 
                    className="edit-input"
                    defaultValue={p.name}
                    onBlur={(e) => {
                      if (e.target.value !== p.name) handleUpdate(p.id, 'name', e.target.value)
                    }}
                  />
                </td>
                <td>
                  <input 
                    className="edit-input"
                    defaultValue={p.base_name || ''}
                    placeholder="Set base name..."
                    onBlur={(e) => {
                      if (e.target.value !== (p.base_name || '')) handleUpdate(p.id, 'base_name', e.target.value)
                    }}
                  />
                </td>
                <td className="td-cat">{p.category}</td>
                <td className="td-price">₹{p.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filtered.length > limit && (
          <div className="load-more">
            <button onClick={() => setLimit(l => l + 100)}>Load More (+100)</button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {status.msg && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`floating-status ${status.type}`}>
            {status.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .renamer-container { padding: 40px; background: #0f172a; min-height: 100vh; color: white; }
        .renamer-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .renamer-header h1 { margin: 0; font-size: 2rem; color: #3b82f6; }
        
        .search-input { background: #1e293b; border: 1px solid #334155; color: white; padding: 10px 20px; border-radius: 10px; width: 300px; }
        
        .bulk-tools { background: #1e293b; padding: 20px; border-radius: 15px; margin-bottom: 30px; border: 1px solid #334155; }
        .tools-row { display: flex; gap: 15px; align-items: center; margin-top: 10px; }
        .tools-row input { background: #0f172a; border: 1px solid #334155; color: white; padding: 8px 15px; border-radius: 8px; flex: 1; }
        .btn-bulk { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; }
        
        .renamer-table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 15px; overflow: hidden; }
        .renamer-table th { text-align: left; padding: 15px; background: #334155; color: #94a3b8; font-size: 0.8rem; text-transform: uppercase; }
        .renamer-table td { padding: 10px 15px; border-bottom: 1px solid #334155; }
        
        .edit-input { background: transparent; border: 1px solid transparent; color: white; padding: 8px; border-radius: 5px; width: 100%; transition: 0.2s; }
        .edit-input:focus { background: #0f172a; border-color: #3b82f6; outline: none; }
        
        .td-id { color: #64748b; font-family: monospace; }
        .td-cat { color: #94a3b8; }
        .td-price { color: #10b981; font-weight: 600; }
        
        .load-more { text-align: center; margin-top: 30px; }
        .load-more button { background: transparent; border: 1px solid #3b82f6; color: #3b82f6; padding: 10px 30px; border-radius: 10px; cursor: pointer; }
        
        .floating-status { position: fixed; bottom: 30px; right: 30px; padding: 15px 30px; border-radius: 12px; font-weight: 600; box-shadow: 0 10px 30px rgba(0,0,0,0.5); z-index: 1000; }
        .floating-status.success { background: #10b981; color: white; }
        .floating-status.error { background: #ef4444; color: white; }
        
        .renamer-login { display: flex; align-items: center; justify-content: center; height: 100vh; background: #0f172a; }
        .login-card { background: #1e293b; padding: 40px; border-radius: 20px; width: 100%; max-width: 400px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
        .login-card input { width: 100%; padding: 15px; margin: 20px 0; background: #0f172a; border: 1px solid #334155; border-radius: 10px; color: white; }
        .login-card button { width: 100%; padding: 15px; background: #3b82f6; color: white; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; }
      `}} />
    </div>
  )
}
