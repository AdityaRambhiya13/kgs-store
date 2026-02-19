---
phase: 2
plan: 1
wave: 1
---

# Plan 2.1: Project Foundation & Product Catalog

## Objective
Set up the Vite + React app structure (routing, design system, API layer) and build the product catalog page with search/filter — the first thing customers see.

## Context
- `.gsd/SPEC.md`
- `.gsd/DECISIONS.md` — Phase 2 decisions (React Router, localStorage cart, +91 phone)
- `app/frontend/vite.config.js` — needs `/api` proxy to port 8000
- `app/frontend/src/` — currently default Vite template files

## Tasks

<task type="auto">
  <name>Configure Vite proxy and project structure</name>
  <files>
    app/frontend/vite.config.js
    app/frontend/src/main.jsx
    app/frontend/src/App.jsx
    app/frontend/src/index.css
    app/frontend/src/api.js
    app/frontend/src/CartContext.jsx
  </files>
  <action>
    1. Update `vite.config.js` to proxy `/api` → `http://localhost:8000`
    2. Replace `src/index.css` with full design system:
       - CSS variables: --primary #1E3A8A, --secondary #10B981, --accent #F59E0B
       - Dark mode via [data-theme="dark"] on :root
       - Google Fonts: Inter (import in index.html)
       - Base resets, scrollbar styling, card/button utility classes
    3. Create `src/api.js` with fetch helpers: getProducts(), placeOrder(data), getOrder(token), listOrders(password), updateStatus(token, status, password)
    4. Create `src/CartContext.jsx` — React context with:
       - cart state initialized from localStorage ("qs_cart" key)
       - addToCart(product, qty), removeFromCart(id), clearCart()
       - cartCount, cartTotal computed values
       - useEffect to sync to localStorage on every change
    5. Update `src/main.jsx` to wrap App with `<BrowserRouter>` and `<CartProvider>`
    6. Update `src/App.jsx` with React Router routes:
       - `/` → CatalogPage
       - `/status/:token` → StatusPage
       - `/admin` → AdminPage
       Route the URL; Catalog is the default landing page.
  </action>
  <verify>npm run dev (no console errors, app loads at localhost:5173)</verify>
  <done>Vite proxies /api correctly (test: fetch('/api/products') in browser console returns array). CartContext available via useCart() hook. Routes defined.</done>
</task>

<task type="auto">
  <name>Build Product Catalog page with search & filter</name>
  <files>
    app/frontend/src/pages/CatalogPage.jsx
    app/frontend/src/components/ProductCard.jsx
    app/frontend/src/components/Navbar.jsx
    app/frontend/src/components/CartPanel.jsx (scaffold only)
  </files>
  <action>
    1. `Navbar.jsx` — sticky top bar with:
       - Logo (🏪 Quick Shop) with gradient text
       - Search input (controlled, filters products live)
       - Cart icon button with animated badge (count from CartContext)
       - Dark mode toggle (toggles data-theme on document.documentElement)
    2. `CatalogPage.jsx`:
       - Fetch products from `/api/products` on mount (useEffect)
       - Store in local state; apply search filter (name + category, case-insensitive)
       - Category filter chips row: "All", "Grocery", "Dairy", "Snacks", etc. extracted from products
       - Render a responsive grid (CSS grid, auto-fill minmax(200px, 1fr))
       - Show skeleton loaders (3-pulse animation) while loading
       - Show empty state if search has no results
    3. `ProductCard.jsx`:
       - Image (Unsplash image_url), product name, category badge, price (₹)
       - Quantity stepper (-, count, +) — reads qty from CartContext for this product
       - "Add to Cart" button animates: scale pulse on click, badge increments
       - Hover: card lifts (translateY -4px) with shadow deepening
       - Use Framer Motion: `whileHover`, `whileTap` on buttons
    4. Scaffold `CartPanel.jsx` as empty export (to be filled in Plan 2.2)
    - DO NOT use Tailwind. All styles via CSS classes defined in index.css or component-level style tags.
  </action>
  <verify>Open http://localhost:5173 — 20 products visible in grid. Type in search box — products filter in real time. Click category chip — grid updates. Click +/- — cart badge in Navbar updates.</verify>
  <done>
    - [ ] 20 products load from API
    - [ ] Search filters by name and category
    - [ ] Category chips filter the grid
    - [ ] Adding product increments navbar badge
    - [ ] ProductCard hover/tap animations visible
  </done>
</task>

## Success Criteria
- [ ] `/api` proxy works (no CORS errors)
- [ ] CartContext persists to localStorage (add item, refresh — still in cart)
- [ ] Catalog page renders 20 products with live search and category filter
- [ ] Framer Motion tap animations visible on ProductCard buttons
