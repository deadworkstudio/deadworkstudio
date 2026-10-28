# Round 3 / B: Radial

**The idea.** The constellation hero becomes an instrument dial. The wordmark, "CREATE MORE. MANAGE LESS." and the supporting line sit inside the ring. The six tools sit on it like bearings, with name and tagline always visible. Masthead + dial + footer rail = exactly 100svh. Nothing scrolls on desktop.

**The geometry.**
- The ring is split into three 120° phase sectors, each labelled along its own arc: III Post-Production 0–120°, II Production 120–240°, I Pre-Production 240–360°.
- Tools sit at 30/90/150/210/270/330°. That puts two tools in each sector and keeps the original 3 | logo | 3 billing: three on the left, three on the right.
- Each label hangs outward from its leader line. Labels above the horizon hang up, labels below hang down, and the 90°/270° labels sit centred. Labels never point back into the ring.
- Every node's index line also repeats its phase ("01 — Pre-Production"), so the grouping is still readable if the small curved arc text isn't.
- One CSS variable, `--R`, sets the ring radius and the label positions (via `sin()`/`cos()`). It's sized as the largest ring whose top and bottom labels still clear the masthead and rail, and whose side labels still clear the screen edge. `radial.js` reads the same `--R` through `.dial-probe` and draws the SVG ring to match.
- **Tested:** 900x700 through 1920x1080. No label overlaps, nothing tucked under the masthead or rail, page height equals viewport height. Only the two longest taglines wrap to two lines, and only below about 1100px.

**Instrument details.**
- The 60 ticks double as a seconds dial. A small marker steps around the ring in sync with the Los Angeles clock in the rail.
- The masthead's centre slot is a fixed index mark pointing at 000°.
- Stock Shredder's markers are filled solid. The five in-development tools use hollow markers.

**The full details.** Clicking a tool opens its readout: a native `<dialog>` side panel with the full description, specs, and either the `notify.js` form or the "Get Stock Shredder" button. The panel works with deep links (`#handoff`). Escape, the backdrop or "Close" all clear the hash, and focus returns to the tool you came from. Without JavaScript, CSS `:target` shows the same panel.

**Phones (under 820px).** A radial layout doesn't fit a phone, so the dial unrolls into a list:
- The lock-up sits inside a tick ring drawn in CSS only.
- Below it, the three phases stack as headed groups (I / II / III), each with its two tools as rows.
- The clock becomes a framed readout above the sign-off.
- The film plays behind the lock-up only and fades to ink under the list.

**Reduced motion.**
- Poster only; video bytes are never fetched. Desktop gets `hero.mp4`, phones get `hero-mobile.mp4`.
- No ring draw-on, focus pull or panel slide.
- The seconds marker still steps, the same way the digital clock does.
