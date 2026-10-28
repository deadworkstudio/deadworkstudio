# Option 02: Experimental Editorial

**Influences:** A24 + Rick Owens + Balenciaga. The homepage reads like an independent film's title sequence that turns into an art publication's table of contents.

## Design approach
- **Type is the image.** "CREATE MORE. MANAGE LESS." is set on four staggered lines (left, right, left, right), each about 15vw tall. The hero film plate is pushed off-axis behind the type, and the letters knock out of the footage (difference blend). This is the A24 poster move: the statement and the picture are one object.
- **Asymmetry with a grid underneath.** Product entries alternate sides like magazine spreads (mark left and copy right, then the reverse). Hairline rules and mono metadata ("No. 01 / Pre-Production") hold it together, in the spirit of Rick Owens: brutal but exact.
- **Chapters, not sections.** I, II and III are set as huge Roman numerals and act as the dividers between Pre-Production, Production and Post-Production.
- **One inversion.** Stock Shredder, the only shipping product, is printed in reverse: bone stock with ink type. It's the Balenciaga move. The live product stands out without adding a badge, a colour or any new copy.
- **The clock is the end card.** Los Angeles time, shown huge in Anton with fixed-width digit cells so nothing jitters. Only the changed digit flickers. It shows time only (no date), 12-hour with AM/PM and PDT/PST.

## What changed visually
- The hero went from a centred headline over full-bleed video to a staggered title sequence with an off-axis plate.
- I added a new **3 | DEADWORK | 3 index** under the hero. It shows six numbered product names with the wordmark plate in the centre. Hovering or focusing a name turns the centre plate into that product's logo and tagline. Clicking a name jumps to the full entry.
- All six product descriptions, specs, forms and CTAs are now **always visible** on the page as editorial entries. On the live site they're only reachable by typing a URL hash.
- The nav dropdowns are restyled as category "contents" drawers with a big numeral, the product cards, and a "Read chapter" jump link.
- The footer clock moved from a small-print line to the closing typographic moment.

## What stayed the same
- All copy is verbatim from CONTENT-SOURCE-OF-TRUTH.md, including the real wordmark and product logo assets.
- The nav keeps the same 4 tabs in the same order. Pre-Production, Production and Post-Production open their products. Studio links to `../../../studio/`.
- The product cards keep their logo, name, tagline, IN DEVELOPMENT badge (Stock Shredder has none) and platform.
- Each product links to its real product page. The signup forms use the live `assets/js/notify.js` with the same markup contract (email field, hidden spam-trap field, status message).
- The hero video logic matches the live `home.js` exactly. No video source is in the markup. Reduced motion or no JS means the poster image only and zero video bytes. Phones get the mobile video file.
- The palette is ink and bone tokens only. Fonts are Anton, Archivo and JetBrains Mono, all self-hosted.

## Tradeoffs
- The hero knockout depends on the footage. Very bright frames briefly make parts of "MORE." busier, so on phones the plate is darkened to 55% brightness to keep it crisp.
- The page is a long scroll, because the full content is on it instead of in hidden panels. The masthead is sticky so navigation is always one tap away.
- The centre "stage" in the index is hover/focus-only and is hidden below 1180px. On touch screens the numbered list is the whole index.
- On mobile the nav uses `display: contents` to lay the four tabs out as one even strip. Very old Safari versions dropped the nav's accessible label with this technique (the links still work).
- The Stock Shredder spread uses `clean/stock-shredder.png` (about 125 KB, lazy-loaded) instead of the webp. The webp's semi-transparent edge shows as a grey box when it's turned black on bone.
- Reduced motion: every animation and transition is off and smooth scrolling is off. The clock still updates its digits, which is a text change, not motion.
