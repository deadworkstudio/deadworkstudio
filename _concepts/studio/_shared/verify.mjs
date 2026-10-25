// node _shared/verify.mjs option-0N   — checks a concept keeps every word of the current Studio page
import { createRequire } from 'module'
const { chromium } = createRequire('/tmp/')('playwright')
import path from 'path'
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const opt = process.argv[2]
const b = await chromium.launch()
const grab = async (url, sel) => {
  const pg = await b.newPage(); await pg.goto(url); await pg.waitForTimeout(300)
  const r = await pg.evaluate((sel) => {
    const txt = (el) => { if (!el) return ''; const c = el.cloneNode(true); c.querySelectorAll('script,style,template,noscript').forEach(n => n.remove()); return c.textContent.replace(/\s+/g, ' ').trim() }
    const m = document.querySelector(sel)
    return {
      main: txt(m), header: txt(document.querySelector('header.poster-head')), footer: txt(document.querySelector('footer.poster-foot')),
      alts: [...(m ? m.querySelectorAll('img[alt]') : [])].map(i => i.alt).filter(a => a.trim()),
      form: !!(m && m.querySelector('form[data-notify-form] input[type=email][data-notify-email]') && m.querySelector('[data-notify-hp]') && m.querySelector('[data-notify-submit]') && m.querySelector('[data-notify-status]'))
    }
  }, sel)
  await pg.close(); return r
}
const orig = await grab('file://' + path.join(root, '../../studio/index.html'), 'main')
const con = await grab('file://' + path.join(root, opt, 'index.html'), 'main')
await b.close()
const norm = s => s.replace(/\b0([1-6])\b/g, '$1')
let ok = true
const cmp = (label, a, c) => {
  if (norm(a) === norm(c)) { console.log('PASS', label); return }
  ok = false; const A = norm(a).split(' '), C = norm(c).split(' ')
  let i = 0; while (i < A.length && A[i] === C[i]) i++
  console.log('FAIL', label, '— first difference at word', i, '\n  expected: …' + A.slice(Math.max(0, i - 6), i + 10).join(' ') + '\n  got:      …' + C.slice(Math.max(0, i - 6), i + 10).join(' '))
}
cmp('main content wording and order', orig.main, con.main)
cmp('header text', orig.header, con.header)
cmp('footer text', orig.footer, con.footer)
if (con.alts.length) { ok = false; console.log('FAIL image alt text adds words:', con.alts) } else console.log('PASS no added image text')
if (!con.form) { ok = false; console.log('FAIL email form missing its notify.js hooks') } else console.log('PASS email form intact')
console.log(ok ? 'ALL PASS' : 'FIX NEEDED'); process.exit(ok ? 0 : 1)
