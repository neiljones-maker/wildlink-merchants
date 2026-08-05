/**
 * One-time migration: consolidate duplicate and near-duplicate categories.
 *
 * For each consolidation: merchants pointing to a retired ID are remapped to
 * the canonical ID. If a merchant already has the canonical category the
 * duplicate row is dropped (deduped). Primary-category flags are transferred
 * before deletion. Retired categories are disabled.
 */

import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = new Database(join(__dirname, '../data/db.sqlite'))
db.pragma('journal_mode = WAL')

// [keep_id, ...retire_ids]
const CONSOLIDATIONS = [
  // Exact duplicates
  ['183', '310', '350'],   // CBD
  ['19',  '314'],           // Financial
  ['186', '206'],           // Furniture
  ['243', '337'],           // Games
  ['12',  '327'],           // Gifts
  ['56',  '151'],           // Medical
  ['38',  '312'],           // Education
  ['34',  '307'],           // Babies & Kids
  ['202', '336'],           // Books & Magazines
  ['96',  '203'],           // School Supplies
  ['70',  '305'],           // Jewelry
  ['193', '205'],           // Supplies
  ['77',  '82'],            // Swimwear
  ['4',   '316'],           // Travel
  ['76',  '78'],            // Underwear & Socks
  ['125', '139'],           // Video Players & Recorders
  ['119', '136'],           // Projectors
  ['45',  '107'],           // Accessories

  // Near-duplicates
  ['29',  '112'],           // Computers & Accessories ← Computer Accessories
  ['32',  '48'],            // Mens ← Men
  ['21',  '49'],            // Womens ← Women
  ['34',  '44'],            // Babies & Kids ← Baby & Kids
  ['1',   '338', '308'],    // Clothing & Apparel ← Clothing, Apparel
  ['128', '135', '133', '134'], // Camera & Optics ← Camera & Optic Accessories, Optics, Cameras
  ['35',  '319'],           // Holidays & Occasions ← Holiday
  ['304', '142'],           // Legal Services ← Legal
  ['321', '149'],           // Pets ← Pet
  ['176', '159'],           // Vitamins & Supplements ← Vitamins & Nutrition
]

// Prepare statements once
const stmts = {
  transferPrimary: db.prepare(`
    UPDATE merchant_category
    SET is_primary = 't'
    WHERE category_id = ?
      AND merchant_id IN (
        SELECT mc1.merchant_id
        FROM merchant_category mc1
        JOIN merchant_category mc2 ON mc1.merchant_id = mc2.merchant_id
        WHERE mc1.category_id = ? AND mc1.is_primary = 't'
          AND mc2.category_id = ?
      )
  `),
  deleteDupes: db.prepare(`
    DELETE FROM merchant_category
    WHERE category_id = ?
      AND merchant_id IN (
        SELECT merchant_id FROM merchant_category WHERE category_id = ?
      )
  `),
  remap: db.prepare(`
    UPDATE merchant_category SET category_id = ? WHERE category_id = ?
  `),
  disable: db.prepare(`
    UPDATE category SET disabled = 't' WHERE id = ?
  `),
}

const migrate = db.transaction(() => {
  let totalRemapped = 0
  let totalDeduped = 0

  for (const [keepId, ...retireIds] of CONSOLIDATIONS) {
    for (const retireId of retireIds) {
      // Transfer primary flag before wiping duplicates
      stmts.transferPrimary.run(keepId, retireId, keepId)

      // Drop rows where merchant already has canonical category
      const dupeResult = stmts.deleteDupes.run(retireId, keepId)
      totalDeduped += dupeResult.changes

      // Remap remaining
      const remapResult = stmts.remap.run(keepId, retireId)
      totalRemapped += remapResult.changes

      // Disable retired category
      stmts.disable.run(retireId)
    }
  }

  // Rename "Personalized gifts" → "Personalized Gifts" (capitalise G)
  db.prepare(`UPDATE category SET name = 'Personalized Gifts' WHERE id = '175'`).run()

  return { totalRemapped, totalDeduped }
})

const { totalRemapped, totalDeduped } = migrate()

console.log(`Migration complete.`)
console.log(`  Merchant-category rows remapped : ${totalRemapped}`)
console.log(`  Duplicate rows removed          : ${totalDeduped}`)
console.log(`  Categories renamed              : 1  (Personalized gifts → Personalized Gifts)`)

// Verify
const retired = db.prepare(`
  SELECT id, name FROM category
  WHERE disabled = 't'
  ORDER BY name
`).all()
console.log(`\nDisabled categories after migration (${retired.length} total):`)
retired.forEach(r => console.log(`  [${r.id}] ${r.name}`))
