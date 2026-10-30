// The welcome email every new website signup gets ("Welcome to DEADWORK!"). Daniel's own copy,
// approved 2026-10-30. Sent from this Worker over Gmail SMTP (src/mailer.ts) rather than as a Kit
// automation: Kit sending as a @gmail.com address fails Gmail's DMARC check and tends to land in
// spam, while a real Gmail send passes it.

import { sendMail, type MailEnv } from './mailer'

export const WELCOME_SUBJECT = 'Welcome to DEADWORK!'

const SITE_URL = 'https://deadworkstudio.com'
const STOCK_SHREDDER_URL = 'https://deadworkstudio.com/products/stock-shredder'
// Same profiles as the site footer.
const SOCIALS = [
  { label: 'Instagram', url: 'https://www.instagram.com/deadworkstudio/' },
  { label: 'YouTube', url: 'https://www.youtube.com/@deadworkstudio' },
  { label: 'TikTok', url: 'https://www.tiktok.com/@deadworkstudio' }
]

const LINK = 'color:#111;text-decoration:underline'

// "Stock Shredder" in the html is a link to its page; the plain-text version spells out the URL.
function linkify(escaped: string): string {
  return escaped.replace('Stock Shredder', `<a href="${STOCK_SHREDDER_URL}" style="${LINK}">Stock Shredder</a>`)
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export function buildWelcomeEmail(firstName: string | null): { subject: string; text: string; html: string } {
  const name = firstName || 'there'
  const paragraphs = [
    `Hey ${name},`,
    "Thanks for signing up. You're on the list.",
    'DEADWORK is a small studio of filmmakers in Los Angeles building tools for filmmakers. Thank you for the support.',
    'Our first tool, Stock Shredder, is out now.',
    "We'll let you know when something new drops. No spam. Just real updates.",
    'Questions? Just reply to this email.'
  ]
  const signoff = ['Create more. Manage less.', 'By Artists. For Artists.']
  const footerText = `DEADWORK STUDIO\ndeadworkstudio.com\n${SOCIALS.map((s) => `${s.label}: ${s.url}`).join('\n')}`
  const textParagraphs = paragraphs.map((line) => (line.startsWith('Our first tool') ? `${line}\n${STOCK_SHREDDER_URL}` : line))
  const text = `${textParagraphs.join('\n\n')}\n\n${signoff.join('\n')}\n\n${footerText}\n`
  const footerHtml =
    `<p style="margin:0">DEADWORK STUDIO</p>` +
    `<p style="margin:4px 0 0;font-size:13px;color:#555">` +
    `<a href="${SITE_URL}" style="${LINK}">deadworkstudio.com</a><br>` +
    SOCIALS.map((s) => `<a href="${s.url}" style="${LINK}">${s.label}</a>`).join(' &middot; ') +
    `</p>`
  const p = 'margin:0 0 16px'
  const html =
    `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">` +
    paragraphs.map((line) => `<p style="${p}">${linkify(escapeHtml(line))}</p>`).join('') +
    `<p style="${p}">${signoff.map(escapeHtml).join('<br>')}</p>${footerHtml}</div>`
  return { subject: WELCOME_SUBJECT, text, html }
}

export async function sendWelcomeEmail(env: MailEnv, email: string, firstName: string | null): Promise<void> {
  await sendMail(env, { to: email, ...buildWelcomeEmail(firstName), fromName: 'DEADWORK STUDIO' })
}
