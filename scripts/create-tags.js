/**
 * One-time migration: create tag + merchant_tag tables and seed initial tags.
 */

import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = new Database(join(__dirname, '../data/db.sqlite'))
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS tag (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    type          TEXT NOT NULL,
    created_date  TEXT,
    modified_date TEXT,
    disabled      TEXT DEFAULT 'f'
  );

  CREATE TABLE IF NOT EXISTS merchant_tag (
    id            TEXT PRIMARY KEY,
    merchant_id   TEXT NOT NULL,
    tag_id        TEXT NOT NULL,
    created_date  TEXT,
    modified_date TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_merchant_tag_merchant ON merchant_tag(merchant_id);
  CREATE INDEX IF NOT EXISTS idx_merchant_tag_tag      ON merchant_tag(tag_id);
`)

const SEED = [
  // Occasion
  { type: 'occasion', name: "New Year's" },
  { type: 'occasion', name: "Valentine's Day" },
  { type: 'occasion', name: "St. Patrick's Day" },
  { type: 'occasion', name: 'Easter' },
  { type: 'occasion', name: "Mother's Day" },
  { type: 'occasion', name: 'Memorial Day' },
  { type: 'occasion', name: "Father's Day" },
  { type: 'occasion', name: '4th of July' },
  { type: 'occasion', name: 'Labor Day' },
  { type: 'occasion', name: 'Halloween' },
  { type: 'occasion', name: 'Thanksgiving' },
  { type: 'occasion', name: 'Black Friday' },
  { type: 'occasion', name: 'Cyber Monday' },
  { type: 'occasion', name: 'Christmas' },
  { type: 'occasion', name: 'Hanukkah' },
  { type: 'occasion', name: 'Graduation' },
  { type: 'occasion', name: 'Super Bowl' },
  { type: 'occasion', name: 'Prime Day' },
  { type: 'occasion', name: "Tax Day" },
  { type: 'occasion', name: "Earth Day" },
  { type: 'occasion', name: "Pride Month" },
  { type: 'occasion', name: "Veterans Day" },
  { type: 'occasion', name: "Breast Cancer Awareness" },

  // Seasonal
  { type: 'seasonal', name: 'Spring' },
  { type: 'seasonal', name: 'Summer' },
  { type: 'seasonal', name: 'Fall' },
  { type: 'seasonal', name: 'Winter' },
  { type: 'seasonal', name: 'Holiday Season' },
  { type: 'seasonal', name: 'Back to School' },
  { type: 'seasonal', name: 'Year-End Clearance' },

  // Audience
  { type: 'audience', name: 'Men' },
  { type: 'audience', name: 'Women' },
  { type: 'audience', name: 'Kids' },
  { type: 'audience', name: 'Teens' },
  { type: 'audience', name: 'Seniors' },
  { type: 'audience', name: 'Students' },
  { type: 'audience', name: 'Families' },
  { type: 'audience', name: 'Pet Owners' },
  { type: 'audience', name: 'Gamers' },
  { type: 'audience', name: 'Fitness Enthusiasts' },
  { type: 'audience', name: 'Homeowners' },
  { type: 'audience', name: 'Travelers' },
  { type: 'audience', name: 'Foodies' },
  { type: 'audience', name: 'Tech Enthusiasts' },
  { type: 'audience', name: 'Beauty Lovers' },

  // Discount
  { type: 'discount', name: '% Off Deal' },
  { type: 'discount', name: 'BOGO' },
  { type: 'discount', name: 'Free Shipping' },
  { type: 'discount', name: 'Flash Sale' },
  { type: 'discount', name: 'Clearance' },
  { type: 'discount', name: 'Bundle Deal' },
  { type: 'discount', name: 'First Order Discount' },
  { type: 'discount', name: 'Student Discount' },
  { type: 'discount', name: 'Promo Code' },
  { type: 'discount', name: 'Loyalty Reward' },
]

const now = new Date().toISOString()
const insert = db.prepare(`
  INSERT OR IGNORE INTO tag (id, name, type, created_date, modified_date)
  VALUES (?, ?, ?, ?, ?)
`)

const migrate = db.transaction(() => {
  let count = 0
  for (const { name, type } of SEED) {
    const result = insert.run(randomUUID(), name, type, now, now)
    count += result.changes
  }
  return count
})

const inserted = migrate()
console.log(`Tags migration complete. ${inserted} tags inserted.`)

const totals = db.prepare(`SELECT type, COUNT(*) as n FROM tag WHERE disabled='f' GROUP BY type ORDER BY type`).all()
totals.forEach(r => console.log(`  ${r.type}: ${r.n}`))
