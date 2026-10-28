# Round 3 / C: Tabular Manifest

## What this is
The Constellation Hero's one-screen promise, with the six tools set as a numbered manifest (call sheet / equipment checklist) instead of display-type names. Wordmark in the centre of the title block, "CREATE MORE. MANAGE LESS." directly under it, then the manifest, then the clock strip. No scrolling at 1440x900, 1600x900, 1440x800, 1280x720 or 1024x768 (measured).

## Manifest decisions
- **Columns:** No. / Phase / Tool / Function / Platform / Status / arrow. Each line is one link, so it reads as one sentence to a screen reader ("01 I Pre-Production Scene Lock Plan smarter...").
- **Phase grouping uses a ledger ditto mark (")** on the second tool in each phase, plus a heavier rule where a new phase starts. That keeps I/II/III visible without spending three extra rows on subheaders.
- **Type split:** mono uppercase for data (numbers, phase, platform, status), extended Archivo caps for tool names, plain Archivo for taglines. Names sit at about 20px, not poster size. The headline stays the only big type.
- **Status:** a hollow square plus "IN DEVELOPMENT" in grey, and a filled green dot plus "LIVE" for Stock Shredder. Green is the only colour on the sheet, so the one tool you can buy stands out right away. The dot pulses only when motion is allowed.
- **Full content without scrolling:** clicking a line opens a spec sheet (native `<dialog>`) that slides over from the right. It holds the full description, Platform / Works with, and the notify.js form (or the "Get Stock Shredder" CTA). Prev/next and the arrow keys step through the manifest. The URL hash (#scene-lock...) still works as a deep link. With no JS, every entry renders on the page below the manifest.
- **Clock:** a readout showing LA time only (no date), with a 60-tick seconds rail as the instrument detail. It keeps ticking under reduced motion because it carries information. Only the transitions stop.
- **Fit strategy:** row height, headline size and wordmark width are clamped against `vh` as well as `vw`, so short laptop screens get a tighter layout instead of a scrollbar. Below 1180px the Platform column drops out (it's in every spec sheet). Under 820px the sheet stacks into two-line records and scrolls normally.

## Tradeoffs
- Taglines are the only product copy on the main screen. Descriptions are one click away, not visible at once.
- With no product stills, the screen is more austere than the Constellation Hero. The faint hero film behind it is the only image.
