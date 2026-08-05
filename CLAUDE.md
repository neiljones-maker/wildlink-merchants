# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start both servers (Express on :3001, Vite on :5173)
npm run server    # Express API only
npm run build     # Production Vite build
npm run lint      # oxlint
```

`npm run dev` uses `concurrently` to run `node server.js` and `vite` together. If a port is already occupied from a previous session, kill the processes before restarting:

```bash
lsof -ti tcp:3001 | xargs kill -9
lsof -ti tcp:5173 | xargs kill -9
```

Run servers independently when `concurrently` is unstable (it can silently exit one process):

```bash
node server.js &
npx vite &
```

## Architecture

Two-process local app — no build step needed for development:

```
Browser → Vite :5173 → proxies /api/* → Express :3001 → data/db.sqlite
```

Vite's `server.proxy` in `vite.config.js` forwards all `/api` requests to Express, so the frontend never hardcodes a port.

### Backend — `server.js`

Single-file Express 5 server using `better-sqlite3` (synchronous SQLite). All queries run synchronously — no async/await needed on the DB layer.

Key query pattern: the `/api/merchants` query uses **three independent CTEs** (`base`, `nets`, `cats`) to avoid a cross-product. A merchant can appear in multiple `network_merchant` rows (one per affiliate network). Joining `merchant_category` directly against `network_merchant` would multiply category rows by network count — the CTEs prevent this.

The `merchant_category` table has a `sort_order` column added by migration (not in the original schema). It tracks user-defined category order within the modal.

### Frontend — `src/`

React 19 + React Router v7. No global state library — each page fetches its own data.

- **`App.jsx`** — shell with `<Routes>`. The `MerchantBrowser` component owns infinite scroll state (IntersectionObserver on a sentinel div, 48 cards per page). Filters reset `displayCount` to 48.
- **`MerchantModal.jsx`** — opens on card click. Uses `@dnd-kit/sortable` for drag-to-reorder category tags. Calls `PUT /api/merchants/:id/categories` on save, which does a full delete-then-reinsert in a transaction.
- **`CategoryManager.jsx`** — `/categories` route. Inline row actions (no modals) for promote/demote/delete. Deletions cascade: removes merchant mappings and promotes subcategories to top-level.
- **`api.js`** — all `fetch()` calls in one place.

### Database — `data/db.sqlite`

Tracked via Git LFS (53 MB). Original schema from `db_snapshot.sqlite`; the app adds `sort_order` on startup via a try/catch `ALTER TABLE`.

**Key tables:**

| Table | Notes |
|---|---|
| `network_merchant` | One row per merchant × network. `merchant_id` is the cross-network merchant identifier used everywhere. |
| `merchant_category` | Many-to-many. `is_primary = 't'` marks the primary category. `sort_order` controls display order. |
| `category` | `disabled = 'f'` filters active categories. `parent_id` empty string or NULL = top-level primary. |
| `network` | 24 affiliate networks. |

### One-time migrations — `scripts/`

`scripts/consolidate-categories.js` — run once after cloning to merge duplicate/near-duplicate categories. Not idempotent; re-running will silently no-op (the retired categories are already disabled and have no merchant rows to remap).

## API surface

| Method | Path | Description |
|---|---|---|
| GET | `/api/merchants` | All active merchants with categories and networks |
| PUT | `/api/merchants/:id/categories` | Full replace of a merchant's categories (ordered) |
| GET | `/api/categories` | Active category names — for add-category dropdowns |
| GET | `/api/categories/manage` | Full rows: id, name, parent_id, parent_name, merchant_count |
| PUT | `/api/categories/:id/parent` | Set or clear parent_id |
| DELETE | `/api/categories/:id` | Disable + remove merchant mappings + promote subcategories |

## Versioning

Commits are tagged semver (`v1.x.x`). Bump `package.json` version and create a git tag on every meaningful change:

```bash
git tag v1.x.x && git push origin main --tags
```
