# Option 05 — THE SLAB

**The one idea:** the homepage is a single wall of type. The statement, the six product names and the live Los Angeles time are each set as one line cut to the exact width of the screen, and every product line is a door you open.

## Design philosophy
- **Type is the interface, not decoration.** There are no cards, thumbnails or product grid. The product name *is* the button. You open Loadout by clicking the word LOADOUT.
- **Architecture over layout (Rick Owens).** Every line is exactly the same width, so the page reads as one monolith. Line heights vary only because the names have different lengths: LOADOUT is a tall block and STOCK SHREDDER a thin one. That accidental rhythm is what makes it look brutalist.
- **Product presentation (Nike).** Each name sits under a thin mono spec strip with the index, tagline, status and platforms, like the label on a product wall. When you hover one name, the others step back.
- **Studio attitude (The Blksmith).** One typeface at one scale, applied without exceptions. The only motion signature is "the splice": on hover, the lower half of a word slides sideways like a cut on a timeline. It's a reference to editing, so it doesn't need explaining to filmmakers.

## What changed visually
- The page becomes four acts: **I Pre-Production, II Production, III Post-Production, IV Los Angeles (Now)**. Act labels stick under the header while you scroll, so you always know where you are.
- **The clock is the final line of the slab.** It's set at the same monumental scale as the products (`08:46:49 PM PDT`). Time only, with no date, always America/Los_Angeles, PDT/PST. Each glyph sits in a fixed-width cell, so the line never shifts as digits change. Changed digits "cut in" for one frame.
- The full product content (description, specs, Notify me form, or the Get Stock Shredder button) is now visibly reachable. Click a name or its strip and the slab splits open underneath. Deep links (`#loadout`) still work and stay in sync with the URL and the Back button.
- Stock Shredder has no badge. Its strip carries a single brand-green (#8FD687) square as the only "shipping" mark.

## What stayed the same
- The centre nav: Pre-Production · Production · DEADWORK wordmark · Post-Production · Studio (2 | logo | 2). The first three tabs open the mega-menu cards with logo, name, tagline, badge and platform, and link to the product pages. Studio is a plain link. Clicking the wordmark resets the page.
- All content is verbatim from CONTENT-SOURCE-OF-TRUTH.md. The bone/ink palette, Anton, JetBrains Mono, the real wordmark and logos are unchanged.
- The hero video uses the same `data-hero-video` / `data-src` / `data-src-mobile` mechanism. Under reduced motion only the poster shows and no video bytes are fetched.
- Signups use the shared `assets/js/notify.js`, unmodified, with the same form markup contract.

## Why it fits DEADWORK
"CREATE MORE. MANAGE LESS." works as a reduction brief. The page removes everything except the words, and the products are shown with the same confidence as the statement. It's dark, quiet and very loud at once, and it doesn't look like a template.

## Tradeoffs
- **Performance:** the fit-to-width is pure CSS. Each line has a `--k` ratio measured from Anton's real glyph widths, and `font-size = k × 1cqw`. There's no JS measuring and no layout shift at any width. Anton loads with `font-display: block` so a fallback face can't overflow the lines. The only JS is the menu, the doors and the clock.
- **Scroll length:** desktop is tall (about 3,800px) because the names are huge. That's deliberate: the scroll *is* the product lineup.
- **Discoverability:** a door is a word, not a "Learn more" button. The spec strip carries a +/− mark and is also clickable, to make it obvious.
- **Reduced motion:** no video, no splice slide, no door animation, no digit tick. The same page appears instantly, fully functional.
- **Small addition:** each open door has a small "Product page →" link. It's navigation chrome, not product copy. Remove it if you want the panels to be strictly verbatim.
- **Browser support:** container units need Safari 16+ / Chrome 105+. Older browsers get a `vw` fallback that fits within about 1%.

Files: `index.html`, `slab.css`, `slab.js`, `desktop.png` (1440), `mobile.png` (390).
