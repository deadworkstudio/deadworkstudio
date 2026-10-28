# Round 4 / D: Category Rows

**Two ideas only.** The page is built from big words and a plain list of the tools with what each one does. It has no cards, borders, connecting lines, dials or tables.

**Hero:** "CREATE MORE. / MANAGE LESS." in Anton at about 15vw, so it runs roughly 80% of the screen width on desktop. It sits at the bottom of a full-height hero over the grayscale film. Under it are the lede and three plain jump links (I / II / III) to the bands.

**Three bands, in timeline order:** I — Pre-Production, II — Production, III — Post-Production. Each band opens with its label in Anton at about 3.4vw: the numeral in bone and the stage name in muted bone. Its two tools sit side by side below the label.

**Bands are separated by background shade only.** Band II is one step lighter (`--ink-raised`) than I and III. The bands also have 72–152px of vertical padding, so each one reads as its own statement without any divider lines.

**Each tool, top to bottom:**
- one mono meta line: index, status and platform
- the name in Anton at about 6.6vw, the biggest type after the headline
- the tagline in heavy Archivo
- the full verbatim description in muted body text, always visible

Nothing about what a tool does is hidden behind a click.

**One click away:** a "Details & updates" button opens a native `<dialog>` with the specs and the `notify.js` signup form. `#scene-lock`-style deep links open the matching sheet. Stock Shredder is the only live tool. It shows a green "Available now" and a solid "Get Stock Shredder" primary button.

**Footer:** "BY ARTISTS. FOR ARTISTS." at band-name scale, then the Los Angeles clock at display size in Anton (time only, PDT/PST). Each digit sits in a fixed-width cell so the numbers don't jitter as they tick. Screen readers hear the time once a minute.

**Nav:** 06 Tools · Pre · Production | wordmark | Post · Studio · Est. Los Angeles. The bar is fixed, transparent over the film and solid ink once you scroll. On phones the wordmark sits on top with the four tabs in one row beneath it.

**Motion and reduced motion:** headline lines and tools fade up on scroll, staggered left to right within each band. Under reduced motion the page is static and only the poster shows. No video bytes are fetched, using the same `data-src` mechanism as the live `home.js` (verified: 0 mp4 requests).
