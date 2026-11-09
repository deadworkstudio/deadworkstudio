// deadwork-hq/src/digestSummary.ts
// Pure digest-building logic, split out of digest.ts so it has zero Cloudflare/worker-mailer
// imports and can be bundled with esbuild and run directly under plain Node (see
// test-digest-logic.mjs) — the same split footage-curator/worker/src/digestSummary.ts uses, for
// the same reason: digest.ts itself transitively imports worker-mailer, and worker-mailer's own
// `require("cloudflare:sockets")` has no equivalent outside a real Worker.

export interface SignupLike {
  product: string
}

export interface DigestSummary {
  totalNew: number
  byProduct: Record<string, number>
  subject: string
  text: string
  /** No logo footer baked in here — the caller appends EMAIL_LOGO_FOOTER itself before sending. */
  html: string
}

/** `null` means "nothing happened — don't send anything," per the owner's explicit "skip entirely
 *  when there's nothing new, no empty emails" requirement. `productLabels` is passed in (rather
 *  than imported) so this stays a plain function with no dependency on index.ts's own
 *  PRODUCT_LABELS constant — test-digest-logic.mjs can pass its own small fixture instead. */
export function buildDigestSummary(newSignups: SignupLike[], productLabels: Record<string, string>): DigestSummary | null {
  if (newSignups.length === 0) return null

  const byProduct: Record<string, number> = {}
  for (const s of newSignups) byProduct[s.product] = (byProduct[s.product] ?? 0) + 1

  const breakdown = Object.entries(byProduct)
    .sort((a, b) => b[1] - a[1])
    .map(([product, count]) => `${productLabels[product] ?? product}: ${count}`)

  const text = ['DEADWORK HQ — daily signup digest', '', `${newSignups.length} new signup${newSignups.length === 1 ? '' : 's'} total`, '', ...breakdown].join('\n')
  const html = `<p><strong>${newSignups.length} new signup${newSignups.length === 1 ? '' : 's'} total</strong></p><ul>${breakdown.map((line) => `<li>${line}</li>`).join('')}</ul>`

  return {
    totalNew: newSignups.length,
    byProduct,
    subject: `DEADWORK HQ daily digest — ${newSignups.length} new signup${newSignups.length === 1 ? '' : 's'}`,
    text,
    html
  }
}

/** Stock Shredder's part of the morning email, as returned by the payments Worker's
 *  /internal/daily-digest route (Daniel 2026-11-08: one morning email, not two). */
export interface StockShredderDaily {
  sales: { headline: string; lines: string[]; details: string[] }
  updates: { text: string; html: string } | null
  /** Site visits from the payments Worker's own visit log (Daniel 2026-11-08: page views + social). */
  website?: { lines: string[]; sources: string[] } | null
}

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Puts the site sign-ups and Stock Shredder's numbers into one email. With Stock Shredder's part
 *  present the email goes out every day (a quiet day still says so); without it, the old rule
 *  stands: no sign-ups, no email. */
export function buildCombinedDigest(signups: DigestSummary | null, ss: StockShredderDaily | null, social: string[] = []): { subject: string; text: string; html: string } | null {
  if (!signups && !ss && !social.length) return null
  const signupCount = signups?.totalNew ?? 0
  const subjectParts = [`${signupCount} new signup${signupCount === 1 ? '' : 's'}`]
  if (ss) subjectParts.push(ss.sales.headline)
  const subject = `DEADWORK HQ daily digest — ${subjectParts.join(' · ')}`

  const text: string[] = ['DEADWORK HQ — daily digest', '']
  const html: string[] = []
  if (ss) {
    text.push('Stock Shredder (last 24 hours)', ...ss.sales.lines.map((l) => `  ${l}`))
    html.push(`<p><strong>Stock Shredder</strong> (last 24 hours)</p><ul>${ss.sales.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`)
    if (ss.sales.details.length) {
      text.push('', 'Who paid:', ...ss.sales.details.map((d) => `  - ${d}`))
      html.push(`<p><strong>Who paid:</strong></p><ul>${ss.sales.details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>`)
    }
    if (ss.website?.lines?.length) {
      text.push('', 'Website (last 24 hours)', ...ss.website.lines.map((l) => `  ${l}`))
      html.push(`<p><strong>Website</strong> (last 24 hours)</p><ul>${ss.website.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`)
      if (ss.website.sources.length) {
        text.push('', 'Where visitors came from:', ...ss.website.sources.map((l) => `  - ${l}`))
        html.push(`<p><strong>Where visitors came from:</strong></p><ul>${ss.website.sources.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`)
      }
    }
    if (ss.updates) {
      text.push('', ss.updates.text)
      html.push(ss.updates.html)
    }
    text.push('')
  }
  if (social.length) {
    text.push('Social media', ...social.map((l) => `  ${l}`), '')
    html.push(`<p><strong>Social media</strong></p><ul>${social.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`)
  }
  text.push('Website signups', signups ? signups.text.split('\n').slice(2).join('\n') : '0 new signups')
  html.push(`<p><strong>Website signups</strong></p>${signups ? signups.html : '<p>0 new signups</p>'}`)
  return { subject, text: text.join('\n'), html: html.join('') }
}
