---
phase: 4
plan: 3
wave: 2
---

# Plan 4.3: Page Transitions & Polish

## Objective
Add smooth route transitions (fades/slides) between pages using Framer Motion and polish global animations.

## Context
- `app/frontend/src/App.jsx` — holds `Routes`
- `app/frontend/src/index.css` — global styles

## Tasks

<task type="auto">
  <name>Implement Route Transitions</name>
  <files>
    app/frontend/src/App.jsx
  </files>
  <action>
    Update `App.jsx` to animate route changes:
    - Wrap `<Routes>` in `<AnimatePresence mode="wait">`
    - Create a wrapper component `PageTransition` that wraps each page content:
      - `motion.div`
      - `initial={{ opacity: 0, y: 20 }}`
      - `animate={{ opacity: 1, y: 0 }}`
      - `exit={{ opacity: 0, y: -20 }}`
      - `transition={{ duration: 0.3 }}`
    - Update `Routes` to use `useLocation()` key to trigger unmount/mount on route change
    - Apply `PageTransition` to all route elements
  </action>
  <verify>Navigate between Catalog -> Confirm -> Status. Pages should cross-fade/slide smoothly.</verify>
  <done>
    - [ ] Routes animate in/out
    - [ ] No layout trashing during transition
    - [ ] Cart panel still works independently
  </done>
</task>

<task type="auto">
  <name>Add Global Animated Background</name>
  <files>
    app/frontend/src/index.css
  </files>
  <action>
    Update `index.css`:
    - Add a subtle animated gradient background to the `body`:
      - `background: linear-gradient(-45deg, #F0F4FF, #E0E7FF, #F5F3FF, #FFF7ED)`
      - `background-size: 400% 400%`
      - `animation: gradient 15s ease infinite`
      - Keyframes for moving background position
    - Ensure dark mode has its own gradient set
  </action>
  <verify>Check background. It should slowly shift colors.</verify>
  <done>
    - [ ] Background animates globally
    - [ ] Dark mode still works (with darker gradient)
  </done>
</task>

## Success Criteria
- [ ] Smooth page transitions between all routes
- [ ] Subtle animated gradient background on body
