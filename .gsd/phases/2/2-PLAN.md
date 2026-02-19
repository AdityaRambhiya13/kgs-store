---
phase: 2
plan: 2
wave: 1
---

# Plan 2.2: Slide-In Cart Panel & Order Confirmation

## Objective
Build the slide-in cart side panel (accessible from anywhere) and the order confirmation page with +91 phone validation.

## Context
- `.gsd/DECISIONS.md` — cart is slide-in panel, phone +91 India format, cart persists in localStorage
- `app/frontend/src/CartContext.jsx` — cart state/actions (from Plan 2.1)
- `app/frontend/src/pages/CatalogPage.jsx` — already renders Navbar with cart toggle

## Tasks

<task type="auto">
  <name>Build slide-in CartPanel with item management</name>
  <files>
    app/frontend/src/components/CartPanel.jsx
    app/frontend/src/index.css
  </files>
  <action>
    1. `CartPanel.jsx` — animated side panel (right side, fixed position):
       - Framer Motion `AnimatePresence` + `motion.div` with `x: "100%"` → `x: 0` slide animation (300ms ease)
       - Backdrop overlay (semi-transparent) that closes panel on click
       - Panel shows: header ("Your Cart 🛒"), list of cart items, total, action buttons
       - Each cart item row: image thumbnail, name, price ×qty, subtotal, × remove button
         - Remove button taps with scale animation
       - Quantity stepper on each item (+/-) that updates CartContext
       - Empty state (cute illustration/emoji + "Your cart is empty")
       - Bottom section: Total (bold, large), "Checkout" CTA button
       - "Checkout" navigates to /confirm (React Router useNavigate)
    2. Wire CartPanel open/close state:
       - Add `cartOpen` state to CartContext (or lift to App.jsx)
       - Navbar cart icon toggles it
       - Panel close button and backdrop also close it
    3. Add CSS for panel, backdrop, and item rows to `index.css`
    - DO NOT build a full separate page. Panel overlays the current page.
  </action>
  <verify>On catalog page, click cart icon — panel slides in from right. Add/remove items — panel updates instantly. Click backdrop — panel slides out.</verify>
  <done>
    - [ ] Panel slides in/out with Framer Motion animation
    - [ ] Item list updates live from CartContext
    - [ ] Qty stepper works inside panel
    - [ ] "Checkout" button navigates to /confirm
    - [ ] localStorage cart survives page refresh
  </done>
</task>

<task type="auto">
  <name>Build Order Confirmation page</name>
  <files>
    app/frontend/src/pages/ConfirmPage.jsx
  </files>
  <action>
    1. `ConfirmPage.jsx` — full page route at `/confirm`:
       - Order summary card: list of cart items (name, qty, subtotal), grand total
       - Phone number input:
         - Prefix label "+91" (not editable), then 10-digit input
         - Validation: exactly 10 digits, starts with 6-9 (Indian mobile)
         - Show inline error: "Please enter a valid 10-digit mobile number"
       - "Place Order 🎉" button:
         - Disabled until phone is valid
         - On click: call POST /api/orders with { phone, items, total }
         - Show spinner while waiting
         - On success: call clearCart(), navigate to /status/:token
         - On error: show error toast/message below button
       - "← Back to Shop" link (navigates to /)
       - If cart is empty on mount: redirect to / automatically
       - Animate entrance: `motion.div` with `initial={{ opacity:0, y:20 }}` → `animate={{ opacity:1, y:0 }}`
  </action>
  <verify>Navigate to /confirm with items in cart. Enter invalid phone — error shows. Enter valid phone (e.g. 9876543210) — button enables. Submit — spinner shows, then redirects to /status/STORE-XXX.</verify>
  <done>
    - [ ] Summary shows correct items and total
    - [ ] Phone validation blocks invalid numbers
    - [ ] Successful order clears cart and redirects to status page
    - [ ] Empty cart redirects back to /
  </done>
</task>

## Success Criteria
- [ ] CartPanel slides in/out smoothly with Framer Motion
- [ ] Cart persists across page reloads via localStorage
- [ ] Order placed successfully via POST /api/orders
- [ ] Redirected to /status/:token after successful order
