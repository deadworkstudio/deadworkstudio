# Round 4 / B — Split Editorial

**The idea:** a magazine spread. The page has two jobs, big words and all six tools explained, and it does nothing else. There are no borders, cards, lines or diagrams.

**Type scale (3 Anton sizes, 1 reading face, 1 label face):**
- Statement "CREATE MORE. MANAGE LESS." uses Anton at `clamp(72px, 15.4vw, 260px)` with 0.86 leading. It is 222px at 1440 wide and fills about 80% of the screen.
- Tool names use Anton at `clamp(56px, 6.6vw, 112px)` (95px at 1440). That is the largest size where "STOCK SHREDDER" still fits one column without wrapping.
- The sign-off "BY ARTISTS. FOR ARTISTS." and the LA clock share one size, `clamp(48px, 7.6vw, 128px)`, so the clock reads as the page's last line rather than small print.
- Taglines are Archivo 600 at 19-24px in full bone, so the tagline is the second thing you read after the name.
- Descriptions are Archivo 16px/1.6 in muted bone, capped at 44ch (about 7 words per line).
- Labels (index, category, status, platform) are JetBrains Mono at 11px in uppercase. The font is subset to capitals only.

**Layout:**
- **Cover:** a full-height hero film. The wordmark sits top centre as the brand anchor, and clicking it resets the page. The statement sits at the bottom with the lede beneath it.
- **Spread:** the left page holds Scene Lock, Set Control and Loadout, flush left. The right page holds Handoff, Sound Driver and Stock Shredder, mirrored flush right. Rows line up across a wide empty middle gap, and the gap itself acts as the divider. A small mono label at the top of each page names its phases.
- Each entry is index + category, then name, tagline, description, and status · platform · "Specs + Notify me". Full specs and the signup form open in a native `<dialog>`, which also works from a `#product` link. Stock Shredder shows a green "Live" label and a primary "Get Stock Shredder" button.
- **Under 860px:** the spread folds into one flush-left column ordered 01 to 06. On phones the nav becomes a two-row masthead and the sheets slide up from the bottom.

**Kept from the live site:** the hero video mechanism (`data-src`/`data-src-mobile`, no video bytes under reduced motion), signups through `notify.js`, and the mega-menu cards with logos. The clock shows Los Angeles time only (no date), with each digit in a fixed-width slot so it doesn't jitter as it ticks. Motion is limited to the statement rising in, entries fading up once on scroll and the clock dot blinking. All of it is off under `prefers-reduced-motion`.
