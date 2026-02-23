// api.js — All API calls to FastAPI backend

// Uses VITE_API_URL for production (Vercel), or fallback to local Vite proxy ('')
const BASE = import.meta.env.VITE_API_URL || ''

async function request(method, path, body = null, signal = null, token = null) {
    const defaultToken = localStorage.getItem('kgsToken')
    const activeToken = token || defaultToken
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
    }
    if (activeToken) {
        opts.headers['Authorization'] = `Bearer ${activeToken}`
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

export const cancelOrder = (token) => request('POST', `/api/orders/${token}/cancel`)

export const getOrder = (token, signal) => request('GET', `/api/orders/${token}`, null, signal)

export const adminLogin = (password) => request('POST', '/api/auth/admin-login', { password })

export const listOrders = (token, signal) =>
    request('GET', '/api/orders', null, signal, token)

export const listCustomers = (token, signal) =>
    request('GET', '/api/admin/customers', null, signal, token)

export const updateStatus = (token, status, adminToken, otp = null) =>
    request('PATCH', `/api/orders/${token}/status`, { status, ...(otp && { otp }) }, null, adminToken)

// ── Auth ───────────────────────────────────────────────────────
// ── Auth ───────────────────────────────────────────────────────
export const signup = (phone, pin, name) =>
    request('POST', '/api/auth/signup', {
        phone: `+91${phone}`,
        pin: String(pin),
        name
    })

export const login = (identifier, pin) =>
    request('POST', '/api/auth/login', {
        identifier: identifier.includes('@') ? identifier : `+91${identifier.replace(/\D/g, '').slice(-10)}`,
        pin: String(pin)
    })

export const forgotPin = (phone) =>
    request('POST', '/api/auth/forgot-pin', { phone: `+91${phone}` })

export const resetPin = (token, new_pin) =>
    request('POST', '/api/auth/reset-pin', { token, new_pin: String(new_pin) })

export const getProfile = () =>
    request('GET', '/api/auth/me')

// ── Order History ──────────────────────────────────────────────
export const getOrderHistory = (token) =>
    request('GET', '/api/orders/history', null, null, token)
