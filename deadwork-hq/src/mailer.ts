// deadwork-hq/src/mailer.ts
// A separate copy of footage-curator/worker's own src/mailer.ts — same Gmail-over-SMTP-via-
// WorkerMailer pattern, same reasoning as syncToKit's own "ported, kept as a separate copy since
// these two Workers are deliberately independent of each other" comment in src/index.ts. The only
// email this Worker sends today is the daily digest (see digest.ts); this helper exists so that,
// like footage-curator/worker, the connection settings only ever live in one place even if a
// second kind of email ever gets added here later.

import { WorkerMailer } from 'worker-mailer'

export interface MailEnv {
  GMAIL_USER?: string
  GMAIL_APP_PASSWORD?: string
}

export interface MailMessage {
  to: string
  subject: string
  text: string
  html: string
  /** Defaults to 'DEADWORK HQ' (the internal digest). Customer-facing mail passes 'DEADWORK STUDIO'. */
  fromName?: string
}

/** Throws if GMAIL_USER/GMAIL_APP_PASSWORD aren't configured yet, or if the send itself fails —
 *  callers decide for themselves whether that should be fatal or just logged (see digest.ts). */
export async function sendMail(env: MailEnv, message: MailMessage): Promise<void> {
  if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) {
    throw new Error('GMAIL_USER/GMAIL_APP_PASSWORD are not configured — run `wrangler secret put` for both before mail can send')
  }
  const mailer = await WorkerMailer.connect({
    credentials: { username: env.GMAIL_USER, password: env.GMAIL_APP_PASSWORD },
    authType: 'plain',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    startTls: true
  })
  await mailer.send({
    from: { name: message.fromName ?? 'DEADWORK HQ', email: env.GMAIL_USER },
    to: { email: message.to },
    subject: message.subject,
    text: message.text,
    html: message.html
  })
}

// Same hosted logo footage-curator/worker's own EMAIL_LOGO_FOOTER points at — already public,
// already the source of truth for every other image this project uses.
//
// CAN-SPAM requires a valid physical postal address on commercial email (a PO Box is fine). No
// real address has been provided yet — rather than ship a visible "[mailing address needed]"
// placeholder, the footer omits the address line entirely until this is set to a real one.
// TODO(Daniel): set this to your real mailing address, then the footer will include it again.
const MAILING_ADDRESS: string | null = null
export const EMAIL_LOGO_FOOTER =
  `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #333"><img src="https://stockshredder.github.io/deadwork-logo.png" alt="DEADWORK — Los Angeles, CA" width="160" style="display:block" />${MAILING_ADDRESS ? `<p style="margin-top:12px;font-size:11px;color:#888">${MAILING_ADDRESS}</p>` : ''}</div>`
