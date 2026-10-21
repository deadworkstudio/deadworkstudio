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
