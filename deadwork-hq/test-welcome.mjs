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
check('taglines sit above the sign-off', named.text.includes('Create more. Manage less.\nBy Artists. For Artists.\n\nDEADWORK STUDIO\ndeadworkstudio.com\n'))
check('mentions Stock Shredder with its page', named.text.includes('Our first tool, Stock Shredder, is out now. deadworkstudio.com/products/stock-shredder') && named.html.includes('href="https://deadworkstudio.com/products/stock-shredder" style="color:#111;text-decoration:underline">Stock Shredder</a>, is out now.'))
check('footer has the site and socials', ['https://deadworkstudio.com', 'instagram.com/deadworkstudio', 'youtube.com/@deadworkstudio', 'tiktok.com/@deadworkstudio'].every((u) => named.html.includes(u)))
check('name is escaped in html', mod.buildWelcomeEmail('<b>x</b>').html.includes('Hey &lt;b&gt;x&lt;/b&gt;,'))
check('no AI wording', !/\bAI\b|artificial|machine learning/i.test(named.text + named.html))

if (failed) process.exit(1)
