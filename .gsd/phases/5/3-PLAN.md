---
phase: 5
plan: 3
wave: 2
---

# Plan 5.3: Admin Dashboard — Three-Lane Status + Delivery Confirmation

## Objective
Upgrade the admin dashboard to show three order lanes (Processing → Ready for Pickup → Delivered), display the delivery type badge on each order card, add a "Mark Delivered" button, show a 4th stat card, and remove all `alert()` calls in favour of in-UI error toasts.

## Context
- app/frontend/src/pages/AdminPage.jsx
- app/frontend/src/api.js

## Tasks

<task type="auto">
  <name>Rewrite AdminPage to three-lane flow with delivery confirmation</name>
  <files>app/frontend/src/pages/AdminPage.jsx, app/frontend/src/api.js</files>
  <action>
    **api.js:**
    Update the `updateStatus` export to also accept "Delivered":
    ```js
    export const markDelivered = (token, password) =>
      request('PATCH', `/api/orders/${token}/status?password=${encodeURIComponent(password)}`, { status: 'Delivered' })
    ```
    Keep the original `updateStatus` as-is (it still handles Processing ↔ Ready toggle).

    **AdminPage.jsx — Full changes:**

    1. Import `markDelivered` from `../api`.
    2. Add state: `const [actionError, setActionError] = useState('')`
    3. Add order lane: `const delivered = orders.filter(o => o.status === 'Delivered')`
    4. Add 4th stat card for delivered count:
       ```jsx
       <div className="stat-card">
         <div className="stat-icon">🚀</div>
         <div className="stat-value">{delivered.length}</div>
         <div className="stat-label">Delivered</div>
       </div>
       ```
    5. Add handler `handleMarkDelivered(token)`:
       ```js
       const handleMarkDelivered = async (token) => {
           setTogglingToken(token)
           try {
               await markDelivered(token, password)
               setOrders(prev => prev.map(o => o.token === token ? { ...o, status: 'Delivered' } : o))
               setActionError('')
           } catch (e) {
               setActionError(e.message || 'Failed to mark delivered')
           } finally {
               setTogglingToken(null)
           }
       }
       ```
    6. Replace the `alert(e.message)` in `handleToggleStatus` with `setActionError(e.message || 'Action failed')`.
    7. Show `actionError` as an inline toast above the orders list:
       ```jsx
       {actionError && (
           <motion.div
               className="toast error"
               style={{ position: 'static', margin: '0 0 16px', borderRadius: 12 }}
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               onClick={() => setActionError('')}
           >
               ❌ {actionError} (click to dismiss)
           </motion.div>
       )}
       ```
    8. Add "Delivered" orders lane below the Ready lane with same pattern:
       ```jsx
       <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4, marginTop: 20 }}>
           🚀 Delivered ({delivered.length})
       </h3>
       {delivered.length === 0 && (
           <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No delivered orders</p>
       )}
       <AnimatePresence>
           {delivered.map(order => (
               <OrderCard key={order.token} order={order}
                   onToggle={handleToggleStatus}
                   onDeliver={handleMarkDelivered}
                   toggling={togglingToken === order.token}
                   expanded={expanded[order.token]} onExpand={toggleExpand} />
           ))}
       </AnimatePresence>
       ```
    9. Update `OrderCard` component:
       - Add `onDeliver` to props.
       - Add `const isDelivered = order.status === 'Delivered'`
       - Show delivery type badge in the header:
         ```jsx
         <div className="order-meta">
             📱 {order.phone} &nbsp;
             {order.delivery_type === 'delivery' ? '🚚 Delivery' : '🏪 Pickup'}
         </div>
         ```
       - In order actions, show buttons based on status:
         - If Processing: show "✅ Mark Ready" button (calls onToggle with 'Ready for Pickup')
         - If Ready: show both "↩ Processing" AND "🚀 Mark Delivered" buttons side by side
         - If Delivered: show only a disabled "✅ Done" badge, no action button
       - Do NOT allow toggling Delivered orders back (immutable once delivered).
  </action>
  <verify>cd app/frontend && npm run build 2>&1 | tail -5</verify>
  <done>Build passes. AdminPage has 3 lanes, no alert() calls, delivery badge visible on order cards.</done>
</task>

## Success Criteria
- [ ] Admin shows Processing / Ready for Pickup / Delivered lanes
- [ ] 4 stat cards visible (Total, Processing, Ready, Delivered)
- [ ] "Mark Delivered" button appears on Ready orders
- [ ] Delivered orders are immutable (no revert button)
- [ ] Delivery type badge (🚚/🏪) shown on each order card
- [ ] No `alert()` calls — errors shown as inline toast
- [ ] `npm run build` passes with 0 errors
