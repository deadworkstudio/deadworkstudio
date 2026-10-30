// Checks the welcome email copy (src/welcome.ts) without sending anything.
import { build } from 'esbuild'

const out = await build({ entryPoints: ['src/welcome.ts'], bundle: true, write: false, format: 'esm', platform: 'neutral', external: ['worker-mailer'] })
const mod = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text.replace(/^import .*worker-mailer.*$/m, '')).toString('base64'))

let failed = 0
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` (${detail})`}`)
  if (!ok) failed++
}

const named = mod.buildWelcomeEmail('Sam')
check('subject', named.subject === 'Welcome to DEADWORK!', named.subject)
check('greets by first name', named.text.startsWith('Hey Sam,'), named.text.slice(0, 20))
check('falls back to "there"', mod.buildWelcomeEmail(null).text.startsWith('Hey there,'))
check('tagline sits right above the sign-off', named.text.endsWith('Create more. Manage less.\nDEADWORK STUDIO\n'))
check('name is escaped in html', mod.buildWelcomeEmail('<b>x</b>').html.includes('Hey &lt;b&gt;x&lt;/b&gt;,'))
check('no AI wording', !/\bAI\b|artificial|machine learning/i.test(named.text + named.html))

if (failed) process.exit(1)
