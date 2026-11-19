#!/usr/bin/env python3
"""Builds the DEADWORK guide pages.

    python3 seo/build.py            # build every article in seo/articles/
    python3 seo/build.py SLUG       # build one

Each article is one file in seo/articles/<slug>.html: a JSON meta block in an
HTML comment at the top, then the body HTML. The page shell is
seo/article-template.html. The site header and footer are copied from the
live Stock Shredder page each build, so the guides never drift from it.

Output: guides/<slug>/index.html.
Drafts get noindex and stay out of the sitemap. Only articles
with "status": "live" are indexed and added to sitemap.xml.

Every call-to-action link is tagged ?ref=guide&utm_campaign=<slug>, which
ss-funnel.js already counts (page visit, source, campaign, checkout).
In-development products (Loadout, Set Control, ...) get a waitlist CTA, never
a buy button.

seo/ is excluded from the site deploy (.github/workflows/pages.yml).
"""
import html
import json
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://deadworkstudio.com"
CSS_V = "20261112a"

# One CTA per product. Waitlist products must never link to a checkout.
CTAS = {
    "stock-shredder": {
        "href": "../../products/stock-shredder/?code=SHRED&ref=guide&utm_campaign={slug}#trial",
        "label": "Start with 100 free clips",
        "eyebrow": "Launch offer · Code SHRED",
        "title": "Try it on your own archive.",
        "text": "100 free clips. 7 days to use them. Keywords included. Mac and Windows.",
        "note": "No card needed, just your name and email. Start any time before December 31, 2026.",
    },
    "loadout": {
        "href": "../../products/loadout/?ref=guide&utm_campaign={slug}#notify",
        "label": "Join the waitlist",
        "eyebrow": "Loadout · In development",
        "title": "Be first to know.",
        "text": "Leave your email and we'll tell you the day it's out.",
        "note": "Not available yet.",
    },
    "set-control": {
        "href": "../../products/set-control/?ref=guide&utm_campaign={slug}",
        "label": "Join the waitlist",
        "eyebrow": "Set Control · In development",
        "title": "Be first to know.",
        "text": "Leave your email and we'll tell you the day it's out.",
        "note": "Not available yet.",
    },
}

OG_IMAGES = {
    "stock-shredder": f"{SITE}/assets/img/brand/share-stock-shredder.jpg",
}

# Copy rules from the brand: no machine-written tells, no AI words.
BANNED = [
    r"\bAI\b", r"artificial intelligence", r"machine learning", r"\bGPT\b", r"Claude",
    r"Anthropic", r"OpenAI", "—", r"Please try again", r"Looks like",
    r"\bunlock\b", r"\bsmart\b", r"\bleverage\b", r"\bseamless", r"\bdelve", r"game.?changer",
    r"Wilson", r"\bLLC\b",
]


def parse(path):
    raw = path.read_text()
    m = re.match(r"\s*<!--meta\s*(\{.*?\})\s*-->\s*", raw, re.S)
    if not m:
        sys.exit(f"{path.name}: missing <!--meta {{...}} --> block")
    meta = json.loads(m.group(1))
    meta["body"] = raw[m.end():].rstrip()
    return meta


def lint(meta):
    text = json.dumps(meta, ensure_ascii=False) + meta["body"]
    exact = {r"\bAI\b", r"\bGPT\b", r"\bLLC\b"}
    hits = [b for b in BANNED if re.search(b, text, 0 if b in exact else re.I)]
    if hits:
        sys.exit(f"{meta['slug']}: banned words or marks found: {hits}")


def chrome():
    page = (ROOT / "products/stock-shredder/index.html").read_text()
    header = re.search(r'<header class="poster-head".*?</header>', page, re.S).group(0)
    footer = re.search(r'<footer class="poster-foot">.*?</footer>', page, re.S).group(0)
    # Guides are English only: drop the language picker (it links to the SS page's translations).
    strip = lambda h: re.sub(r"<!-- i18n:picker -->.*?<!-- /i18n:picker -->", "", h, flags=re.S)
    return strip(header), strip(footer)


