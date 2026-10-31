// DEADWORK HQ — the shared Cloudflare Worker that collects every email signup across all 6
// DEADWORK products (Scene Lock, Set Control, Loadout, Handoff, Sound Driver, Stock Shredder)
// plus the site's general /join page into one place, with a real admin dashboard.
//
// Evolved from notify-worker (renamed in place, git history preserved via `git mv` — this is the
// same service, not a fresh start). What changed:
//   - Storage moved from a KV namespace (one JSON blob per email) to a D1 database (one row per
//     email+product pair) — see migrations/0001_signups.sql. Simpler to query, matches how
//     footage-curator/worker's own `leads` table already works.
//   - The admin view moved from a bare HTML table gated by `?key=` in the URL to a real
//     password-login dashboard, matching footage-curator/worker's own admin page shape (same dark
//     theme, same escapeHtml/CSP-nonce/requireAdmin reasoning — see that file for the pattern
//     this mirrors).
//   - `stock-shredder` was added as a 6th valid product, fed by footage-curator/worker's own
//     /lead route (Stock Shredder's desktop app), in addition to the 5 in-development products'
//     website "Notify me" forms.
//
// One public endpoint, unchanged in shape: POST /notify { email, product, company? } -> { ok: true }

import { runDailyDigest } from './digest'
import { sendWelcomeEmail } from './welcome'

export interface Env {
  SIGNUPS_DB: D1Database
  /** Legacy store from before this Worker had a real database. Kept bound, read-only in
   *  practice, solely so POST /admin/migrate-kv can read every signup ever written here and copy
   *  it into D1. Never written to again after that one-time call, aside from two other things
   *  that reuse this same namespace the way footage-curator/worker reuses its own INVITES KV for
   *  more than one purpose: rate-limit counters for the admin login, and the daily digest's own
   *  "last sent at" watermark (see digest.ts). */
  NOTIFY_SIGNUPS: KVNamespace
  /** Set via `wrangler secret put ADMIN_KEY` — guards the admin dashboard's login and the
   *  one-time KV migration endpoint. A single shared password is enough for a one-person back
   *  office; there's no per-user login here, same reasoning as footage-curator/worker's
   *  ADMIN_PASSWORD. */
  ADMIN_KEY?: string
  /** Set via `wrangler secret put KIT_API_KEY` — same Kit (ConvertKit) account/key as
   *  footage-curator/worker's own syncToKit. Mirrors every signup into Kit so a real person can
   *  follow up and sell; best-effort, see syncToKit() below. */
  KIT_API_KEY?: string
  /** Local test/dev only. Set exclusively via unstable_dev's `vars` option in this project's
   *  test-*.mjs files — never as a real `wrangler secret put` value. Gates both /_test/* routes
   *  below; if this were ever set on the deployed Worker, either route would let anyone wipe or
   *  forge signup data, so it must never appear in wrangler.toml or the Cloudflare dashboard. */
  ALLOW_TEST_BYPASS?: string
  /** NOT yet configured on the real deployed Worker as of this writing — set both via
   *  `wrangler secret put GMAIL_USER` / `wrangler secret put GMAIL_APP_PASSWORD` before the daily
   *  digest cron (see digest.ts and wrangler.toml's [triggers] block) can actually send mail.
   *  Same Gmail account/SMTP pattern footage-curator/worker already uses for its own emails — see
   *  src/mailer.ts, a separate copy of that same pattern (these two Workers are deliberately
   *  independent of each other, same reasoning as syncToKit above). */
  GMAIL_USER?: string
  GMAIL_APP_PASSWORD?: string
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

// Keep in sync with the product slugs actually linked on the live site, plus Stock Shredder (fed
// by footage-curator/worker's /lead route, not a website form — see that Worker's own notice).
// 'general' is the site-wide Join page signup — not tied to a specific product.
const VALID_PRODUCTS = new Set(['scene-lock', 'set-control', 'loadout', 'handoff', 'sound-driver', 'stock-shredder', 'general'])

// Display names — used for the Kit tags, the admin dashboard's stat tiles, and the daily digest
// email's per-product breakdown (see digest.ts).
export const PRODUCT_LABELS: Record<string, string> = {
  'scene-lock': 'Scene Lock',
  'set-control': 'Set Control',
  loadout: 'Loadout',
  handoff: 'Handoff',
  'sound-driver': 'Sound Driver',
  'stock-shredder': 'Stock Shredder',
  general: 'General (Join page)'
}

const KIT_API_BASE = 'https://api.kit.com/v4'

// Mirrors every signup in Kit, tagged by which product they're interested in, so a real person
// can follow up and sell — separate from the D1 table above, which stays the source of truth for
// the admin dashboard. Best-effort: if Kit is down or the key is wrong, the visitor's signup
// still succeeds (it's already saved to D1) and we just skip the Kit sync for this one.
async function syncToKit(env: Env, email: string, product: string, firstName: string | null): Promise<void> {
  if (!env.KIT_API_KEY) {
    console.log('syncToKit: no KIT_API_KEY set, skipping')
    return
  }

  const headers = {
    'X-Kit-Api-Key': env.KIT_API_KEY,
    'Content-Type': 'application/json'
  }

  const subRes = await fetch(`${KIT_API_BASE}/subscribers`, {
    method: 'POST',
    headers,
    // Kit's create-subscriber is an upsert, so first_name is only sent when we have one; sending
    // an empty value on a later nameless signup would wipe the name Kit already has.
    body: JSON.stringify(firstName ? { email_address: email, first_name: firstName } : { email_address: email })
  })
  if (!subRes.ok) {
    console.log('syncToKit: create subscriber failed', subRes.status, await subRes.text())
    return
  }

  const tagName = PRODUCT_LABELS[product] ?? product
  const tagRes = await fetch(`${KIT_API_BASE}/tags`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: tagName })
  })
  if (!tagRes.ok) {
    console.log('syncToKit: create tag failed', tagRes.status, await tagRes.text())
    return
  }
  const tagData: { tag?: { id?: number } } = await tagRes.json()
  const tagId = tagData.tag?.id
  if (!tagId) {
    console.log('syncToKit: tag response had no id', JSON.stringify(tagData))
    return
  }

  const applyRes = await fetch(`${KIT_API_BASE}/tags/${tagId}/subscribers`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email_address: email })
  })
  if (!applyRes.ok) {
    console.log('syncToKit: apply tag failed', applyRes.status, await applyRes.text())
    return
  }
  console.log('syncToKit: success for', email, tagName)
}

