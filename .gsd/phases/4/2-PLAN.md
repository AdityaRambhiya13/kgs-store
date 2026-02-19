---
phase: 4
plan: 2
wave: 1
---

# Plan 4.2: 3D Token Reveal (Spinning Coin)

## Objective
Create a "Spinning Token" 3D animation for the `StatusPage`. When the order is ready, the token should spin dramatically and reveal the order ID, replacing the simple CSS card.

## Context
- `app/frontend/src/pages/StatusPage.jsx` — currently uses `.token-card` div
- Token format: "STORE-XXX"

## Tasks

<task type="auto">
  <name>Create Token3D component</name>
  <files>
    app/frontend/src/components/Token3D.jsx
  </files>
  <action>
    Create `Token3D` component taking prop `{ token }`:
    - Use `<Canvas>` with transparent background
    - Render a Cylinder geometry (radius=2.5, height=0.2, radialSegments=64) to look like a coin
    - Material: `MeshStandardMaterial` color="#F59E0B" (Gold), metalness=0.8, roughness=0.2
    - Add text on the face using `<Text>` from `@react-three/drei`:
      - Text content: `token`
      - Color: white
      - Position: centered on cylinder face, slightly raised
    - Wrap in `<Float>` for gentle hovering
    - Add animations:
      - Continuous slow rotation (y-axis)
      - Entrance animation: `useFrame` or `spring` to scale up from 0 to 1 with a spin
    - Add lights: Ambient + Directional + SpotLight for shiny reflections
  </action>
  <verify>Render Token3D in isolation. Coin spins, text is readable, gold material looks shiny.</verify>
  <done>
    - [ ] 3D Coin renders with gold material
    - [ ] Token text visible on the coin
    - [ ] Spinning animation works
  </done>
</task>

<task type="auto">
  <name>Integrate Token3D into StatusPage</name>
  <files>
    app/frontend/src/pages/StatusPage.jsx
  </files>
  <action>
    Update `StatusPage.jsx`:
    - Replace the `.token-value` text div with `<Token3D token={token} />` inside a container
    - Give the container a fixed height (e.g. 300px) so the canvas fits
    - Keep the `.token-card` background (gradient) or adjust it to be a scene background
    - If status becomes "Ready for Pickup", trigger a faster spin or jump animation on the coin (pass `isReady` prop to Token3D)
  </action>
  <verify>Go to /status/STORE-101. See 3D coin spinning with "STORE-101". Mark ready -> coin spins faster or jumps.</verify>
  <done>
    - [ ] Token text displayed in 3D
    - [ ] Integration into StatusPage layout is seamless
    - [ ] Animation reacts to status changes
  </done>
</task>

## Success Criteria
- [ ] Status page features a 3D gold token instead of plain text
- [ ] Token spins and floats
- [ ] Token reacts to "Ready" status (e.g. fast spin)
