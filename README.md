# Skin Profit Tracker

A fully offline desktop portfolio manager for CS2 skin trading. Track purchases and
sales across marketplaces (CSFloat, CSGOEmpire, Skinport, BUFF, Steam), record the
original currency and exchange rate for every trade, and see realized/unrealized
profit, ROI and holding times at a glance.

Everything runs locally in an Electron app backed by SQLite — **no cloud, no online
database, no account**. Your data never leaves your machine.

> **Base currency is INR.** Every trade also preserves its original currency (USD or
> Empire coins) and the exchange rate used at the time, so historical numbers are
> never rewritten when the live rate moves.

---

## Tech stack

| Area | Choice |
|------|--------|
| Shell | Electron 31 (frameless, custom titlebar) |
| UI | React 18 + TypeScript + Vite 5 |
| Styling | TailwindCSS (CSS-variable theming) + Framer Motion |
| Data grid | TanStack Table + TanStack Virtual |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Database | SQLite via `better-sqlite3` (WAL mode) |
| Packaging | electron-builder (NSIS installer + portable `.exe`) |

The React renderer never touches the database directly. `better-sqlite3` lives in
the Electron **main** process; the renderer talks to it through a typed
`contextBridge` preload API (`window.api`) with `contextIsolation` on and
`nodeIntegration` off.

---

## Getting started

```bash
npm install      # installs deps and rebuilds better-sqlite3 for Electron
npm run dev       # launch the app in development (Vite + Electron with HMR)
```

### Build a Windows executable

```bash
npm run build     # typecheck → vite build → electron-builder (Windows x64)
```

Artifacts are written to `release/<version>/`:

- `Skin Profit Tracker-Setup-<version>.exe` — NSIS installer
- `Skin Profit Tracker-Portable-<version>.exe` — portable, no install

Other targets: `npm run build:mac` (dmg for local testing) and
`npm run build:unpacked` (an unpacked folder build for quick inspection).

> Auto-update is intentionally disabled.

---

## Project structure

```
electron/                 Main process (Node) — owns the database
  main.ts                 App lifecycle, frameless window, security
  preload.ts              Typed contextBridge API (window.api)
  db/
    database.ts           Connection, schema, migrations
    repositories/         skins, settings, market history
  services/
    dashboard.ts          Dashboard analytics aggregation
    seed.ts               Sample-data generator
  ipc/index.ts            Registers all IPC handlers

shared/                   Pure code shared by main + renderer
  models.ts               Domain types (mirror the DB schema)
  calculations.ts         Profit / currency math (single source of truth)
  constants.ts            Defaults, marketplace fees

src/                      React renderer
  components/
    layout/               Sidebar, TitleBar, Topbar, AppLayout
    ui/                    Card, Button, StatCard, Badge, …
    charts/               Chart theme, tooltip, legend
    dashboard/            Dashboard-specific widgets
    skins/                Reusable skin identity components
  pages/                  One file per route
  providers/              Settings + Toast context
  hooks/                  useAsyncData, …
  lib/                    api bridge, formatters, utils
```

Clean separation: **database → repositories → services → IPC → api bridge →
hooks → components → pages**.

---

## Database

The SQLite file is created automatically on first launch in Electron's
`userData` directory (e.g. `%APPDATA%/Skin Profit Tracker` on Windows). WAL mode is
enabled for performance with large libraries.

Tables: `skins` (the portfolio), `settings` (single-row preferences),
`market_history` (recorded market prices for unrealized value), and `schema_meta`
(migration bookkeeping).

---

## Build status (delivered page-by-page)

This project is built one page at a time. Current status:

- [x] **Project scaffold** — structure, database schema, routing, IPC, UI kit
- [x] **1 · Dashboard** — KPI cards, cashflow/profit/timeline charts, source
      distributions, top trades and recent activity
- [x] **2 · Purchases** — CSFloat & CSGOEmpire paste parsers, manual entry, live
      currency conversion, editable preview and confirm-to-save
- [x] **3 · Inventory** — virtualized TanStack data table, search, filters
      (status/source/date/price), sorting, pagination, column resize/hide,
      edit modal, duplicate, delete with undo, bulk delete
- [x] **4 · Sales** — sale window with live gross → fee → net → profit → ROI →
      holding time, multi-currency, quick-sell deep-link, recently-sold list
- [x] **5 · Arbitrage Calculator** — live cross-market profit calculator with
      break-even sale price in INR / USD / Empire coins
- [x] **6 · Statistics** — win rate, average/median ROI, most-traded &
      most-profitable weapon/finish, profit-by-marketplace, ROI distribution,
      best/worst trade, PNG chart export
- [x] **7 · Settings** — preferences, theme switcher, daily auto-backup (latest
      30 kept), JSON export/import, CSV export, database reset

**All seven pages are complete.** On an empty database, the Dashboard offers a
**Load sample data** button so you can explore the app immediately.

---

## Troubleshooting

**`better-sqlite3` fails to load / "was compiled against a different Node.js version".**
The native module must be rebuilt for Electron's ABI:

```bash
npm run rebuild
```

On Windows this needs the Visual Studio C++ Build Tools. `npm install` runs
`electron-builder install-app-deps` automatically, which handles this in most cases.

**App shows a blank window in dev.** Ensure the Vite dev server is on port 5173
(`npm run dev` starts both Vite and Electron together).