// Deliberately simple/server-side only: good enough to reject typos and garbage, not meant to be
// an exhaustive RFC 5322 validator. The point is "don't trust client-side validation alone."
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  })
}

export interface SignupRow {
  email: string
  /** From the signup form's First name field. Null for rows written before
   *  migrations/0003_signup_first_name.sql and for an old cached notify.js. */
  firstName: string | null
  product: string
  createdAt: number
  /** The visitor's own document.referrer at submission time (or the literal string 'direct'
   *  when there wasn't one) — see assets/js/notify.js. Null for every row written before
   *  migrations/0002_signup_source.sql, and for any submission from an old cached copy of that
   *  script that never sent the field at all. */
  source: string | null
  /** The site path the "Notify me" form lived on (e.g. '/loadout/'). Same null-for-old-rows story
   *  as `source` above. */
  page: string | null
}

function rowToSignup(row: Record<string, unknown>): SignupRow {
  return {
    email: row.email as string,
    firstName: (row.first_name as string) ?? null,
    product: row.product as string,
    createdAt: row.created_at as number,
    source: (row.source as string) ?? null,
    page: (row.page as string) ?? null
  }
}

/** One row per email+product pair — `UNIQUE(email, product)` in the schema plus `INSERT OR
 *  IGNORE` means re-submitting the same product for the same email is a silent no-op, same
 *  behavior the old KV-backed version had. `meta.changes` (not `rows_written`, which reports a
 *  nonzero count even for a row INSERT OR IGNORE ended up skipping) is the actual "did this
 *  statement change anything" signal — same field footage-curator/worker's own
 *  claimFreeTrialDevice uses for this identical atomic-check-and-claim pattern. Returns whether a
 *  new row was actually written, so callers (notably the KV migration below) can report real
 *  counts instead of guessing. */
