// The welcome email every new website signup gets ("Welcome to DEADWORK!"). Daniel's own copy,
// approved 2026-10-30. Sent from this Worker over Gmail SMTP (src/mailer.ts) rather than as a Kit
// automation: Kit sending as a @gmail.com address fails Gmail's DMARC check and tends to land in
// spam, while a real Gmail send passes it.

import { sendMail, type MailEnv } from './mailer'

export const WELCOME_SUBJECT = 'Welcome to DEADWORK!'

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export function buildWelcomeEmail(firstName: string | null): { subject: string; text: string; html: string } {
  const name = firstName || 'there'
  const paragraphs = [
    `Hey ${name},`,
    "Thanks for signing up. You're on the list.",
    'DEADWORK is a small studio in Los Angeles building tools for filmmakers.',
    "We'll let you know when something new drops. No spam. Just real updates.",
    'Questions? Just reply to this email.'
  ]
  const signoff = ['Create more. Manage less.', 'DEADWORK STUDIO']
  const text = `${paragraphs.join('\n\n')}\n\n${signoff.join('\n')}\n`
  const p = 'margin:0 0 16px'
  const html =
    `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">` +
    paragraphs.map((line) => `<p style="${p}">${escapeHtml(line)}</p>`).join('') +
    `<p style="${p}">${signoff.map(escapeHtml).join('<br>')}</p></div>`
  return { subject: WELCOME_SUBJECT, text, html }
}

export async function sendWelcomeEmail(env: MailEnv, email: string, firstName: string | null): Promise<void> {
  await sendMail(env, { to: email, ...buildWelcomeEmail(firstName), fromName: 'DEADWORK STUDIO' })
}
