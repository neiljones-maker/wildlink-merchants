# Wildlink Merchant Browser

A local web app for browsing, searching, and managing the Wildlink merchant catalog and category taxonomy. Built with React + Vite on the frontend and Express + SQLite on the backend.

## Features

- Browse 14,000+ active merchants with category tags and cashback rates
- Search and filter by category
- Infinite scroll (48 cards at a time)
- Click any merchant to view full details and edit its categories (drag to reorder, add, remove, set primary)
- Category Manager — promote/demote categories between primary and subcategory, or remove them entirely

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [Git LFS](https://git-lfs.com/) — required to download the database file

> The database (`data/db.sqlite`, 53 MB) is stored in this repo via Git LFS. You must have Git LFS installed before cloning, otherwise the file will be a placeholder pointer and the app won't start.

## Setup

### 1. Install Git LFS (once per machine)

```bash
# macOS
brew install git-lfs

# Windows
# Download the installer from https://git-lfs.com

# Linux
sudo apt install git-lfs   # Debian/Ubuntu
```

Then register it with git:

```bash
git lfs install
```

### 2. Clone the repo

```bash
git clone https://github.com/neiljones-maker/wildlink-merchants.git
cd wildlink-merchants
```

Git LFS will automatically download `data/db.sqlite` during the clone.

### 3. Install dependencies

```bash
npm install
```

### 4. Run the category consolidation migration (first time only)

This cleans up duplicate and near-duplicate categories in the database:

```bash
node scripts/consolidate-categories.js
```

You should see output confirming rows were remapped and retired categories were disabled. **Only run this once** — it's not idempotent.

### 5. Start the app

```bash
npm run dev
```

This starts two servers concurrently:

| Server | Port | Purpose |
|---|---|---|
| Express API | 3001 | Reads/writes the SQLite database |
| Vite dev server | 5173 | Serves the React frontend |

Open **http://localhost:5173** in your browser.

## Project structure

```
├── data/
│   └── db_snapshot.sqlite      # Database (gitignored — add manually)
├── scripts/
│   └── consolidate-categories.js  # One-time category dedup migration
├── server.js                   # Express API server
└── src/
    ├── App.jsx                 # Merchant browser with infinite scroll
    ├── CategoryManager.jsx     # Category management page
    ├── MerchantModal.jsx       # Merchant detail + category editor modal
    ├── Nav.jsx                 # Top navigation
    └── api.js                  # Fetch helpers for all API endpoints
```

## API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/merchants` | All active merchants with categories |
| PUT | `/api/merchants/:id/categories` | Update a merchant's categories |
| GET | `/api/categories` | Active category names (for dropdowns) |
| GET | `/api/categories/manage` | Full category data with parent + merchant count |
| PUT | `/api/categories/:id/parent` | Set or clear a category's parent |
| DELETE | `/api/categories/:id` | Disable a category and remove its merchant mappings |

## Version history

| Version | Description |
|---|---|
| v1.3.0 | Infinite scroll, Category Manager page, top navigation |
| v1.2.2 | Fix duplicate category tags on merchants with multiple networks |
| v1.2.1 | Serve category list from API instead of stale static file |
| v1.2.0 | Consolidate 32 duplicate/near-duplicate categories |
| v1.1.0 | Persist category edits to SQLite via Express backend |
| v1.0.0 | Merchant detail modal with drag-to-reorder category editing |
