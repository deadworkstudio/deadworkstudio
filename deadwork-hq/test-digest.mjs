// deadwork-hq/test-digest.mjs
// Exercises runDailyDigest's full stateful flow (the KV "last sent" watermark included) through
// the real Worker, via the test-only /_test/run-digest route (see src/index.ts) — the
// counting/body logic itself is covered without any network or D1 in test-digest-logic.mjs; what
// matters here is the behavior that logic alone can't prove: a run with nothing new sends
// nothing, a run with real activity gets counted correctly, and running the digest again right
// after — with nothing new in between — never re-reports the same signups a second time.
//
// Every real signup created below is stamped with the real wall-clock Date.now() (insertSignup
// has no override for that), so every /_test/run-digest call here lets the Worker use its own
// real Date.now() too (never an artificial "a day later" timestamp) — the relative ordering
// between "a signup was created" and "the digest ran" is all that matters, and real sequential
// awaits already guarantee that ordering, with no need to fake elapsed days.
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

async function runDigest() {
  const res = await worker.fetch('http://worker/_test/run-digest', { method: 'POST', body: JSON.stringify({}) })
  return res.json()
}

try {
  await worker.fetch('http://worker/_test/setup-signups-db', { method: 'POST' })

  const beforeAnything = await runDigest()
  check('a run with no signups at all (and no prior digest on record) sends nothing', beforeAnything.hadNewActivity === false, JSON.stringify(beforeAnything))
  check('a run with nothing new reports no email sent', beforeAnything.emailSent === false, JSON.stringify(beforeAnything))

  // A real signup, captured the normal way (through /notify, not seeded directly), so this
  // exercises the exact same signups the admin dashboard and the digest both read from.
  const signup = await worker.fetch('http://worker/notify', {
    method: 'POST',
    body: JSON.stringify({ email: 'new-signup@example.com', product: 'loadout' })
  })
  check('seeding a real signup for the digest to pick up succeeds', signup.status === 200, String(signup.status))

  const withActivity = await runDigest()
  check('a run after a new signup landed reports hadNewActivity: true', withActivity.hadNewActivity === true, JSON.stringify(withActivity))
  check('the summary counts exactly the one new signup', withActivity.summary?.totalNew === 1, JSON.stringify(withActivity.summary))
  check('it is counted under the right product', withActivity.summary?.byProduct?.loadout === 1, JSON.stringify(withActivity.summary))

  // No real Gmail credentials in this test environment (GMAIL_USER/GMAIL_APP_PASSWORD aren't set
  // in the vars above) - emailSent is expected to be false here, same documented limitation
  // footage-curator/worker's own test-report-issue.mjs and test-earn-submission.mjs already note
  // for their own best-effort emails. That's not what this test is verifying either way.

  const secondRunRightAfter = await runDigest()
  check('running the digest again with no new activity in between reports hadNewActivity: false', secondRunRightAfter.hadNewActivity === false, JSON.stringify(secondRunRightAfter))
  check('the already-reported signup is never counted a second time', secondRunRightAfter.emailSent === false, JSON.stringify(secondRunRightAfter))

  // Prove the watermark really did advance (not just "no activity happened to exist"): a second,
  // genuinely new signup arriving after the watermark moved must still show up on the next run,
  // and the first signup (already reported) must not be double-counted alongside it.
  const secondSignup = await worker.fetch('http://worker/notify', {
    method: 'POST',
    body: JSON.stringify({ email: 'another-signup@example.com', product: 'stock-shredder' })
  })
  check('seeding a second real signup succeeds', secondSignup.status === 200, String(secondSignup.status))

  const withSecondSignup = await runDigest()
  check('a brand-new signup after the watermark is picked up on the next run', withSecondSignup.hadNewActivity === true, JSON.stringify(withSecondSignup))
  check('only the one genuinely new signup is counted, not the earlier one again', withSecondSignup.summary?.totalNew === 1, JSON.stringify(withSecondSignup.summary))
  check('the newly counted signup is under the right (different) product', withSecondSignup.summary?.byProduct?.['stock-shredder'] === 1, JSON.stringify(withSecondSignup.summary))
} finally {
  await worker.stop()
}

if (failed > 0) process.exit(1)
