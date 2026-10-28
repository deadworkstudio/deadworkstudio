# DEADWORK Homepage — Exact Content (source of truth)

Extracted verbatim from the live homepage (`home/index.html`, `git log` tip `cd68cd8`). Every one of
the five prototypes MUST use this exact text, these exact product names, and this exact structure of
information. Do not rewrite, shorten, paraphrase, or invent anything. If a design needs to truncate
visually (e.g. a card that only shows a one-line teaser), the FULL text must still be reachable on
the same prototype page — not cut from the experience.

**A real finding worth knowing:** on the LIVE site today, the six product panels below (full
description + spec table + signup form) are only reachable by typing a URL hash directly
(`home/#scene-lock` etc.) — there is no visible on-page element that reveals them. The mega-menu
(nav tabs) instead links straight to each product's own page. Your prototype should make this
content genuinely reachable through a real, visible interaction — your choice of mechanism (a
clickable word index like the one the codebase's own `home.js` comments describe as the original
design, a scroll-revealed section, tabs, a product grid, etc.) — not hidden behind a hash only
power users would guess.

---

## Meta / brand

- Page title: "DEADWORK - Create more. Manage less."
- Meta description: "DEADWORK builds production software for filmmakers: pre-production, production, and post tools made by filmmakers for filmmakers."
- Wordmark: DEADWORK (image asset `assets/img/brand/deadwork-wordmark-bone.webp`, bone/cream color) — the wordmark IS the brand identity, don't redraw it as plain text unless genuinely necessary for a concept's typography, and if you do, match the brand's actual condensed caps character.
- Brand philosophy (used verbatim elsewhere on the site, available to use): "BY ARTISTS. FOR ARTISTS." and "CREATE MORE. MANAGE LESS."

## Header / nav (functional, must work)

- Left meta label: "06 Tools"
- Right meta label: "Est. Los Angeles"
- Center navigation, four tabs in this exact order and exact label text:
  1. **Pre-Production** — opens a menu revealing: Scene Lock, Set Control
  2. **Production** — opens a menu revealing: Loadout, Handoff
  3. **Post-Production** — opens a menu revealing: Sound Driver, Stock Shredder
  4. **Studio** — a plain link to `../studio/` (not a menu)
- Each mega-menu card shows: product logo, product name, one-line tagline (see product list below), a status badge ("IN DEVELOPMENT" — all except Stock Shredder, which is live/shipping and must NOT show that badge), and platform availability text.
- Clicking the DEADWORK wordmark returns to the default view (equivalent to today's `data-panel-reset`).

## Default / hero view

- Oversized statement headline: **"CREATE MORE. MANAGE LESS."**
- Supporting line: "tools designed to eliminate busywork so creatives can stay creative."
- Background: a hero video (poster image first, then video once loaded) — reuse the SAME actual asset paths: `assets/img/hero/poster.jpg`, `assets/video/hero.mp4` (desktop), `assets/video/hero-mobile.mp4` (mobile, swapped in under ~800px wide). Respect `prefers-reduced-motion`: show the poster only, never fetch/play video bytes, exactly like the current site's `home.js` already does (`data-hero-video`/`data-src`/`data-src-mobile` pattern — keep this exact mechanism, it's a deliberate perf/accessibility choice, not something to simplify away).

## The six products — exact names, categories, taglines, full descriptions, specs

Preserve the "three pre-production tools / DEADWORK logo centered / three post-production tools"
six-product composition as an important visual reference — most of the current site expresses this
as 3 tools on the left of the nav and 3 on the right (Pre-Production+Production on one side,
Post-Production+Studio on the other), with the logo dead center. Explore how this 3-center-3
arrangement can inform your design (e.g. a literal constellation/grid layout somewhere on the page),
without breaking the real three-category structure (Pre-Production / Production / Post-Production)
these six products actually belong to.

### 1. Scene Lock — category: Pre-Production
- Tagline (used in mega-menu): "Plan smarter. Execute better."
- Status: IN DEVELOPMENT
- Full description: "Organizes your pre-production with storyboards, shot lists, camera plots, references, and schedules all in one place. Provides iPhone capability so everyone can see the entire day with a clock and schedule to see where production is."
- Platform: iPhone, Mac & Windows
- Works with: iPhone companion app, PDF & image references
- Has an email signup form ("Notify me")

