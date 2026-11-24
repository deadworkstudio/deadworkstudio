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
CSS_V = "20261124a"

# One CTA per product. Waitlist products must never link to a checkout.
CTAS = {
    "stock-shredder": {
        "href": "../../products/stock-shredder/?code=SHRED&ref=guide&utm_campaign={slug}#trial",
        "label": "Start with 100 free clips",
        "eyebrow": "Launch offer · Code SHRED",
        "title": "Try it on your own archive.",
        "text": "100 free clips. 7 days to use them. Keywords included. Mac and Windows.",
        "note": "Card saved to verify you, never charged. Start any time before December 31, 2026.",
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


# Cover frames: real footage stills from the Stock Shredder page, cropped in assets/img/guides/.
COVER_ALT = {
    "moto-01": "Rider on a mountain road, seen from behind",
    "moto-02": "Motorcycle rounding a dry hillside bend",
    "moto-03": "Mountain range at golden hour",
    "moto-04": "Rider on a canyon road at dusk",
    "moto-05": "Rider leaning into a curve by the guardrail",
    "moto-06": "Rider on a winding mountain road",
    "moto-07": "Man standing on a truck under a stormy sky",
    "moto-08": "Truck on a dry lake bed at sunset",
    "moto-09": "Man and truck in silhouette at dusk",
    "moto-11": "Man on a truck on a dry lake bed",
    "archive-wall": "A wall of frames from a footage archive",
}
COVERS = {
    "adobe-stock-video-workflow": "moto-03",
    "automatic-stock-footage-clipping": "moto-05",
    "blackmagic-raw-stock-footage": "moto-07",
    "drone-footage-for-stock": "moto-02",
    "pond5-video-upload": "moto-08",
    "premiere-pro-batch-export-stock": "moto-04",
    "prepare-stock-footage-faster": "moto-01",
    "raw-footage-to-stock-clips": "archive-wall",
    "red-r3d-stock-footage": "moto-09",
    "shutterstock-video-contributor": "moto-06",
    "sony-slog3-stock-footage": "moto-11",
    "stock-footage-requirements-adobe-pond5-shutterstock": "moto-06",
    "storyblocks-video-contributor": "moto-04",
    "sell-old-footage-archive": "archive-wall",
    "best-sites-to-sell-stock-footage": "moto-09",
    "sell-stock-footage": "moto-01",
    "xpiks-alternative": "moto-05",
}


def cover(m):
    c = m.get("cover") or COVERS.get(m["slug"])
    if c not in COVER_ALT:
        keys = sorted(COVER_ALT)
        c = keys[sum(map(ord, m["slug"])) % len(keys)]
    return c


def cover_html(m):
    if m.get("tool"):
        return ""  # Free tools open on the tool itself, not a cover frame.
    c = cover(m)
    return (
        '    <figure class="g-cover">\n'
        f'      <img src="../../assets/img/guides/{c}.webp" alt="{html.escape(COVER_ALT[c])}" '
        'width="1440" height="602" fetchpriority="high" decoding="async" />\n'
        '    </figure>\n'
    )


def toc_html(body):
    heads = re.findall(r'<h2 id="([^"]+)">(.*?)</h2>', body, re.S)
    if len(heads) < 3:
        return ""
    items = "\n".join(
        f'        <li><a href="#{i}">{re.sub(r"<[^>]+>", "", t).strip().rstrip(".")}</a></li>' for i, t in heads
    )
    return (
        '    <nav class="g-toc" aria-labelledby="toc">\n'
        '      <p class="mono" id="toc">In this guide</p>\n'
        f'      <ol>\n{items}\n      </ol>\n'
        '    </nav>\n'
    )


def minutes(t):
    t = t.replace(",", "")
    h = re.search(r"(\d+)\+?\s*(?:hr|hour)", t)
    m = re.search(r"(\d+)\s*min", t)
    return (int(h.group(1)) * 60 if h else 0) + (int(m.group(1)) if m else 0)


def race_bars(body):
    """Turn the measured time table into a bar chart. Same numbers, same words, easier to feel."""
    def repl(mt):
        rows = re.findall(r"<tr><td>([^<]+)</td><td>([^<]+)</td><td>([^<]+)</td>(?:<td>([^<]+)</td>)?</tr>", mt.group(0))
        if not rows:
            return mt.group(0)
        out = []
        for n, ss, hand, failed in rows:
            a, b = minutes(ss), minutes(hand)
            if not a or not b:
                return mt.group(0)
            pct = max(2.5, round(a / b * 100, 1))
            out.append(
                '  <div class="g-race-row">\n'
                f'    <p class="g-race-n">{n} clips' + (f' <i aria-hidden="true">&middot;</i> {failed} failed' if failed else "") + '</p>\n'
                f'    <div class="g-race-bar g-race-bar--ss"><span style="width:{pct}%"></span><b>Stock Shredder <em>{ss}</em></b></div>\n'
                f'    <div class="g-race-bar g-race-bar--hand"><span style="width:100%"></span><b>By hand <em>{hand}</em></b></div>\n'
                '  </div>'
            )
        return '<div class="g-race" role="group" aria-label="Time to prep 4K clips">\n' + "\n".join(out) + "\n</div>"
    return re.sub(
        r'<div class="g-table-wrap">\s*<table class="g-table g-table--num">\s*<thead><tr><th>4K clips</th>.*?</table>\s*</div>',
        repl, body, flags=re.S,
    )


NOTE = (
    '    <aside class="g-note">\n'
    '      <p class="mono">From the team</p>\n'
    "      <p>We're DEADWORK STUDIO, the team behind Stock Shredder. Our timings come from our own tests on real footage, "
    "and site rules come from each site's own pages. See something out of date? Email "
    '<a href="mailto:deadworkstudio@gmail.com">deadworkstudio@gmail.com</a> and we\'ll fix it.</p>\n'
    '    </aside>\n'
)


STOP = set("a an and the to of for in on with how what is your you by vs or from at as it best".split())


def words(m):
    text = " ".join([m["keyword"], m["title"], *m.get("secondary", [])]).lower()
    return {w for w in re.findall(r"[a-z0-9]+", text) if w not in STOP and len(w) > 2}


def related(meta, metas, n=3):
    """Up to n LIVE guides to show under "Keep reading". Drafts are never linked."""
    live = {m["slug"]: m for m in metas if m["status"] == "live" and m["slug"] != meta["slug"]}
    picks = [live[s] for s in meta.get("related", []) if s in live]
    mine = words(meta)
    rest = sorted(
        (m for m in live.values() if m not in picks),
        key=lambda m: (-len(mine & words(m)), m["slug"]),
    )
    return (picks + rest)[:n]


def related_html(picks):
    if not picks:
        return ""
    items = "\n".join(
        f'        <li><a href="../{m["slug"]}/" data-related="{m["slug"]}">'
        f'<img src="../../assets/img/guides/{cover(m)}-card.webp" alt="" width="640" height="401" loading="lazy" decoding="async" />'
        f'<span class="mono">{html.escape(m["eyebrow"].split("·")[-1].strip())} <i aria-hidden="true">&middot;</i> <em>{m["read_minutes"]} min</em></span>'
        f'<strong>{html.escape(m["title"])}</strong>'
        f'<span class="g-more-dek">{html.escape(m["dek"])}</span>'
        f'<span class="g-more-go mono">Read <i aria-hidden="true">&rarr;</i></span></a></li>'
        for m in picks
    )
    return (
        '    <nav class="g-more" aria-labelledby="keep-reading">\n'
        '      <h2 id="keep-reading">Keep reading</h2>\n'
        f'      <ul>\n{items}\n      </ul>\n'
        '    </nav>\n'
    )


def check_links(meta, metas):
    """A live guide must not link to a guide that isn't live yet."""
    status = {m["slug"]: m["status"] for m in metas}
    if meta["status"] != "live":
        return
    for s in re.findall(r'href="\.\./([a-z0-9-]+)/"', meta["body"]):
        if status.get(s) != "live":
            sys.exit(f"{meta['slug']}: links to {s}, which is not live ({status.get(s, 'missing')})")


def build(meta, header, footer, metas):
    lint(meta)
    check_links(meta, metas)
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
        "body": race_bars(meta["body"]),
        "cover_html": cover_html(meta),
        "toc_html": "" if meta.get("tool") else toc_html(meta["body"]),
        "note_html": NOTE,
        "faq_html": faq_html,
        "related_html": related_html(related(meta, metas)),
        "extra_head": "".join(
            f'<link rel="stylesheet" href="../../assets/css/{c}?v={CSS_V}" />\n' for c in meta.get("css", [])
        ),
    }
    page = (ROOT / "seo/article-template.html").read_text()
    for k, v in vals.items():
        page = page.replace("{{" + k + "}}", v)
    if meta.get("tool"):
        # The tool sits right under the headline. Stock Shredder shows up next to the results instead.
        page = re.sub(r'\s*<p class="g-head-cta">.*?</p>', "", page)
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
            build(m, header, footer, metas)
    sitemap([m for m in metas if m["status"] == "live"])


if __name__ == "__main__":
    main()
