// api.js — All API calls to FastAPI backend

const BASE = ''  // Vite proxy handles /api → http://localhost:8000

async function request(method, path, body = null) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
    }
    if (body) opts.body = JSON.stringify(body)
    const res = await fetch(`${BASE}${path}`, opts)
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || 'Request failed')
    }
    return res.json()
}

export const getProducts = () => request('GET', '/api/products')

export const placeOrder = (data) => request('POST', '/api/orders', data)

export const getOrder = (token) => request('GET', `/api/orders/${token}`)

export const listOrders = (password) =>
    request('GET', `/api/orders?password=${encodeURIComponent(password)}`)

export const updateStatus = (token, status, password) =>
    request('PATCH', `/api/orders/${token}/status?password=${encodeURIComponent(password)}`, { status })
