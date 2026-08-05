#!/usr/bin/env node
// One-time migration: adds new schema tables from Wildfire_New_Schema.sqlite into data/db.sqlite
// Safe to re-run — uses CREATE TABLE IF NOT EXISTS and INSERT OR IGNORE

import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const workingDb = path.join(__dirname, '..', 'data', 'db.sqlite')
const sourceDb = process.argv[2] || '/Users/neiljones/Downloads/Wildfire_New_Schema.sqlite'

console.log(`Working DB: ${workingDb}`)
console.log(`Source DB:  ${sourceDb}`)

const db = new Database(workingDb)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = OFF') // off during migration

// Attach source DB
db.exec(`ATTACH DATABASE '${sourceDb}' AS src`)

// ── Create new tables ──────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS category_top (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS subcategory (
    id              INTEGER PRIMARY KEY,
    top_category_id INTEGER NOT NULL REFERENCES category_top(id),
    name            TEXT NOT NULL,
    UNIQUE (top_category_id, name)
  );

  CREATE TABLE IF NOT EXISTS occasion_tag (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS audience_tag (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS business_model_tag (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS category_crosswalk (
    old_fmtc_id      TEXT PRIMARY KEY,
    old_fmtc_name    TEXT NOT NULL,
    target_dimension TEXT NOT NULL CHECK (target_dimension IN ('subcategory','occasion_tag','audience_tag','business_model_tag','none')),
    target_id        INTEGER,
    action           TEXT NOT NULL CHECK (action IN ('Keep','Merge','Delete','Review')),
    notes            TEXT
  );

  CREATE TABLE IF NOT EXISTS merchant_subcategory (
    merchant_id    TEXT    NOT NULL,
    subcategory_id INTEGER NOT NULL REFERENCES subcategory(id),
    basis          TEXT,
    confidence     TEXT,
    PRIMARY KEY (merchant_id, subcategory_id)
  );

  CREATE TABLE IF NOT EXISTS merchant_occasion_tag (
    merchant_id      TEXT    NOT NULL,
    occasion_tag_id  INTEGER NOT NULL REFERENCES occasion_tag(id),
    PRIMARY KEY (merchant_id, occasion_tag_id)
  );

  CREATE TABLE IF NOT EXISTS merchant_audience_tag (
    merchant_id     TEXT    NOT NULL,
    audience_tag_id INTEGER NOT NULL REFERENCES audience_tag(id),
    PRIMARY KEY (merchant_id, audience_tag_id)
  );

  CREATE TABLE IF NOT EXISTS merchant_business_model_tag (
    merchant_id          TEXT    NOT NULL,
    business_model_tag_id INTEGER NOT NULL REFERENCES business_model_tag(id),
    PRIMARY KEY (merchant_id, business_model_tag_id)
  );

  CREATE TABLE IF NOT EXISTS merchant_remap_disabled (
    merchant_id  TEXT PRIMARY KEY,
    reason       TEXT,
    decided_by   TEXT,
    decided_date TEXT
  );
`)

// ── Copy data ──────────────────────────────────────────────────────────────

const steps = [
  ['category_top',              'INSERT OR IGNORE INTO category_top SELECT * FROM src.category_top'],
  ['subcategory',               'INSERT OR IGNORE INTO subcategory SELECT * FROM src.subcategory'],
  ['occasion_tag',              'INSERT OR IGNORE INTO occasion_tag SELECT * FROM src.occasion_tag'],
  ['audience_tag',              'INSERT OR IGNORE INTO audience_tag SELECT * FROM src.audience_tag'],
  ['business_model_tag',        'INSERT OR IGNORE INTO business_model_tag SELECT * FROM src.business_model_tag'],
  ['category_crosswalk',        'INSERT OR IGNORE INTO category_crosswalk SELECT * FROM src.category_crosswalk'],
  ['merchant_subcategory',      'INSERT OR IGNORE INTO merchant_subcategory SELECT * FROM src.merchant_subcategory'],
  ['merchant_occasion_tag',     'INSERT OR IGNORE INTO merchant_occasion_tag SELECT * FROM src.merchant_occasion_tag'],
  ['merchant_audience_tag',     'INSERT OR IGNORE INTO merchant_audience_tag SELECT * FROM src.merchant_audience_tag'],
  ['merchant_business_model_tag','INSERT OR IGNORE INTO merchant_business_model_tag SELECT * FROM src.merchant_business_model_tag'],
  ['merchant_remap_disabled',   'INSERT OR IGNORE INTO merchant_remap_disabled SELECT * FROM src.merchant_remap_disabled'],
]

db.transaction(() => {
  for (const [name, sql] of steps) {
    const result = db.prepare(sql).run()
    console.log(`  ${name}: ${result.changes} rows inserted`)
  }
})()

// ── Verify ─────────────────────────────────────────────────────────────────

const tables = [
  'category_top', 'subcategory', 'occasion_tag', 'audience_tag',
  'business_model_tag', 'merchant_subcategory', 'merchant_occasion_tag',
  'merchant_audience_tag', 'merchant_business_model_tag', 'merchant_remap_disabled'
]

console.log('\nVerification:')
for (const t of tables) {
  const { cnt } = db.prepare(`SELECT count(*) as cnt FROM ${t}`).get()
  console.log(`  ${t}: ${cnt}`)
}

db.exec(`DETACH DATABASE src`)
db.pragma('foreign_keys = ON')
db.close()
console.log('\nDone.')
