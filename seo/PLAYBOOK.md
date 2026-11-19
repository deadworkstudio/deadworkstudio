# DEADWORK guides: SEO playbook

Repeatable system for search articles that bring in people who already have the problem.
Stock Shredder first. Loadout and Set Control get waitlist pages later.

## How to make an article

1. Pick the next keyword from the list below.
2. Copy `seo/articles/raw-footage-to-stock-clips.html` to `seo/articles/<slug>.html`.
3. Fill the meta block (slug, keyword, titles, description, FAQ) and write the body.
4. `python3 seo/build.py <slug>` builds `guides/<slug>/index.html`.
   It refuses to build if the copy has AI words, long dashes, "Looks like", "Please try again",
   Daniel's last name or "LLC".
5. Screenshot desktop + phone, send to Daniel.
6. Only after Daniel says "put it live": set `"status": "live"`, rebuild (adds it to sitemap.xml
   and removes noindex), push to main.

## Every article must have

- A short answer box at the top (the 5-line version people came for).
- A real workflow comparison: the by-hand way vs the DEADWORK way, step by step.
- Measured numbers only. Stock Shredder: the spec sheet benchmark (100 clips 16 min vs 3+ hrs,
  500 = 1 hr 19 min vs 16+ hrs, 1,000 = 3 hr 1 min vs 33+ hrs, review not included).
- A "What to know before you start." section (Daniel, Nov 17: not "where it falls short"): intro "Stock Shredder handles the repetitive parts. A few things stay with you." then 4 bullets that each end on a plus (you review, you pick what sells, you upload, format list). No "computer only" / "needs a connection" bullets. Plus a "when the other way makes sense" section.
- At least 2 real app screenshots from `assets/img/products/<product>/`.
- Sources linked for any outside rule (stock site specs etc.), with the month checked.
- The tracked CTA (added by the build): `?ref=guide&utm_campaign=<slug>`.
- FAQ (4 to 6), which the build also turns into FAQ rich-result data.
- No prices in the body. The CTA box is the only offer.

## Rules

- HIDDEN (Daniel, Nov 16): guides are never linked from the site's menus or pages. Google finds them only through sitemap.xml (+ Search Console).

- Zero AI words. Say "naming service" / "auto-naming".
- Never Daniel's last name or the LLC. Byline is DEADWORK STUDIO.
- Loadout, Set Control and other in-development products: waitlist CTA only, never a buy link.
- Competitors: describe them fairly, from their own public pages. Metadata/keyword tools are not
  full clip-processing tools; say so plainly, don't trash them.
- Nothing goes live without Daniel's separate "put it live".

## Tracking (the 4 numbers)

| Number | Where it comes from | Status |
|---|---|---|
| Visitors per article | ss-funnel.js ping on the guide page (page + Google/other referrer) | Works now |
| Trial starts from articles | CTA carries ref=guide + campaign=slug into the SS page and checkout | Works now (same funnel as other tagged links) |
| First successful exports | App reports first export per account | Needs linking to source (to check after launch) |
| Paying customers | Stripe | Needs linking to source (to check after launch) |

Also recommended: verify deadworkstudio.com in Google Search Console (DNS record on Cloudflare)
to see real search terms, impressions and clicks per article.

## Angle (Daniel, Nov 17)

Write for people searching because stock prep takes too long: "how to save time", "stock footage taking forever",
"edit stock footage faster". Lead every article with the time problem and the hours saved. Pain-first articles go
ahead of spec/how-to topics in the queue below.

| # | Product | Target search | Article |
|---|---|---|---|
| P1 | SS | how to edit stock footage faster / speed up stock footage workflow | How to Prepare Stock Footage Faster (1,000 Clips in 3 Hours) |
| P2 | SS | stock footage takes too long / why is stock footage so slow | Why Stock Footage Prep Takes So Long, and How to Cut It Down |
| P3 | SS | batch process stock footage / process hundreds of clips at once | How to Process Hundreds of Stock Clips at Once |
| P4 | SS | how many stock clips per week / stock footage side income time | How to Upload More Stock Clips Each Week Without Losing Your Weekends |

## Keyword list (priority order)

No paid keyword tool is connected, so search volumes are not measured. Order is by buyer intent,
fit with what the product actually does, and how weak the current Google results are.
Re-rank once Search Console has 2 to 4 weeks of data.