def human(d):
    d = date.fromisoformat(d)
    return d.strftime("%b %-d, %Y").upper()


def jsonld(meta, url):
    article = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": meta["title"],
        "description": meta["description"],
        "datePublished": meta["published"],
        "dateModified": meta["updated"],
        "author": {"@type": "Organization", "name": "DEADWORK STUDIO", "url": SITE},
        "publisher": {"@type": "Organization", "name": "DEADWORK STUDIO", "url": SITE},
        "mainEntityOfPage": url,
        "image": OG_IMAGES.get(meta["product"], f"{SITE}/assets/img/brand/share-stock-shredder.jpg"),
    }
    faq = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
            for q, a in meta.get("faq", [])
        ],
    }
    out = [article] + ([faq] if meta.get("faq") else [])
    return json.dumps(out, ensure_ascii=False).replace("</", "<\\/")


def build(meta, header, footer):
    lint(meta)
    slug = meta["slug"]
    url = f"{SITE}/guides/{slug}/"
    cta = {k: v.format(slug=slug) for k, v in CTAS[meta["product"]].items()}
    faq_html = "\n".join(
        f'      <details class="g-faq-item"><summary>{html.escape(q)}</summary><p>{html.escape(a)}</p></details>'
        for q, a in meta.get("faq", [])
    )
    live = meta["status"] == "live"
    vals = {
        "product": meta["product"],
        "robots": "" if live else '<meta name="robots" content="noindex" />',
        "seo_title": html.escape(meta["seo_title"]),
        "description": html.escape(meta["description"]),
        "url": url,
        "og_image": OG_IMAGES.get(meta["product"], f"{SITE}/assets/img/brand/share-stock-shredder.jpg"),
        "css_v": CSS_V,
        "jsonld": jsonld(meta, url),
        "header": header,
        "footer": footer,
        "eyebrow": html.escape(meta["eyebrow"]),
        "title": html.escape(meta["title"]),
        "dek": html.escape(meta["dek"]),
        "updated_human": human(meta["updated"]),
        "read_minutes": str(meta["read_minutes"]),
        "cta_href": html.escape(cta["href"]),
        "cta_label": cta["label"],
        "cta_eyebrow": cta["eyebrow"],
        "cta_title": cta["title"],
        "cta_text": cta["text"],
        "cta_note": cta["note"],
        "body": meta["body"],
        "faq_html": faq_html,
    }
    page = (ROOT / "seo/article-template.html").read_text()
    for k, v in vals.items():
        page = page.replace("{{" + k + "}}", v)
    left = re.findall(r"\{\{\w+\}\}", page)
    if left:
        sys.exit(f"{slug}: unfilled placeholders {left}")
    out = ROOT / "guides" / slug / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page)
    print(f"built guides/{slug}/ ({meta['status']})")


def sitemap(live):
    p = ROOT / "sitemap.xml"
    s = p.read_text()
    s = re.sub(r"\s*<url>\s*<loc>https://deadworkstudio\.com/guides/.*?</url>", "", s, flags=re.S)
    entries = "".join(
        f"\n  <url>\n    <loc>{SITE}/guides/{m['slug']}/</loc>\n    <lastmod>{m['updated']}</lastmod>\n"
        f"    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>"
        for m in live
    )
    s = s.replace("\n</urlset>", entries + "\n</urlset>")
    p.write_text(s)


def main():
    header, footer = chrome()
    files = sorted((ROOT / "seo/articles").glob("*.html"))
    metas = [parse(f) for f in files]
    want = sys.argv[1:]
    for m in metas:
        if not want or m["slug"] in want:
            build(m, header, footer)
    sitemap([m for m in metas if m["status"] == "live"])


if __name__ == "__main__":
    main()