async function insertSignup(db: D1Database, email: string, product: string, createdAt: number, source: string | null, page: string | null, firstName: string | null = null): Promise<boolean> {
  const { meta } = await db
    .prepare('INSERT OR IGNORE INTO signups (email, product, created_at, source, page, first_name) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(email, product, createdAt, source, page, firstName)
    .run()
  return meta.changes > 0
}

// Exported so digest.ts can read the same signups this admin dashboard reads, without a second
// copy of this query living in two places.
export async function listSignups(db: D1Database): Promise<SignupRow[]> {
  const { results } = await db.prepare('SELECT email, first_name, product, created_at, source, page FROM signups ORDER BY created_at DESC').all()
  return results.map((row) => rowToSignup(row as Record<string, unknown>))
}

// Lead-source tracking is deliberately simple — the visitor's own document.referrer (or 'direct')
// plus the page path, not real UTM-parameter parsing (see assets/js/notify.js). Capped, not
// rejected: a visitor's own browser sends this, so a malformed/oversized value should never be
// able to turn an otherwise-valid signup into a 400.
const MAX_SOURCE_LENGTH = 500

function normalizeSourceField(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, MAX_SOURCE_LENGTH)
}

/** Trimmed, control characters stripped, capped at 80, null when missing or empty. */
function normalizeFirstName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80)
  return cleaned || null
}

// /notify is public and every accepted signup is also pushed into Kit, so without a cap a script
// could subscribe any list of strangers' addresses from one machine. 10 an hour from one address
// is far more than a real visitor signing up for a few products ever needs. Best-effort, same plain
// KV get-then-put as requireAdmin's failure counter.
const NOTIFY_MAX_PER_IP_PER_HOUR = 10

async function handleNotify(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
  let payload: { email?: unknown; firstName?: unknown; product?: unknown; company?: unknown; source?: unknown; page?: unknown }
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

  // Both optional and never required — an old cached copy of notify.js that never sends these
  // fields at all must keep signing people up exactly as it always has.
  const source = normalizeSourceField(payload.source)
  const page = normalizeSourceField(payload.page)
  // Optional for the same reason. Saved with the signup, sent to Kit as first_name, and used in
  // the welcome email's greeting.
  const firstName = normalizeFirstName(payload.firstName)

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const ipKey = `notify-ip:${ip}`
  const recentFromIp = Number(await env.NOTIFY_SIGNUPS.get(ipKey)) || 0
  if (recentFromIp >= NOTIFY_MAX_PER_IP_PER_HOUR) {
    return jsonResponse({ ok: false, error: 'Too many signups from this network. Try again later.' }, 429)
  }
  await env.NOTIFY_SIGNUPS.put(ipKey, String(recentFromIp + 1), { expirationTtl: 3600 })

  // Checked before the insert so someone signing up for a second product doesn't get welcomed twice.
  const seenBefore = await env.SIGNUPS_DB.prepare('SELECT 1 FROM signups WHERE email = ? LIMIT 1').bind(email).first()
  await insertSignup(env.SIGNUPS_DB, email, product, Date.now(), source, page, firstName)

  // Website signups only: Stock Shredder app users come in through footage-curator/worker's /lead
  // and already get that app's own emails. Best-effort and off the response path, same as Kit.
  if (!seenBefore && product !== 'stock-shredder') {
    const welcome = sendWelcomeEmail(env, email, firstName).catch((err) => {
      console.log('sendWelcomeEmail threw', err instanceof Error ? err.message : String(err))
    })
    if (ctx) ctx.waitUntil(welcome)
    else await welcome
  }

  try {
    await syncToKit(env, email, product, firstName)
  } catch (err) {
    // D1 already has it (the admin dashboard is unaffected either way) — don't fail the
    // visitor's signup just because Kit's API had a bad moment.
    console.log('syncToKit threw', err instanceof Error ? err.message : String(err))
  }

  return jsonResponse({ ok: true })
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// A single shared admin password (see Env.ADMIN_KEY's doc comment) has no username to lock out
// and no 2FA — same brute-force exposure footage-curator/worker's requireAdmin already guards
// against. 20 wrong guesses in 15 minutes from the same IP is already far more than a human
// fat-fingering a password would ever need.
const ADMIN_LOGIN_MAX_FAILURES = 20
const ADMIN_LOGIN_WINDOW_SECONDS = 15 * 60

/** Every /admin/api/* route requires this exact header — mirrors footage-curator/worker's own
 *  requireAdmin (same rate-limit thresholds, same "rate-limit failures only, never successes"
 *  reasoning: the dashboard re-sends the same password on every poll once logged in, so counting
 *  successes too would eventually lock the owner's own IP out of their own back office).
 *  The dashboard holds every signup email, so the key is compared in constant time, same as
 *  footage-curator/worker's constantTimeEqual. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function requireAdmin(request: Request, env: Env): Promise<Response | null> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const rateLimitKey = `admin-login-fail:${ip}`
  const recentFailures = Number(await env.NOTIFY_SIGNUPS.get(rateLimitKey)) || 0
  if (recentFailures >= ADMIN_LOGIN_MAX_FAILURES) {
    return jsonResponse({ error: 'Too many failed attempts - try again later' }, 429)
  }
  const provided = request.headers.get('Authorization')?.replace(/^Bearer\s+/, '')
  if (!env.ADMIN_KEY || !provided || !constantTimeEqual(provided, env.ADMIN_KEY)) {
    await env.NOTIFY_SIGNUPS.put(rateLimitKey, String(recentFailures + 1), { expirationTtl: ADMIN_LOGIN_WINDOW_SECONDS })
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }
  return null
}

interface SignupStats {
  total: number
  thisWeek: number
  byProduct: Record<string, number>
  /** Top 10 sources among signups from the last 30 days (same rolling-window convention as
   *  `thisWeek` above, not a calendar-month boundary), most common first. A signup with no
   *  source recorded at all (null — an old cached notify.js, or the KV migration) is grouped
   *  under '(unknown)', kept distinct from the literal string 'direct' a current visitor with no
   *  referrer actually sends. */
  topSources: { source: string; count: number }[]
}