| # | Product | Target search | Article | Why | Target date |
|---|---|---|---|---|---|
| 1 | SS | turn raw footage into stock footage / how to prepare footage for stock sites | How to Turn Raw Footage Into Stock Clips | Exact problem SS solves; results today are thin forum threads | Nov 16 (draft ready) |
| 2 | SS | Adobe Stock / Pond5 / Shutterstock video requirements | How to Prepare Footage for Adobe Stock, Pond5 and Shutterstock | High-volume how-to; we can give one checklist across sites. Artgrid looks curated (not open upload), verify before naming it | Nov 18 |
| 3 | SS | Xpiks alternative | Best Xpiks Alternatives for Stock Footage Creators | xpiks.com redirected to a domain-for-sale page on Nov 12, 2026: users need a replacement now. Xpiks was keywords/upload only, so be clear SS covers video prep + keywords, not photo upload | Nov 20 |
| 4 | SS | batch export clips Premiere Pro stock footage | Stock Shredder vs Manual Editing in Premiere Pro | People already fighting batch export in Premiere forums | Nov 22 |
| 5 | SS | best software for stock footage contributors | Best Software for Processing Thousands of Stock Footage Clips | Roundup; Premiere, Resolve, keyword tools, SS, each with its real job | Nov 23 |
| 6 | SS | stock footage keywords / how to keyword video | How to Keyword Stock Footage Without Typing All Day | Pro/Studio keyword feature | Dec |
| 7 | SS | how long should stock footage clips be | Stock Clip Length: What Sites Want | Short, high-volume question; links to #1 | Dec |
| 8 | Loadout (waitlist) | Cheqroom alternative for filmmakers | Cheqroom Alternatives for Film Crews | Differentiator: checks what made it back into the case, not just inventory | After Loadout gates |
| 9 | Loadout (waitlist) | camera equipment checklist / camera gear checklist app | Camera Gear Checklist (free list + app waitlist) | Free list earns links and signups | After Loadout gates |
| 10 | Set Control (waitlist) | digital call sheet with crew confirmations | Digital Call Sheets That Show Who Confirmed | Differentiator: who got the change and confirmed | Dec |
| 11 | Set Control (waitlist) | StudioBinder alternative / call sheet app | StudioBinder Alternatives for Small Crews | High-intent comparison | Dec |

## Growth plan (Daniel, Nov 16)

Benchmark: a founder at ~$18k/month from SEO runs ~200 posts, 30 landing pages, 4-5 languages.

- Articles: 1 a week now. Move to 2 a week once Search Console shows which ones bring trials.
- Landing pages: ~30 for Stock Shredder, one each, drafted alongside the weekly article:
  - Stock sites: Adobe Stock, Pond5, Shutterstock, Artgrid, Storyblocks, Getty/iStock, Motion Array, Envato, Filmsupply, Blackbox.
  - Cameras: Sony, DJI, ARRI, RED, Blackmagic, Canon, Panasonic, GoPro, drones.
  - Competitors / jobs: Xpiks, StockSubmitter, Premiere Pro batch export, Resolve, keywording tools.
- Languages: the site is in 7. Translate an article only after it proves itself in English.
- Everything stays hidden from the site menus. Sitemap + Search Console + Bing only.

## Landing pages (Stock Shredder, Nov 18)

Same build as the guides (seo/articles -> guides/<slug>/), same hidden rule, eyebrow "Stock Shredder · For ...".
Cadence (Daniel, Nov 18): 2 new pages a week, one article plus one landing page. Each goes live only on Daniel's "put it live".
No paid keyword tool, so order is by buyer fit, who we already email (drone + Sony shooters), and how much the page
can say that article 2 doesn't already say (avoid near-duplicate pages).

| # | Type | Target search | Page | Status |
|---|---|---|---|---|
| L1 | Stock site | prepare video for adobe stock / adobe stock video contributor | adobe-stock-video-workflow | LIVE Nov 18 |
| L2 | Camera | sell drone footage on stock sites / dji drone footage stock / fpv stock footage | drone-footage-for-stock | Draft (Dec 7 slot) |
| L3 | Camera | sony fx3 stock footage workflow / s-log3 stock footage | sony-slog3-stock-footage | Draft (Dec 14 slot) |
| L4 | Competitor | xpiks alternative (video) | Merge with article #3 rather than a second page | Folded into article #3, no separate page |
| L5 | Stock site | shutterstock video contributor upload | shutterstock-video-contributor (angle: 7-50 keywords, sentence descriptions, editorial) | Draft (Dec 28 slot) |
| L6 | Stock site | pond5 video upload / sell footage on pond5 | pond5-video-upload (angle: file names, size caps, payout; video pricing is tiered) | Draft (Dec 21 slot) |
| L7 | Camera | blackmagic raw stock footage / braw stock | blackmagic-raw-stock-footage | Draft (Jan 4 slot) |
| L8 | Camera | red r3d stock footage | red-r3d-stock-footage (says REDCINE-X Pro needed) | Draft (Jan 11 slot) |
| L9 | Competitor | premiere pro batch export clips for stock | premiere-pro-batch-export-stock (overlaps article #4, pick one) | Draft (Jan 18 slot) |
| L10 | Stock site | storyblocks / getty istock video contributor | storyblocks-video-contributor; Getty/iStock not drafted (spec page didn't load Nov 19) | Draft (Jan 25 slot) |

## Later (separate project, not now)

ChatGPT and Claude app directories (one DEADWORK connector for all products, starting with account
info and export status). Post-launch, Dec 1-12 prototype.
