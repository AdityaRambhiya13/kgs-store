---
phase: 5
plan: 4
wave: 2
---

# Plan 5.4: Performance & Stability Hardening

## Objective
Eliminate all potential crashes, stale state updates, and performance regressions: AbortController on all fetch calls, Three.js Suspense fallback, backend product cache, and CatalogPage showing new grain categories correctly.

## Context
- app/frontend/src/pages/CatalogPage.jsx
- app/frontend/src/pages/StatusPage.jsx
- app/frontend/src/pages/OrderHistoryPage.jsx
- app/frontend/src/components/Hero3D.jsx
- app/frontend/src/components/Token3D.jsx
- app/database.py

## Tasks

<task type="auto">
  <name>Add AbortController to all useEffect fetch calls</name>
  <files>
    app/frontend/src/pages/CatalogPage.jsx,
    app/frontend/src/pages/StatusPage.jsx,
    app/frontend/src/pages/OrderHistoryPage.jsx,
    app/frontend/src/pages/AdminPage.jsx
  </files>
  <action>
    **Pattern to apply to every `useEffect` that calls an async API function:**

    ```js
    useEffect(() => {
        const controller = new AbortController()
        let cancelled = false

        const fetchData = async () => {
            try {
                const data = await someApiCall()
                if (!cancelled) setState(data)
            } catch (err) {
                if (!cancelled) setError(err.message)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        fetchData()
        return () => { cancelled = true; controller.abort() }
    }, [deps])
    ```

    **CatalogPage.jsx:** Wrap the `getProducts()` call in this pattern.

    **StatusPage.jsx:** The `fetchOrder` function is called from BOTH an immediate call and interval. Apply the `cancelled` flag pattern: define `let cancelled = false` in the effect, set `cancelled = true` in the cleanup, and check `if (!cancelled)` before each `setOrder`, `setNotFound`, `setLoading` call.

    **AdminPage.jsx:** In the polling `useEffect`, apply the cancelled pattern to the `fetchOrders` function. Also stop the interval on auth logout by ensuring `clearInterval` runs if `authed` becomes false.

    **OrderHistoryPage.jsx:** The `handleSearch` is user-triggered (not in useEffect), so no AbortController needed — but add a guard: `if (!mounted) return` where `mounted` is a `useRef(true)` set to `false` in a `useEffect` cleanup:
    ```js
    const mountedRef = useRef(true)
    useEffect(() => () => { mountedRef.current = false }, [])
    // In handleSearch, check: if (mountedRef.current) setState(data)
    ```
  </action>
  <verify>cd app/frontend && npm run build 2>&1 | tail -5</verify>
  <done>Build passes. No "Can't perform a React state update on an unmounted component" warnings.</done>
</task>

<task type="auto">
  <name>Wrap Three.js in Suspense + add product cache</name>
  <files>
    app/frontend/src/components/Hero3D.jsx,
    app/frontend/src/components/Token3D.jsx,
    app/frontend/src/pages/CatalogPage.jsx,
    app/database.py
  </files>
  <action>
    **Hero3D.jsx and Token3D.jsx:**
    Check if they already use `<Canvas>` from `@react-three/fiber`. If yes, wrap each Canvas in an error boundary pattern using a simple try/catch or lazy loading. The simplest approach is to wrap the Canvas with a `<Suspense fallback={<div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}>⏳</div>}>`:
    ```jsx
    import { Suspense } from 'react'
    // Wrap <Canvas> with <Suspense fallback={<div className="canvas-fallback">⏳</div>}>
    ```

    **CatalogPage.jsx:**
    - The category chips now EXCLUDE the hardcoded `const CATEGORIES = ['All']` line (it is already dynamic from `useMemo`). Verify line 9 doesn't conflict — if `CATEGORIES` constant is still there, REMOVE it since categories are now fully dynamic from the API.
    - Cap the stagger animation delay: change `transition={{ delay: i * 0.03 }}` to `transition={{ delay: Math.min(i * 0.03, 0.5) }}` to prevent long waits with 37 products.
    - Memoize filtered products already done. No further change needed.

    **database.py:**
    Add a simple module-level cache for products:
    ```python
    _products_cache = None
    _products_cache_time = 0

    def get_all_products():
        global _products_cache, _products_cache_time
        import time
        now = time.time()
        if _products_cache is not None and (now - _products_cache_time) < 300:  # 5 min cache
            return _products_cache
        conn = get_connection()
        rows = conn.execute("SELECT * FROM products ORDER BY category, name").fetchall()
        conn.close()
        _products_cache = [dict(row) for row in rows]
        _products_cache_time = now
        return _products_cache

    def _invalidate_products_cache():
        global _products_cache
        _products_cache = None
    ```
    Call `_invalidate_products_cache()` inside `_seed_products()` to bust cache when products change.
  </action>
  <verify>cd app/frontend && npm run build 2>&1 | tail -5</verify>
  <done>Build passes. CatalogPage no longer has hardcoded CATEGORIES constant. Hero3D and Token3D wrapped in Suspense.</done>
</task>

## Success Criteria
- [ ] `npm run build` completes with 0 errors
- [ ] No React unmount state update warnings in browser console
- [ ] CatalogPage shows category chips: Rice, Wheat, Jowari, Bajri (no old categories)
- [ ] Hero3D and Token3D render or show fallback spinner (no crash on WebGL error)
- [ ] Backend `get_all_products()` uses 5-minute cache (verified via logs: second call instant)
