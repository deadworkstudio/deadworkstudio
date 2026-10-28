# Option 04 — Cinematic Studio

**Idea:** DEADWORK as an independent film studio that happens to make software. The homepage plays
like a film: opening title card, opening billing block, three chapters, end card, slate.
A24's confidence, IMAX/Kodak's scale and film heritage, and Lens Distortions-style atmospheric
product storytelling.

## The sequence
1. **Opening title card.** The real hero video, desaturated (CSS `grayscale/contrast/brightness`) and
   letterboxed to 2.39:1. On load, a shutter opens onto the letterbox, the frame slowly pushes in, and
   "CREATE MORE. MANAGE LESS." pulls into focus. The lower letterbox bar is a working chapter index
   (I / II / III).
2. **Billing block, 3 | DEADWORK | 3.** All six product names set like a poster credit block around the
   wordmark. Every name links to that product's full section. Hovering one name throws the others out
   of focus (a rack focus).
3. **Three chapters** (Pre-Production, Production, Post-Production). Each opens on a full-bleed scope
   title card over a crew-on-set still, then two "scenes", one per product: a black-and-white still,
   the logo, tagline, full description, the spec table set like end credits, and the Notify form.
   Stock Shredder is the only product with no badge and a solid bone "Get Stock Shredder" button.
4. **End card + slate footer.** "By artists. For artists." as a closing title card. The footer is a
   clapperboard (Location: Los Angeles, Time: the live clock) that snaps shut as it enters view.

## What changed vs. live
- One scrolling film replaces the single fixed poster. All six products' full descriptions, specs and
  forms are now **visible and reachable** (the live site hides them behind URL hashes). Old hash links
  like `#stock-shredder` still land on the right product.
- Monochrome by design. The only colour is meaning: green for "You're on the list", red for errors.
- Clock: time only (no date) in a large mono timecode, LA time, PDT/PST.
- Animated film grain over the whole page. Transitions behave like cuts, dissolves, shutters and focus
  pulls, never bounces or slides.

## What stayed the same
Center nav (Pre-Production / Production / Post-Production menus + Studio link) in a 3 | logo | 3
arrangement. The menu cards show logo, name, tagline, IN DEVELOPMENT badge (not on Stock Shredder) and
platforms. The wordmark returns you to the top. All copy is verbatim from the content file. The site
fonts (Anton / Archivo / JetBrains Mono) and colours (ink and bone) are unchanged. The hero video uses
the exact `data-hero-video` mechanism, and signups go through the shared `assets/js/notify.js`.

## Tradeoffs
- **Weight:** the stills are compressed 4:5 crops of existing product/hero images, stored in
  `stills/` (~1.1 MB total, all lazy-loaded). The first screen costs the same as live: poster + video.
  Converting the stills to WebP would roughly halve that.
- **Length:** it's a long page by design. The chapter index, billing block and nav menus give
  three ways to jump straight to a product.
- **Motion safety:** reduced-motion users get the full page with no animation and no video download.
  No-JS users get the full page too. Content is only hidden for a reveal once the script has confirmed
  motion is allowed. Grain animation uses transforms only.
- The header tucks away while scrolling down and returns on any scroll up or keyboard focus.
