# CLAUDE.md — OptiMap

This file is read by Claude Code at the start of every session. Keep it updated as decisions change.

## Mission

OptiMap is an open-source, free-tier-friendly geospatial platform for **small telecom operators** (regional ISPs, WISPs, fixed-wireless carriers). It replaces the spreadsheet + Google Earth + email stack with a single map-first tool.

This codebase is being developed solo + AI-assisted as a deliberate research exercise in AI-driven software construction. Ship quality matters; volume matters less. We will move slowly and correctly.

## Locked decisions (do not change without discussion)

- **Lead persona:** small telco operations (5–50 staff). Councils and digital-farm users come later.
- **Stack:** Next.js 15 (App Router) + TypeScript strict + tRPC + Drizzle ORM + PostgreSQL 16 + PostGIS 3 + MapLibre GL JS + Tailwind. Single TypeScript codebase, monolith. No microservices in MVP.
- **Workers:** BullMQ + Redis (added when first background job needs it; not before).
- **Auth:** `better-auth` with email + password to start. Add OAuth providers when there's a real user asking.
- **Database:** PostgreSQL 16 with PostGIS 3. Local dev via Docker Compose. Production deploy target: Hetzner CX22 or Fly.io.
- **Licence:** AGPLv3 (decision pending owner confirmation; default AGPLv3).
- **Hosting choice:** open-source means **anyone can self-host**. The "official" hosted instance is a future concern.
- **Region default:** Australian standards (ACMA, AUD, metric). Data model is region-agnostic.
- **No paid services in MVP:** no AWS, no Mapbox paid tiles, no Sentry paid plan, no SOC 2 work yet.

## What is in MVP scope

See `docs/MVP-SCOPE.md`. The four modules are: Sites, Equipment, Mapping, Licence tracking. Anything else is out of MVP.

If a ticket or change feels like it pulls in a non-MVP module (towers, leases, subscribers, projects, costs, vendor catalogue, microwave link budget), **stop and flag it**.

## Repo layout

```
optimap/
├── CLAUDE.md                  # this file
├── README.md                  # public-facing project intro
├── LICENSE                    # AGPLv3 (or chosen)
├── docs/
│   ├── MVP-SCOPE.md           # locked v1 scope
│   ├── TICKETS-001-to-020.md  # current ticket queue
│   ├── ARCHITECTURE.md        # to be written when scaffolding lands
│   └── DECISIONS/             # ADRs go here, one file per decision
├── apps/
│   └── web/                   # Next.js 15 app
├── packages/
│   ├── db/                    # Drizzle schema + migrations
│   ├── api/                   # tRPC routers
│   └── ui/                    # shared React components (later, only if reuse emerges)
├── docker-compose.yml         # Postgres + PostGIS + Redis for local dev
├── .github/workflows/         # CI
└── package.json               # pnpm workspace root
```

Use **pnpm** as the package manager. Do not use npm or yarn.

## Local dev

```bash
# from repo root
pnpm install
docker compose up -d            # postgres + postgis + redis
pnpm db:migrate
pnpm db:seed                    # loads sample sites
pnpm dev                        # next dev on :3000
```

Test commands:
```bash
pnpm test                       # vitest unit
pnpm test:e2e                   # playwright
pnpm lint                       # eslint
pnpm typecheck                  # tsc --noEmit
```

If any of these aren't yet wired up because we're early, that's a ticket — wire it up rather than skipping it.

## Conventions

### TypeScript
- `strict: true`. No `any` without an inline `// eslint-disable-next-line` and a comment explaining why.
- Prefer `type` over `interface` unless extending.
- Use `zod` for runtime validation at trust boundaries (API inputs, env vars, third-party data).

### Naming
- Files: `kebab-case.ts` for modules, `PascalCase.tsx` for React components.
- DB tables: `snake_case`, plural (`sites`, `equipment_items`).
- DB columns: `snake_case`.
- TS variables/functions: `camelCase`. Types/components: `PascalCase`.

