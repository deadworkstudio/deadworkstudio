# DEADWORK — hub site

The parent-brand marketing site for DEADWORK, showcasing all six products plus the company's
mission and ethics. Pure static HTML/CSS/JS — no build step, no npm dependencies, no framework.
Every folder has its own `index.html` so URLs are clean (e.g. `/products/stock-shredder/`).

## Folder structure

```
deadwork-site/
├── index.html                     Home page
├── 404.html                       Not-found page (GitHub Pages serves this automatically)
├── robots.txt
├── about/index.html                About / mission / ethics / contact
├── products/index.html             Grid of all 6 products
├── products/<slug>/index.html      One page per product (6 total)
├── assets/
│   ├── css/
│   │   ├── tokens.css              Colors, fonts, the @font-face for Anton, per-product accents
│   │   ├── base.css                Reset, header/nav, buttons, badges, product grid, footer
│   │   └── product.css             Product page template (hero, spec table, cross-sell) + about page
│   ├── fonts/
│   │   ├── anton.woff2             Self-hosted display font (works offline, no Google Fonts request)
│   │   └── LICENSE.txt             Anton's SIL Open Font License
│   ├── img/brand/                  Processed logo assets + favicon (see below)
│   └── js/main.js                  Sticky-header scroll state + mobile nav overlay toggle
└── README.md                       This file
```

All internal links are **relative**, not root-relative (`../products/` rather than `/products/`),
so the site works correctly whether it's served from a domain root or a GitHub Pages project
subpath like `username.github.io/deadwork-site/`.

## Brand assets

The source wordmark (the original black-on-white PNG, no
transparency) was processed into transparent PNGs using a plain luminance-to-alpha conversion
(white background → 0 alpha, black ink → full alpha), then tinted:

- `deadwork-wordmark-bone.png` / `deadwork-wordmark-black.png` — "DEADWORK" only, no subtitle.
  Used in the header and footer.
- `deadwork-lockup-bone.png` / `deadwork-lockup-black.png` — full lockup including
  "LOS ANGELES, CA". Available if a page wants the full mark instead of the cropped wordmark.
- `favicon.png` / `apple-touch-icon.png` / `favicon-512.png` — a simple ink-square "D" monogram
  set in Anton, generated directly (not cropped from the wordmark, which is far too wide for a
  square favicon).

If the source logo ever changes, the regenerate script is not part of this repo (it was a
one-off Python/Pillow script) — re-run the same luminance→alpha approach on the new file, or
process it in any image editor: convert to grayscale, invert, use that as the alpha channel,
then flood-fill the RGB channels with the target color (`#e6e0d3` bone or `#000000` black).

## Editing content

- **Change a product's status** (e.g. Sound Driver goes from "in development" to "beta"): edit
  the badge markup (`<span class="badge badge-dev">…</span>` → `badge-beta`, and swap the
  `&#9633;` outline-square icon for `&#9632;` filled-square) in that product's `index.html`, in
  its card on the home page and `/products/index.html`, and its row in `assets/css` is unaffected
  — the badge styling is shared via `.badge-beta` / `.badge-dev` in `base.css`.
- **Add a 7th product**: create `products/<slug>/index.html` following the shape of any existing
  product page, add its accent color to `assets/css/tokens.css` under
  `[data-product='<slug>']`, add a card to the home page grid and `/products/index.html`, and add
  a footer link under the right phase column on every page (header/footer markup is duplicated
  per page since this is a build-free static site — no includes).
- **Placeholders**: every piece of copy that needs the owner's real input is wrapped in an HTML
  comment reading `PLACEHOLDER` — grep for it: `grep -rn PLACEHOLDER .`

## Preview locally

No build step. From this folder:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

## Deploy to GitHub Pages

1. Push this folder's contents to a repo (as the repo root, or to a `docs/` folder / `gh-pages`
   branch — whichever you configure Pages to serve).
2. In the repo's Settings → Pages, set the source to that branch/folder.
3. GitHub Pages automatically serves `404.html` for unmatched routes, and resolves
   `products/stock-shredder/` to `products/stock-shredder/index.html` for you — no extra config
   needed.
4. If you want a custom domain (e.g. `deadwork.la`), add a `CNAME` file at the repo root with the
   domain name, and point the domain's DNS at GitHub Pages per GitHub's docs.
