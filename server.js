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
  const rows = db.prepare(`
    SELECT
      nm.merchant_id             AS id,
      TRIM(nm.name)              AS name,
      nm.url,
      CAST(nm.default_rate  AS REAL) AS default_rate,
      CAST(nm.derived_rate  AS REAL) AS derived_rate,
      CAST(nm.admin_rate    AS REAL) AS admin_rate,
      nm.locked,
      nm.deeplink_disabled,
      nm.coupon_disabled,
      nm.existing_customer_rate_disabled,
      nm.is_itp_compliant,
      nm.is_delinquent,
      nm.domain_ranking,
      nm.note,
      nm.redirect_code,
      GROUP_CONCAT(DISTINCT n.name)   AS networks,
      GROUP_CONCAT(c.name ORDER BY mc.sort_order, mc.rowid) AS categories,
      GROUP_CONCAT(DISTINCT CASE WHEN mc.is_primary = 't' THEN c.name END) AS primary_category
    FROM network_merchant nm
    LEFT JOIN merchant_category mc ON mc.merchant_id = nm.merchant_id
    LEFT JOIN category c           ON c.id = mc.category_id
    LEFT JOIN network n            ON n.id = nm.network_id
    WHERE nm.disabled = 'f'
      AND nm.name IS NOT NULL
      AND TRIM(nm.name) != ''
    GROUP BY nm.merchant_id
    ORDER BY TRIM(nm.name) COLLATE NOCASE
  `).all()

  res.json(rows)
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
