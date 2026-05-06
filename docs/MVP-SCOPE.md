# MVP Scope (v1)

**Status:** Locked. Changes require explicit owner approval and a date-stamped entry in the change log at the bottom.

## Form factor

**Desktop application** built with Tauri 2. Distributed as native installers for Windows, macOS, and Linux. Single-user. Data lives in the OS app-data directory on the user's machine.

## Lead persona

Small telecom operations engineer at a regional ISP, WISP, or fixed-wireless carrier (5–50 staff). Currently using Excel + Google Earth + email. Wants a single tool to see what they own, where it is, and when their licences expire — and they want it to run on their laptop without a server.

## Success criteria for MVP

The MVP is "done" when a user can do all of the following on a fresh install:

1. **Install OptiMap and create their first site within 5 minutes.**
2. **Import 100+ existing sites from a CSV** with sensible error reporting.
3. **See every site on a map**, colour-coded by status, click through to detail.
4. **Add equipment to a site** (radios, antennas, switches, routers) with make/model/serial.
5. **Record spectrum licences** with expiry dates and fees.
6. **See an in-app warning when a licence is 30 days from expiry**, on every launch and persistently in the licence dashboard.
7. **Search the network** by site name, address, or proximity.
8. **Export a list of sites or licences to CSV** for finance or compliance use.
9. **Back up the entire dataset to a single file** they can copy to a USB stick or cloud-sync folder.
10. **Restore from backup** on the same or another machine.

## Modules in MVP

### 1. Sites
- Create, edit, soft-delete, list, view sites.
- Fields: name, type, lat/lng, ground elevation, address, status, notes.
- Bulk import from CSV.
- Soft delete with audit log.

### 2. Equipment
- Hierarchical equipment register attached to sites.
- Generic equipment fields: make, model, serial, MAC, IP, firmware, install date, warranty expiry, vendor.
- Antenna sub-fields where applicable: gain, beamwidth (H/V), mount height AGL, azimuth, downtilt (mech/elec), polarisation.
- Status: in-service, spare, faulty, RMA, retired.
- Search by serial / model / MAC.

### 3. Mapping
- Interactive map (MapLibre GL JS, OpenStreetMap raster tiles).
- Site markers colour-coded by status; click for popup; click through for detail.
- Search bar: site-name search (local) and address geocode (online via Nominatim).
- Distance + bearing measurement tool.
- Map state persists across launches.
- Graceful behaviour when offline: cached tiles where possible; "no internet — basemap unavailable" message otherwise.

### 4. Licence tracking
- Create, edit, soft-delete licences linked to a site.
- Fields: licence ID, regulator (ACMA default), frequency, bandwidth, EIRP, polarisation, expiry, annual fee.
- Dashboard view: expiring in 7/30/60/90 days, plus already-expired.
- In-app notification at 30 days (and on every launch while overdue).
- CSV export for finance.

### Cross-cutting (in MVP)

- **Audit log:** every create/update/delete recorded with timestamp, before/after JSON. Useful for "what did I change yesterday" recovery.
- **Soft delete:** `deleted_at` column on every entity; lists hide soft-deleted by default; `Trash` view exposes them with restore.
- **Backup & restore:** "Backup" exports the SQLite DB and any attachments to a single timestamped `.optimap` archive (zip). "Restore" reads one back. Critical for a desktop app.
- **First-launch experience:** welcome screen with three options: "Start with a sample dataset", "Import from CSV", "Start empty".
- **Settings:** show data directory path with "Reveal in Finder/Explorer" button. Toggle for online basemap on/off. Backup reminder cadence.

## Explicitly OUT of MVP

| Module | Status | Why |
|---|---|---|
| Microwave link planning + budget | Phase 2 | Single biggest scope reduction. Defers ITU-R P.530 work and a Python sidecar service. |
| Tower & structure management | Phase 2 | Useful but additive. |
| Lease & property management | Phase 2 | Useful but additive. |
| Subscriber tracking | Phase 3 | Different module shape. |
| Project & change management | Phase 3 | Workflow tool — separate concern. |
| Cost / financial tracking | Phase 3 | Build after subscribers and projects exist. |
| Vendor equipment catalogue | Phase 3 | Manual entry in MVP. |
| Mobile / field app | Phase 4 | Desktop only at v1. |
| Multi-user / cloud sync | Phase 4 | Single-user / single-machine in MVP. Data sharing via backup file or shared filesystem only. |
| Auto-update via updater | Phase 1.x | Architecture supports it; UX work deferred to a polish ticket. |
| Code-signing certificates | Pre-1.0 | Builds will warn unsigned until certs are obtained. |
| Document/PDF attachments on entities | Phase 1.x | Bumped to immediately-after-MVP if not in scope per ticket. |
| Reporting / scheduled exports | Post-MVP | CSV export covers core need. |

## Constraints

- **Free.** No paid SaaS dependencies anywhere. (OpenStreetMap tiles + Nominatim geocoder are free with attribution and usage policies; we comply.)
- **Open source.** Public GitHub repo from day 1 under GPLv3.
- **Offline-capable.** App must launch and be usable without internet. Online features (basemap, geocoder) degrade gracefully.
- **Region-agnostic data model.** AU/ACMA/AUD is the default profile; nothing in the schema or code should make adding NZ/UK/US a rewrite.
- **Single-user.** No `tenant_id`, no `users` table, no auth in MVP. The OS user is the user.
- **No telemetry.** No phone-home, no analytics, no crash reporting that exfiltrates data without consent. (Crash dumps stay local; an opt-in "send to GitHub Issues" flow is acceptable post-MVP.)

## Phased timeline (rough)

Solo + AI-assisted, part-time. Multiply any "normal" estimate by 2–3.

- **Months 1–2:** foundation (T-001 to T-003). Tauri scaffold, DB layer, app shell.
- **Months 3–4:** Sites + Mapping (T-004 to T-011). First demo build lands.
- **Months 5–6:** Equipment + Licences (T-012 to T-017). Closed alpha to 3 friendly users.
- **Month 7:** cross-cutting + polish (T-018 to T-020). Public alpha installer on GitHub Releases.

Phase 2 (microwave link planning) starts after public alpha lands. Don't pull it forward.

## Change log

| Date | Change | Approved by |
|---|---|---|
| 2026-05-06 | Initial scope locked (web-app form factor) | Owner |
| 2026-05-06 | **Pivot to desktop app** (Tauri 2). Removed multi-tenant, auth, server-side concerns. Added backup/restore as MVP feature. | Owner |
