// deadwork-hq/test-migrate-kv.mjs
// POST /admin/migrate-kv is the one-time, explicitly-triggered move from the old KV-backed
// signup store into the new D1 `signups` table (see migrateKvToD1 in src/index.ts). Covers: a
// legacy KV entry actually lands in D1 with the right email/product/timestamp, and running the
// migration twice doesn't duplicate rows (UNIQUE(email, product) + INSERT OR IGNORE).
//
// /_test/seed-kv writes directly into the legacy NOTIFY_SIGNUPS namespace in its old
// one-blob-per-email shape — unstable_dev provisions its own local KV for this test run, so this
// never touches the real production namespace.
import { unstable_dev } from 'wrangler'

let failed = 0
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
  if (!ok) failed++
}

const worker = await unstable_dev('src/index.ts', {
  experimental: { disableExperimentalWarning: true },
  vars: { ALLOW_TEST_BYPASS: 'true', ADMIN_KEY: 'test-admin-key' }
})

async function signups() {
  const res = await worker.fetch('http://worker/admin/api/signups', { headers: { Authorization: 'Bearer test-admin-key' } })
  return res.json()
}

try {
  await worker.fetch('http://worker/_test/setup-signups-db', { method: 'POST' })

  // The old shape: one KV entry per email, listing every product they ever signed up for.
  await worker.fetch('http://worker/_test/seed-kv', {
    method: 'POST',
    body: JSON.stringify({
      email: 'legacy@example.com',
      entries: [
        { product: 'scene-lock', timestamp: '2026-01-15T12:00:00.000Z' },
        { product: 'sound-driver', timestamp: '2026-02-20T09:30:00.000Z' }
      ]
    })
  })
  await worker.fetch('http://worker/_test/seed-kv', {
    method: 'POST',
    body: JSON.stringify({
      email: 'another-legacy@example.com',
      entries: [{ product: 'general', timestamp: '2026-03-01T00:00:00.000Z' }]
    })
  })

  const beforeMigration = await signups()
  check('nothing is in D1 before the migration runs', beforeMigration.length === 0, JSON.stringify(beforeMigration))

  const firstRun = await worker.fetch('http://worker/admin/migrate-kv', { method: 'POST', headers: { Authorization: 'Bearer test-admin-key' } })
  check('the first migration run succeeds', firstRun.status === 200, String(firstRun.status))
  const firstRunBody = await firstRun.json()
  check('the first run reports 2 emails scanned', firstRunBody.emailsScanned === 2, JSON.stringify(firstRunBody))
  check('the first run reports 3 rows inserted', firstRunBody.rowsInserted === 3, JSON.stringify(firstRunBody))
  check('the first run reports 0 rows skipped', firstRunBody.rowsSkipped === 0, JSON.stringify(firstRunBody))

  const afterFirstRun = await signups()
  check('all 3 legacy signups landed in D1', afterFirstRun.length === 3, JSON.stringify(afterFirstRun))
  const legacyRow = afterFirstRun.find((s) => s.email === 'legacy@example.com' && s.product === 'scene-lock')
  check('a migrated row carries the right email and product', Boolean(legacyRow), JSON.stringify(afterFirstRun))
  check('a migrated row preserves the original signup timestamp, not "now"', legacyRow?.createdAt === Date.parse('2026-01-15T12:00:00.000Z'), legacyRow?.createdAt)

  const secondRun = await worker.fetch('http://worker/admin/migrate-kv', { method: 'POST', headers: { Authorization: 'Bearer test-admin-key' } })
  check('running the migration a second time still succeeds', secondRun.status === 200, String(secondRun.status))
  const secondRunBody = await secondRun.json()
  check('the second run inserts 0 new rows', secondRunBody.rowsInserted === 0, JSON.stringify(secondRunBody))
  check('the second run reports all 3 as skipped (already migrated)', secondRunBody.rowsSkipped === 3, JSON.stringify(secondRunBody))

  const afterSecondRun = await signups()
  check('re-running the migration does not duplicate any rows', afterSecondRun.length === 3, JSON.stringify(afterSecondRun))
} finally {
  await worker.stop()
}

if (failed > 0) process.exit(1)
