# Round 4 / A — Stacked Roster

**Brief:** big words, and all six tools listed plainly with what each one does. Nothing else.

**Type scale.** Three Anton steps, each about half the one above:
- Headline `clamp(60px, 17vw, 300px)` at line-height .86. It renders at ~245px on a 1440 screen, where "CREATE MORE." spans 1284 of 1344px. On a 390 phone it's 64px and fills the width edge to edge.
- Product names `clamp(48px, 8vw, 136px)` at ~115px on desktop and 48px on phone. That's about half the headline, still a statement size. The longest name, STOCK SHREDDER, is 720px wide in a 774px column.
- Taglines are Archivo 500 at `clamp(20px, 1.8vw, 28px)` in full bone, so they read as the second voice right after the name.
- Descriptions are 16px Archivo in bone-2, capped at 46ch (about 60–70 characters per line).
- Labels (category headings, status, specs, nav) are JetBrains Mono 11–12px uppercase, kept deliberately quiet so they never compete with the names.

**Layout.**
- The hero is one full screen: film behind, headline anchored bottom-left, lede, then a foot row with "06 Tools ↓" and the live LA time.
- The roster runs on a 12-column grid. The name takes columns 1–7. The tagline, full description, platform, works-with and signup take columns 8–12, top-aligned to the name. Below 1180px the split becomes 6/6. Below 900px the explanation drops directly under the name.
- Category headings (I — Pre-Production, II — Production, III — Post-Production) are plain mono text with no rules.
- Spacing does the grouping: 64–112px between tools and 96–176px between phases. There are no borders, cards or dividers anywhere in the roster.
- Everything is visible with no clicks. Each name links to its product page and each in-development tool has its notify.js form inline. Stock Shredder swaps the form for a solid "Get Stock Shredder" button, the page's only primary button. Notify buttons are outlined (secondary).
- Each tool has an anchor (`#scene-lock` etc.), so the live site's hash links still land on the right tool.
- The LA clock shows twice from one ticker: small in the hero foot, then large (mono, 44–80px, tabular) in the footer beside the "BY ARTISTS. / FOR ARTISTS." sign-off, which is set at name scale.
- The masthead has the meta labels on each side and "Pre-Production · Production [DEADWORK] Post-Production · Studio" in the middle, with mega-menus as in round 3. It turns solid once you scroll past the hero. On phones it becomes two rows: the wordmark row, then four tabs.
- Motion: one headline rise on load. The video uses the exact `data-hero-video` / `data-src` / `data-src-mobile` gate. With reduced motion you get the poster only, no video bytes and no animation.
