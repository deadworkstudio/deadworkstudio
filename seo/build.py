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
Loadout (live on iPhone) links to its product page with the same tags. In-development
products (Set Control, ...) get a waitlist CTA, never a buy button.

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
CSS_V = "20261124h"

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
        "href": "../../products/loadout/?ref=guide&utm_campaign={slug}",
        "label": "Start your 14-day free trial",
        "eyebrow": "Loadout · iPhone",
        "title": "Scan the case before you leave.",
        "text": "Pan your iPhone across the open case. Loadout checks it against your saved kit and lists what's missing.",
        "note": "Free download. 14 days free, no card needed. Android coming soon.",
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
    "loadout": f"{SITE}/assets/img/brand/share-loadout.jpg",
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


# Covers: real Stock Shredder app screens, framed in assets/img/guides/.
COVER_ALT = {
    "tool-gear-checklist": "The free camera gear checklist maker: shoot type, cameras and days, then the list by kit",
    "tool-title-keyword": "The free stock footage title and keyword checker with fields for title, description and keywords",
    "ss-review-dark": "Stock Shredder review screen in dark mode, with a list of trimmed clips",
    "ss-review-forest": "Stock Shredder reviewing a forest clip, with grade and export settings",
    "ss-review-mac": "Stock Shredder on a Mac, reviewing a tape deck clip",
    "ss-share": "Stock Shredder Share screen with 18 clips ready and their keywords",
    "ss-import-light": "Stock Shredder import screen, ready for a folder of raw footage",
    "ss-review-light": "Stock Shredder review screen in light mode, with Look and export settings",
    "lo-kit-scan": "Loadout on iPhone: a list of kits, a scan of an open case, and All accounted for",
    "lo-scan-real": "Three frames from a real Loadout scan of a packed case on iPhone",
    "lo-kit-wrap": "Loadout on iPhone: an A-cam kit list, the All packed step, and a saved check",
}
COVERS = {
    "camera-gear-checklist-maker": "tool-gear-checklist",
    "stock-footage-title-keyword-checker": "tool-title-keyword",
    "adobe-stock-video-workflow": "ss-share",
    "automatic-stock-footage-clipping": "ss-review-dark",
    "blackmagic-raw-stock-footage": "ss-review-forest",
    "drone-footage-for-stock": "ss-review-light",
    "pond5-video-upload": "ss-import-light",
    "premiere-pro-batch-export-stock": "ss-review-mac",
    "prepare-stock-footage-faster": "ss-review-light",
    "raw-footage-to-stock-clips": "ss-import-light",
    "red-r3d-stock-footage": "ss-review-mac",
    "shutterstock-video-contributor": "ss-review-forest",
    "sony-slog3-stock-footage": "ss-review-dark",
    "stock-footage-requirements-adobe-pond5-shutterstock": "ss-share",
    "storyblocks-video-contributor": "ss-review-mac",
    "sell-old-footage-archive": "ss-import-light",
    "best-sites-to-sell-stock-footage": "ss-share",
    "sell-stock-footage": "ss-review-dark",
    "xpiks-alternative": "ss-share",
    "camera-gear-checklist": "lo-kit-scan",
    "film-production-wrap-checklist": "lo-kit-wrap",
    "keep-track-of-camera-equipment": "lo-kit-scan",
    "check-gear-before-leaving-set": "lo-scan-real",
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
        'width="1440" height="720" fetchpriority="high" decoding="async" />\n'
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


NOTE_TEXT = {
    "stock-shredder": "We're DEADWORK STUDIO, the team behind Stock Shredder. Our timings come from our own tests on real footage, "
    "and site rules come from each site's own pages.",
    "loadout": "We're DEADWORK STUDIO, the team behind Loadout. We shoot too, and these lists come from packing our own cases.",
}


def note_html(meta):
    text = NOTE_TEXT.get(meta["product"], NOTE_TEXT["stock-shredder"])
    return (
        '    <aside class="g-note">\n'
        '      <p class="mono">From the team</p>\n'
        f"      <p>{text} See something out of date? Email "
        '<a href="mailto:deadworkstudio@gmail.com">deadworkstudio@gmail.com</a> and we\'ll fix it.</p>\n'
        '    </aside>\n'
    )


STOP = set("a an and the to of for in on with how what is your you by vs or from at as it best".split())


def words(m):
    text = " ".join([m["keyword"], m["title"], *m.get("secondary", [])]).lower()
    return {w for w in re.findall(r"[a-z0-9]+", text) if w not in STOP and len(w) > 2}


def related(meta, metas, n=3):
    """Up to n LIVE guides to show under "Keep reading". Drafts are never linked."""
    # Same product only: a Loadout guide never sends readers to a Stock Shredder guide, and back.
    live = {m["slug"]: m for m in metas if m["status"] == "live" and m["slug"] != meta["slug"] and not m.get("tool")
            and m["product"] == meta["product"]}
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


def tools_html(meta, metas):
    """Free tools box on every guide: live tools only, never on the tool's own page."""
    tools = [m for m in metas if m.get("tool") and m["status"] == "live" and m["slug"] != meta["slug"]
             and m["product"] == meta["product"]]
    if not tools:
        return ""
    mine = words(meta)
    tools.sort(key=lambda m: (-len(mine & words(m)), m["published"], m["slug"]))
    items = "\n".join(
        f'        <li><a href="../{m["slug"]}/" data-tool="{m["slug"]}"><strong>{html.escape(m["title"])}</strong>'
        f'<span>{html.escape(m.get("tool_line", m["dek"]))}</span><em class="mono">Open <i aria-hidden="true">&rarr;</i></em></a></li>'
        for m in tools[:2]
    )
    return (
        '    <aside class="g-tools" aria-labelledby="free-tools">\n'
        '      <p class="mono" id="free-tools">Free tool' + ("s" if len(tools[:2]) > 1 else "") + '</p>\n'
        f'      <ul>\n{items}\n      </ul>\n'
        '    </aside>\n'
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
        "note_html": note_html(meta),
        "tools_html": tools_html(meta, metas),
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


# ---- The Guides hub: /guides/. One DEADWORK library, a cluster per product, topics inside each. ----
# Every live guide must have a topic here, or the build stops (so nothing new is ever left off the hub).
HUB = [
    {
        "product": "loadout", "name": "Loadout", "href": "../products/loadout/",
        "line": "Camera gear checklists and the habits that stop gear going missing. Loadout checks the open case with your iPhone.",
        "topics": [
            ("Checklists", ["camera-gear-checklist", "film-production-wrap-checklist", "check-gear-before-leaving-set"]),
            ("Tracking your gear", ["keep-track-of-camera-equipment"]),
        ],
    },
    {
        "product": "stock-shredder", "name": "Stock Shredder", "href": "../products/stock-shredder/",
        "line": "Turning raw footage into stock clips that sell, and getting them onto each site. Stock Shredder does the finding, trimming and naming.",
        "topics": [
            ("Getting started", ["prepare-stock-footage-faster", "raw-footage-to-stock-clips", "stock-footage-requirements-adobe-pond5-shutterstock", "automatic-stock-footage-clipping"]),
            ("Selling on each site", ["adobe-stock-video-workflow", "shutterstock-video-contributor", "pond5-video-upload", "storyblocks-video-contributor"]),
            ("Cameras and formats", ["blackmagic-raw-stock-footage", "red-r3d-stock-footage", "sony-slog3-stock-footage", "drone-footage-for-stock"]),
            ("Editing", ["premiere-pro-batch-export-stock"]),
        ],
    },
]
# Where the two workflows meet: the shoot day ends, the footage starts. Shown as its own short row.
HUB_BRIDGE = ["check-gear-before-leaving-set", "prepare-stock-footage-faster"]


def hub_card(m, up=""):
    kind = "Free tool" if m.get("tool") else f'{m["read_minutes"]} min'
    return (
        f'<li><a href="{up}{m["slug"]}/" data-hub="{m["slug"]}">'
        f'<img src="../assets/img/guides/{cover(m)}-card.webp" alt="" width="640" height="401" loading="lazy" decoding="async" />'
        f'<span class="mono">{html.escape(m["eyebrow"].split("·")[-1].strip())} <i aria-hidden="true">&middot;</i> <em>{kind}</em></span>'
        f'<strong>{html.escape(m["title"])}</strong>'
        f'<span class="g-more-dek">{html.escape(m["dek"])}</span>'
        f'<span class="g-more-go mono">{"Open" if m.get("tool") else "Read"} <i aria-hidden="true">&rarr;</i></span></a></li>'
    )


def build_hub(header, footer, metas):
    live = {m["slug"]: m for m in metas if m["status"] == "live"}
    placed = {s for c in HUB for _, ss in c["topics"] for s in ss}
    tools = [m for m in live.values() if m.get("tool")]
    missing = sorted(s for s, m in live.items() if s not in placed and not m.get("tool"))
    if missing:
        sys.exit(f"hub: live guides with no topic in HUB: {missing}")
    fix = lambda h: h.replace('href="../../', 'href="../').replace('src="../../', 'src="../')
    sections, items, n = [], [], 0
    for c in HUB:
        blocks = []
        for name, slugs in c["topics"]:
            cards = [live[s] for s in slugs if s in live]
            if not cards:
                continue
            items += cards
            blocks.append(
                f'      <section class="gh-topic"><h3 class="mono">{html.escape(name)} <span>{len(cards)}</span></h3>\n'
                f'        <ul class="gh-cards">{"".join(hub_card(m) for m in cards)}</ul></section>'
            )
        ptools = [m for m in tools if m["product"] == c["product"]]
        if ptools:
            items += ptools
            blocks.append(
                f'      <section class="gh-topic"><h3 class="mono">Free tools <span>{len(ptools)}</span></h3>\n'
                f'        <ul class="gh-cards">{"".join(hub_card(m) for m in ptools)}</ul></section>'
            )
        if not blocks:
            continue
        n += 1
        sections.append(
            f'    <section class="gh-product" id="{c["product"]}" aria-labelledby="h-{c["product"]}">\n'
            f'      <header class="gh-product-head"><p class="mono">{n:02d}</p><h2 id="h-{c["product"]}">{html.escape(c["name"])}</h2>'
            f'<p>{html.escape(c["line"])} <a href="{c["href"]}?ref=guide&amp;utm_campaign=guides-hub">About {html.escape(c["name"])} <i aria-hidden="true">&rarr;</i></a></p></header>\n'
            + "\n".join(blocks) + "\n    </section>"
        )
    bridge = [live[s] for s in HUB_BRIDGE if s in live]
    bridge_html = ""
    if len(bridge) == 2:
        bridge_html = (
            '    <section class="gh-bridge" aria-labelledby="h-bridge">\n'
            '      <p class="mono">Where they meet</p><h2 id="h-bridge">From the last case on the truck to the first clip on sale.</h2>\n'
            f'      <ul class="gh-cards">{"".join(hub_card(m) for m in bridge)}</ul>\n    </section>'
        )
    chips = "".join(
        f'<a class="mono" href="#{c["product"]}">{html.escape(c["name"])}</a>' for c in HUB
    )
    total = len([m for m in live.values()])
    url = f"{SITE}/guides/"
    ld = {
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "CollectionPage", "@id": url, "url": url, "name": "DEADWORK Guides",
             "description": "Practical guides and free tools for filmmakers, by DEADWORK.",
             "isPartOf": {"@type": "WebSite", "name": "DEADWORK", "url": SITE + "/"},
             "mainEntity": {"@type": "ItemList", "numberOfItems": len(items), "itemListElement": [
                 {"@type": "ListItem", "position": i + 1, "url": f"{SITE}/guides/{m['slug']}/", "name": m["title"]}
                 for i, m in enumerate(items)]}},
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "DEADWORK", "item": SITE + "/"},
                {"@type": "ListItem", "position": 2, "name": "Guides", "item": url}]},
        ],
    }
    page = (ROOT / "seo/hub-template.html").read_text()
    vals = {"css_v": CSS_V, "jsonld": json.dumps(ld, ensure_ascii=False), "header": fix(header), "footer": fix(footer),
            "chips": chips, "sections": "\n\n".join(sections), "bridge": bridge_html, "count": str(total)}
    for k, v in vals.items():
        page = page.replace("{{" + k + "}}", v)
    left = re.findall(r"\{\{\w+\}\}", page)
    if left:
        sys.exit(f"hub: unfilled placeholders {left}")
    (ROOT / "guides/index.html").write_text(page)
    print(f"built guides/ (hub, {len(items)} items)")


