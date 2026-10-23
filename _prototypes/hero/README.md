# DEADWORK hero prototypes (Phase 4) — local review only

Three genuinely different first screens for deadworkstudio.com, built on the production design tokens
and real assets. Nothing here is linked from the live site, and this branch is not deployed.

## View them

From the root of this worktree:

    python3 -m http.server 8000

then open http://localhost:8000/_prototypes/hero/ and pick A, B or C. Resize under 720px wide (or open on
a phone on the same network) for the mobile treatment. Each page has a small A / B / C switcher top-right.

- `a/` — Industrial Cinema: full-bleed footage from the 4K master, film-slate text block, slate strip.
- `b/` — Engineered Performance: the real Stock Shredder Review screen rises into frame, readouts, rail.
- `c/` — Editorial Luxury: sand page, light two-tone headline, one photographic plate, numbered index.
- `shared/` — shared CSS, the Archivo typeface (SIL OFL), hero video renditions and posters, the Review capture.
- `screenshots/` — desktop (1440) and iPhone 14 renders of each, plus the real app captures.

## Media provenance

- `shared/media/hero-1080.mp4`, `hero-720.mp4`, `hero-portrait-1080.mp4`, posters: re-encoded from
  `~/Desktop/Deadwork Homepage.mp4` (3840x2160, 23.976 fps, 31.2 s — the same cut the live site plays at 854x480).
- `shared/media/review.png`: the installed Stock Shredder 0.6.3 Review screen with Daniel's own footage
  (`fuzzy.mp4`, auto-labelled "Man thinking"), captured through the app's own drop handler. Nothing in the app
  was changed; the session was cleared afterwards with the app's own Start over.
