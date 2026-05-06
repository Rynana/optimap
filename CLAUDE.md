# CLAUDE.md — OptiMap

This file is read by Claude Code at the start of every session. Keep it updated as decisions change.

## Mission

OptiMap is an open-source, free, **cross-platform desktop application** for **small telecom operators** (regional ISPs, WISPs, fixed-wireless carriers). It replaces the spreadsheet + Google Earth + email stack that small operators rely on today, with a single map-first tool that runs locally on the user's machine.

This codebase is being developed solo + AI-assisted as a deliberate research exercise in AI-driven software construction. Ship quality matters; volume matters less. We move slowly and correctly.

## Locked decisions (do not change without discussion)

- **Form factor:** desktop app (Tauri 2). No web app, no SaaS, no servers. The user installs OptiMap on their machine and that's where their data lives.
- **Lead persona:** small telco operations engineer (5–50 staff). Councils and digital-farm users come later.
- **Stack:**
  - **Shell:** Tauri 2 (Rust)
  - **Frontend:** React 18 + TypeScript strict + Vite + Tailwind CSS
  - **Database:** SQLite via `tauri-plugin-sql`
  - **ORM / migrations:** Drizzle ORM (SQLite dialect)
  - **Mapping:** MapLibre GL JS
  - **State:** TanStack Query for async, Zustand or React Context for app state
  - **Forms:** React Hook Form + Zod
- **Spatial strategy:** plain SQLite + lat/lng REAL columns + Haversine in TypeScript for distance/bearing/within-radius. **No SpatiaLite** in MVP — adds Rust extension-loading complexity for queries that perform fine with bounding-box pre-filter at <50k sites. Revisit if data volumes ever justify it.
- **Licence:** GPLv3 (default; AGPL adds nothing for a non-networked desktop app — owner can override).
- **Region default:** Australian standards (ACMA, AUD, metric). Data model is region-agnostic.
- **No paid services:** no online-required auth, no telemetry, no analytics, no paid tiles. Online basemap (OSM) is used by default but the app is fully usable with no internet once installed.
- **Distribution:** GitHub Releases; signed installers for Windows, macOS, Linux (`.msi`, `.dmg`, `.AppImage`). Code signing certificates deferred until close to v1.0 release.

## What is in MVP scope

See `docs/MVP-SCOPE.md`. The four modules are: Sites, Equipment, Mapping, Licence tracking. Anything else is out of MVP.

If a ticket or change feels like it pulls in a non-MVP module (towers, leases, subscribers, projects, costs, vendor catalogue, microwave link budget, multi-user, cloud sync), **stop and flag it**.

## Repo layout

```
optimap/
├── CLAUDE.md                  # this file
├── README.md                  # public-facing project intro
├── LICENSE                    # GPLv3
├── docs/
│   ├── MVP-SCOPE.md           # locked v1 scope
│   ├── TICKETS-001-to-020.md  # current ticket queue
│   ├── ARCHITECTURE.md        # written when scaffolding lands
│   └── DECISIONS/             # ADRs go here, one file per decision
├── src/                       # React frontend
│   ├── main.tsx               # entry
│   ├── App.tsx
│   ├── routes/                # page-level components
│   ├── components/            # shared UI components
│   ├── features/
│   │   ├── sites/
│   │   ├── equipment/
│   │   ├── licences/
│   │   └── map/
│   ├── db/                    # Drizzle schema + query helpers
│   │   ├── schema.ts
│   │   ├── client.ts          # tauri-plugin-sql adapter
│   │   └── migrations/        # generated SQL migrations
│   ├── lib/                   # utilities (geo math, formatting, etc.)
│   └── types/
├── src-tauri/                 # Tauri Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   └── lib.rs
│   ├── tauri.conf.json
│   ├── capabilities/          # Tauri permissions config
│   └── Cargo.toml
├── public/                    # static assets bundled with the app
├── package.json               # pnpm workspace root
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── drizzle.config.ts
├── .gitattributes             # enforces LF line endings
└── .github/workflows/         # CI: build + release
```

Use **pnpm** as the package manager. Do not use npm or yarn.

## Local dev

```bash
# from repo root
pnpm install
pnpm tauri dev                  # launches the desktop app in dev mode
```

