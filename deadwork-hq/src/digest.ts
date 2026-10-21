// deadwork-hq/src/digest.ts
// The owner's ask: "any update is a notification" — one periodic summary of new signups, instead
// of no notification email at all (this Worker didn't send any email to the owner before this —
// only syncToKit, which is for Kit's own follow-up sequences, not a heads-up to a human). Runs
// off a Cloudflare Cron Trigger (see wrangler.toml's [triggers] block and index.ts's scheduled()
// export), not a real request.
//
// The actual "is there anything to say, and what" logic lives in digestSummary.ts, split out
// because it has zero Cloudflare/worker-mailer imports and so can be tested directly under plain
// Node (see test-digest-logic.mjs) — the same split footage-curator/worker uses for its own
// digest. This file is just the stateful glue: figure out "since when," read the signups table,
// and (if there's something to report) send it and advance the "last digest" watermark.

import { listSignups, PRODUCT_LABELS, type Env } from './index'
import { sendMail, EMAIL_LOGO_FOOTER } from './mailer'
import { buildDigestSummary, type DigestSummary } from './digestSummary'

const DIGEST_LAST_SENT_KV_KEY = 'digest:last-sent-at'
const DIGEST_RECIPIENT = 'deadworkstudio@gmail.com'

/** No prior digest on record (first run after this feature deploys) starts the window at 24
 *  hours ago rather than the beginning of time — this cron runs daily, so that's the natural
 *  "since the last one" window, and it avoids a first-ever digest dumping this Worker's entire
 *  signup history into one email. */
const DEFAULT_LOOKBACK_MS = 24 * 60 * 60 * 1000

export interface DigestRunResult {
  /** True if there was anything new to report — NOT whether the email itself was confirmed
   *  delivered (see the comment on the send below for why those are tracked separately). */
  hadNewActivity: boolean
  emailSent: boolean
  summary?: DigestSummary
}

/** The actual Cron Trigger handler's work (see index.ts's scheduled() export), plus a test-only
 *  HTTP route that calls this directly so test-digest.mjs can exercise the full stateful flow
 *  without waiting for a real scheduled event.
 *
 *  `now` is a parameter (not a bare `Date.now()` call) so tests can simulate a later run without
 *  actually sleeping. */
export async function runDailyDigest(env: Env, now: number = Date.now()): Promise<DigestRunResult> {
  const lastSentRaw = await env.NOTIFY_SIGNUPS.get(DIGEST_LAST_SENT_KV_KEY)
  const since = lastSentRaw ? Number(lastSentRaw) : now - DEFAULT_LOOKBACK_MS

  const signups = await listSignups(env.SIGNUPS_DB)
  const newSignups = signups.filter((s) => s.createdAt >= since)

  const summary = buildDigestSummary(newSignups, PRODUCT_LABELS)
  if (!summary) return { hadNewActivity: false, emailSent: false }

  // The watermark advances as soon as we've decided there's something to report — BEFORE
  // attempting the send — same ordering footage-curator/worker's own /report-issue (and its own
  // digest) already use for a durable record vs. a best-effort email: a flaky SMTP connection
  // must never be able to make this digest replay the same signups again tomorrow. The signups
  // table itself is always the real source of truth and stays queryable in the admin dashboard
  // regardless of whether any digest email about it ever went out.
  await env.NOTIFY_SIGNUPS.put(DIGEST_LAST_SENT_KV_KEY, String(now))

  let emailSent = false
  try {
    await sendMail(env, { to: DIGEST_RECIPIENT, subject: summary.subject, text: summary.text, html: `${summary.html}${EMAIL_LOGO_FOOTER}` })
    emailSent = true
  } catch (err) {
    console.log('runDailyDigest: sendMail threw', err instanceof Error ? err.message : String(err))
  }

  return { hadNewActivity: true, emailSent, summary }
}
