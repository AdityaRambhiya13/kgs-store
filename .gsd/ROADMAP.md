# ROADMAP.md

> **Current Milestone**: v2.0 React + Three.js Frontend
> **Goal**: Replace the existing Flet UI with a production-ready React + Three.js frontend, keeping the FastAPI backend unchanged and delivering a polished, real-time virtual queue experience.

## Must-Haves
- [x] React frontend with product catalog, cart, confirm, status tracking
- [x] Admin dashboard with login and order management
- [x] **Phase 4**: Three.js & Animations (Hero, Token, Transitions)
  - [x] 4.1 3D Hero Animation
  - [x] 4.2 3D Token Reveal
  - [x] 4.3 Page Transitions & Polish
- [x] Real-time polling for order status
- [x] Dark mode toggle

## Nice-to-Haves
- [ ] WebSocket live updates
- [ ] PWA support
- [ ] Sound effects
- [x] Confetti on order ready

## Phases

### Phase 1: Scaffold & Foundation
**Status**: ✅ Complete
**Objective**: Initialize Vite + React project, install Three.js / Framer Motion / React Router, set up project structure, design system (CSS variables, fonts, colors).

### Phase 2: Customer Frontend
**Status**: ✅ Complete
**Objective**: Build customer pages — product catalog grid with hover effects, slide-in cart panel, order confirmation with phone input, status tracking page with auto-polling.

### Phase 3: Admin Frontend
**Status**: ⬜ Not Started
**Objective**: Build admin pages — password-protected login, order dashboard with stats cards, expandable order cards, status toggle buttons, auto-refresh polling.

### Phase 4: Three.js & Animations
**Status**: ⬜ Not Started
**Objective**: Add 3D effects — floating particles hero banner, spinning 3D token reveal with confetti, animated gradient mesh backgrounds. Wire up Framer Motion page transitions and micro-animations.

### Phase 5: Product Overhaul + Order History + Delivery
**Status**: 🟡 Planning
**Objective**: Replace generic product catalog with categorized grain products (Rice/Wheat/Jowari/Bajri with kg-pricing), add per-customer order history, delivery type selection (Pickup/Home Delivery), admin delivery confirmation (three-lane: Processing→Ready→Delivered), and performance/stability hardening.
**Depends on**: Phase 4

**Tasks**:
- [ ] 5.1 — Backend: Schema migration + grain product catalog (37 products)
- [ ] 5.2 — Customer frontend: Delivery toggle + Order History page
- [ ] 5.3 — Admin: Three-lane dashboard + delivery confirmation
- [ ] 5.4 — Performance: AbortController, Suspense fallback, product cache

**Verification**:
- `GET /api/products` returns only Rice/Wheat/Jowari/Bajri products
- Customer can choose Home Delivery or Store Pickup
- Order History page shows all past orders by phone
- Admin can mark orders Delivered — customer status page updates
- `npm run build` passes, no console errors

---

## Previous Milestones

### v1.0 MVP ✅
**Goal**: Build the core virtual queue & digital storefront with FastAPI backend and Flet frontend.
**Status**: ✅ Complete