### 2. Set Control — category: Pre-Production
- Tagline: "Every crew. Every detail. In sync."
- Status: IN DEVELOPMENT
- Full description: "Organizes film sets with tracked schedules, locations, shot progress, timing and production in one shared view. A change made once is a change everyone sees via iPhone notifications. Eliminates inefficient communication during pre-production and production."
- Platform: iPhone, Mac & Windows
- Works with: iPhone companion app, Scene Lock
- Has an email signup form

### 3. Loadout — category: Production
- Tagline: "Never leave gear behind."
- Status: IN DEVELOPMENT
- Full description: "Tracks production gear, cases, and equipment against a created list. It uses uploaded photos to confirm each item before it leaves or is needed so nothing gets lost or left behind."
- Platform: iPhone, Mac & Windows
- Works with: iPhone companion app
- Has an email signup form

### 4. Handoff — category: Production
- Tagline: "Every file. Verified."
- Status: IN DEVELOPMENT
- Full description: "Handoff copies to every destination in parallel and checks each file against the original before it will ever call a card safe. If anything couldn't be verified, it says so — the card stays marked unsafe until it's actually confirmed."
- Platform: iPhone, Mac & Windows
- Works with: SD, CFexpress & CompactFlash cards, external drives
- Has an email signup form

### 5. Sound Driver — category: Post-Production
- Tagline: "Real artists. Real sounds."
- Status: IN DEVELOPMENT
- Full description: "Eliminates the grunt work and watches visuals of an edit to get to the creative process. Every sound comes from DEADWORK's own exclusive library; you won't find it in any other stock library or sound tool. Recorded and designed in-house and available nowhere else, with thousands of diverse cinematic sound variations straight to you."
- Platform: Mac & Windows
- Works with: Premiere Pro, DaVinci Resolve, Final Cut Pro, Avid Media Composer, Pro Tools, Nuendo
- Has an email signup form

### 6. Stock Shredder — category: Post-Production
- Tagline: "Raw footage into stock-ready clips."
- Status: LIVE / shipping (no "IN DEVELOPMENT" badge — this is the one product people can actually buy today)
- Full description: "Stock Shredder helps find and prepare usable moments from your raw footage. You review what stays, fine-tune the look, and export individual clips ready for stock submission."
- Platform: Mac & Windows
- Works with: Artgrid, Shutterstock, Adobe Stock, Pond5, Storyblocks, Blackbox, iStock, Getty Images, Motion Array, Envato Elements, Filmsupply
- CTA button instead of a signup form: "Get Stock Shredder" → links to `../products/stock-shredder/`

## Footer

- A live clock — **remove the calendar date entirely, keep only the ticking time** (hour:minute:second, 12-hour with AM/PM, and the timezone abbreviation — PDT/PST). It's always Los Angeles time (America/Los_Angeles), not the visitor's own timezone — "Est. Los Angeles" is already in the header for exactly this reason. Make it a genuinely designed element of your concept (placement, type treatment, how it ticks) — not a leftover small-print afterthought.
- Social links: Instagram, TikTok, YouTube (real URLs: instagram.com/deadworkstudio, tiktok.com/@deadworkstudio, youtube.com/@deadworkstudio)
- Tagline: "By artists. For artists."
- Copyright: "© 2026 DEADWORK STUDIO®"

## Signup form mechanics (preserve functionally)

Each "Notify me" form: an email input (type=email, required), a honeypot anti-spam field (hidden,
tabindex=-1), a submit button, and a status message region. This posts through the site's existing
shared `assets/js/notify.js` — keep using that same script/mechanism (don't invent a new submission
path), just restyle the form to match your concept.

## Brand colors available (from tokens.css — reuse, don't invent a new unrelated palette unless the
concept specifically calls for exploring value, e.g. Cinematic Studio's black-and-white emphasis)

- `--ink: #0a0a09` (near-black, primary dark background)
- `--ink-deep: #060605`
- `--ink-raised: #11110f`
- `--bone: #e6e0d3` (warm cream/bone — the wordmark color, primary light/accent)
- `--bone-2: #94918a`
- `--bone-3: #807d77`
- Brand green `#8FD687` exists site-wide for beta/success states — available if a concept finds genuine use for it, not required.

Fonts already self-hosted and available to reuse: Anton (the oversized display headline font, e.g.
"CREATE MORE. MANAGE LESS."), JetBrains Mono (small mono labels like "06 TOOLS", "EST. LOS ANGELES").
Check `assets/fonts/` in the repo root for the actual files if you want to reference them directly
rather than re-linking Google Fonts.
