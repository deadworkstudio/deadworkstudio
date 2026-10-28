# Option 03: Industrial Minimalism

**Influences:** Teenage Engineering, NASA, ARRI. The page works like a piece of equipment you read.

## Design philosophy
- **Hairline grid, one column system.** A 12-column grid with 1px rules. Space is the only decoration.
- **Labels work like equipment labels.** Small tracked mono caps (JetBrains Mono) number everything (CH 01–06, keys 01–04, stages I–III), the way a camera body or rack unit labels its controls.
- **Color means status.** The palette is ink and bone. Yellow shows IN DEVELOPMENT, green shows Stock Shredder is shipping, and red appears only on form errors.
- **Motion only where it tells you something.** The only motion is a 160ms menu fade and hover color changes. The clock changes because time changes. It has no animation of its own.

## What changed visually
- **Header:** the 3 | logo | 3 composition is literal: `06 Tools · Pre-Production · Production | DEADWORK | Post-Production · Studio · Est. Los Angeles`. Each nav tab is a numbered hardware "key" with a small light that turns on when its menu is open. On mobile the four keys sit in one row of four segments, all visible, with no hamburger menu.
- **Hero:** the video plays inside a framed "monitor" with viewfinder corner marks and a small LA timecode readout. "CREATE MORE. MANAGE LESS." stays large (Anton, up to 156px). Under the monitor, a **stage ruler** (I / II / III with tick marks) acts as the pipeline and links to each stage.
- **Index (new):** a spec table of all six tools showing channel, stage, status, and iPhone/Mac/Windows indicators (filled squares). Clicking a row jumps to that tool. This fixes the live site's problem that the product panels could only be reached through the URL hash.
- **Tool modules:** each product is one rack unit: ID column, then nameplate (the logo in a consistent plate with corner "fastener" dots), then the full description, the Platform / Works with spec rows, and the Notify form. Stock Shredder gets a green light and the "Get Stock Shredder" button instead of a form.
- **Footer:** the LA time is the main instrument. Large tabular mono digits, AM/PM and PDT/PST stacked beside them, and a 60-step seconds scale that lights one step per second. The date is removed.

## What stayed the same
All copy is verbatim from CONTENT-SOURCE-OF-TRUTH.md. The four nav tabs have the same labels and order, and their menus show the logo, name, tagline, badge and platform for each product. Stock Shredder has no "IN DEVELOPMENT" badge. The wordmark is the real asset, and clicking it resets to the top, closes any open menu and clears the hash. Product and Studio links point to the real pages (`../../../products/...`, `../../../studio/`). The forms use the unmodified shared `assets/js/notify.js`. The hero video uses the same `data-hero-video` / `data-src` / `data-src-mobile` mechanism as the live site: no source is attached under reduced motion, so no video bytes are downloaded.

## Why it fits DEADWORK
DEADWORK makes tools for crews who trust their ARRI and their card readers. A homepage that reads like a spec sheet tells them these tools are built to the same standard, and it does it without saying so. The tone stays dark, cinematic and confident without adding decoration.

## Tradeoffs
- **Longer page:** all six products are fully expanded instead of swapped into a single panel. The full prose is visible with no hidden interactions, but there is more scrolling. The index table and stage ruler keep jumping around fast.
- **Click-only menus:** the nav menus open on click, not hover. This is predictable on touch and keyboard but needs one extra click on desktop.
- **Status cell for Stock Shredder:** the index status cell shows only the green light, with no word, because the content file has no status label for it. Adding a short approved word there would make it clearer.
- **Weight:** about 59KB of uncompressed HTML, CSS and JS combined (much smaller gzipped), with no dependencies. Fonts and images are the site's existing files.
