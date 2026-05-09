# ADR 0001 — Router choice: React Router v6

**Status:** Accepted  
**Date:** 2026-05-09  
**Ticket:** T-003

## Context

OptiMap is a Tauri 2 desktop app. The frontend is served from a local webview with no HTTP server behind it. We need client-side routing between the main screens (Dashboard, Sites, Map, Licences, Settings, Welcome).

Two mature options exist in the React ecosystem:

- **React Router v6** (`react-router-dom@6`) — the de-facto standard, broad community adoption, stable API, ships its own TypeScript types.
- **TanStack Router** — newer, fully type-safe route params and search params, file-based or code-based config.

## Decision

Use **React Router v6** with `<HashRouter>`.

**Why React Router over TanStack Router:**  
Both would work. React Router is chosen because it is already the documented choice in the T-003 ticket ("Set up React Router (or TanStack Router — pick and document)"), has a wider community surface, and the MVP routes are simple enough that TanStack Router's extra type-safety on route params offers no material benefit today. TanStack Router is worth revisiting if route params become complex (e.g., `/sites/:id/edit` with validated search params).

**Why `HashRouter` over `BrowserRouter`:**  
Tauri 2 in production serves the app via the `tauri://localhost` custom protocol. Deep links such as `/sites` cannot be handled by a server that doesn't exist, so `BrowserRouter` would produce blank screens on direct navigation or reload. `HashRouter` stores the current route in the URL hash (`#/sites`), which works correctly in both development (`http://localhost:1420`) and production (`tauri://localhost`) without any server configuration.

**Why not `MemoryRouter`:**  
`MemoryRouter` loses the current route on hot-reload (common during development). Hash URLs are visible in the DevTools address bar, which aids debugging without requiring any extra configuration.

## Consequences

- All internal links use hash-prefixed paths internally but `react-router-dom` abstracts this away — components use plain paths like `/sites`.
- Tests use the same `HashRouter` that production uses (via the full `<App>` render); `MemoryRouter` is not needed because `HashRouter` works correctly in jsdom.
- If the project ever needs server-side rendering or deep-link sharing, migrating from `HashRouter` to `BrowserRouter` requires adding a catch-all route to whatever server serves the app — acceptable for a future non-desktop version.
