# Tickets 001–020

The first 20 tickets to take OptiMap from empty repo to MVP-shaped. Each is sized to be one focused Claude Code session (1–4 hours of human review time). Pick the next ticket whose dependencies are all `Done`.

**Status legend:** `Open` · `In progress` · `In review` · `Done` · `Blocked`

---

## Foundation (T-001 to T-005)

### T-001 — Repo bootstrap
**Status:** Open
**Depends on:** none

Initialise the monorepo. Create the directory structure described in `CLAUDE.md`. Set up pnpm workspaces. Add `.gitignore`, `.editorconfig`, `.nvmrc` (Node 20). Add LICENSE (AGPLv3). Add base ESLint + Prettier configs. Set up Husky + lint-staged for pre-commit hooks. Add a base GitHub Actions workflow that runs `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test` on every PR.

**Acceptance criteria:**
- `pnpm install` works from a fresh clone.
- `pnpm typecheck` passes (even with empty packages).
- `pnpm lint` passes.
- A trivial commit triggers the GitHub Actions workflow and passes.
- LICENSE file is AGPLv3 (full text).
- README explains how to get started (already drafted; verify links work).

---

### T-002 — Local dev infrastructure (Docker Compose)
**Status:** Open
**Depends on:** T-001

Add `docker-compose.yml` with PostgreSQL 16 + PostGIS 3 and Redis 7. Add a `.env.example` documenting required environment variables. Add `pnpm db:up` and `pnpm db:down` scripts that wrap docker compose.

**Acceptance criteria:**
- `pnpm db:up` starts Postgres and Redis.
- `psql` connection from host works using credentials from `.env.example`.
- `psql -c "SELECT PostGIS_Version();"` returns the version (proves PostGIS extension is loaded).
- `.env` is gitignored; `.env.example` is committed and complete.

---

### T-003 — Drizzle ORM setup + first migration
**Status:** Open
**Depends on:** T-002

Add Drizzle to `packages/db`. Configure with the postgres-js driver. Create the first migration: a `tenants` table and a `users` table with a foreign key to tenants. Add `pnpm db:generate`, `pnpm db:migrate`, and `pnpm db:studio` scripts. Configure Drizzle to use the PostGIS `geography` type.

**Acceptance criteria:**
- `pnpm db:generate` produces a SQL migration file from the TS schema.
- `pnpm db:migrate` applies it cleanly to a fresh database.
- A second `pnpm db:migrate` is a no-op (migrations are idempotent).
- `pnpm db:studio` opens the Drizzle Studio UI.
- A test seeds 2 tenants and 4 users (2 per tenant) and asserts cross-tenant queries return the expected isolation.

---

### T-004 — Next.js 15 app scaffold + Tailwind
**Status:** Open
**Depends on:** T-001

Scaffold `apps/web` as a Next.js 15 App Router project with TypeScript strict. Add Tailwind CSS. Add a single root layout and a placeholder home page. Wire up the path alias `@/*` to `apps/web/src/*` in `tsconfig.json`.

**Acceptance criteria:**
- `pnpm dev` starts the app on port 3000.
- The home page renders "OptiMap — coming soon" styled with Tailwind utilities.
- `pnpm build` produces a production build with zero TS or ESLint errors.

---

### T-005 — Auth with better-auth + tenant scoping
**Status:** Open
**Depends on:** T-003, T-004

