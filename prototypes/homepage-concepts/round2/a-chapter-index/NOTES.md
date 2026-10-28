# Round 2 / A: Chapter Index

## What this is
Cinematic Studio's widescreen black-and-white atmosphere, with the 6-product "reel index" promoted to a persistent navigation element (`<nav class="reel-index" data-reel-index data-state="hero">`) instead of a one-time footer line. It tracks which chapter (I/II/III) is in view as you scroll and lets you jump straight to one.

## What stayed from Cinematic Studio
- Same 3 chapters (I — Pre-Production, II — Production, III — Post-Production), each opening on a full-width still photo with the chapter's 2 products listed under it.
- Same black-and-white restraint — color only shows up in signup success/error states.
- Same hero treatment, same `prefers-reduced-motion` handling for the hero video.

## What's different
- The index bar isn't just a footer afterthought — it changes state (`data-state="hero" / "chapter"`) as you scroll, so it's always telling you where you are in the reel, like a film strip counter.
- Clicking a product name in the index jumps to its chapter rather than just being a label.

## Tradeoffs
- The index bar adds a bit of visual noise to what was a very clean, spare layout in the original Cinematic Studio — worth checking it doesn't fight the full-bleed stills for attention.
- Slightly more JS (258 lines) than the original concept needed, to track scroll position and update the index state.
