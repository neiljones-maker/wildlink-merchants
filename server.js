import express from 'express'
import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = new Database(join(__dirname, 'data/db.sqlite'))
db.pragma('journal_mode = WAL')

// Add sort_order column if it doesn't exist
try {
  db.exec(`ALTER TABLE merchant_category ADD COLUMN sort_order INTEGER DEFAULT 0;`)
} catch (_) {}

const app = express()
app.use(express.json())

// GET /api/merchants — all active merchants with their categories
app.get('/api/merchants', (_req, res) => {
  // CTEs keep networks and categories independent so a merchant on N networks
  // doesn't produce N copies of each category row in the result set.
  const rows = db.prepare(`
    WITH base AS (
      SELECT
        merchant_id                          AS id,
        MIN(TRIM(name))                      AS name,
        MIN(url)                             AS url,
        MAX(CAST(default_rate  AS REAL))     AS default_rate,
        MAX(CAST(derived_rate  AS REAL))     AS derived_rate,
        MAX(CAST(admin_rate    AS REAL))     AS admin_rate,
        MAX(locked)                          AS locked,
        MAX(deeplink_disabled)               AS deeplink_disabled,
        MAX(coupon_disabled)                 AS coupon_disabled,
        MAX(existing_customer_rate_disabled) AS existing_customer_rate_disabled,
        MAX(is_itp_compliant)                AS is_itp_compliant,
        MAX(is_delinquent)                   AS is_delinquent,
        MAX(domain_ranking)                  AS domain_ranking,
        MAX(note)                            AS note,
        MAX(redirect_code)                   AS redirect_code
      FROM network_merchant
      WHERE disabled = 'f' AND name IS NOT NULL AND TRIM(name) != ''
      GROUP BY merchant_id
    ),
    nets AS (
      SELECT nm.merchant_id, GROUP_CONCAT(DISTINCT n.name) AS networks
      FROM network_merchant nm
      JOIN network n ON n.id = nm.network_id
      WHERE nm.disabled = 'f'
      GROUP BY nm.merchant_id
    ),
    cats AS (
      SELECT
        mc.merchant_id,
        GROUP_CONCAT(c.name, ',') AS categories,
        GROUP_CONCAT(CASE WHEN mc.is_primary = 't' THEN c.name ELSE NULL END) AS primary_category
      FROM merchant_category mc
      JOIN category c ON c.id = mc.category_id
      GROUP BY mc.merchant_id
      ORDER BY mc.sort_order, mc.rowid
    )
    SELECT b.*, ne.networks, ca.categories, ca.primary_category
    FROM base b
    LEFT JOIN nets ne ON ne.merchant_id = b.id
    LEFT JOIN cats ca ON ca.merchant_id = b.id
    ORDER BY b.name COLLATE NOCASE
  `).all()

  res.json(rows)
})

// GET /api/categories — active category names (for add-category dropdown)
app.get('/api/categories', (_req, res) => {
  const rows = db.prepare(`
    SELECT name FROM category WHERE disabled = 'f' ORDER BY name
  `).all()
  res.json(rows.map(r => r.name))
})

// GET /api/categories/manage — full category data for the category manager
app.get('/api/categories/manage', (_req, res) => {
  const rows = db.prepare(`
    SELECT
      c.id,
      c.name,
      COALESCE(c.parent_id, '') AS parent_id,
      COALESCE(p.name, '')      AS parent_name,
      COUNT(mc.category_id)     AS merchant_count
    FROM category c
    LEFT JOIN category p         ON p.id = c.parent_id AND p.disabled = 'f'
    LEFT JOIN merchant_category mc ON mc.category_id = c.id
    WHERE c.disabled = 'f'
    GROUP BY c.id
    ORDER BY c.name
  `).all()
  res.json(rows)
})

// PUT /api/categories/:id/parent — set or clear a category's parent
app.put('/api/categories/:id/parent', (req, res) => {
  const { id } = req.params
  const { parent_id } = req.body
  db.prepare(`
    UPDATE category SET parent_id = ?, modified_date = datetime('now') WHERE id = ?
  `).run(parent_id || null, id)
  res.json({ ok: true })
})

// DELETE /api/categories/:id — disable category, remove merchant mappings,
// and promote any subcategories to top-level
app.delete('/api/categories/:id', (req, res) => {
  const { id } = req.params
  db.transaction(() => {
    db.prepare(`DELETE FROM merchant_category WHERE category_id = ?`).run(id)
    db.prepare(`UPDATE category SET parent_id = NULL WHERE parent_id = ?`).run(id)
    db.prepare(`UPDATE category SET disabled = 't', modified_date = datetime('now') WHERE id = ?`).run(id)
  })()
  res.json({ ok: true })
})

// PUT /api/merchants/:id/categories
// Body: { categories: string[], primary_category: string }
app.put('/api/merchants/:id/categories', (req, res) => {
  const { id } = req.params
  const { categories, primary_category } = req.body

  if (!Array.isArray(categories)) {
    return res.status(400).json({ error: 'categories must be an array' })
  }

  const now = new Date().toISOString()

  // Resolve category name → id
  const getCatId = db.prepare(`SELECT id FROM category WHERE name = ? LIMIT 1`)

  db.transaction(() => {
    // Remove all existing category mappings for this merchant
    db.prepare(`DELETE FROM merchant_category WHERE merchant_id = ?`).run(id)

    // Re-insert in the new order
    const insert = db.prepare(`
      INSERT INTO merchant_category
        (id, merchant_id, category_id, created_date, modified_date, source, is_primary, sort_order)
      VALUES (?, ?, ?, ?, ?, 'manual', ?, ?)
    `)

    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i]
      const row = getCatId.get(cat)
      if (!row) continue
      insert.run(
        randomUUID(),
        id,
        row.id,
        now,
        now,
        cat === primary_category ? 't' : 'f',
        i
      )
    }
  })()

  res.json({ ok: true })
})

const PORT = 3001
app.listen(PORT, () => console.log(`API server listening on http://localhost:${PORT}`))