Add `better-auth` to the web app. Email + password only for now. On signup, the user creates a new tenant and becomes its Owner. Add a `tenant_id` column to `users` and create a `tenant_memberships` table for the many-to-many (a future user can belong to multiple tenants, but at signup it's 1:1).

Add an auth middleware that loads the active tenant onto every request context.

**Acceptance criteria:**
- A user can sign up, sign in, and sign out via the UI.
- The session cookie is HttpOnly, Secure, SameSite=Lax.
- Email verification is wired (token email goes to console in dev).
- A signed-in user has `ctx.user` and `ctx.tenant` available in any server action / route handler.
- Trying to sign in with bad credentials shows a generic error (no user-enumeration leak).
- Passwords stored with argon2id (or whatever better-auth uses by default; verify and document).

---

## Sites (T-006 to T-010)

### T-006 — Sites schema + migrations
**Status:** Open
**Depends on:** T-003

Add `sites` table to `packages/db`. Columns:
- `id` (uuid, pk)
- `tenant_id` (uuid, fk → tenants, indexed)
- `name` (text)
- `type` (enum: `tower`, `rooftop`, `hut`, `mpop`, `exchange`, `customer_premise`, `other`)
- `status` (enum: `planned`, `active`, `decommissioned`, `maintenance`, `fault`)
- `location` (PostGIS geography(Point, 4326))
- `ground_elevation_m` (real, nullable)
- `address` (text, nullable)
- `notes` (text, nullable)
- `created_at`, `updated_at`, `deleted_at` (all timestamps; `deleted_at` is the soft-delete marker)
- `created_by`, `updated_by` (uuid, fk → users)

Add a GIST index on `location`. Add a B-tree index on `(tenant_id, deleted_at)`.

**Acceptance criteria:**
- Migration applies cleanly forward and rolls back cleanly.
- Tests confirm the GIST index is created and a `ST_DWithin` query plan uses it.
- Inserting a site without `location` fails with a NOT NULL violation.

---

### T-007 — Sites tRPC router (CRUD)
**Status:** Open
**Depends on:** T-005, T-006

Create `packages/api/src/routers/sites.ts`. Procedures: `list`, `byId`, `create`, `update`, `softDelete`, `restore`. All inputs validated with Zod.

Every query must filter by `tenant_id = ctx.tenant.id`. Every mutation must verify the target row's `tenant_id` matches `ctx.tenant.id` before write. Hard-fail with a 403 on mismatch.

`list` supports: pagination (cursor or offset; pick one and document), free-text search on `name` and `address`, filter by `status` and `type`, optional bounding-box filter using PostGIS `ST_MakeEnvelope`.

**Acceptance criteria:**
- Tests cover: create + list, update + read, soft-delete + restore, cross-tenant access denied (returns 404 not 403 to avoid info leak).
- Bounding-box filter returns sites within the box and not outside it (asserted with fixtures).
- All mutations write an audit log entry (see T-020 if not yet implemented; for now, write a TODO comment and a stub function).

---

### T-008 — Sites list page
**Status:** Open
**Depends on:** T-007

Build `/sites` page in the web app. Table view with columns: name, type, status, address, last updated. Top bar: search input, status filter, type filter, "New site" button. Pagination at the bottom. Click a row to go to `/sites/[id]`.

Use server components for the initial render; client components for interactive filters.

**Acceptance criteria:**
- Lists 1,000 sites in under 1 second on a local dev machine.
- Search debounced 300ms.
- URL reflects the current filters (so a link is shareable).
- Empty state when no sites exist links to "Create your first site" and "Bulk import".
- Keyboard navigable (tab through filters, enter on a row opens detail).

---

### T-009 — Site create / edit form
**Status:** Open
**Depends on:** T-007

Build the create form at `/sites/new` and the edit form at `/sites/[id]/edit`. Fields: name (required), type, status, lat + lng (numeric inputs), ground elevation, address, notes.

Lat/lng inputs accept decimal degrees and DMS (e.g. `33°43′01″S`) — auto-convert. Add a small "pick on map" button that opens a modal with a MapLibre map; the user clicks to drop a pin and the lat/lng populate. (Map dependency from T-011 — if T-011 isn't done, ship this ticket without the map picker and add a follow-up.)

**Acceptance criteria:**
- Validation errors appear inline on the field and prevent submit.
- DMS-to-decimal conversion correct for the four cardinal hemispheres (test fixtures).
- After successful save, redirect to `/sites/[id]` with a success toast.
- Cancel returns to `/sites` without confirmation if no fields were changed; with confirmation if dirty.

---

### T-010 — Site detail page
**Status:** Open
**Depends on:** T-007

Build `/sites/[id]`. Shows all site fields, a small embedded map centred on the site (T-011), and a tab strip for `Equipment` (T-017) and `Licences` (T-019) — show "coming soon" placeholders if those modules aren't built yet.

Add an "Actions" menu: Edit, Soft delete, Export PDF (stub for v1, file a ticket).

**Acceptance criteria:**
- Page renders with all site fields.
- Soft delete shows a confirm dialog and on confirm sets `deleted_at`, then redirects to `/sites` with a toast offering Undo (which calls `restore`).
- 404 page shown for unknown id or cross-tenant id.

---

## Mapping (T-011 to T-014)

### T-011 — MapLibre GL setup
**Status:** Open
**Depends on:** T-004

Install `maplibre-gl`. Create a `<Map>` component wrapping the GL renderer. Use OpenStreetMap raster tiles (the standard tile.openstreetmap.org URL) with proper attribution. Default centre: Sydney (-33.86, 151.21), zoom 5.

Important: respect OSM tile usage policy — set a User-Agent header, don't blast their servers; for production we'll switch to a self-hosted tile cache. Document this in a comment.

**Acceptance criteria:**
- Map renders, can be panned and zoomed.
- Attribution control visible.
- Component accepts `centre`, `zoom`, and `children` props.
- Lazy-loaded so the map JS isn't in the initial bundle.

---

### T-012 — Site markers on the map
**Status:** Open
**Depends on:** T-007, T-011

Build `/map` page. Loads all sites for the current tenant via `sites.list`, renders them as markers on a MapLibre map. Marker colour by status (green=active, amber=maintenance, red=fault, grey=decommissioned, blue=planned). Cluster markers when there are more than 50 visible (use `supercluster` or MapLibre's built-in clustering).

Click a marker to show a popup with name, type, status, and a "View details" link.

**Acceptance criteria:**
- 1,000 sites render in under 2 seconds.
- Cluster click zooms in to expand.
- Popup is keyboard-accessible (focus trap, Esc to close).
- Map state (centre, zoom) persists in the URL.

---

### T-013 — Map search
**Status:** Open
**Depends on:** T-012

Add a search bar to the map page. Two modes:
1. **Site name search:** queries `sites.list` and shows top 10 results in a dropdown; selecting one flies the map to the site.
2. **Address search:** uses Nominatim public API (with attribution and a User-Agent identifying OptiMap, per their usage policy). Selecting a result flies the map to the geocoded location and drops a transient pin.

Debounce 300ms. Cache results client-side for the session.

**Acceptance criteria:**
- Switching between modes happens via a toggle, default is site search.
- Nominatim usage stays under 1 request/second per user (debounce + queue).
- Empty state explains how to search.
- "Sorry, address service is rate-limited" surfaces gracefully on 429.

---

### T-014 — Distance + bearing measurement tool
**Status:** Open
**Depends on:** T-011

Add a measurement tool to the map. Activate via a toolbar button. Click two points on the map; show a line, the great-circle distance in km (with miles toggle), and the bearing in degrees true.

**Acceptance criteria:**
- Distance calculation matches `ST_Distance(::geography)` to within 0.1%.
- Bearing matches an external reference (e.g., movable-type.co.uk's calculator) for 5 test fixtures.
- Esc key clears the measurement and exits the tool.
- Mobile-touch-friendly (works on a phone screen).

---

## Equipment (T-015 to T-017)

### T-015 — Equipment schema + migrations
**Status:** Open
**Depends on:** T-006

Add `equipment_items` table. Columns:
- `id`, `tenant_id`, `site_id` (fk → sites), `parent_id` (self-fk for hierarchy, nullable)
- `category` (enum: `radio`, `antenna`, `switch`, `router`, `power`, `other`)
- `make`, `model`, `serial`, `mac` (text, nullable except where noted)
- `firmware_version`, `ip_address` (text, nullable)
- `install_date`, `warranty_expiry` (dates, nullable)
- `status` (enum: `in_service`, `spare`, `faulty`, `rma`, `retired`)
- Antenna-only nullable columns: `gain_dbi`, `beamwidth_h_deg`, `beamwidth_v_deg`, `mount_height_agl_m`, `azimuth_deg`, `mechanical_downtilt_deg`, `electrical_downtilt_deg`, `polarisation` (enum)
- `notes` (text, nullable)
- audit columns same as sites

**Acceptance criteria:**
- Migration applies cleanly. Constraint check: when `category = 'antenna'`, gain and azimuth must be non-null (DB-level CHECK constraint).
- Self-fk for hierarchy works; cascade behaviour documented.
- Unique index on `(tenant_id, serial)` where serial is not null.

---

### T-016 — Equipment tRPC router
**Status:** Open
**Depends on:** T-007, T-015

Procedures: `listBySite`, `byId`, `create`, `update`, `softDelete`, `restore`. Tenant + site scoping enforced. Search by serial, model, or MAC.

**Acceptance criteria:**
- Tests cover: create antenna with required RF fields, create non-antenna without RF fields succeeds, create antenna without RF fields fails with a clear error.
- Cross-site cross-tenant isolation tested.

---

### T-017 — Equipment management UI
**Status:** Open
**Depends on:** T-010, T-016

On the site detail page Equipment tab: list equipment for that site as a table, "Add equipment" button opens a modal form. Form has a category selector that reveals the antenna-specific fields when `antenna` is selected.

Inline edit and inline delete on the list.

**Acceptance criteria:**
- Form validates antenna fields required when category=antenna.
- After add, list updates without a page reload (optimistic update with rollback on error).
- Sortable by category, model, serial.

---

## Licences (T-018 to T-020)

### T-018 — Licences schema + migrations
**Status:** Open
**Depends on:** T-006

Add `licences` table:
- `id`, `tenant_id`, `site_id` (fk, nullable — link to come in Phase 2)
- `licence_id_external` (text, nullable — the regulator's licence number)
- `regulator` (text, default `ACMA`)
- `country_code` (char(2), default `AU`)
- `frequency_mhz`, `bandwidth_mhz` (numeric)
- `eirp_dbm`, `polarisation` (numeric, enum, both nullable)
- `expiry_date` (date)
- `annual_fee_amount`, `annual_fee_currency` (numeric, char(3) default `AUD`)
- `notes`
- audit columns

**Acceptance criteria:**
- Migration applies cleanly.
- Index on `(tenant_id, expiry_date)` for the dashboard query.
- Test asserts that a licence can exist without `site_id` (orphan, intentional — pre-allocated licences).

---

### T-019 — Licences tRPC router + dashboard
**Status:** Open
**Depends on:** T-007, T-018

Procedures: `list`, `byId`, `create`, `update`, `softDelete`, `restore`, `expiringWithinDays(n: number)`.

Build `/licences` dashboard page with three sections: Expiring in 7 days, Expiring in 30 days, Expiring in 90 days. CSV export button at the top.

PDF attachments via the document-attachment system (which itself needs to exist — this ticket may surface a sub-ticket for "document attachment service" if we don't have one yet; if so, file it and use a stub for now).

**Acceptance criteria:**
- Dashboard query under 200ms for 5,000 licences.
- CSV export contains all listed columns and parses cleanly in Excel and LibreOffice.
- "Expired" section shown if any licences are past expiry; visually distinguished.

---

### T-020 — Audit log + soft delete utility
**Status:** Open
**Depends on:** T-006 (and applies retroactively to T-007, T-016, T-019)

Build the audit log infrastructure. Add `audit_log` table:
- `id`, `tenant_id`, `actor_user_id`, `entity_type`, `entity_id`, `action` (enum: `create`, `update`, `soft_delete`, `restore`, `hard_delete`), `before_json`, `after_json`, `created_at`, `ip_address`, `user_agent`.

Build a tRPC middleware or helper that automatically writes an audit log entry on every mutation in the site, equipment, and licence routers.

Build a simple `/audit` page (admin-only) that lists recent audit entries with filters by entity type and actor.

**Acceptance criteria:**
- Mutations across sites, equipment, and licences write audit entries automatically.
- Soft-delete and restore actions are auditable.
- Audit entries are themselves immutable (no update/delete procedures exposed).
- Audit page lists newest first, paginated.
- Cross-tenant audit access denied.

---

## How to use this file

1. **Pick the next `Open` ticket** whose dependencies are all `Done`.
2. **Move it to `In progress`** in this file (commit the change separately, before starting work).
3. **Branch:** `t-NNN-short-description`.
4. **When done, open a PR** referencing the ticket ID in the title.
5. **On merge, mark `Done`** and add the PR link.

When the queue empties, the next batch (T-021 onwards) is generated based on what we've learned. Don't generate them in advance — scope earned, not assumed.

## Backlog (not yet ticketed)

- Bulk CSV import for sites (will be T-021).
- Document attachment system (T-022 — surfaced by T-019).
- Map picker integration with site form (deferred from T-009).
- Production deployment guide (Hetzner / Fly.io).
- E2E test suite (Playwright; first scenarios: signup → first site, edit site, view on map).
