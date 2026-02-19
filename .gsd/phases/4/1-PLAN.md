---
phase: 4
plan: 1
wave: 1
---

# Plan 4.1: 3D Hero Animation (Floating Particles)

## Objective
Replace the static CSS hero banner on `CatalogPage` with an immersive 3D scene using React Three Fiber. The scene should feature floating particles/stars and perhaps some abstract geometry to create a "magical" shop feel.

## Context
- `app/frontend/src/pages/CatalogPage.jsx` — currently has a static `.hero` div
- `npm install three @react-three/fiber @react-three/drei` — already installed in Phase 2

## Tasks

<task type="auto">
  <name>Create Hero3D component</name>
  <files>
    app/frontend/src/components/Hero3D.jsx
  </files>
  <action>
    Create a new component `Hero3D` that renders a full-width/height `<Canvas>`:
    - Use `<Canvas>` from `@react-three/fiber`
    - Add `<Stars>` from `@react-three/drei` (radius=100, depth=50, count=5000)
    - Add `<Sparkles>` (count=100, scale=10, size=2, speed=0.4)
    - Add floating geometric shapes:
      - Use `<Float>` from `@react-three/drei` (speed=2, rotationIntensity=1, floatIntensity=2)
      - Render 3-4 random `Torus` or `Icosahedron` meshes with `MeshDistortMaterial` (color="#F59E0B", distort=0.3, speed=2)
      - Position them loosely around the center but behind the text area
    - Add `<AmbientLight>` (intensity=0.5) and `<PointLight>` (position=[10, 10, 10])
    - Ensure the canvas has `position: absolute; inset: 0; pointer-events: none;` style so text interactivity works.
  </action>
  <verify>Import Hero3D in CatalogPage, render it. 3D elements should appear behind the text.</verify>
  <done>
    - [ ] Canvas renders without errors
    - [ ] Stars and sparkles visible
    - [ ] Floating shapes animate smoothly
  </done>
</task>

<task type="auto">
  <name>Integrate Hero3D into CatalogPage</name>
  <files>
    app/frontend/src/pages/CatalogPage.jsx
    app/frontend/src/index.css
  </files>
  <action>
    1. Update `CatalogPage.jsx`:
       - Import `Hero3D`
       - Inside the `.hero` div, add `<Hero3D />` as the first child
       - Ensure `Hero3D` is positioned absolutely to fill the `.hero` container
    2. Update `index.css`:
       - `.hero` must have `position: relative; overflow: hidden;`
       - Ensure z-index layering: 3D canvas (z-0), content (z-1)
       - Adjust text colors if needed for contrast against the 3D scene
  </action>
  <verify>Open http://localhost:5173. Hero section has animated 3D background behind the text "Quick Shop".</verify>
  <done>
    - [ ] 3D scene fills hero container
    - [ ] Text remains readable and selectable
    - [ ] Performance is good (60fps)
  </done>
</task>

## Success Criteria
- [ ] Hero section has a rich 3D animated background
- [ ] Stars, sparkles, and floating shapes present
- [ ] Text overlay works correctly
