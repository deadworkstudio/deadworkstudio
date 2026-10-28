# Round 3 / D: Instrument Cards

**Layout:** a 4-column, 2-row rack. The DEADWORK wordmark, headline and lede fill the two centre cells of the top row. Scene Lock sits to the left of that block and Sound Driver to the right. The bottom row holds Set Control, Loadout, Handoff and Stock Shredder. Read left to right, the columns follow the production timeline: Pre (col 1), then Production (cols 2–3), then Post (col 4). Under the rack, a label strip like the printed labels on hardware brackets each group as I / II / III. The constellation's "products flank the logo" shape is kept, and the three categories stay together instead of Production being split across both sides.

**Module anatomy:** each card has the same parts, top to bottom:
- an index number (01–06) and a status LED
- the product logo as a small badge
- the category, the name in Anton, and the tagline
- a hairline divider
- the platform text and a square "+" Details key

There is a 1px border and a small screw head in each corner, and every card sits on the same 12px gap. Equal sizes and one gap width are what make the cards read as interchangeable instruments rather than marketing cards.

**Status as hardware:** in-development products show an unlit ring LED. Stock Shredder, the one live product, gets a lit brand-green LED, "LIVE", a slightly brighter border and a solid "Get Stock Shredder" key. Green is used only for "live" and for signup success.

**Centre window:** the wordmark cell has no fill, so the hero film shows through it. It is marked only by crop marks in the corners. The background shade is darkest behind the modules and most open in the centre, so the panels read as solid and the brand reads as the view through them.

**Tactility:** hovering lights the border and fills the "+" key in bone. Pressing a card pushes it down 1px. The whole card is clickable through a stretched Details button, so no interactive elements are nested. Stock Shredder's buy key sits above that click area.

**Full content stays reachable:** a card's Details key, or a `#product` deep link, opens a native `<dialog>` sheet. Each sheet has the product's verbatim description, specs, and either a `notify.js` signup form or the Stock Shredder button. Escape, the close button or a backdrop click dismisses it, and focus goes back to the card. On phones the sheet slides up from the bottom.

**One screen:** the frame is locked to `100svh` with rows of `auto / 1fr / auto`, so the rack takes whatever height is left. Tested with no scrolling at 1440×900, 1600×900, 1440×780, 1280×720 and 1024×768. Under 820px tall, the screen tightens type and padding. Under 1360px wide, "Details" collapses to the "+" key and the word stays for screen readers.

**Clock:** a bordered readout module in the bottom rail: Los Angeles label, an LED that blinks once a second, and HH:MM:SS with AM/PM and PDT/PST. Time only, no date.

**Motion:** the cards slide into place one after another and each LED flickers on. The sheet fades up. Only opacity and transform are animated, with `backwards` fill so the press-down still works afterwards. Reduced motion shows the static page, poster only, and no video bytes are ever fetched. This is the same `data-src` mechanism the live `home.js` uses.

**Phones:** a single column in timeline order. The bracket labels become section headers and every card is shown in full.
