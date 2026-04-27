import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getProducts, getAvailableImages, updateProduct, adminLogin } from '../api'

const PROJECT_ID = 'iezqlltomqrdkgogdgqu'
const BUCKET_NAME = 'products'
const SUPABASE_BASE_URL = `https://${PROJECT_ID}.supabase.co/storage/v1/object/public/${BUCKET_NAME}`

export default function ImageMapper() {
  const [products, setProducts] = useState([])
  const [images, setImages] = useState([])
  const [search, setSearch] = useState('')
  const [imgSearch, setImgSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ type: '', msg: '' })
  const [token, setToken] = useState(localStorage.getItem('adminToken') || '')
  const [password, setPassword] = useState('')
  const [productLimit, setProductLimit] = useState(100)
  const [imageLimit, setImageLimit] = useState(100)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [debouncedImgSearch, setDebouncedImgSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedImgSearch(imgSearch), 300)
    return () => clearTimeout(timer)
  }, [imgSearch])

  useEffect(() => {
    if (token) {
      loadData()
    }
  }, [token])

  async function loadData() {
    setLoading(true)
    try {
      const [pData, iData] = await Promise.all([
        getProducts(null, token),
        getAvailableImages(token)
      ])
      setProducts(pData)
      setImages(iData.images)
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

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(debouncedSearch.toLowerCase())
    )
  }, [products, debouncedSearch])

  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(0, productLimit)
  }, [filteredProducts, productLimit])

  const folders = useMemo(() => {
    const s = new Set(['All Folders'])
    images.forEach(img => {
      if (img.includes('/')) {
        s.add(img.split('/')[0])
      }
    })
    return Array.from(s).sort()
  }, [images])

  const [selectedFolder, setSelectedFolder] = useState('All Folders')

  const filteredImages = useMemo(() => {
    return images
      .filter(img => selectedFolder === 'All Folders' || img.startsWith(`${selectedFolder}/`))
      .filter(img => img.toLowerCase().includes(debouncedImgSearch.toLowerCase()))
  }, [images, debouncedImgSearch, selectedFolder])

  const visibleImages = useMemo(() => {
    return filteredImages.slice(0, imageLimit)
  }, [filteredImages, imageLimit])

  async function onDrop(productId, imageName) {
    setStatus({ type: 'loading', msg: `Mapping ${imageName}...` })
    try {
      const encodedName = imageName.split('/').map(part => encodeURIComponent(part)).join('/')
      const imageUrl = `${SUPABASE_BASE_URL}/${encodedName}`
      
      console.log(`Updating product ${productId} with image ${imageUrl}`)
      await updateProduct(productId, { image_url: imageUrl }, token)
      
      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, image_url: imageUrl } : p
      ))
      
      setStatus({ type: 'success', msg: `Mapped ${imageName}!` })
      setTimeout(() => setStatus({ type: '', msg: '' }), 1500)
    } catch (err) {
      console.error('Drop error:', err)
      setStatus({ type: 'error', msg: err.message || 'Failed to update product' })
    }
  }

  if (!token) {
    return (
      <div className="mapper-login">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="login-card">
          <h2>Admin Access Required</h2>
          <form onSubmit={handleLogin}>
            <input 
              type="password" 
              placeholder="Admin Password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              autoFocus
            />
            <button type="submit">Login to Mapper</button>
          </form>
          {status.msg && <p className={`status ${status.type}`}>{status.msg}</p>}
        </motion.div>
      </div>
    )
  }

  return (
    <div className="image-mapper-container">
      <header className="mapper-header">
        <div className="header-left">
          <h1>Product Image Mapper</h1>
          <p>Drag an image from the right and drop it onto a product on the left.</p>
        </div>
        <div className="header-right">
          <input 
            type="text" 
            placeholder="Search products..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="mapper-search"
          />
          <button onClick={loadData} className="refresh-btn">Refresh</button>
          <button onClick={() => {
            setToken('')
            localStorage.removeItem('adminToken')
          }} className="logout-btn">Logout</button>
        </div>
      </header>

      {status.msg && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className={`floating-status ${status.type}`}>
          {status.msg}
        </motion.div>
      )}

      <div className="mapper-layout">
        {/* Left: Product List */}
        <div className="mapper-column products-col">
          <section className="product-section">
            <h3>All Products ({filteredProducts.length})</h3>
            <div className="product-list">
              {visibleProducts.map(p => (
                <ProductRow key={p.id} product={p} onDrop={onDrop} isMapped={p.image_url && p.image_url.includes(SUPABASE_BASE_URL)} />
              ))}
            </div>
            {filteredProducts.length > productLimit && (
              <button onClick={() => setProductLimit(prev => prev + 200)} className="load-more-btn">
                Load More Products ({filteredProducts.length - productLimit} left)
              </button>
            )}
          </section>
        </div>

        {/* Right: Image Grid */}
        <div className="mapper-column images-col">
          <div className="col-header">
            <h3>Unassigned ({filteredImages.length})</h3>
            <select 
              value={selectedFolder} 
              onChange={e => setSelectedFolder(e.target.value)}
              className="folder-select"
            >
              {folders.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <input 
              type="text" 
              placeholder="Search..." 
              value={imgSearch} 
              onChange={e => setImgSearch(e.target.value)} 
              className="col-search"
            />
          </div>
          <div className="image-grid">
            {visibleImages.map(img => (
              <DraggableImage key={img} name={img} />
            ))}
          </div>
          {filteredImages.length > imageLimit && (
            <button onClick={() => setImageLimit(prev => prev + 200)} className="load-more-btn" style={{ marginTop: 20, width: '100%' }}>
              Load More Images ({filteredImages.length - imageLimit} left)
            </button>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .image-mapper-container {
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
        .mapper-header h1 { font-size: 1.5rem; margin: 0; }
        .mapper-header p { color: #94a3b8; font-size: 0.9rem; margin: 5px 0 0; }
        .mapper-search {
          background: #1e293b;
          border: 1px solid #334155;
          color: white;
          padding: 8px 15px;
          border-radius: 8px;
          width: 300px;
          margin-right: 15px;
        }
        .refresh-btn {
          background: #3b82f6;
          border: none;
          color: white;
          padding: 8px 15px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          margin-right: 10px;
        }
        .logout-btn {
          background: #ef4444;
          border: none;
          color: white;
          padding: 8px 15px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }
        .mapper-layout {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 20px;
          flex: 1;
          overflow: hidden;
        }
        .mapper-column {
          display: flex;
          flex-direction: column;
          background: #1e293b;
          border-radius: 12px;
          padding: 20px;
          overflow-y: auto;
        }
        .product-section h3 {
          font-size: 0.8rem;
          text-transform: uppercase;
          color: #64748b;
          letter-spacing: 0.05em;
          margin-bottom: 10px;
        }
        .col-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          gap: 10px;
        }
        .col-search {
          background: #0f172a;
          border: 1px solid #334155;
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.8rem;
          flex: 1;
        }
        .folder-select {
          background: #0f172a;
          border: 1px solid #334155;
          color: white;
          padding: 6px;
          border-radius: 6px;
          font-size: 0.8rem;
          max-width: 120px;
        }
        .product-list { margin-bottom: 30px; }
        .product-row {
          background: #334155;
          padding: 10px 15px;
          border-radius: 8px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 15px;
          transition: 0.2s;
          border: 2px solid transparent;
        }
        .product-row.drag-over {
          border-color: #3b82f6;
          background: #1e3a8a;
          transform: scale(1.02);
        }
        .row-thumb {
          width: 40px;
          height: 40px;
          border-radius: 4px;
          object-fit: cover;
          background: #0f172a;
        }
        .row-info { flex: 1; min-width: 0; }
        .row-info p { margin: 0; font-weight: 500; font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .row-info span { font-size: 0.7rem; color: #94a3b8; }

        .image-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 15px;
        }
        .image-item {
          background: #334155;
          padding: 8px;
          border-radius: 8px;
          cursor: grab;
          text-align: center;
          transition: 0.2s;
        }
        .image-item:hover { background: #475569; transform: translateY(-2px); }
        .image-item img {
          width: 100%;
          aspect-ratio: 1;
          object-fit: cover;
          border-radius: 4px;
          margin-bottom: 5px;
        }
        .image-item p {
          font-size: 0.7rem;
          margin: 0;
          color: #cbd5e1;
          word-break: break-all;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
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
        .status { margin-top: 15px; font-size: 0.9rem; }
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
        .load-more-btn {
          background: #334155;
          color: #94a3b8;
          border: 1px solid #475569;
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          width: 100%;
          font-weight: 600;
          transition: 0.2s;
        }
        .load-more-btn:hover {
          background: #475569;
          color: white;
        }
      `}} />
    </div>
  )
}

function ProductRow({ product, onDrop, isMapped }) {
  const [isOver, setIsOver] = useState(false)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsOver(true)
  }

  const handleDragLeave = () => {
    setIsOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsOver(false)
    const imageName = e.dataTransfer.getData('imageName')
    if (imageName) {
      onDrop(product.id, imageName)
    }
  }

  return (
    <div 
      className={`product-row ${isOver ? 'drag-over' : ''} ${isMapped ? 'mapped' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <img 
        src={product.image_url ? `${product.image_url}?width=80` : 'https://via.placeholder.com/40'} 
        className="row-thumb" 
        alt="" 
        loading="lazy"
      />
      <div className="row-info">
        <p>{product.name}</p>
        <span>{product.category}</span>
      </div>
      {isMapped && (
        <div className="row-check">✅</div>
      )}
    </div>
  )
}

function DraggableImage({ name }) {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('imageName', name)
  }

  return (
    <div 
      className="image-item" 
      draggable 
      onDragStart={handleDragStart}
    >
      <img src={`${SUPABASE_BASE_URL}/${name}?width=200`} alt="" loading="lazy" />
      <p>{name}</p>
    </div>
  )
}