function computeStats(signups: SignupRow[]): SignupStats {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  const byProduct: Record<string, number> = {}
  for (const product of VALID_PRODUCTS) byProduct[product] = 0
  for (const s of signups) byProduct[s.product] = (byProduct[s.product] ?? 0) + 1

  const sourceCounts: Record<string, number> = {}
  for (const s of signups) {
    if (s.createdAt < monthAgo) continue
    const key = s.source ?? '(unknown)'
    sourceCounts[key] = (sourceCounts[key] ?? 0) + 1
  }
  const topSources = Object.entries(sourceCounts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    total: signups.length,
    thisWeek: signups.filter((s) => s.createdAt >= weekAgo).length,
    byProduct,
    topSources
  }
}

// A single self-contained page — no build step, no framework, matching the shape of
// footage-curator/worker's own adminPageHtml. Password lives only in sessionStorage on the
// admin's own machine, sent as a header on every call — never as a query string, so it never
// ends up in a server access log.
//
// A function (not a bare constant) so a fresh per-request nonce can be stamped onto the one
// <script> tag below — see the /admin route handler, which sends that same nonce in a
// Content-Security-Policy header restricting script-src to it.
function adminPageHtml(nonce: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>DEADWORK HQ — Signups</title>
<style>
  body { font-family: -apple-system, sans-serif; background: #111; color: #eee; padding: 24px; }
  table { border-collapse: collapse; width: 100%; margin-top: 16px; }
  th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #333; }
  th { color: #999; font-weight: normal; text-transform: uppercase; font-size: 12px; }
  button { background: #333; color: #eee; border: 1px solid #555; padding: 6px 12px; cursor: pointer; border-radius: 4px; }
  button:hover { background: #444; }
  input { background: #222; color: #eee; border: 1px solid #555; padding: 8px; border-radius: 4px; }
  #login { max-width: 320px; margin-top: 80px; }
  .stat-tile { background: #1a1a1a; border: 1px solid #333; border-radius: 6px; padding: 14px 18px; min-width: 140px; }
  .filter-pill { background: transparent; border: 1px solid #555; border-radius: 999px; padding: 5px 14px; font-size: 13px; }
  .filter-pill.active { background: #8fd687; color: #111; border-color: #8fd687; font-weight: 600; }
  .stat-tile .stat-value { font-size: 28px; line-height: 1.1; }
  .stat-tile .stat-label { color: #999; font-size: 12px; text-transform: uppercase; margin-top: 4px; }
  .top-bar { display: flex; align-items: center; justify-content: center; position: relative; margin-bottom: 32px; min-height: 32px; }
  .top-bar img { position: absolute; left: 0; height: 28px; }
  .main-tab { background: transparent; border: none; color: #999; padding: 8px 18px; font-size: 14px; cursor: pointer; border-bottom: 2px solid transparent; border-radius: 0; }
  .main-tab:hover { background: transparent; color: #eee; }
  .main-tab.active { color: #eee; border-bottom-color: #8fd687; font-weight: 600; }
  .empty-state { color: #999; text-align: center; margin-top: 80px; font-size: 14px; }
</style>
</head>
<body>
  <div id="login">
    <h2>DEADWORK HQ — Signups</h2>
    <input id="password" type="password" placeholder="Admin password" style="width: 100%">
    <button id="loginBtn" style="margin-top: 8px; width: 100%">Log in</button>
    <p id="loginError" style="color: #f66"></p>
  </div>
  <div id="dashboard" style="display: none">
    <div class="top-bar">
      <img src="https://stockshredder.github.io/deadwork-logo.png" alt="DEADWORK">
      <div id="mainTabs" style="display: flex; gap: 4px"></div>
    </div>

    <div id="tab-signups">
      <div id="statTiles" style="display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 8px"></div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 32px">
        <h2>Top sources this month</h2>
      </div>
      <table>
        <thead><tr><th>Source</th><th>Signups</th></tr></thead>
        <tbody id="topSourceRows"></tbody>
      </table>
      <p id="noTopSources" style="color: #999; display: none">No signups in the last 30 days.</p>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 40px">
        <h2>Emails</h2>
        <div>
          <input id="search" placeholder="Search name, email or product" style="width: 220px">
          <button id="downloadCsv">Download CSV</button>
        </div>
      </div>
      <div id="productFilters" style="display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0"></div>
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Product</th><th>Source</th><th>When</th></tr></thead>
        <tbody id="rows"></tbody>
      </table>
    </div>

    <div id="tab-social" style="display: none">
      <p class="empty-state">No social media accounts connected yet. Follower counts, post performance, and engagement will show up here once that's wired up.</p>
    </div>

    <div id="tab-income" style="display: none">
      <p class="empty-state">No billing data flows into DEADWORK HQ yet. Revenue charts and per-product income breakdowns will show up here once that's connected.</p>
    </div>
  </div>
<script nonce="${nonce}">
  // Every field below is public-submitted text rendered straight from JSON into innerHTML -
  // escape it before it ever touches the DOM, the same discipline footage-curator/worker's own
  // admin page uses (an email like "<img src=x onerror=...>" would otherwise run as real script
  // in this admin page's own context, which has access to sessionStorage's adminPassword).
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
  }

  const PRODUCT_LABELS = ${JSON.stringify(PRODUCT_LABELS)}

  // Top-level nav across the dashboard's three sections. Social Media and Income are placeholder
  // panels for now — no social API or billing feed is wired into this Worker yet (see their
  // empty-state copy above) — but the tab structure is real so those can be filled in later
  // without another layout change.
  const MAIN_TABS = [
    { id: 'signups', label: 'Signups' },
    { id: 'social', label: 'Social Media' },
    { id: 'income', label: 'Income' }
  ]
  let activeMainTab = 'signups'

  function renderMainTabs() {
    document.getElementById('mainTabs').innerHTML = MAIN_TABS.map(
      (t) => \`<button type="button" class="main-tab\${activeMainTab === t.id ? ' active' : ''}" data-main-tab="\${t.id}">\${escapeHtml(t.label)}</button>\`
    ).join('')
    document.querySelectorAll('[data-main-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeMainTab = btn.dataset.mainTab
        renderMainTabs()
        MAIN_TABS.forEach((t) => {
          document.getElementById('tab-' + t.id).style.display = activeMainTab === t.id ? 'block' : 'none'
        })
      })
    })
  }
  renderMainTabs()

  let password = sessionStorage.getItem('adminPassword') || ''
  let signups = []
  // null = "All" - clicking a pill sets this instead of typing a product name into the search
  // box, which the existing \`search\` input still also matches against (both filters apply
  // together: a product pill narrows down to that product, and typing still searches within it).
  let activeProductFilter = null

  function renderProductFilters() {
    const pills = [{ slug: null, label: 'All' }, ...Object.entries(PRODUCT_LABELS).map(([slug, label]) => ({ slug, label }))]
    document.getElementById('productFilters').innerHTML = pills
      .map(
        (p) =>
          \`<button type="button" class="filter-pill\${activeProductFilter === p.slug ? ' active' : ''}" data-product-filter="\${escapeHtml(p.slug ?? '')}">\${escapeHtml(p.label)}</button>\`
      )
      .join('')
    document.querySelectorAll('[data-product-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeProductFilter = btn.dataset.productFilter || null
        renderProductFilters()
        render()
      })
    })
  }
  renderProductFilters()

  async function fetchStats() {
    const res = await fetch('/admin/api/stats', { headers: { Authorization: 'Bearer ' + password } })
    if (!res.ok) throw new Error('unauthorized')
    renderStats(await res.json())
  }

  function renderStats(s) {
    const tiles = [
      { value: s.total, label: 'Total signups' },
      { value: s.thisWeek, label: 'This week' },
      ...Object.entries(PRODUCT_LABELS).map(([slug, label]) => ({ value: s.byProduct[slug] || 0, label }))
    ]
    document.getElementById('statTiles').innerHTML = tiles
      .map((t) => \`<div class="stat-tile"><div class="stat-value">\${escapeHtml(String(t.value))}</div><div class="stat-label">\${escapeHtml(t.label)}</div></div>\`)
      .join('')
    renderTopSources(s.topSources || [])
  }

  function renderTopSources(topSources) {
    document.getElementById('noTopSources').style.display = topSources.length ? 'none' : 'block'
    document.getElementById('topSourceRows').innerHTML = topSources.map((t) => \`
      <tr>
        <td>\${escapeHtml(t.source)}</td>
        <td>\${escapeHtml(String(t.count))}</td>
      </tr>
    \`).join('')
  }

  async function fetchSignups() {
    const res = await fetch('/admin/api/signups', { headers: { Authorization: 'Bearer ' + password } })
    if (!res.ok) throw new Error('unauthorized')
    signups = await res.json()
    render()
  }

  function render() {
    const q = document.getElementById('search').value.trim().toLowerCase()
    const filtered = signups.filter(
      (s) =>
        (!activeProductFilter || s.product === activeProductFilter) &&
        (!q || s.email.toLowerCase().includes(q) || (s.firstName || '').toLowerCase().includes(q) || s.product.toLowerCase().includes(q))
    )
    document.getElementById('rows').innerHTML = filtered.map((s) => \`
      <tr>
        <td>\${escapeHtml(s.firstName || '—')}</td>
        <td>\${escapeHtml(s.email)}</td>
        <td>\${escapeHtml(PRODUCT_LABELS[s.product] || s.product)}</td>
        <td>\${escapeHtml(s.source || '—')}</td>
        <td>\${new Date(s.createdAt).toLocaleString()}</td>
      </tr>
    \`).join('')
  }

  function toCsv() {
    const header = ['Name', 'Email', 'Product', 'Source', 'When']
    const rows = signups.map((s) => [s.firstName || '', s.email, PRODUCT_LABELS[s.product] || s.product, s.source || '', new Date(s.createdAt).toISOString()])
    // A cell starting with = + - @ (or a tab/CR) runs as a formula when the file is opened in
    // Excel/Sheets, and name/email/source are typed by the public. A leading ' makes it plain text.
    const cell = (v) => {
      const text = String(v)
      return '"' + (/^[=+\\-@\\t\\r]/.test(text) ? "'" + text : text).replace(/"/g, '""') + '"'
    }
    return [header, ...rows].map((r) => r.map(cell).join(',')).join('\\n')
  }

  document.getElementById('loginBtn').addEventListener('click', async () => {
    password = document.getElementById('password').value
    try {
      await fetchSignups()
      await fetchStats()
      sessionStorage.setItem('adminPassword', password)
      document.getElementById('login').style.display = 'none'
      document.getElementById('dashboard').style.display = 'block'
    } catch {
      document.getElementById('loginError').textContent = 'Wrong password.'
    }
  })

  document.getElementById('search').addEventListener('input', render)

  document.getElementById('downloadCsv').addEventListener('click', () => {
    const blob = new Blob([toCsv()], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'deadwork-hq-signups.csv'
    a.click()
  })

  if (password) {
    Promise.all([fetchSignups(), fetchStats()])
      .then(() => {
        document.getElementById('login').style.display = 'none'
        document.getElementById('dashboard').style.display = 'block'
      })
      .catch(() => sessionStorage.removeItem('adminPassword'))
  }
</script>
</body>
</html>`
}

interface LegacySignupEntry {
  product: string
  timestamp: string
}

/** One-time, explicitly-triggered migration from the old KV shape (one JSON blob per email,
 *  listing every product + when) into the new D1 `signups` table. Never runs automatically — see
 *  the /admin/migrate-kv route below. Safe to run more than once: insertSignup's `INSERT OR
 *  IGNORE` (backed by the `UNIQUE(email, product)` constraint) means an already-migrated row is
 *  silently skipped the second time, not duplicated.
 *
 *  KV's list() is paginated (1000 keys max per call) — loop with the cursor until it's exhausted,
 *  same approach the old notify-worker's getAllSignups used. */
async function migrateKvToD1(env: Env): Promise<{ emailsScanned: number; rowsInserted: number; rowsSkipped: number }> {
  let emailsScanned = 0
  let rowsInserted = 0
  let rowsSkipped = 0
  let cursor: string | undefined

  do {
    const page = await env.NOTIFY_SIGNUPS.list({ cursor })
    for (const key of page.keys) {
      // This same namespace also holds requireAdmin's per-IP rate-limit counters
      // ("admin-login-fail:<ip>" -> a plain number string) — never legacy signup data. Skip that
      // reserved prefix explicitly, and also guard with Array.isArray below in case anything else
      // unexpected ever ends up in here: a single malformed/foreign key must never abort the
      // whole migration for every other email.
      if (key.name.startsWith('admin-login-fail:') || key.name.startsWith('notify-ip:')) continue
      const raw = await env.NOTIFY_SIGNUPS.get(key.name)
      if (!raw) continue
      const email = key.name
      let entries: unknown
      try {
        entries = JSON.parse(raw)
      } catch {
        continue
      }
      if (!Array.isArray(entries)) continue
      emailsScanned++
      for (const entry of entries as LegacySignupEntry[]) {
        if (!entry || !VALID_PRODUCTS.has(entry.product)) continue
        const parsed = Date.parse(entry.timestamp)
        const createdAt = Number.isFinite(parsed) ? parsed : Date.now()
        // The legacy KV shape predates lead-source tracking entirely — nothing to migrate for
        // either field, same as any other pre-migration row.
        const inserted = await insertSignup(env.SIGNUPS_DB, email, entry.product, createdAt, null, null)
        if (inserted) rowsInserted++
        else rowsSkipped++
      }
    }
    cursor = page.list_complete ? undefined : page.cursor
  } while (cursor)

  return { emailsScanned, rowsInserted, rowsSkipped }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

    const url = new URL(request.url)

    if (url.pathname === '/notify' && request.method === 'POST') {
      return handleNotify(request, env, ctx)
    }

    if (url.pathname === '/admin' && request.method === 'GET') {
      // A fresh nonce every request — script-src is locked to it below, so even a successful
      // stored-XSS injection (despite escapeHtml in adminPageHtml) can't execute via its own
      // injected <script> tag or an inline event handler. Same pattern as
      // footage-curator/worker's own /admin route.
      const nonce = crypto.randomUUID()
      return new Response(adminPageHtml(nonce), {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`
        }
      })
    }

    if (url.pathname === '/admin/api/stats' && request.method === 'GET') {
      const authError = await requireAdmin(request, env)
      if (authError) return authError
      const signups = await listSignups(env.SIGNUPS_DB)
      return jsonResponse(computeStats(signups))
    }

    if (url.pathname === '/admin/api/signups' && request.method === 'GET') {
      const authError = await requireAdmin(request, env)
      if (authError) return authError
      const signups = await listSignups(env.SIGNUPS_DB)
      return jsonResponse(signups)
    }

    if (url.pathname === '/admin/migrate-kv' && request.method === 'POST') {
      // Same Bearer header and failed-attempt limit as the dashboard. This used to take the key as
      // a ?key= query param with no attempt limit, which made it an unthrottled way to guess
      // ADMIN_KEY (and put the key in URLs and logs).
      const authError = await requireAdmin(request, env)
      if (authError) return authError
      const result = await migrateKvToD1(env)
      return jsonResponse({ ok: true, ...result })
    }

    if (url.pathname === '/_test/setup-signups-db' && env.ALLOW_TEST_BYPASS === 'true') {
      // unstable_dev's own D1 migration application (via wrangler.toml's migrations_dir) doesn't
      // reliably persist across test runs — same issue footage-curator/worker's own
      // /_test/setup-customers-db route works around, for the same reason. Hand-create the table
      // instead of relying on it.
      await env.SIGNUPS_DB.exec(
        [
          'CREATE TABLE IF NOT EXISTS signups (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL, product TEXT NOT NULL, created_at INTEGER NOT NULL, UNIQUE(email, product))',
          'CREATE INDEX IF NOT EXISTS idx_signups_email ON signups(email)',
          'CREATE INDEX IF NOT EXISTS idx_signups_product ON signups(product)'
        ].join('\n')
      )
      // signups may already exist on disk from before lead-source tracking (this same real D1
      // database persists to disk across separate test-file runs), in which case CREATE TABLE IF
      // NOT EXISTS above is a no-op and these columns are still missing - ALTER them in now,
      // ignoring "duplicate column" once a later run has already added them. Same pattern
      // footage-curator/worker's own /_test/setup-customers-db route already uses for this exact
      // situation.
      for (const alter of ['ALTER TABLE signups ADD COLUMN source TEXT', 'ALTER TABLE signups ADD COLUMN page TEXT', 'ALTER TABLE signups ADD COLUMN first_name TEXT']) {
        try {
          await env.SIGNUPS_DB.exec(alter)
        } catch {
          // already has the column from an earlier run - fine
        }
      }
      // Wiped on every call (not just IF NOT EXISTS above) — this real D1 database persists to
      // disk across separate test-file runs, and the tests assert on exact counts, which leftover
      // rows from a previous run would silently break.
      await env.SIGNUPS_DB.exec('DELETE FROM signups')
      // Same persistence issue applies to the digest's own "last sent" watermark in the
      // NOTIFY_SIGNUPS KV namespace (see digest.ts) — a stale value left over from a previous
      // test-digest.mjs run would make every "is this new" comparison wrong.
      await env.NOTIFY_SIGNUPS.delete('digest:last-sent-at')
      // Local test state persists between runs, so a previous run's signups would otherwise count
      // against this run's per-IP /notify limit.
      const ipCounters = await env.NOTIFY_SIGNUPS.list({ prefix: 'notify-ip:' })
      for (const key of ipCounters.keys) await env.NOTIFY_SIGNUPS.delete(key.name)
      return jsonResponse({ ok: true })
    }

    if (url.pathname === '/_test/seed-kv' && request.method === 'POST' && env.ALLOW_TEST_BYPASS === 'true') {
      // Writes directly into the legacy KV store in the old one-blob-per-email shape, so
      // test-migrate-kv.mjs can exercise the real migration path without ever touching the real
      // production NOTIFY_SIGNUPS namespace (unstable_dev provisions its own local KV for tests).
      const body = (await request.json().catch(() => ({}))) as { email?: string; entries?: LegacySignupEntry[] }
      if (!body.email || !body.entries) return jsonResponse({ error: 'email and entries are required' }, 400)
      await env.NOTIFY_SIGNUPS.put(body.email, JSON.stringify(body.entries))
      return jsonResponse({ ok: true })
    }

    // Test-only hook letting test-digest.mjs exercise runDailyDigest's full stateful flow (the
    // KV watermark included) directly via HTTP, rather than trying to fire a real Cron Trigger
    // inside a test harness. `now` lets a test simulate a later run without actually sleeping.
    // Same gate as every other /_test/* route — never reachable on the real deployed Worker.
    if (url.pathname === '/_test/run-digest' && request.method === 'POST' && env.ALLOW_TEST_BYPASS === 'true') {
      const { now } = (await request.json().catch(() => ({}))) as { now?: number }
      const result = await runDailyDigest(env, typeof now === 'number' ? now : Date.now())
      return jsonResponse(result)
    }

    return jsonResponse({ ok: false, error: 'Not found.' }, 404)
  },

  // Fired by the Cloudflare Cron Trigger declared in wrangler.toml's [triggers] block, once a
  // day — never by a real request, so there's no Response to return and no CORS/auth to apply.
  // Errors are caught and logged rather than left to throw: a bad run today must never crash the
  // scheduler itself out of running again tomorrow.
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    try {
      const result = await runDailyDigest(env)
      console.log('scheduled digest run', JSON.stringify({ hadNewActivity: result.hadNewActivity, emailSent: result.emailSent }))
    } catch (err) {
      console.error('runDailyDigest threw', err instanceof Error ? err.message : String(err))
    }
  }
}
