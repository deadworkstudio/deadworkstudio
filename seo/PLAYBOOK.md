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
| 4 | SS | batch export clips Premiere Pro stock footage | Stock Shredder vs Manual Editing in Premiere Pro | Merged into landing page L9 (premiere-pro-batch-export-stock, Daniel Nov 19). No separate article | Done as L9 |
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
Cadence: superseded by the daily queue below (Daniel, Nov 19). Each goes live only on Daniel's "put it live".
No paid keyword tool, so order is by buyer fit, who we already email (drone + Sony shooters), and how much the page
can say that article 2 doesn't already say (avoid near-duplicate pages).

| # | Type | Target search | Page | Status |
|---|---|---|---|---|
| L1 | Stock site | prepare video for adobe stock / adobe stock video contributor | adobe-stock-video-workflow | LIVE Nov 18 |
| L2 | Camera | sell drone footage on stock sites / dji drone footage stock / fpv stock footage | drone-footage-for-stock | Draft (Dec 7 slot) |
| L3 | Camera | sony fx3 stock footage workflow / s-log3 stock footage | sony-slog3-stock-footage | LIVE Nov 20 |
| L4 | Competitor | xpiks alternative (video) | Merge with article #3 rather than a second page | Folded into article #3, no separate page |
| L5 | Stock site | shutterstock video contributor upload | shutterstock-video-contributor (angle: 7-50 keywords, sentence descriptions, editorial) | LIVE Nov 22 |
| L6 | Stock site | pond5 video upload / sell footage on pond5 | pond5-video-upload (angle: file names, size caps, payout; video pricing is tiered) | LIVE Nov 21 |
| L7 | Camera | blackmagic raw stock footage / braw stock | blackmagic-raw-stock-footage | LIVE Nov 23 |
| L8 | Camera | red r3d stock footage | red-r3d-stock-footage (says REDCINE-X Pro needed) | LIVE Nov 23 |
| L9 | Competitor | premiere pro batch export clips for stock | premiere-pro-batch-export-stock, titled "Stock Shredder vs Manual Editing in Premiere Pro" (replaces article #4) | LIVE Nov 23 |
| L10 | Stock site | storyblocks / getty istock video contributor | storyblocks-video-contributor; Getty/iStock not drafted (spec page didn't load Nov 19) | LIVE Nov 23 |

## Priority queue (SEO plan, Nov 23) - take these BEFORE the Daily queue

Plan doc: https://claude.ai/artifact/25xsp2RpBSrunD6bnLQy85 (100-article roadmap, briefs, architecture).
Publish order matters: sell-stock-footage links to the archive and best-sites pages, so it goes live after both.

**Hub (11-24, Daniel approved via Loadout thread, #141):** /guides/ hub is live with a Guides footer link. When a Stock Shredder guide goes live, add its slug to a Stock Shredder topic in HUB in seo/build.py (the build stops otherwise). Suggested topics for the queue: archive / best sites / make money / income -> a new "Making money" topic; rejections, workflow, batch, CSV, log -> "Getting started" or "Editing".

| # | Search | Slug | Status |
| --- | --- | --- | --- |
| P1 | sell old footage | sell-old-footage-archive | LIVE 11-24 (main 179d605) |
| P2 | best sites to sell stock footage | best-sites-to-sell-stock-footage | LIVE 11-25 (main 97ce326) |
| P3 | how to make money selling stock footage | sell-stock-footage | LIVE 11-26 (indexing requested 11-27) |
| P4 | "Keep reading" block at the end of every guide: up to 3 related LIVE guides, set by the "related" meta field, then by shared keywords. Build refuses a live guide whose body links to a draft. (Hub + footer link added later, 11-24, #141) | seo/build.py | LIVE 11-23 (main 8ef5b92) |
| P5 | how to keyword stock footage | keyword-stock-footage | Merged 11-24: the live free title and keyword checker (stock-footage-title-keyword-checker) answers this search |
| P6 | stock footage rejected | stock-footage-rejection-reasons | LIVE 11-27 (main a1d3fbc, indexing requested) |
| P7 | what stock footage sells best | what-stock-footage-sells | Draft ready (11-26) |
| P8 | stock footage workflow | stock-footage-workflow | Draft ready (11-27) |
| P9 | batch export video clips | batch-process-stock-footage | To draft |
| P10 | stock footage csv upload | stock-footage-metadata-csv | Merged 11-27: the live free upload sheet converter (stock-upload-sheet-converter, keyword "stock footage csv metadata") answers this search |
| P11 | log footage stock | log-raw-footage-for-stock | To draft |
| P12 | how much money stock footage (needs Daniel OK on money claims) | stock-footage-income | To draft |
| P13 | stock footage software | best-stock-footage-software | To draft |

## Daily queue (Daniel, Nov 19: "post everyday")

ONE list for every Stock Shredder page from now on. It replaces the P1-P4 list, the keyword list, the L1-L10 list
and the growth plan's 30 landing pages + 50 blog topics. Those ~85 ideas were merged so that each row below answers a
DIFFERENT search. Rule: before drafting, check the row's search isn't already answered by a live page. If it is,
skip the row or merge it in, never publish a second page for the same search.

Already live (don't redo): raw-footage-to-stock-clips, stock-footage-requirements-adobe-pond5-shutterstock,
prepare-stock-footage-faster, adobe-stock-video-workflow.

Merged away as repeats: P2 "why it takes so long", P4 "upload more each week" and "upload stock footage faster"
(all = prepare-stock-footage-faster). "Grade S-Log3" (= Sony page). "Grade D-Log M" and "drone pilot workflow"
(= drone page). "Batch export in Premiere", "Stock Shredder vs Premiere" and "batch export separate ProRes files"
(= Premiere page). Camera articles that repeated camera landing pages (BRAW, RED, ARRI, Canon, iPhone). "How many
keywords" (inside the keywords page). "Check for logos" (inside the rejections page). "Find the sellable moments"
(inside automatic clipping). Hard drive setup + backup (one page).

Daily: the next ready draft is offered to Daniel; one new row is drafted so about 5 drafts stay ready.

| # | Target search | Page (slug) | Status |
|---|---|---|---|
| 1 | sell drone footage on stock sites | drone-footage-for-stock | LIVE Nov 19 |
| 2 | sony fx3 stock footage workflow | sony-slog3-stock-footage | LIVE Nov 20 |
| 3 | sell footage on pond5 | pond5-video-upload | LIVE Nov 21 |
| 4 | shutterstock video contributor upload | shutterstock-video-contributor | LIVE Nov 22 |
| 5 | premiere pro batch export clips for stock | premiere-pro-batch-export-stock | LIVE Nov 23 |
| 6 | blackmagic raw stock footage | blackmagic-raw-stock-footage | LIVE Nov 23 |
| 7 | red r3d stock footage | red-r3d-stock-footage | LIVE Nov 23 |
| 8 | storyblocks video contributor | storyblocks-video-contributor | LIVE Nov 23 |
| 9 | xpiks alternative | xpiks-alternative | Draft ready |
| 10 | automatic stock footage clipping software | automatic-stock-footage-clipping | LIVE Nov 23 |
| 11 | batch process stock footage / hundreds of clips at once | batch-process-stock-footage | To draft |
| 12 | how to keyword stock footage (and how many keywords) | keyword-stock-footage | To draft |
| 13 | why stock footage gets rejected | stock-footage-rejection-reasons | To draft |
| 14 | sell old footage archive | sell-old-footage-archive | To draft |
| 15 | best software for stock footage contributors | best-stock-footage-software | To draft |
| 16 | davinci resolve batch export clips for stock | resolve-batch-export-stock | To draft |
| 17 | how long should stock footage clips be | stock-clip-length | To draft |
| 18 | pond5 vs adobe stock vs shutterstock for video | pond5-vs-adobe-stock-vs-shutterstock | To draft |
| 19 | upload log or graded footage to stock | log-vs-graded-stock-footage | To draft |
| 20 | grade log footage in bulk / apply LUT to many clips | bulk-grade-log-footage | To draft |
| 21 | how to write stock footage titles | stock-footage-titles | To draft |
| 22 | how to name stock footage files | name-stock-footage-files | To draft |
| 23 | prores vs h264 for stock footage | prores-vs-h264-stock | To draft |
| 24 | best frame rate for stock footage | stock-footage-frame-rate | To draft |
| 25 | 4k vs hd stock footage | 4k-vs-hd-stock-footage | To draft |
| 26 | getty images istock video contributor | getty-istock-video-contributor | To draft |
| 27 | envato motion array video contributor | envato-motion-array-contributor | To draft |
| 28 | arri footage for stock / arriraw | arri-stock-footage | To draft |
| 29 | canon footage for stock | canon-stock-footage | To draft |
| 30 | panasonic v-log stock footage | panasonic-vlog-stock-footage | To draft |
| 31 | iphone footage for stock sites | iphone-stock-footage | To draft |
| 32 | gopro footage for stock | gopro-stock-footage | To draft |
| 33 | stabilize stock footage in bulk | stabilize-stock-footage | To draft |
| 34 | remove grain from stock footage | remove-grain-stock-footage | To draft |
| 35 | model and property releases for stock video | stock-video-releases | To draft |
| 36 | exclusive vs non-exclusive stock footage | exclusive-vs-non-exclusive-stock | To draft |
| 37 | slow motion stock footage | slow-motion-stock-footage | To draft |
| 38 | timelapse and hyperlapse for stock | timelapse-stock-footage | To draft |
| 39 | how many clips from one shoot day | clips-per-shoot-day | To draft |
| 40 | shoot more sellable stock on every job | shoot-sellable-stock | To draft |
| 41 | wedding videographer extra footage to stock | wedding-footage-to-stock | To draft |
| 42 | travel footage to stock | travel-footage-to-stock | To draft |
| 43 | process footage overnight | process-footage-overnight | To draft |
| 44 | hard drive setup and backup for a stock archive | stock-footage-drive-setup | To draft |
| 45 | stocksubmitter alternative | stocksubmitter-alternative | To draft |
| 46 | blackbox video contributor | blackbox-video-contributor | To draft |
| 47 | how much stock footage to make $1,000 a month (sourced) | stock-footage-income | To draft |
| 48 | how we tested 1,000 clips in 3 hours | 1000-clips-benchmark | To draft |
| 49 | stock footage trends 2027 (from the sites' own reports) | stock-footage-trends-2027 | To draft |
| 50 | stock footage glossary | stock-footage-glossary | To draft |

Held: price your time, taxes and payouts (needs sourcing care), year-in-review (needs real sales data),
Artgrid/Filmsupply (curated, check they take open submissions first).

## Later (separate project, not now)

ChatGPT and Claude app directories (one DEADWORK connector for all products, starting with account
info and export status). Post-launch, Dec 1-12 prototype.

## Handoff queue (Daniel 11-27: one Handoff page a day)

Handoff is not out yet (site status PROCESSING). Guides use the "Notify me at launch" CTA only: never a download, checkout or price in the body. Claims only from the live products/handoff page. Say "Handoff" only for the product, never as a generic word. Covers: hf-safe, hf-copying (real app screens). HUB topic "Offload and verify" (add more topics as the queue grows). Link to Loadout wrap/gear-check guides and Stock Shredder guides where the workflow overlaps (cards are gear at wrap; footage goes to clip prep after offload).

| # | Target search | Slug | Status |
|---|---|---|---|
| H1 | how to offload camera cards / when to format | offload-camera-cards | LIVE 11-27 (main bcded2e, indexing requested) |
| H2 | checksum verification footage / verify footage copy | verify-footage-checksum | To draft |
| H3 | what is an MHL file / ASC MHL | mhl-file-explained | To draft |
| H4 | DIT checklist / data wrangler checklist | dit-checklist | To draft |
| H5 | how many backups of footage on set / 3-2-1 footage backup | footage-backup-rule | To draft |
| H6 | ShotPut Pro alternative | shotput-pro-alternative | To draft (competitor facts from their own site that day) |
| H7 | OffShoot alternative | offshoot-alternative | To draft (same) |
| H8 | drag and drop footage safe? / copy vs verify | drag-and-drop-footage | To draft |
| H9 | camera card got corrupted / recover footage before formatting | corrupted-camera-card | To draft (no recovery promises) |
| H10 | chain of custody footage / footage delivery report for insurers | footage-custody-report | To draft |
| H11 | camera card naming and reel numbers | camera-card-naming | To draft |
| H12 | Silverstack alternative | silverstack-alternative | To draft (same) |

## Freelance articles (Daniel 11-27: one a week)

Built from Daniel's own topics, words or voice memo. Never invent his stories. Waiting on his list.