### Commits
- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- Reference the ticket: `feat(sites): add site detail page (T-010)`.
- Atomic commits. No "wip" or "stuff" or "more changes".

### Branches
- `main` is always deployable.
- Feature branches: `t-NNN-short-description` (e.g., `t-006-site-schema`).
- One ticket per branch; one PR per branch.

### PRs
- Title: same as commit subject.
- Description: link to the ticket, list AC met, list AC explicitly *not* met (with reason).
- All checks green before merge.

### Tests
- Every tRPC router has at least one happy-path and one auth-fail test.
- Every Drizzle schema change has a migration test (apply + rollback).
- E2E tests cover the three critical user flows: signup → first site, edit a site, view a site on the map.
- Coverage target: 70% lines on `packages/api`, 50% on `apps/web`. Don't chase coverage for its own sake.

## How to handle ambiguity

When the ticket is unclear or you discover a real ambiguity mid-task:

1. **Don't guess.** Stop and surface the question.
2. **Pick one.** Phrase it as: "I see two reasonable ways to do this: A and B. I'm planning A unless you say otherwise. Reasoning: …"
3. **Document the answer.** If the decision is non-trivial, write an ADR in `docs/DECISIONS/` (`NNNN-short-name.md`).

When in doubt about scope: prefer the smaller, simpler implementation. We add complexity when forced to, not before.

## What to NEVER do without explicit approval

- Add a new package dependency (especially anything > 50KB or anything that requires a paid API).
- Run a destructive migration (drop column, drop table) on existing tables.
- Hard-code secrets or credentials, including in tests. Use `.env.local` and a documented schema.
- Add a feature outside the MVP scope (see `docs/MVP-SCOPE.md`).
- Introduce a new top-level architectural pattern (microservice, message bus, GraphQL alongside tRPC, alternate ORM).
- Open-source-license incompatible code (no copy-paste from MIT-incompatible sources into an AGPL project).
- Push directly to `main`. All work via PR.

## Definition of done (any ticket)

A ticket is done when ALL are true:
1. Code matches the acceptance criteria.
2. Tests are written and passing locally.
3. `pnpm lint`, `pnpm typecheck`, `pnpm test` all pass.
4. The PR description explains *what* and *why* (not just what — git already knows).
5. Docs updated if user-visible (README, MVP-SCOPE, ADR).
6. The ticket file is updated with status `Done` and a link to the PR.

## Working agreement with the AI

You (Claude Code) operate this repo on the human's behalf. The human reviews every PR. To make that review fast and trust high:

- **Small PRs.** If a PR is over ~400 lines of net change, split it.
- **No "while I'm here" refactors.** If you spot tech debt outside the ticket, file a ticket, don't fix it in-flight.
- **Explain your reasoning** in the PR description and inline code comments where logic isn't obvious. Future-you will thank present-you.
- **When tests don't pass and you can't see why,** stop and ask. Don't disable the test or comment it out.
- **When a dependency is broken or surprising,** open an issue describing the symptom rather than working around it silently.

## Useful files to consult

- `docs/MVP-SCOPE.md` — what's in/out for v1.
- `docs/TICKETS-001-to-020.md` — the current ticket queue. Pick the next unblocked ticket.
- `docs/DECISIONS/` — ADRs explaining why things are the way they are.

## Glossary

- **ACMA:** Australian Communications and Media Authority — the AU spectrum regulator.
- **PostGIS:** spatial extension for PostgreSQL, the heart of OptiMap's data layer.
- **MapLibre GL:** open-source vector map renderer (forked from Mapbox GL pre-licence-change).
- **Site:** a physical location in OptiMap's data model (tower, rooftop, hut, exchange, etc.).
- **Tenant:** a customer organisation. Multi-tenant from day 1; row-level isolation via `tenant_id`.
