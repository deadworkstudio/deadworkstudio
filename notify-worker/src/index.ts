// DEADWORK — notify-worker
//
// A tiny, standalone Cloudflare Worker that powers the inline "Notify me" email capture forms on
// the deadwork-site marketing site's in-development product pages. Deliberately separate from the
// Stock Shredder payments Worker
// (`footage-curator/worker`) — that one is scoped to paying customers (Stripe, activation keys,
// iPhone pairing); this one just wants a public, low-stakes email address + which product someone
// is interested in. Mixing the two would mean every future change to one risks the other.
//
// One endpoint: POST /notify { email, product } -> { ok: true }
// Storage: a single KV namespace, keyed by email, holding every product that email signed up for
// plus when. Someone can sign up for more than one product — each POST just appends to their list
// (skipping an exact product they already signed up for, so re-submitting the same form twice
// doesn't create duplicate entries).

export interface Env {
  NOTIFY_SIGNUPS: KVNamespace
  ADMIN_KEY: string
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}

// Keep in sync with the product slugs actually linked on the live site. 'general' is the
// site-wide Join page signup — not tied to a specific product.
const VALID_PRODUCTS = new Set(['scene-lock', 'set-control', 'loadout', 'handoff', 'sound-driver', 'general'])

// Deliberately simple/server-side only: good enough to reject typos and garbage, not meant to be
// an exhaustive RFC 5322 validator. The point is "don't trust client-side validation alone."
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface SignupEntry {
  product: string
  timestamp: string
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  })
}

async function handleNotify(request: Request, env: Env): Promise<Response> {
  let payload: { email?: unknown; product?: unknown; company?: unknown }
  try {
    payload = await request.json()
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body.' }, 400)
  }

  // Honeypot: "company" is a field real visitors never see or fill (hidden via CSS on the form).
  // A non-empty value means whatever submitted this skipped the page's styling — almost certainly a
  // bot. Report success without writing anything, so the bot doesn't learn to look elsewhere.
  if (typeof payload.company === 'string' && payload.company.trim()) {
    return jsonResponse({ ok: true })
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : ''
  const product = typeof payload.product === 'string' ? payload.product.trim() : ''

  if (!email || !EMAIL_RE.test(email) || email.length > 320) {
    return jsonResponse({ ok: false, error: 'That email address looks invalid.' }, 400)
  }
  if (!VALID_PRODUCTS.has(product)) {
    return jsonResponse({ ok: false, error: 'Unknown product.' }, 400)
  }

  const existingRaw = await env.NOTIFY_SIGNUPS.get(email)
  const existing: SignupEntry[] = existingRaw ? JSON.parse(existingRaw) : []

  if (!existing.some((entry) => entry.product === product)) {
    existing.push({ product, timestamp: new Date().toISOString() })
    await env.NOTIFY_SIGNUPS.put(email, JSON.stringify(existing))
  }

  return jsonResponse({ ok: true })
}

interface Signup {
  email: string
  entries: SignupEntry[]
}

// KV's list() is paginated (1000 keys max per call) — loop with the cursor until it's exhausted.
// Fine at the scale this list will realistically reach; worth revisiting if it ever gets huge.
async function getAllSignups(env: Env): Promise<Signup[]> {
  const signups: Signup[] = []
  let cursor: string | undefined
  do {
    const page = await env.NOTIFY_SIGNUPS.list({ cursor })
    for (const key of page.keys) {
      const raw = await env.NOTIFY_SIGNUPS.get(key.name)
      if (!raw) continue
      signups.push({ email: key.name, entries: JSON.parse(raw) })
    }
    cursor = page.list_complete ? undefined : page.cursor
  } while (cursor)

  // Most recent signup first — that's who you'd want to follow up with first.
  signups.sort((a, b) => latestTimestamp(b.entries).localeCompare(latestTimestamp(a.entries)))
  return signups
}

function latestTimestamp(entries: SignupEntry[]): string {
  return entries.reduce((latest, e) => (e.timestamp > latest ? e.timestamp : latest), '')
}

function checkAdminKey(request: Request, env: Env): boolean {
  if (!env.ADMIN_KEY) return false
  const url = new URL(request.url)
  return url.searchParams.get('key') === env.ADMIN_KEY
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value
}

function toCsv(signups: Signup[]): string {
  const rows = ['email,products,first_signup,last_signup']
  for (const s of signups) {
    const products = s.entries.map((e) => e.product).join('; ')
    const timestamps = s.entries.map((e) => e.timestamp).sort()
    rows.push(
      [s.email, products, timestamps[0] ?? '', timestamps[timestamps.length - 1] ?? '']
        .map(csvEscape)
        .join(',')
    )
  }
  return rows.join('\n')
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function toHtml(signups: Signup[], key: string): string {
  const rows = signups
    .map((s) => {
      const products = s.entries.map((e) => escapeHtml(e.product)).join(', ')
      const latest = latestTimestamp(s.entries).slice(0, 10)
      return `<tr><td>${escapeHtml(s.email)}</td><td>${products}</td><td>${latest}</td></tr>`
    })
    .join('\n')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>DEADWORK — Notify signups</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; background: #141210; color: #e6e0d3; padding: 32px; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  p { color: #9a9488; font-size: 13px; margin-top: 0; }
  a.download { color: #e6e0d3; }
  table { border-collapse: collapse; width: 100%; margin-top: 20px; font-size: 14px; }
  th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid rgba(230,224,211,0.15); }
  th { color: #9a9488; font-weight: 500; text-transform: uppercase; font-size: 11px; letter-spacing: 0.08em; }
</style>
</head>
<body>
  <h1>Notify signups (${signups.length})</h1>
  <p>Most recent first. <a class="download" href="/admin/signups.csv?key=${encodeURIComponent(key)}">Download CSV</a></p>
  <table>
    <thead><tr><th>Email</th><th>Product(s)</th><th>Last signup</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

    const url = new URL(request.url)
    if (url.pathname === '/notify' && request.method === 'POST') {
      return handleNotify(request, env)
    }

    if (url.pathname === '/admin/signups' && request.method === 'GET') {
      if (!checkAdminKey(request, env)) return new Response('Not found.', { status: 404 })
      const signups = await getAllSignups(env)
      return new Response(toHtml(signups, url.searchParams.get('key') ?? ''), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }

    if (url.pathname === '/admin/signups.csv' && request.method === 'GET') {
      if (!checkAdminKey(request, env)) return new Response('Not found.', { status: 404 })
      const signups = await getAllSignups(env)
      return new Response(toCsv(signups), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="deadwork-notify-signups.csv"'
        }
      })
    }

    return jsonResponse({ ok: false, error: 'Not found.' }, 404)
  }
}
