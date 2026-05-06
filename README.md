# OptiMap

> Open-source geospatial platform for small telecom operators.

OptiMap helps regional ISPs, WISPs, and fixed-wireless carriers manage sites, equipment, and spectrum licences on a single map-first interface — replacing the spreadsheet + Google Earth + email stack that small operators rely on today.

**Status:** pre-alpha, in active development. Not yet usable.

## Why

Big telcos spend $100k+/year on ArcGIS, MapInfo, and dedicated GIS staff. Small operators can't justify that — and free tools like QGIS or Google Earth aren't built for telecom workflows. OptiMap fills the gap with a focused, free, self-hostable platform that does a few things well:

- See every site on a map, by status.
- Track equipment, antennas, and serial numbers per site.
- Track spectrum licences and never miss a renewal.
- Search and filter by location, region, or attribute.

For the longer-term vision (microwave link planning, lease management, project workflow, cost tracking), see [`docs/MVP-SCOPE.md`](docs/MVP-SCOPE.md).

## Tech stack

- Next.js 15 (App Router) + TypeScript (strict)
- tRPC for type-safe APIs
- Drizzle ORM
- PostgreSQL 16 + PostGIS 3
- MapLibre GL JS for mapping
- Tailwind CSS

## Getting started

Requirements:
- Node.js 20+
- pnpm 9+
- Docker (for local Postgres + Redis)

```bash
git clone https://github.com/<your-username>/optimap.git
cd optimap
pnpm install
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Visit http://localhost:3000.

## Contributing

OptiMap is being developed solo with AI assistance as a research project. Contributions are welcome but the bar is high on code quality and test coverage. Read `CLAUDE.md` to understand how the codebase is structured and the conventions in use.

## Licence

AGPLv3. See [`LICENSE`](LICENSE).

If you self-host this for internal use at your company, you're fine. If you offer it as a hosted service to others, the AGPL requires you to share your modifications under the same licence.

## Acknowledgements

- [MapLibre GL JS](https://maplibre.org/) — the open-source map renderer.
- [OpenStreetMap](https://www.openstreetmap.org/) contributors for the basemap.
- ITU-R recommendations P.530, P.838, P.676 for the propagation models we'll use in Phase 2.
- The [`itur`](https://github.com/inigodelportillo/ITU-Rpy) Python library, which we plan to integrate when the link-budget module lands.
