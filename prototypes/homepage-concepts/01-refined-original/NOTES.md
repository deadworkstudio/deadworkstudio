# 01: Refined Original

## Design philosophy
This is the live homepage done with more care. It keeps the same structure: one cinematic poster,
the 3 | wordmark | 3 header, the oversized Anton statement and the footer. What changes is the
execution. The Apple influence shows up as precision: one spacing scale, tabular numerals, a single
ease-out curve, and motion that follows your input instead of performing. Fear of God shows up as
restraint: no new colours, no new decoration, hairlines instead of boxes, and empty space left
alone. Lens Distortions shows up as atmosphere and product storytelling. The video fades in only
once it's actually playing, the frame dims ("lights down") while you read about a tool, and each
tool gets a proper product sheet.

## What changed visually
- **The six tools are now visible and reachable.** A new index sits along the bottom of the
  poster: three tools, a registration mark, then three more, in lifecycle order. Category brackets
  run above it, and the Production bracket passes straight through the center mark, so the 3|logo|3
  layout and the three real categories now support each other. Clicking a tool swaps its full
  sheet into the stage (description, specs, signup form or the Stock Shredder button), the same
  in-place swap the original `home.js` was built for. Prev/next arrows, the ← → keys, Close/Esc and
  the wordmark all work, and the URL hash and back button stay in sync.
- **Sheets carry the statement typography.** Each tagline is set in Anton capitals ("EVERY FILE.
  VERIFIED."), the same voice as CREATE MORE. MANAGE LESS. The text itself is unchanged; only CSS
  capitalizes it.
- **Status is shown by shape.** A hollow square means in development and a filled green square
  (#8FD687) means shipping. Stock Shredder never shows the IN DEVELOPMENT badge.
- **Refined mega-menu.** Frosted ink panel, the category name in Anton next to two logo plates, a
  calmer entrance, and an instant swap when you move between tabs.
- **The clock is now a designed element.** It shows only the time, large tabular mono with dimmed
  seconds and PDT/PST, plus a 60-step "gate" hairline whose mark moves once per second. It's
  always Los Angeles time, and the date is gone.
- The email field and button are joined into one 48px unit, the statement gets a one-time
  line-mask entrance, and focus states, 44px touch targets and the 16px input (so iOS never zooms)
  are all covered.

## What stayed the same
Header order and labels, the registration-corner tab frames, the wordmark, the hero poster and
video files plus the exact reduced-motion and no-bytes video loading, all copy word for word, the
real product, Studio and social links, the shared `assets/js/notify.js` signup path (honeypot,
status region, validation messages) and the dark, bone-on-ink palette.

## Why it fits DEADWORK
It's the least risky option because it changes nothing a returning visitor relies on. It fixes the
one real gap (product details were only reachable through a hidden #hash) and makes every surface
feel deliberate, like precision equipment in a luxury housing.

## Tradeoffs
- On desktop the poster still fits one screen, so the product sheets have to fit within it. On
  short windows the page grows and scrolls instead of shrinking the type. On phones it becomes
  one natural scroll, and opening a tool scrolls to its sheet.
- All six sheets are stacked in the same layout cell on desktop, so switching never shifts the
  layout. The cost is that the stage reserves the height of the tallest sheet.
- There are no new assets or dependencies: about 70 KB of uncompressed HTML, CSS and JS
  (much of it comments) on top of the existing site assets. Video loading is unchanged.
- Without JavaScript, the hash links still open the right sheet through CSS `:target`. The clock
  needs JavaScript and shows a dashed placeholder without it.
