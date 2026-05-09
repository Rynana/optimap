# Tickets 001–020

The first 20 tickets to take OptiMap from empty repo to MVP-shaped. Each is sized to be one focused Claude Code session (1–4 hours of human review time). Pick the next ticket whose dependencies are all `Done`.

**Status legend:** `Open` · `In progress` · `In review` · `Done` · `Blocked`

**Model tags:** ticket titles may carry `[model: opus]` or `[model: sonnet]`. Untagged tickets default to Sonnet. See `CLAUDE.md` § "Model selection" for the escalation/de-escalation rules.

---

## Foundation (T-001 to T-003)

### T-001 — Repo bootstrap (Tauri 2 + React + Vite + Tailwind)

**Status:** Done (a6e4f5b)
**Depends on:** none

Initialise the project. Use `pnpm create tauri-app` with the React + TypeScript + Vite template. Add Tailwind CSS, ESLint, Prettier, Husky + lint-staged. Set up the directory structure described in `CLAUDE.md`. Add `.gitattributes` enforcing LF line endings. Add the GPLv3 LICENSE file. Add a base GitHub Actions workflow that runs `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm tauri build` on every PR (build for the runner's OS only).

Configure `tauri.conf.json`:

- `productName: "OptiMap"`
- `identifier: "com.optimap.app"`
- Window: 1280×800 default, min 1024×640.
- Title: "OptiMap".

**Acceptance criteria:**

- `pnpm install` works from a fresh clone.
- `pnpm tauri dev` launches a window showing a placeholder "OptiMap — coming soon" with Tailwind styling.
- `pnpm tauri build` produces an installer artefact in `src-tauri/target/release/bundle/`.
- `pnpm typecheck`, `pnpm lint`, `pnpm test` all pass (test suite can be empty).
- A trivial commit triggers GitHub Actions and passes.
- LICENSE is GPLv3 (full text).
- `.gitattributes` enforces LF for source files.

---

### T-002 — Database layer: tauri-plugin-sql + Drizzle + first migration `[model: opus]`

**Status:** Done (2e6aa33)
**Depends on:** T-001

Add `@tauri-apps/plugin-sql` (frontend) and the Rust `tauri-plugin-sql` (backend). Configure to use SQLite, with the database file at the OS-standard app-data directory: `<appDataDir>/optimap.db`.

Add Drizzle ORM (`drizzle-orm`, `drizzle-kit`) configured for SQLite. Build a small adapter at `src/db/client.ts` that lets Drizzle's query builder execute against `tauri-plugin-sql` (the plugin returns JSON; wrap it so Drizzle can use it).

Create the first migration: a `meta` table with one row tracking the schema version, and an `audit_log` table (used in T-018 but defined now so subsequent migrations don't have to retro-fit it).

Add `pnpm db:generate` (drizzle-kit generates SQL migrations from the TS schema) and a runtime migration runner that applies pending migrations on app startup.

**Acceptance criteria:**

- App startup creates `optimap.db` in the correct app-data dir if it doesn't exist.
- Migration runner applies all pending migrations and is idempotent on re-run.
- A test asserts that after first launch, `meta.schema_version` exists and is correct.
- The data dir path is logged once on startup at info level.
- A "Reveal data folder" button is added to a stub Settings page (full Settings UI is later — this button is tested here).

---

### T-003 — App shell: routing, layout, first-launch experience

**Status:** Done (77f4ebf)
**Depends on:** T-001

Set up React Router (or TanStack Router — pick and document) with these routes:

- `/` — home / dashboard
- `/sites` — sites list (placeholder until T-006)
- `/map` — map view (placeholder until T-009)
- `/licences` — licences dashboard (placeholder until T-016)
- `/settings` — settings (Reveal data folder button from T-002 lives here)
- `/welcome` — first-launch experience

Add a left-side navigation rail with icons (lucide-react) and a top bar with the app title and a search input (search wired in T-010).

**First-launch experience:** if the database is empty, redirect to `/welcome`. Welcome screen offers three buttons:

1. **Start with a sample dataset** — loads 10 demo sites in NSW for the user to explore.
2. **Import from CSV** — opens the import dialog (full functionality in a later ticket; stub for now with a "coming soon" message).
3. **Start empty** — drops user at `/sites` empty state.

Add a "first-launch completed" flag in the `meta` table so the welcome screen only appears once unless the user resets it.

**Acceptance criteria:**

- Empty database → first launch shows `/welcome`.
- Clicking "Start with sample" loads sample sites and lands on `/sites`.
- Subsequent launches go straight to `/`.
- All four placeholder routes render with correct page titles.
- The nav rail is keyboard-navigable.
- "Reset first-launch experience" button in Settings works (testing aid; can be hidden in production with a flag later).

---

## Sites (T-004 to T-008)

### T-004 — Sites schema + migration

**Status:** Done (56b6a66)
**Depends on:** T-002

Add the `sites` table to `src/db/schema.ts`. Columns:

- `id` (text, pk, uuid)
- `name` (text, not null)
- `type` (text, not null — values: `tower`, `rooftop`, `hut`, `mpop`, `exchange`, `customer_premise`, `other`)
- `status` (text, not null — values: `planned`, `active`, `decommissioned`, `maintenance`, `fault`)
- `latitude` (real, not null)
- `longitude` (real, not null)
- `ground_elevation_m` (real, nullable)
- `address` (text, nullable)
- `notes` (text, nullable)
- `created_at`, `updated_at`, `deleted_at` (text — ISO 8601 timestamps)

Add indexes on:

- `(deleted_at)` for the default "active rows" filter.
- `(latitude, longitude)` to support bounding-box pre-filter for spatial queries.

Add Zod schemas for create and update operations.

Add a `lib/geo.ts` module with: `haversineKm(a, b)`, `bearingDeg(a, b)`, `boundingBox(centre, radiusKm)`. All Haversine math, well-tested.

**Acceptance criteria:**

- Migration applies cleanly forward; rollback removes the table cleanly.
- Inserting a site with bad enum values fails at the Zod boundary (DB has no enum constraint — Zod is the source of truth).
- `lib/geo.ts` has at least 8 test fixtures covering equator, poles, antimeridian crossing, hemispheres.
- Haversine matches a reference implementation (e.g., movable-type.co.uk) to within 0.1%.

---

### T-005 — Sites query module

**Status:** Done
**Depends on:** T-004

Create `src/features/sites/queries.ts` with typed functions:

- `listSites(opts: { search?, status?, type?, bbox?, limit?, offset?, includeDeleted? })`
- `getSiteById(id)`
- `createSite(input)`
- `updateSite(id, input)`
- `softDeleteSite(id)`
- `restoreSite(id)`
- `sitesWithinRadiusKm(centre, radiusKm)`

Each function:

- Validates input with Zod.
- Wraps Drizzle queries.
- Writes an audit log entry on every mutation (use the `audit_log` table from T-002; helper function `writeAudit(...)`).
- Sets `deleted_at` on soft delete; never hard-deletes.

`sitesWithinRadiusKm` uses the bounding-box pre-filter from `lib/geo.ts` and then filters exactly with Haversine in JS.

**Acceptance criteria:**

- 100% of mutations go through the audit log.
- Tests cover: create + read, update + read, soft-delete + restore, list with each filter, radius search returning only the right sites.
- Cross-rows-not-deleted-by-default tested.
- Performance: `listSites` over 10,000 sites returns in < 100ms on a typical dev laptop (use a generated fixture).

---

### T-006 — Sites list page

**Status:** Open
**Depends on:** T-005

Build `/sites`. Table view with columns: name, type, status, address, last updated. Top bar: search input, status filter, type filter, "New site" button, "Import CSV" button (stub — full importer is T-019). Click a row → site detail.

Use TanStack Query for data fetching. Empty state when no sites exists shows the three first-launch options inline.

**Acceptance criteria:**

- 1,000 sites render in under 1 second.
- Search debounced 300ms.
- Filters reflected in URL query string.
- Status badges colour-coded consistently with the map (T-010).
- Keyboard navigable (tab through filters, enter on a row opens detail).

---

### T-007 — Site create / edit form

**Status:** Open
**Depends on:** T-005

Build `/sites/new` and `/sites/:id/edit`. Fields: name, type, status, lat, lng, ground elevation, address, notes.

Lat/lng inputs accept decimal degrees and DMS (e.g. `33°43′01″S`); auto-convert with a `parseCoordinate` helper. Add a "Pick on map" button that opens a modal with MapLibre (T-009 dependency — if T-009 not done, ship without and file follow-up).

Use React Hook Form + Zod resolver.

**Acceptance criteria:**

- Validation errors inline, prevent submit.
- DMS-to-decimal conversion correct for all four hemispheres (test fixtures).
- After save: redirect to `/sites/:id` with a success toast.
- Cancel asks for confirmation only if the form is dirty.

---

### T-008 — Site detail page

**Status:** Open
**Depends on:** T-005

Build `/sites/:id`. Shows all site fields, a small embedded map centred on the site (T-009 dependency), tab strip for `Equipment` (T-014) and `Licences` (T-016) — show "coming soon" placeholders if the modules aren't built yet.

"Actions" menu: Edit, Soft delete, Export single-site PDF (stub — file a Phase 2 ticket).

**Acceptance criteria:**

- Renders all site fields.
- Soft delete shows a confirm dialog; on confirm, redirects to `/sites` with a "Site deleted — Undo" toast (Undo calls `restoreSite`).
- 404 page shown for unknown id.

---

## Mapping (T-009 to T-011)

### T-009 — MapLibre GL setup `[model: opus]`

**Status:** Open
**Depends on:** T-001

Install `maplibre-gl`. Create a `<Map>` component wrapping the GL renderer. Use OpenStreetMap raster tiles (with attribution and User-Agent identifying OptiMap). Default centre: Sydney (-33.86, 151.21), zoom 5. Persist map state (centre, zoom) to localStorage so it restores on next launch.

**Important:** the OSM tile usage policy requires identifying ourselves and not blasting their servers. The tile URL config and User-Agent must be reviewed before this ticket merges. Document this in `docs/DECISIONS/0001-osm-tile-usage.md`.

**Offline graceful degrade:** if tile fetch fails, show "Basemap unavailable — check internet" overlay; map still pans/zooms and shows site markers.

**Acceptance criteria:**

- Map renders, can be panned and zoomed.
- Attribution control visible.
- State persists across app restarts.
- ADR written.
- Tile failure does not crash the app — markers still render.

---

### T-010 — Site markers on the map

**Status:** Open
**Depends on:** T-005, T-009

Build `/map` page. Loads all non-deleted sites via `listSites()`, renders as MapLibre markers. Colour by status (green=active, amber=maintenance, red=fault, grey=decommissioned, blue=planned). Cluster at 50+ visible markers. Click marker → popup with name/type/status + "View details" link.

The top bar's search input (from T-003) becomes functional here: typing searches sites and shows top 10 results in a dropdown; selecting flies the map to the site.

**Acceptance criteria:**

- 1,000 sites render in under 2 seconds.
- Cluster click zooms in.
- Popup is keyboard-accessible (focus trap, Esc to close).
- Map state syncs with URL `?lat=…&lng=…&zoom=…`.

---

### T-011 — Distance + bearing measurement tool

**Status:** Open
**Depends on:** T-009

Add a measurement tool to the map. Toolbar button activates it. Click two points → show a line, great-circle distance in km (with miles toggle), bearing in degrees true.

Uses `lib/geo.ts` from T-004. No external services.

**Acceptance criteria:**

- Distance matches `lib/geo.ts` to 4 decimal places.
- Bearing matches reference for 5 test fixtures.
- Esc clears measurement and exits the tool.
- Mobile-touch-friendly (works on a touchscreen laptop).

---

## Equipment (T-012 to T-014)

### T-012 — Equipment schema + migration

**Status:** Open
**Depends on:** T-004

Add `equipment_items` table:

- `id` (uuid, pk)
- `site_id` (fk → sites)
- `parent_id` (self-fk for hierarchy, nullable)
- `category` (text — `radio`, `antenna`, `switch`, `router`, `power`, `other`)
- `make`, `model`, `serial`, `mac`, `firmware_version`, `ip_address` (text, nullable except where category demands)
- `install_date`, `warranty_expiry` (text — ISO 8601 dates)
- `status` (text — `in_service`, `spare`, `faulty`, `rma`, `retired`)
- Antenna-only nullable: `gain_dbi`, `beamwidth_h_deg`, `beamwidth_v_deg`, `mount_height_agl_m`, `azimuth_deg`, `mechanical_downtilt_deg`, `electrical_downtilt_deg`, `polarisation`
- `notes` (text, nullable)
- audit columns

Add indexes: `(site_id, deleted_at)`, unique `(serial)` where serial is not null and not deleted (partial index).

Validation enforced at Zod boundary: `category=antenna` requires `gain_dbi`, `azimuth_deg`, and `mount_height_agl_m`.

**Acceptance criteria:**

- Migration applies cleanly.
- Unique-serial test passes (creating two with same serial fails; soft-deleting one then creating another with same serial succeeds).
- Antenna validation tested both ways (valid & invalid).

---

### T-013 — Equipment query module

**Status:** Open
**Depends on:** T-005, T-012

Create `src/features/equipment/queries.ts`. Functions: `listBySite`, `getById`, `create`, `update`, `softDelete`, `restore`, `searchBySerial`, `searchByModel`, `searchByMac`. Audit log on all mutations.

**Acceptance criteria:**

- Tests cover create antenna with required RF fields, create non-antenna without RF fields succeeds, antenna without required fields fails.
- Search functions case-insensitive.

---

### T-014 — Equipment management UI

**Status:** Open
**Depends on:** T-008, T-013

Equipment tab on the site detail page: list as a table with category, make/model, serial, status. "Add equipment" button opens a modal form. Form has a category selector that reveals antenna-specific fields when `antenna` is selected.

Inline edit and inline soft-delete on the list.

**Acceptance criteria:**

- Form validates antenna fields conditionally.
- Optimistic updates with rollback on error.
- Sortable by category, model, serial.

---

## Licences (T-015 to T-017)

### T-015 — Licences schema + migration

**Status:** Open
**Depends on:** T-004

Add `licences` table:

- `id` (uuid, pk)
- `site_id` (fk → sites, nullable for orphan/pre-allocated licences)
- `licence_id_external` (text, nullable — the regulator's licence number)
- `regulator` (text, default `ACMA`)
- `country_code` (text, default `AU`)
- `frequency_mhz` (real)
- `bandwidth_mhz` (real)
- `eirp_dbm` (real, nullable)
- `polarisation` (text, nullable — `V`, `H`, `Dual`, `Circular`)
- `expiry_date` (text — ISO 8601 date)
- `annual_fee_amount` (real)
- `annual_fee_currency` (text, default `AUD`)
- `notes` (text, nullable)
- audit columns

Index on `(deleted_at, expiry_date)` for the dashboard queries.

**Acceptance criteria:**

- Migration applies cleanly.
- Test asserts a licence can exist without `site_id`.

---

### T-016 — Licences query module + dashboard

**Status:** Open
**Depends on:** T-005, T-015

Query module functions: `list`, `getById`, `create`, `update`, `softDelete`, `restore`, `expiringWithinDays(n)`, `expired()`.

Build `/licences` dashboard with sections: Expired (red), Expiring in 7 days, Expiring in 30 days, Expiring in 90 days. CSV export button at the top.

**Acceptance criteria:**

- Dashboard renders 5,000 licences in under 200ms.
- CSV export valid in Excel and LibreOffice.
- Expired section visually distinguished.
- Audit log on all mutations.

---

### T-017 — In-app expiry notifications

**Status:** Open
**Depends on:** T-016

On every app launch, query `expiringWithinDays(30)` and `expired()`. Show a non-dismissible banner at the top of the app if any are present: "X licence(s) expire in the next 30 days; Y already expired. View." Click → `/licences`.

Add a notification badge on the licence nav item showing the count of expired-or-expiring-soon.

Snooze: user can dismiss the banner for 24 hours via a "Remind me tomorrow" button. Dismissal stored in `meta` table.

**Acceptance criteria:**

- Banner appears on launch when applicable.
- Snooze persists for 24 hours then re-appears.
- Badge count reflects live state (updates when a licence is edited).

---

## Cross-cutting (T-018 to T-020)

### T-018 — Audit log viewer

**Status:** Open
**Depends on:** T-005, T-013, T-016

The `audit_log` table is being written to from T-005 onwards. This ticket builds the _viewer_: `/settings/audit`. Lists recent entries newest-first, paginated. Filters: entity type, action, date range.

Each entry shows: timestamp, actor (always "you" for now since single-user), entity type + id, action, before/after diff (rendered as a pretty diff for the JSON).

**Acceptance criteria:**

- 10,000 audit entries paginate cleanly.
- Diff view readable for a typical Site update.
- Audit entries are immutable — no edit / delete UI.

---

### T-019 — CSV import for sites `[model: opus]`

**Status:** Open
**Depends on:** T-005, T-007

Build the CSV import dialog reachable from `/sites` and from the welcome screen. Drag-and-drop a CSV. Show a column mapper: "Your CSV's `Site Name` column → maps to → OptiMap's `name` field." Preview the first 10 rows post-mapping. Show validation errors per-row before import. On import, write an audit log entry per row created.

Re-import is idempotent if the user provides an `external_id` column (we store it as a meta field for now; a real `external_id` column on sites can be a follow-up).

**Acceptance criteria:**

- 1,000-row CSV processes in under 10 seconds.
- Per-row errors surfaced clearly; user can fix and re-upload.
- Successful import writes one audit entry per site created.
- Cancelling mid-import does not leave partial state.

---

### T-020 — Backup, restore, and release pipeline `[model: opus]`

**Status:** Open
**Depends on:** T-001, T-002

Two-part ticket.

**Part A — Backup & Restore.**
"Backup" button in Settings: writes a timestamped `optimap-backup-YYYY-MM-DD-HHMM.optimap` file (a zip containing `optimap.db` + `attachments/`). User chooses save location. "Restore" reads one back: shows a "this will replace your current data" warning and requires explicit confirm.

Add a "Backup reminder" setting (off / weekly / monthly). When due, show a non-blocking banner suggesting backup.

**Part B — Release pipeline.**
GitHub Actions workflow on tag push (`v*`):

- Builds installers for Windows (.msi), macOS (.dmg, universal), Linux (.AppImage).
- Generates SHA256 sums.
- Creates a draft GitHub Release with all artefacts attached.
- Code signing: configured but optional; if signing secrets are present, sign the macOS and Windows builds; otherwise produce unsigned (with a warning in the release notes).

**Acceptance criteria:**

- Backup → wipe DB → Restore → all data is back, byte-equivalent.
- Backup file is a valid zip openable in any unzip tool.
- Restore refuses to load a corrupted backup (with a clear error).
- Tagging `v0.1.0` in CI produces three platform installers as artefacts.
- A fresh install on each platform launches the app and reaches the welcome screen.

---

## How to use this file

1. **Pick the next `Open` ticket** whose dependencies are all `Done`.
2. **Move it to `In progress`** in this file (commit the change separately, before starting work).
3. **Branch:** `t-NNN-short-description`.
4. **When done, open a PR** referencing the ticket ID in the title.
5. **On merge, mark `Done`** and add the PR link.

When the queue empties, the next batch (T-021 onwards) is generated based on what we've learned. Don't generate them in advance — scope earned, not assumed.

## Backlog (not yet ticketed)

- Document attachments (PDFs/photos linked to sites and licences) — Phase 1.x.
- Map picker integration with site form — file follow-up after T-009.
- Auto-update via Tauri updater plugin — Phase 1.x.
- Code-signing certificates and signed releases — pre-1.0.
- E2E test suite (Playwright targeting the running Tauri app) — first scenarios: first-launch, create site, view on map.
- Settings: theme (light/dark/system), units (metric/imperial), default region.
- Trash view and 30-day auto-purge of soft-deleted records.
