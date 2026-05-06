# MVP Scope (v1)

**Status:** Locked. Changes require explicit owner approval and a date-stamped entry in the change log at the bottom.

## Lead persona

Small telecom operations manager / engineer at a regional ISP, WISP, or fixed-wireless carrier (5–50 staff). Currently using Excel + Google Earth + email. Wants a single tool to see what they own, where it is, and when their licences expire.

## Success criteria for MVP

The MVP is "done" when a user can do all of the following without leaving the app:

1. **Sign up and create their first site within 10 minutes.**
2. **Bulk-import 100+ existing sites from a CSV** with sensible error reporting.
3. **See every site on a map**, colour-coded by status, and click through to detail.
4. **Add equipment to a site** (radios, antennas, switches, routers) with make/model/serial.
5. **Record spectrum licences** with expiry dates, fees, and PDF attachments.
6. **Receive an in-app alert when a licence is 30 days from expiry.**
7. **Search the network** by site name, address, or proximity.
8. **Export a list of sites or licences to CSV** for finance or compliance use.

## Modules in MVP

### 1. Sites
- Create, edit, delete, list, view sites.
- Fields: name, type, lat/lng, ground elevation, address, status, notes.
- Document attachments (one or more PDFs/images per site).
- Bulk import from CSV.
- Soft delete with audit log.

### 2. Equipment
- Hierarchical equipment register attached to sites.
- Generic equipment fields: make, model, serial, MAC, IP, firmware, install date, warranty expiry, vendor.
- Antenna sub-fields where applicable: gain, beamwidth, mount height AGL, azimuth, downtilt.
- Status: in-service, spare, faulty, RMA, retired.
- Search by serial / model / MAC.

### 3. Mapping
- Interactive map (MapLibre GL JS, OpenStreetMap raster tiles).
- Site markers colour-coded by status; click to see popup; click again for detail page.
- Search bar: address geocode (Nominatim free tier) and site-name search.
- Distance + bearing measurement tool.
- Fly-to from site list.
- Map state persists in URL query string (so links are shareable).

### 4. Licence tracking
- Create, edit, delete licences linked to a site (and optionally a future link).
- Fields: licence ID, regulator (ACMA default), frequency, bandwidth, EIRP, polarisation, expiry, annual fee, PDF attachment.
- Dashboard view: expiring in 7/30/60/90 days.
- In-app notification at 30 days.
- CSV export for finance.

### Cross-cutting (in MVP)

- **Auth:** email + password via `better-auth`. MFA toggle for owners.
- **Multi-tenant:** every record carries `tenant_id`; row-level isolation enforced at API layer.
- **Roles:** Owner, Admin, Editor, Viewer (4-tier; simpler than the proposed 5).
- **Audit log:** every create/update/delete recorded with user, timestamp, before/after JSON.
- **Soft delete:** `deleted_at` column on every entity; lists hide soft-deleted by default.

## Explicitly OUT of MVP

These are real product requirements but won't be built in v1:

| Module | Status | Why |
|---|---|---|
| Microwave link planning + budget | Phase 2 | Single biggest scope reduction. Defers ITU-R P.530 work and Python service. |
| Tower & structure management | Phase 2 | Useful but additive; doesn't unlock first usefulness. |
| Lease & property management | Phase 2 | Useful but additive. |
| Subscriber tracking | Phase 3 | Different module shape; integrate with existing CRMs instead. |
| Project & change management | Phase 3 | Workflow tool — separate concern. |
| Cost / financial tracking | Phase 3 | Build after subscribers and projects exist to attach to. |
| Vendor equipment catalogue | Phase 3 | Manual entry in MVP; catalogue is a follow-on. |
| Mobile field app | Phase 3 | Web responsive only in MVP. |
| Public REST API + webhooks | Phase 3 | tRPC only in MVP. |
| Reporting / scheduled emails | Post-MVP | CSV export covers the core need in v1. |
| SSO (SAML, OIDC) | When asked | Email/password is enough until a customer needs it. |
| SOC 2 / compliance certifications | When asked | Open-source-self-host doesn't require it. |

## Constraints

- **Free.** No paid SaaS dependencies in the default install. (OpenStreetMap tiles, Nominatim geocoder, free Sentry tier optional.)
- **Open source.** Public GitHub repo from day 1 under AGPLv3.
- **Self-hostable.** Single `docker compose up` should work for local dev. Production deployment guide (Hetzner, Fly.io) lands by end of MVP.
- **Region-agnostic data model.** AU/ACMA is the default profile; nothing in the schema or code should make adding NZ/UK/US regulators a rewrite.
- **Multi-tenant from day 1.** Even though the lead persona is single-tenant, the data model assumes multi-tenant because it's much easier to design in than to retrofit.

## Phased timeline (rough)

This is solo + AI-assisted, part-time. Multiply any "normal" estimate by 2–3.

- **Months 1–2:** foundation (T-001 to T-005). Repo, DB, auth, tRPC, tenant scaffolding.
- **Months 3–4:** Sites + Mapping (T-006 to T-014). The first usable demo lives here.
- **Months 5–6:** Equipment + Licences (T-015 to T-020). Closed alpha to 3 friendly users.
- **Months 7–8:** polish, docs, deployment guide, public alpha.

Phase 2 (microwave link planning) starts after public alpha lands. Don't pull it forward.

## Change log

| Date | Change | Approved by |
|---|---|---|
| 2026-05-06 | Initial scope locked | Owner |
