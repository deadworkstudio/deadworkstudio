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
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}

// Keep in sync with the product slugs actually linked on the live site — Scene Lock, Set Control,
// Handoff, and Sound Driver are unpublished for now (pages still exist, just unlinked), so their
// slugs are deliberately not accepted here even though the pages' own notify forms still exist.
const VALID_PRODUCTS = new Set(['loadout'])

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
  let payload: { email?: unknown; product?: unknown }
  try {
    payload = await request.json()
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body.' }, 400)
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

    const url = new URL(request.url)
    if (url.pathname === '/notify' && request.method === 'POST') {
      return handleNotify(request, env)
    }

    return jsonResponse({ ok: false, error: 'Not found.' }, 404)
  }
}
