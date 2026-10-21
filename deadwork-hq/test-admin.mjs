// deadwork-hq/test-admin.mjs
// The admin dashboard replaced the old "?key=" URL-param gate with a real password-login flow
// (Authorization: Bearer header, matching footage-curator/worker's own requireAdmin). Covers:
// every /admin/api/* route requires auth, the admin page itself loads without auth (no secrets
// in the page itself — same as footage-curator/worker's own /admin), and stats reflect real data.
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

try {
  await worker.fetch('http://worker/_test/setup-signups-db', { method: 'POST' })

  const pageRes = await worker.fetch('http://worker/admin')
  check('the admin page loads without auth (the page itself has no secrets in it)', pageRes.status === 200)
  const pageHtml = await pageRes.text()
  check('the page contains the login form', pageHtml.includes('id="password"'))
  check('the page never embeds the admin key itself', !pageHtml.includes('test-admin-key'))

  const signupsNoAuth = await worker.fetch('http://worker/admin/api/signups')
  check('the signups list refuses an unauthenticated request', signupsNoAuth.status === 401)

  const signupsWrongKey = await worker.fetch('http://worker/admin/api/signups', { headers: { Authorization: 'Bearer wrong' } })
  check('the signups list refuses the wrong password', signupsWrongKey.status === 401)

  const statsNoAuth = await worker.fetch('http://worker/admin/api/stats')
  check('the stats endpoint refuses an unauthenticated request', statsNoAuth.status === 401)

  // Seed two signups across two products for the stat tiles to actually report on.
  await worker.fetch('http://worker/notify', { method: 'POST', body: JSON.stringify({ email: 'a@example.com', product: 'loadout' }) })
  await worker.fetch('http://worker/notify', { method: 'POST', body: JSON.stringify({ email: 'b@example.com', product: 'handoff' }) })

  const signupsAuthed = await worker.fetch('http://worker/admin/api/signups', { headers: { Authorization: 'Bearer test-admin-key' } })
  check('the signups list succeeds with the right password', signupsAuthed.status === 200, String(signupsAuthed.status))
  const signups = await signupsAuthed.json()
  check('the response is a JSON array', Array.isArray(signups), JSON.stringify(signups))
  check('both seeded signups are present', signups.length === 2, JSON.stringify(signups))

  const statsAuthed = await worker.fetch('http://worker/admin/api/stats', { headers: { Authorization: 'Bearer test-admin-key' } })
  check('the stats endpoint succeeds with the right password', statsAuthed.status === 200, String(statsAuthed.status))
  const stats = await statsAuthed.json()
  check('total reflects both seeded signups', stats.total === 2, JSON.stringify(stats))
  check('per-product counts are broken out', stats.byProduct.loadout === 1 && stats.byProduct.handoff === 1, JSON.stringify(stats.byProduct))

  const migrateNoKey = await worker.fetch('http://worker/admin/migrate-kv', { method: 'POST' })
  check('the migration endpoint refuses a request with no key', migrateNoKey.status === 401)

  const migrateWrongKey = await worker.fetch('http://worker/admin/migrate-kv?key=wrong', { method: 'POST' })
  check('the migration endpoint refuses the wrong key', migrateWrongKey.status === 401)
} finally {
  await worker.stop()
}

if (failed > 0) process.exit(1)
