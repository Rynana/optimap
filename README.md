# OptiMap

> Open-source desktop application for small telecom operators.

OptiMap helps regional ISPs, WISPs, and fixed-wireless carriers manage sites, equipment, and spectrum licences on a single map-first interface — replacing the spreadsheet + Google Earth + email stack that small operators rely on today.

OptiMap is a **desktop app**, not a cloud service. Your data lives on your machine. No accounts, no subscriptions, no server fees. Free and open source under GPLv3.

**Status:** pre-alpha, in active development. Not yet usable.

## Why a desktop app?

- **Your data, your machine.** No SaaS lock-in, no hosting bill, no privacy worries.
- **Works offline.** Plan a site visit from the back of a tower paddock with no signal.
- **Free forever.** Download the installer and run it.
- **Open source.** Audit the code, fix bugs, fork it.

## Features (planned for v1)

- See every site on a map, by status.
- Track equipment, antennas, and serial numbers per site.
- Track spectrum licences and never miss a renewal.
- Search by location, region, or attribute.
- Backup and restore your data with a single click.

For the longer-term vision (microwave link planning, lease management, project workflow, cost tracking), see [`docs/MVP-SCOPE.md`](docs/MVP-SCOPE.md).

## Install (when v1 ships)

Download the installer for your OS from the [Releases page](https://github.com/<your-username>/optimap/releases/latest):

- **Windows:** `OptiMap-x64.msi`
- **macOS:** `OptiMap-universal.dmg`
- **Linux:** `OptiMap-x64.AppImage`

Run the installer and you're done.

## Development

Requirements:
- Node.js 20+
- pnpm 9+
- Rust toolchain (`rustup`)
- Platform build prerequisites (see [Tauri prerequisites](https://tauri.app/start/prerequisites/))

```bash
git clone https://github.com/<your-username>/optimap.git
cd optimap
pnpm install
pnpm tauri dev
```

The app launches as a desktop window.

## Tech stack

- [Tauri 2](https://tauri.app/) (Rust shell)
- React 18 + TypeScript (strict)
- Vite + Tailwind CSS
- SQLite via `tauri-plugin-sql`
- Drizzle ORM
- MapLibre GL JS

## Contributing

OptiMap is being developed solo with AI assistance as a research project. Contributions are welcome but the bar is high on code quality and test coverage. Read `CLAUDE.md` to understand the codebase structure and conventions before submitting a PR.

## Licence

GPLv3. See [`LICENSE`](LICENSE).

## Acknowledgements

- [Tauri](https://tauri.app/) — the desktop app framework.
- [MapLibre GL JS](https://maplibre.org/) — the open-source map renderer.
- [OpenStreetMap](https://www.openstreetmap.org/) contributors for the basemap.
- The [`itur`](https://github.com/inigodelportillo/ITU-Rpy) library, planned for the future microwave link-budget module (Phase 2).
