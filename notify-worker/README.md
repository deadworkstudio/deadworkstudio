# deadwork-notify

A small, standalone Cloudflare Worker that powers the inline "Notify me" email capture forms on
deadwork-site's in-development product pages (Scene Lock, Set Control, Loadout, Offload, Sound
Driver). Kept separate from `footage-curator/worker` (the Stock Shredder payments Worker) on
purpose — that one is scoped to paying customers and shouldn't mix concerns with public,
no-login email signups.

**Status: deployed.** Live at `https://deadwork-notify.stockshredder.workers.dev`.
(The `.workers.dev` subdomain comes from the Cloudflare account's existing `stockshredder`
subdomain — same account as the Stock Shredder Worker, just a different, independent Worker.)

## What it does

One endpoint:

```
POST /notify
Content-Type: application/json

{ "email": "someone@example.com", "product": "offload" }
```

- Validates `email` looks like a plausible email address (server-side — never trust the browser's
  `type="email"` alone) and that `product` is one of the 5 in-development slugs.
- Stores it in a KV namespace (`NOTIFY_SIGNUPS`), keyed by email, with the value a JSON list of
  `{ product, timestamp }` — so someone who signs up for more than one product gets one KV entry
  with multiple products, not duplicate entries. Re-submitting the same product for the same email
  is a no-op (doesn't add a duplicate entry to the list).
- Returns `{ "ok": true }` on success, or `{ "ok": false, "error": "..." }` with a 400 status on
  invalid input.
- CORS is wide open (`Access-Control-Allow-Origin: *`) since this is a public marketing-site form,
  matching the pattern already used by `footage-curator/worker`.

## Local development

```bash
npm install     # installs wrangler + TypeScript types
npm run dev     # wrangler dev — local server with access to the real KV namespace
```

## Deploying a change

```bash
npm run deploy    # wrangler deploy
```

This redeploys to the same `deadwork-notify` Worker at the URL above — no new setup needed, the
`wrangler.toml` already points at the real KV namespace ID.

## Reading stored signups

The easy way — a password-protected page listing every signup, newest first, with a
"Download CSV" link for pulling the list into a spreadsheet or CRM to follow up:

```
https://deadwork-notify.stockshredder.workers.dev/admin/signups?key=YOUR_ADMIN_KEY
```

This needs a one-time setup to set the password (skip if already done):

```bash
npx wrangler secret put ADMIN_KEY
# paste any password you want when prompted — this becomes the ?key= value above
```

The CLI way (for one email, or scripting):

```bash
# List every email that's signed up:
npx wrangler kv key list --namespace-id d42c89327ebd493c838f9a60142ae615

# Read one email's signups:
npx wrangler kv key get --namespace-id d42c89327ebd493c838f9a60142ae615 "someone@example.com"
```

## If this ever needs to be redeployed from scratch

1. `wrangler login` (opens a browser to authenticate with the Cloudflare account).
2. `wrangler kv namespace create NOTIFY_SIGNUPS` — copy the `id` it prints into `wrangler.toml`'s
   `[[kv_namespaces]]` block (replacing the existing id if starting a fresh namespace).
3. `wrangler deploy`.
4. Update `WORKER_URL` in `deadwork-site/assets/js/notify.js` if the deployed URL changed (e.g. a
   different Cloudflare account/subdomain).
