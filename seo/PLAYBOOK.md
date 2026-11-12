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
- An honest "where it falls short" section and a "when the other way makes sense" section.
- At least 2 real app screenshots from `assets/img/products/<product>/`.
- Sources linked for any outside rule (stock site specs etc.), with the month checked.
- The tracked CTA (added by the build): `?ref=guide&utm_campaign=<slug>`.
- FAQ (4 to 6), which the build also turns into FAQ rich-result data.
- No prices in the body. The CTA box is the only offer.

## Rules

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

## Later (separate project, not now)

ChatGPT and Claude app directories (one DEADWORK connector for all products, starting with account
info and export status). Post-launch, Dec 1-12 prototype.
