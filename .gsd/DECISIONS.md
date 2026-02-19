# DECISIONS.md — Architecture Decision Records

## ADR-001: Python-Only Stack
- **Decision**: Use FastAPI + Flet + SQLite
- **Rationale**: User requirement for Python-only, no external DB dependencies
- **Date**: 2026-02-19

## ADR-002: Polling over WebSocket for Flet
- **Decision**: Use HTTP polling every 5s instead of WebSocket client in Flet
- **Rationale**: More reliable, simpler implementation, Flet handles state updates well with polling
- **Date**: 2026-02-19

## ADR-003: Token Counter in DB
- **Decision**: Store token counter in SQLite `counters` table, starting at 100
- **Rationale**: Persist across restarts, atomic increments, format "STORE-###"
- **Date**: 2026-02-19

## ADR-004: React + Three.js Frontend (replacing Flet)
- **Decision**: Replace Flet with Vite + React + Three.js + Framer Motion
- **Rationale**: Flet too slow, limited animations, API breaking across versions. React gives full control.
- **Date**: 2026-02-19

## Phase 2 Decisions

**Date:** 2026-02-19

### Scope
- Cart: Slide-in side panel (not a full page)
- Status tracking: Rich animated progress steps
- Product search/filter: Included in v2.0

### Approach
- Chose: React Router with separate page components (Option B)
- Reason: Cleaner URLs (/cart, /status/STORE-101), better structure

### Constraints
- Product images: Unsplash URLs resembling Indian general store items
- Phone validation: +91 India format, 10-digit mobile only
- Cart persistence: localStorage so cart survives refreshes
