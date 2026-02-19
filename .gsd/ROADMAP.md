# ROADMAP.md

> **Current Milestone**: v2.0 React + Three.js Frontend
> **Goal**: Replace the existing Flet UI with a production-ready React + Three.js frontend, keeping the FastAPI backend unchanged and delivering a polished, real-time virtual queue experience.

## Must-Haves
- [ ] React frontend with product catalog, cart, confirm, status tracking
- [ ] Admin dashboard with login and order management
- [ ] Three.js animated hero and token effects
- [ ] Real-time polling for order status
- [ ] Dark mode toggle

## Nice-to-Haves
- [ ] WebSocket live updates
- [ ] PWA support
- [ ] Sound effects
- [ ] Confetti on order ready

## Phases

### Phase 1: Scaffold & Foundation
**Status**: ⬜ Not Started
**Objective**: Initialize Vite + React project, install Three.js / Framer Motion / React Router, set up project structure, design system (CSS variables, fonts, colors).

### Phase 2: Customer Frontend
**Status**: ⬜ Not Started
**Objective**: Build customer pages — product catalog grid with hover effects, slide-in cart panel, order confirmation with phone input, status tracking page with auto-polling.

### Phase 3: Admin Frontend
**Status**: ⬜ Not Started
**Objective**: Build admin pages — password-protected login, order dashboard with stats cards, expandable order cards, status toggle buttons, auto-refresh polling.

### Phase 4: Three.js & Animations
**Status**: ⬜ Not Started
**Objective**: Add 3D effects — floating particles hero banner, spinning 3D token reveal with confetti, animated gradient mesh backgrounds. Wire up Framer Motion page transitions and micro-animations.

### Phase 5: Polish & DevOps
**Status**: ⬜ Not Started
**Objective**: Dark mode toggle, responsive design polish, update Dockerfile and docker-compose for React build, update README, final verification.

---

## Previous Milestones

### v1.0 MVP ✅
**Goal**: Build the core virtual queue & digital storefront with FastAPI backend and Flet frontend.
**Status**: ✅ Complete
