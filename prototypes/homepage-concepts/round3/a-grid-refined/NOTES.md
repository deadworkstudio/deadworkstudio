# Round 3 / A: Grid Refined

Same idea as round-2 D (3 tools | DEADWORK + headline | 3 tools, everything on one screen), rebuilt on a stricter grid.

## What changed from the round-2 base, and why
- **One column system for the whole screen.** Masthead, stage and footer all use the same three tracks (`.grid`: left | core | right). The nav tabs end exactly where the left tools end, the clock sits under the wordmark, and the signup lines up with the right tools' outer edge.
- **Rows line up across the page.** Both tool columns sit on a shared 3-row subgrid, so Scene Lock lines up with Handoff, Set Control with Sound Driver, and Loadout with Stock Shredder (measured: same top position).
- **Connecting lines removed.** The SVG lines, hub dots, draw-on animation and their JS are all gone. Each tool now starts with a single hairline above it, and that's the only structural line.
- **Every tool block has the same four parts:** index + category label (index on the outer edge, category on the inner edge, mirrored), name, tagline, and a status slot. The five in-development tools show the IN DEVELOPMENT badge. Stock Shredder uses that same slot for a filled "Get Stock Shredder" button, so the one live product stands out without breaking the grid.
- **No scrolling on desktop, checked.** Measured with no scroll at 1600×900, 1440×900, 1440×800, 1280×720 and 1024×700. Type sizes are capped by both viewport width and height (`min(vw, svh)`), and there's an extra step for short windows (≤760px tall).
- **Chapters and scenes below the fold removed.** Full descriptions, specs and per-product signups now open in place from any tool name, as an overlay under the masthead with a 01–06 index to switch between tools, a Close button and Escape. Deep links like `#scene-lock` (same as the live `home/#scene-lock`) open it directly. Without JS it's a plain section after the screen.
- **Footer is part of the same screen:** "By artists. For artists." with © and social links | the LA clock (time only, PDT/PST) | one compact site-wide signup (`notify.js`, product `general`, which the deadwork-hq Worker accepts).
- **Calmer hover.** Hovering a tool dims the other five (opacity only, no blur), brightens its hairline and turns its "+". Keyboard focus does the same.
- **Kept as-is:** the hero-video mechanism (`data-src`/`data-src-mobile`, no video download under reduced motion, verified), the mega-menu behaviour, the wordmark reset, grain, the mono/Anton type and the monochrome palette.
- **Mobile:** the page stacks and scrolls on purpose: the title lock-up over the film, then all six tools as one numbered list, then the clock, signup and footer. The tool details open full-height with a sideways index.
