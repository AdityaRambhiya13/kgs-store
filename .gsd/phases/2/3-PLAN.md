---
phase: 2
plan: 3
wave: 2
---

# Plan 2.3: Status Tracking Page (Animated Progress Steps)

## Objective
Build the rich order status tracking page with animated progress steps that auto-polls the API and updates visually when the order is ready.

## Context
- `.gsd/DECISIONS.md` — polling every 5s, animated steps experience
- `app/frontend/src/api.js` — getOrder(token) already implemented (Plan 2.1)
- Status values from API: "Processing" | "Ready for Pickup"

## Tasks

<task type="auto">
  <name>Build animated Status Tracking page</name>
  <files>
    app/frontend/src/pages/StatusPage.jsx
    app/frontend/src/components/ProgressSteps.jsx
    app/frontend/src/index.css
  </files>
  <action>
    1. `ProgressSteps.jsx` — animated 3-step progress indicator:
       Step 1: "Order Placed ✅" — always complete
       Step 2: "Being Prepared 🛒" — active when status = "Processing"
       Step 3: "Ready for Pickup 🎉" — active when status = "Ready for Pickup"
       Each step:
         - Circle icon (filled = done, pulsing ring = active, grey = pending)
         - Label below
         - Connecting line between steps (fills from left with CSS transition)
       The active step's circle has a `pulsing ring` CSS animation (scale 1→1.3→1, opacity 1→0)
       When status changes to "Ready", step 3 triggers confetti animation (use CSS keyframe burst, no library needed)
    2. `StatusPage.jsx` — route `/status/:token`:
       - Read token from `useParams()`
       - Fetch order on mount using getOrder(token): show loading spinner first
       - If 404: show "Order not found" with link back to /
       - Display:
         a) Token box — large gradient card with "Your Token: STORE-XXX"
            Entrance: `motion.div` scale from 0.8→1 with spring physics
         b) `<ProgressSteps status={order.status} />`
         c) Status message card:
            - Processing: "⏳ We're preparing your order. Hang tight!"
            - Ready: "🎉 Your order is ready! Please collect at the counter."
              When Ready: card background turns green gradient, text pulses once
         d) Order summary accordion (collapsed by default, click to expand):
            Shows items ordered and total amount
         e) "🛍️ New Order" button — navigates to /
       - Auto-poll every 5s using setInterval in useEffect
         Clear interval when status = "Ready for Pickup" or on unmount
         When status flips to "Ready", trigger confetti burst
    - DO NOT auto-navigate away from this page; user stays and sees the celebration.
  </action>
  <verify>After placing order: navigate to /status/STORE-XXX. Shows token card and 3 progress steps with step 2 pulsing. In another tab, go to admin and mark ready. Within 5s, step 3 lights up green, confetti bursts, message changes.</verify>
  <done>
    - [ ] Token displayed in large gradient card with entrance animation
    - [ ] 3 progress steps render correctly for each status value
    - [ ] Active step pulses with CSS ring animation
    - [ ] Auto-polls every 5s (verify via Network tab)
    - [ ] Status updates without page refresh within 5s of admin toggle
    - [ ] Confetti/celebration on "Ready for Pickup"
    - [ ] Interval cleared on unmount (no memory leak)
  </done>
</task>

<task type="checkpoint:human-verify">
  <name>Customer flow end-to-end verification</name>
  <action>
    The user should manually test the full customer journey:
    1. Open http://localhost:5173
    2. Search for a product ("Rice") — confirm filtering works
    3. Filter by a category chip — confirm grid updates
    4. Add 2-3 items using + buttons
    5. Click cart icon — confirm panel slides in with correct items
    6. Click "Checkout" → enter valid phone (9876543210) → Place Order
    7. Confirm redirect to /status/STORE-XXX with animated steps
    8. Leave page open and mark order ready from admin — confirm update within 5s
  </action>
  <done>All 8 steps complete without errors. UI looks polished and animations are smooth.</done>
</task>

## Success Criteria
- [ ] Status page loads with token from URL param
- [ ] Progress steps animate correctly for "Processing" and "Ready for Pickup"
- [ ] Polling updates UI within 5 seconds of status change
- [ ] Celebration/confetti triggers when order is ready
- [ ] Full customer flow works end-to-end
