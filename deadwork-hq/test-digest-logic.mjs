// deadwork-hq/test-digest-logic.mjs
// Pure-logic check for src/digestSummary.ts's buildDigestSummary — no network, no D1, no KV
// (digestSummary.ts has zero Cloudflare/worker-mailer imports, unlike digest.ts itself, which is
// why the logic was split into its own file — same split footage-curator/worker's own digest
// uses, for the same reason). Bundles the one file with esbuild and imports the result directly,
// rather than spinning up a wrangler dev instance just to prove this function's own math is right.
// Covers the three cases the owner's digest feature exists to get right: nothing new means no
// email at all, real new activity produces the right counts, and the email body actually
// mentions the per-product breakdown (so a human skimming it gets the real picture).
import { build } from 'esbuild'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)))
let failed = 0
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
  if (!ok) failed++
}

const outDir = mkdtempSync(path.join(tmpdir(), 'hq-digest-test-'))
const outFile = path.join(outDir, 'digest-summary.bundle.mjs')
await build({
  entryPoints: [path.join(ROOT, 'src/digestSummary.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: outFile,
  logLevel: 'error'
})
const { buildDigestSummary } = await import(pathToFileURL(outFile).href)

const labels = { loadout: 'Loadout', 'stock-shredder': 'Stock Shredder', general: 'General (Join page)' }

check('no new signups produces no summary at all (no empty "nothing happened" email)', buildDigestSummary([], labels) === null, JSON.stringify(buildDigestSummary([], labels)))

const oneSignup = buildDigestSummary([{ product: 'loadout' }], labels)
check('one new signup produces a real summary, not null', oneSignup !== null)
check('the total count is exactly 1', oneSignup?.totalNew === 1, JSON.stringify(oneSignup))
check('the per-product breakdown counts it under loadout', oneSignup?.byProduct.loadout === 1, JSON.stringify(oneSignup))
check("the product's display label shows up in the plain-text body, not the raw slug", oneSignup?.text.includes('Loadout:'), oneSignup?.text)
check("the product's display label shows up in the HTML body too", oneSignup?.html.includes('Loadout:'), oneSignup?.html)
check('the subject line mentions the total count (1)', oneSignup?.subject.includes('1 new signup'), oneSignup?.subject)

const mixed = buildDigestSummary(
  [{ product: 'loadout' }, { product: 'loadout' }, { product: 'stock-shredder' }, { product: 'general' }],
  labels
)
check('a mix of products reports the right total', mixed?.totalNew === 4, JSON.stringify(mixed))
check('loadout is counted twice', mixed?.byProduct.loadout === 2, JSON.stringify(mixed))
check('stock-shredder is counted once', mixed?.byProduct['stock-shredder'] === 1, JSON.stringify(mixed))
check('general is counted once', mixed?.byProduct.general === 1, JSON.stringify(mixed))
check('the subject line pluralizes correctly for more than one', mixed?.subject.includes('4 new signups'), mixed?.subject)

const unknownProduct = buildDigestSummary([{ product: 'some-future-product' }], labels)
check('a product with no known label still shows up, falling back to the raw slug', unknownProduct?.text.includes('some-future-product:'), unknownProduct?.text)

if (failed > 0) process.exit(1)
