# DEADWORK HQ

The shared Cloudflare Worker that collects every email signup across all 6 DEADWORK products
(Scene Lock, Set Control, Loadout, Handoff, Sound Driver, Stock Shredder) plus the site's general
`/join` page into one place, with a real admin dashboard. Evolved in place from `notify-worker`
(renamed, not rebuilt — same `git mv`'d history) when Stock Shredder's own desktop-app leads got
wired in too and the old KV-backed store needed a real database and a real login to match.

Kept as its own standalone Worker — separate from `footage-curator/worker` (the Stock Shredder
payments Worker) — on purpose: that one is scoped to paying customers (Stripe, activation keys,
iPhone pairing) and shouldn't mix concerns with public, low-stakes email signups. Stock Shredder's
`/lead` route fires a best-effort POST here in addition to its own `leads` table — see that
Worker's own notes.

## What it does

One public endpoint:

```
POST /notify
Content-Type: application/json

{ "email": "someone@example.com", "product": "loadout" }
```

- Validates `email` looks like a plausible email address (server-side — never trust the browser's
  `type="email"` alone) and that `product` is one of the 6 product slugs or `general`.
- Stores one row per `(email, product)` pair in a D1 database (`signups` table — see
  `migrations/0001_signups.sql`). Re-submitting the same product for the same email is a no-op
  (`UNIQUE(email, product)` + `INSERT OR IGNORE`).
- Returns `{ "ok": true }` on success, or `{ "ok": false, "error": "..." }` with a 400 status on
  invalid input.
- CORS is wide open (`Access-Control-Allow-Origin: *`) since this is a public marketing-site form.
- Also mirrors the signup into Kit (formerly ConvertKit) as a real subscriber, tagged by which
  product they want, so a real person can follow up and sell — see "Syncing signups to Kit" below.
  Best-effort: if Kit's API is down or the key is wrong, the visitor's signup still succeeds.

## Admin dashboard

```
https://deadwork-hq.stockshredder.workers.dev/admin
```

A real password login (the page itself has no secrets in it — the password lives only in
sessionStorage on your own machine, sent as a header on every call, never as a query string).
Shows stat tiles (total signups, this week, a tile per product), a searchable signups table, and
a CSV download — same shape as `footage-curator/worker`'s own `/admin` dashboard.

Set the password once (skip if already done):

```bash
npx wrangler secret put ADMIN_KEY
```

## Syncing signups to Kit

One-time setup, from this folder:

```bash
npx wrangler secret put KIT_API_KEY
# paste the Kit V4 API key when prompted (Kit: Settings -> Developer -> API Keys)
npm run deploy
```

Once set, every new signup also creates/updates the subscriber in Kit and tags them with the
product name. No code change needed to turn it off — just don't set the secret (or remove it with
`npx wrangler secret delete KIT_API_KEY`) and the sync is silently skipped.

## Local development

```bash
npm install     # installs wrangler + TypeScript types
npm run dev     # wrangler dev — local server with access to the real KV/D1 bindings
npm test        # runs test-notify.mjs, test-admin.mjs, test-migrate-kv.mjs against a local worker
```

## Deploying — first time after this rename/upgrade

This Worker didn't have a D1 database before. Before the first deploy after this change:

1. `npx wrangler d1 create deadwork-hq-signups` — copy the `database_id` it prints into
   `wrangler.toml`'s `[[d1_databases]]` block (replacing `REPLACE_WITH_REAL_D1_DATABASE_ID`).
2. `npx wrangler deploy` — this also applies `migrations/0001_signups.sql` to create the
   `signups` table in the new database.
3. **One-time only** — bring over every signup that was already sitting in the old KV store:
   ```bash
   curl -X POST "https://deadwork-hq.stockshredder.workers.dev/admin/migrate-kv?key=YOUR_ADMIN_KEY"
   ```
   Safe to run more than once (it skips anything already migrated) but there's no need to run it
   again after the first time.

## Deploying a routine change

```bash
npm run deploy    # wrangler deploy
```

This redeploys to the same `deadwork-hq` Worker — the `wrangler.toml` already points at the real
KV namespace and D1 database IDs once step 1 above has been done.

## If this ever needs to be redeployed from scratch

1. `wrangler login` (opens a browser to authenticate with the Cloudflare account).
2. `wrangler kv namespace create NOTIFY_SIGNUPS` — copy the `id` it prints into `wrangler.toml`'s
   `[[kv_namespaces]]` block (replacing the existing id if starting a fresh namespace). Only
   needed for the one-time KV migration above; a brand-new deploy with no old data to migrate can
   skip this and remove the binding.
3. `wrangler d1 create deadwork-hq-signups` — see step 1 above.
4. `wrangler deploy`.
5. Update `WORKER_URL` in `deadwork-site/assets/js/notify.js` if the deployed URL changed (e.g. a
   different Cloudflare account/subdomain).
