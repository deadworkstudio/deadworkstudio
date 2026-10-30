// The welcome email every new website signup gets ("Welcome to DEADWORK!"). Daniel's own copy,
// approved 2026-10-30. Sent from this Worker over Gmail SMTP (src/mailer.ts) rather than as a Kit
// automation: Kit sending as a @gmail.com address fails Gmail's DMARC check and tends to land in
// spam, while a real Gmail send passes it.

import { sendMail, type MailEnv } from './mailer'

export const WELCOME_SUBJECT = 'Welcome to DEADWORK!'

const SITE_URL = 'https://deadworkstudio.com'
const STOCK_SHREDDER_URL = 'deadworkstudio.com/products/stock-shredder'
// Same profiles as the site footer.
const SOCIALS = [
  { label: 'Instagram', url: 'https://www.instagram.com/deadworkstudio/' },
  { label: 'YouTube', url: 'https://www.youtube.com/@deadworkstudio' },
  { label: 'TikTok', url: 'https://www.tiktok.com/@deadworkstudio' }
]

const LINK = 'color:#111;text-decoration:underline'
const STOCK_SHREDDER_LINE = 'Our first tool, Stock Shredder, is out now.'

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// "Stock Shredder" itself is the link in the html version; the plain-text version spells out the URL.
function toHtml(line: string): string {
  const escaped = escapeHtml(line)
  if (line !== STOCK_SHREDDER_LINE) return escaped
  return escaped.replace('Stock Shredder', `<a href="https://${STOCK_SHREDDER_URL}" style="${LINK}">Stock Shredder</a>`)
}

export function buildWelcomeEmail(firstName: string | null): { subject: string; text: string; html: string } {
  const name = firstName || 'there'
  const paragraphs = [
    `Hey ${name},`,
    "Thanks for signing up. You're on the list.",
    'DEADWORK is a small studio of filmmakers in Los Angeles building tools for filmmakers. Thank you for the support.',
    STOCK_SHREDDER_LINE,
    "We'll let you know when something new drops. No spam. Just real updates.",
    'Questions? Just reply to this email.'
  ]
  const taglines = ['Create more. Manage less.', 'By Artists. For Artists.']
  const textParagraphs = paragraphs.map((line) => (line === STOCK_SHREDDER_LINE ? `${line} ${STOCK_SHREDDER_URL}` : line))
  const footerText = `DEADWORK STUDIO\ndeadworkstudio.com\n${SOCIALS.map((s) => `${s.label}: ${s.url}`).join('\n')}`
  const text = `${textParagraphs.join('\n\n')}\n\n${taglines.join('\n')}\n\n${footerText}\n`
  const p = 'margin:0 0 16px'
  const html =
    `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">` +
    paragraphs.map((line) => `<p style="${p}">${toHtml(line)}</p>`).join('') +
    `<p style="${p}">${taglines.map(escapeHtml).join('<br>')}</p>` +
    `<p style="margin:24px 0 0">DEADWORK STUDIO<br>` +
    `<a href="${SITE_URL}" style="${LINK}">deadworkstudio.com</a><br>` +
    SOCIALS.map((s) => `<a href="${s.url}" style="${LINK}">${s.label}</a>`).join(' &middot; ') +
    `</p></div>`
  return { subject: WELCOME_SUBJECT, text, html }
}

export async function sendWelcomeEmail(env: MailEnv, email: string, firstName: string | null): Promise<void> {
  await sendMail(env, { to: email, ...buildWelcomeEmail(firstName), fromName: 'DEADWORK STUDIO' })
}