Other commands:
```bash
pnpm db:generate                # generate a migration from the Drizzle schema
pnpm db:check                   # verify migrations are consistent
pnpm test                       # vitest unit tests
pnpm test:e2e                   # playwright (drives the running Tauri app)
pnpm lint                       # eslint
pnpm typecheck                  # tsc --noEmit
pnpm tauri build                # produce a release installer for the current OS
```

If any of these aren't yet wired up because we're early, that's a ticket — wire it up rather than skipping it.

### Where the data lives at runtime

The SQLite database lives in the OS-standard app-data directory:

- **Windows:** `%APPDATA%\com.optimap.app\optimap.db`
- **macOS:** `~/Library/Application Support/com.optimap.app/optimap.db`
- **Linux:** `~/.local/share/com.optimap.app/optimap.db`

Attachments (PDFs, photos) live alongside in `attachments/`. The bundle ID `com.optimap.app` is canonical — do not change it without an explicit migration plan.

## Conventions

### TypeScript
- `strict: true`. No `any` without an inline `// eslint-disable-next-line` and a comment explaining why.
- Prefer `type` over `interface` unless extending.
- Use `zod` for runtime validation at trust boundaries (file imports, third-party API responses, user-entered data).

### Naming
- Files: `kebab-case.ts` for modules, `PascalCase.tsx` for React components.
- DB tables: `snake_case`, plural (`sites`, `equipment_items`).
- DB columns: `snake_case`.
- TS variables/functions: `camelCase`. Types/components: `PascalCase`.

### Commits
- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- Reference the ticket: `feat(sites): add site detail page (T-008)`.
- Atomic commits. No "wip" or "stuff" or "more changes".

### Branches
- `main` is always installable.
- Feature branches: `t-NNN-short-description` (e.g., `t-004-sites-schema`).
- One ticket per branch; one PR per branch.

### PRs
- Title: same as commit subject.
- Description: link to the ticket, list AC met, list AC explicitly *not* met (with reason).
- All checks green before merge.

### Tests
- Every database query helper has at least one happy-path test.
- Every Drizzle schema change has a migration test (apply forward + rollback if reversible).
- E2E tests cover three critical flows: first-launch experience, create a site, view sites on the map.
- Coverage target: 70% on `src/db` and `src/features/*/queries.ts`, 50% overall. Don't chase coverage for its own sake.

## Desktop-specific concerns (read this before architecting any feature)

Because OptiMap is a desktop app, the constraints are different from a web app:

1. **Data lives on the user's hard drive.** If their disk dies and they have no backup, their data is gone. Therefore: backup/export must be a first-class feature (T-020), and the user must always be able to find their data file.
2. **No auth, no users table, no `tenant_id`.** The OS user is the user. We do not multi-tenant.
3. **Offline by default.** The app must launch and be fully usable with no internet. Only the basemap tiles and address-geocoding rely on network — both must degrade gracefully.
4. **First-launch experience matters.** No empty white screen. T-003 covers this.
5. **Updates ship via Tauri's updater.** `tauri.conf.json` points at a public update manifest. Code-signing is deferred but the architecture must support it from day 1.
6. **OS conventions matter.** macOS users expect ⌘ shortcuts; Windows users expect Ctrl. Right-click menus, keyboard shortcuts, window controls — let the platform breathe through.
7. **File-system access is privileged.** Don't ask for `fs:default` if you only need `fs:scope` to one directory. Capability files are explicit and audited.
8. **No browser globals.** `window.localStorage` works (Tauri ships a webview), but persistent app state belongs in SQLite. Use storage only for ephemeral UI state if at all.

## How to handle ambiguity

When a ticket is unclear or you discover a real ambiguity mid-task:

1. **Don't guess.** Stop and surface the question.
2. **Pick one.** Phrase it as: "I see two reasonable ways to do this: A and B. I'm planning A unless you say otherwise. Reasoning: …"
3. **Document the answer.** If the decision is non-trivial, write an ADR in `docs/DECISIONS/` (`NNNN-short-name.md`).

When in doubt about scope: prefer the smaller, simpler implementation.

## What to NEVER do without explicit approval

- Add a new package dependency (especially anything > 50KB or anything that requires a paid API).
- Run a destructive migration (drop column, drop table) on existing tables.
- Change the bundle ID, app data directory, or any path users' data depends on.
- Introduce a network-required feature in MVP. Online-optional is fine; online-required is not.
- Hard-code secrets or credentials, including in tests. Use env vars and a documented schema.
- Add a feature outside the MVP scope (see `docs/MVP-SCOPE.md`).
- Add a Rust dependency without confirming the licence is compatible with GPLv3.
- Push directly to `main`. All work via PR.

