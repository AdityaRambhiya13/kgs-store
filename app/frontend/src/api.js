// api.js — All API calls to FastAPI backend

// Uses VITE_API_URL for production (Vercel), or fallback to local Vite proxy ('')
const BASE = import.meta.env.VITE_API_URL || ''

async function request(method, path, body = null, signal = null) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
    }
    if (body) opts.body = JSON.stringify(body)
    if (signal) opts.signal = signal
    const res = await fetch(`${BASE}${path}`, opts)
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || 'Request failed')
    }
    return res.json()
}

export const getProducts = (signal) => request('GET', '/api/products', null, signal)

export const placeOrder = (data) => request('POST', '/api/orders', data)

export const getOrder = (token, signal) => request('GET', `/api/orders/${token}`, null, signal)

export const listOrders = (password, signal) =>
    request('GET', `/api/orders?password=${encodeURIComponent(password)}`, null, signal)

export const listCustomers = (password, signal) =>
    request('GET', `/api/admin/customers?password=${encodeURIComponent(password)}`, null, signal)

export const updateStatus = (token, status, password) =>
    request('PATCH', `/api/orders/${token}/status?password=${encodeURIComponent(password)}`, { status })

// ── Auth ───────────────────────────────────────────────────────
export const setupPin = (phone, pin) =>
    request('POST', '/api/auth/setup-pin', { phone: `+91${phone}`, pin })

export const verifyPin = (phone, pin) =>
    request('POST', '/api/auth/verify', { phone: `+91${phone}`, pin })

// ── Order History ──────────────────────────────────────────────
export const getOrderHistory = (phone, pin) =>
    request('GET', `/api/orders/history?phone=${encodeURIComponent(phone)}&pin=${encodeURIComponent(pin)}`)