def sitemap(live):
    p = ROOT / "sitemap.xml"
    s = p.read_text()
    s = re.sub(r"\s*<url>\s*<loc>https://deadworkstudio\.com/guides/.*?</url>", "", s, flags=re.S)
    entries = "".join(
        f"\n  <url>\n    <loc>{SITE}/guides/{m['slug']}/</loc>\n    <lastmod>{m['updated']}</lastmod>\n"
        f"    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>"
        for m in live
    )
    hub = f"\n  <url>\n    <loc>{SITE}/guides/</loc>\n    <lastmod>{max(m['updated'] for m in live)}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>"
    s = s.replace("\n</urlset>", hub + entries + "\n</urlset>")
    p.write_text(s)


def main():
    header, footer = chrome()
    files = sorted((ROOT / "seo/articles").glob("*.html"))
    metas = [parse(f) for f in files]
    want = sys.argv[1:]
    for m in metas:
        if not want or m["slug"] in want:
            build(m, header, footer, metas)
    build_hub(header, footer, metas)
    sitemap([m for m in metas if m["status"] == "live"])
    orphans(metas)


def orphans(metas):
    """No orphan guides (Daniel 11-24): every live guide should get body links from 2+ live guides of its product."""
    live = [m for m in metas if m["status"] == "live"]
    for m in live:
        n = sum(1 for o in live if o is not m and o["product"] == m["product"] and f'href="../{m['slug']}/"' in o["body"])
        peers = sum(1 for o in live if o["product"] == m["product"]) - 1
        if n < min(2, peers):
            print(f"warning: {m['slug']} has {n} body links from other live guides (want 2+)")


if __name__ == "__main__":
    main()