## Definition of done (any ticket)

A ticket is done when ALL are true:
1. Code matches the acceptance criteria.
2. Tests are written and passing locally.
3. `pnpm lint`, `pnpm typecheck`, `pnpm test` all pass.
4. `pnpm tauri dev` launches the app cleanly and the new feature behaves as specified.
5. The PR description explains *what* and *why*.
6. Docs updated if user-visible (README, MVP-SCOPE, ADR).
7. The ticket file is updated with status `Done` and a link to the PR.

## Model selection: when to ask for a stronger or cheaper model

This repo runs on a Pro/Max subscription with limited Opus allocation. Default to working with whatever model the user started the session on. **Don't silently struggle on the wrong model, and don't burn Opus tokens on tasks Sonnet would handle cleanly.**

If the current task is a poor fit for the current model, **stop and surface it before continuing**. Phrase it as a clear recommendation the user can accept or override.

### When to recommend escalating to a stronger model (e.g., Sonnet → Opus)

Flag and stop if any of the following are true:

- You've attempted the same fix more than once and the problem persists in the same way.
- The task involves designing or debugging across three or more layers simultaneously (e.g., React + IPC + Rust + SQLite).
- The task requires weighing multiple architectural trade-offs with no obvious single right answer.
- You're about to write code in a domain where a subtle wrong answer would compile and run but be incorrect (Tauri capabilities, async Rust, SQL migrations on existing data, cryptographic code).
- You notice yourself producing speculative or "best guess" code rather than reasoned code.
- The ticket description is vague enough that you'd need to make 3+ design decisions to proceed.

### When to recommend de-escalating to a cheaper model (e.g., Opus → Sonnet)

Flag if:

- The task turns out to be straightforward boilerplate, scaffolding, or a single-file edit with a clear specification.
- You're being asked to summarise, explain, or read existing code.
- The task is "apply this well-defined pattern to a new entity" (e.g., copying the sites query module pattern to equipment).

### How to phrase the recommendation

Use this format exactly:

> **Model check:** I'd recommend switching to [model] before I continue.
> **Reason:** [one sentence — what about this task suggests the other model is a better fit]
> **What I'll do:** wait for your call. Reply "continue" to proceed on the current model, or switch with `/model` and re-send.

Don't suggest model switches more than once per task. If the user says continue, continue and don't bring it up again for that task.

### Optional: ticket-level hints

Tickets in `docs/TICKETS-001-to-020.md` may carry a `[model: opus]` or `[model: sonnet]` tag in the title. If so, confirm the active model matches before starting; surface a model-check message if it doesn't. Tickets without a tag default to Sonnet.

## Working agreement with the AI

Claude Code operates this repo on the human's behalf. The human reviews every PR. To make that review fast and trust high:

- **Small PRs.** If a PR is over ~400 lines of net change, split it.
- **No "while I'm here" refactors.** If you spot tech debt outside the ticket, file a ticket, don't fix it in-flight.
- **Explain your reasoning** in PR descriptions and inline comments where logic isn't obvious.
- **When tests don't pass and you can't see why,** stop and ask. Don't disable the test or comment it out.
- **When a dependency surprises you,** open an issue describing the symptom rather than working around it silently.
- **Rust code is reviewed slower than TS** by the human. Keep `src-tauri/` code minimal — push logic to TypeScript wherever reasonable.

## Useful files to consult

- `docs/MVP-SCOPE.md` — what's in/out for v1.
- `docs/TICKETS-001-to-020.md` — the current ticket queue. Pick the next unblocked ticket.
- `docs/DECISIONS/` — ADRs explaining why things are the way they are.

## Glossary

- **ACMA:** Australian Communications and Media Authority — the AU spectrum regulator.
- **MapLibre GL:** open-source vector map renderer (forked from Mapbox GL pre-licence-change).
- **Site:** a physical location in OptiMap's data model (tower, rooftop, hut, exchange, etc.).
- **Tauri:** Rust-based framework for building desktop apps with a web frontend. Smaller and faster than Electron.
- **Haversine:** the standard great-circle distance formula we use in JS for site-to-site distance.
