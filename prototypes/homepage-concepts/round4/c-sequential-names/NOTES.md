# Round 4 / C: Sequential Names

**Idea:** a title sequence. You get the opening statement, then six title cards with one product per screen, then an end card. There are no borders, tables, panels or diagrams. The page is built from type, space and order.

**One type scale for everything big.** The opening statement and every product name share a single `--display` size: `min(14.2vw, 25svh, 240px)`. That's 204px at 1440 wide and 180px at 1280x720. Each name lands with the same weight as "CREATE MORE. MANAGE LESS." because it is literally the same size. The `25svh` cap means a short laptop still shows the name, tagline and the start of the description together. The size was measured in Playwright: "STOCK SHREDDER", the longest name, fits on one line at every desktop width.

**Phones go one word per line** at `24vw`, so the names get bigger rather than smaller. "SHREDDER" and "MANAGE" fill the width.

**Each card has four tiers, no more.** A mono kicker (`01 / 06 · I — Pre-Production · In Development`), then the NAME in Anton, the tagline in Archivo 500 at 24–44px, and the body in two columns: the description (60ch, bone-2) on the left and specs plus signup on the right. Stock Shredder swaps the signup for "Get Stock Shredder" and shows a green "Live" status instead of In Development.

**Pacing.** Each card is `min-height: 100svh` with its content centred, so every product gets its own full screen. Cards are separated only by space. The category label (I / II / III) carries the grouping, so I didn't add separate chapter breaks that would slow the scroll.

**Seeing all six at once.** A plain-text running order (01 Scene Lock … 06 Stock Shredder) sits at the bottom of the opening screen. Each item jumps to its card. You see the whole lineup immediately without hovering or opening anything.

**Motion.** Each name rises out of a mask like a title cutting in, and the tagline and body follow 240ms and 360ms later. This only runs under `html.motion` (JS on and motion not reduced). With reduced motion everything is static, and the hero film is never fetched. That's the same `data-hero-video` / `data-src` / `data-src-mobile` mechanism as the live `home.js`, and it was verified: 0 `<source>` elements.

**End card.** "BY ARTISTS. FOR ARTISTS." is followed by the Los Angeles clock set at the same display scale. It shows time only, 12-hour, with PDT/PST. Every digit sits in a fixed-width cell so the ticking seconds never shift the line, and the AM/PM suffix hangs off the right so the numerals stay centred. Screen readers get a quiet minute-level version.

**Kept as-is:** the 2 | wordmark | 2 tab masthead with working mega-menus (Escape, outside click and focus-out all close it), the wordmark reset, one `notify.js` form per product, and all copy word for word from CONTENT-SOURCE-OF-TRUTH.md.
