// deadwork-hq/test-notify.mjs
// POST /notify is the one public endpoint — same request/response shape the old KV-backed
// notify-worker had (`{ email, product, company? } -> { ok: true }`), now backed by D1. Covers:
// a real signup succeeding and landing in the signups table, a duplicate email+product not
// creating a second row, an invalid product being rejected, and the honeypot still working.
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

  const badJson = await worker.fetch('http://worker/notify', { method: 'POST', body: '{not json' })
  check('invalid JSON body is rejected with 400', badJson.status === 400, String(badJson.status))

  const badEmail = await worker.fetch('http://worker/notify', { method: 'POST', body: JSON.stringify({ email: 'not-an-email', product: 'loadout' }) })
  check('a malformed email is rejected with 400', badEmail.status === 400, String(badEmail.status))

  const badProduct = await worker.fetch('http://worker/notify', { method: 'POST', body: JSON.stringify({ email: 'jamie@example.com', product: 'not-a-real-product' }) })
  check('an invalid product is rejected with 400', badProduct.status === 400, String(badProduct.status))
  const badProductBody = await badProduct.json()
  check('the invalid-product response is {ok:false}', badProductBody.ok === false, JSON.stringify(badProductBody))

  const honeypot = await worker.fetch('http://worker/notify', {
    method: 'POST',
    body: JSON.stringify({ email: 'bot@example.com', product: 'loadout', company: 'Definitely A Bot LLC' })
  })
  check('a filled honeypot still reports success', honeypot.status === 200, String(honeypot.status))
  const afterHoneypot = await signups()
  check('a filled honeypot never actually stores a row', afterHoneypot.length === 0, JSON.stringify(afterHoneypot))

  const real = await worker.fetch('http://worker/notify', {
    method: 'POST',
    body: JSON.stringify({ email: 'Jamie@Example.com', product: 'loadout' })
  })
  check('a real submission succeeds with 200', real.status === 200, String(real.status))
  const realBody = await real.json()
  check('the response is {ok:true}', realBody.ok === true, JSON.stringify(realBody))

  const afterReal = await signups()
  check('the real submission landed in the signups table', afterReal.length === 1, JSON.stringify(afterReal))
  check('the email was normalized to lowercase', afterReal[0]?.email === 'jamie@example.com', afterReal[0]?.email)
  check('the product was recorded', afterReal[0]?.product === 'loadout', afterReal[0]?.product)
  check('a submission with no source/page at all (an old cached notify.js) stores null, not an error', afterReal[0]?.source === null && afterReal[0]?.page === null, JSON.stringify(afterReal[0]))

  const withSource = await worker.fetch('http://worker/notify', {
    method: 'POST',
    body: JSON.stringify({ email: 'with-source@example.com', product: 'loadout', source: 'https://google.com/search?q=deadwork', page: '/loadout/' })
  })
  check('a submission with source/page succeeds with 200', withSource.status === 200, String(withSource.status))
  const afterSource = await signups()
  const sourceRow = afterSource.find((s) => s.email === 'with-source@example.com')
  check('the referrer is recorded as the source', sourceRow?.source === 'https://google.com/search?q=deadwork', JSON.stringify(sourceRow))
  check('the page path is recorded', sourceRow?.page === '/loadout/', JSON.stringify(sourceRow))

  const directSource = await worker.fetch('http://worker/notify', {
    method: 'POST',
    body: JSON.stringify({ email: 'direct-source@example.com', product: 'loadout', source: 'direct', page: '/' })
  })
  check('a submission with no referrer (source: "direct") succeeds with 200', directSource.status === 200, String(directSource.status))
  const afterDirect = await signups()
  const directRow = afterDirect.find((s) => s.email === 'direct-source@example.com')
  check("the literal string 'direct' is stored as-is, not treated as missing", directRow?.source === 'direct', JSON.stringify(directRow))

  const oversizedSource = await worker.fetch('http://worker/notify', {
    method: 'POST',
    body: JSON.stringify({ email: 'oversized-source@example.com', product: 'loadout', source: 'x'.repeat(600), page: 'y'.repeat(600) })
  })
  check('an oversized source/page is capped, not rejected (a visitor should never get a 400 over this)', oversizedSource.status === 200, String(oversizedSource.status))
  const afterOversized = await signups()
  const oversizedRow = afterOversized.find((s) => s.email === 'oversized-source@example.com')
  check('the source was capped to 500 characters', oversizedRow?.source?.length === 500, oversizedRow?.source?.length)
  check('the page was capped to 500 characters', oversizedRow?.page?.length === 500, oversizedRow?.page?.length)

  const countBeforeSecondProduct = afterOversized.length

  const stockShredder = await worker.fetch('http://worker/notify', {
    method: 'POST',
    body: JSON.stringify({ email: 'jamie@example.com', product: 'stock-shredder' })
  })
  check('stock-shredder is a valid product', stockShredder.status === 200, String(stockShredder.status))
  const afterSecondProduct = await signups()
  check('signing up for a second product adds exactly one more row', afterSecondProduct.length === countBeforeSecondProduct + 1, JSON.stringify(afterSecondProduct))

  const duplicate = await worker.fetch('http://worker/notify', {
    method: 'POST',
    body: JSON.stringify({ email: 'jamie@example.com', product: 'loadout' })
  })
  check('re-submitting the same email+product still reports success', duplicate.status === 200, String(duplicate.status))
  const afterDuplicate = await signups()
  check('re-submitting the same email+product does not create a second row', afterDuplicate.length === afterSecondProduct.length, JSON.stringify(afterDuplicate))

  // First name is optional, so any shape of it must still sign up fine.
  for (const [label, firstName] of [['a first name', 'Jamie'], ['a non-string first name', 42], ['an oversized first name', 'n'.repeat(500)]]) {
    const res = await worker.fetch('http://worker/notify', {
      method: 'POST',
      body: JSON.stringify({ email: `named-${firstName.toString().length}@example.com`, firstName, product: 'handoff' })
    })
    check(`a signup with ${label} succeeds`, res.status === 200, String(res.status))
  }
  const afterNamed = await signups()
  const byEmail = (e) => afterNamed.find((s) => s.email === e)
  check('the first name is saved with the signup', byEmail('named-5@example.com')?.firstName === 'Jamie', JSON.stringify(byEmail('named-5@example.com')))
  check('a non-string first name is saved as no name', byEmail('named-2@example.com')?.firstName === null, JSON.stringify(byEmail('named-2@example.com')))
  check('an oversized first name is capped at 80 characters', byEmail('named-500@example.com')?.firstName?.length === 80, byEmail('named-500@example.com')?.firstName?.length)
  check('a signup without a first name has no name', byEmail('jamie@example.com')?.firstName === null, JSON.stringify(byEmail('jamie@example.com')))

  // Per-IP cap: every submission above came from the same (local) address, so keep going until the
  // 10-an-hour limit is hit, and confirm the next one is refused and not stored.
  let capped = null
  for (let i = 0; i < 12 && !capped; i++) {
    const res = await worker.fetch('http://worker/notify', { method: 'POST', body: JSON.stringify({ email: `flood${i}@example.com`, product: 'general' }) })
    if (res.status === 429) capped = i
  }
  check('one address is cut off after 10 signups in an hour', capped !== null, String(capped))
  const afterFlood = await signups()
  check('a refused signup is not stored', !afterFlood.some((s) => s.email === `flood${capped}@example.com`), JSON.stringify(afterFlood.map((s) => s.email)))
} finally {
  await worker.stop()
}

if (failed > 0) process.exit(1)
