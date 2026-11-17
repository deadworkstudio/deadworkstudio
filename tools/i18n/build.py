#!/usr/bin/env python3
"""Make the translated copies of the site's main pages.

    python3 tools/i18n/build.py            # rebuild everything
    python3 tools/i18n/build.py --check    # only list English lines that have no translation yet

The English pages stay the source. For each page in PAGES this:
  1. adds the language picker, the hreflang links and lang.css/lang.js to the English page
     (between <!-- i18n --> markers, so running it again replaces rather than duplicates);
  2. writes /<lang>/<page>/index.html for es, fr, de, it, zh and ja, with every line of copy
     swapped for its translation from translations/<lang>.json.

Translations are keyed by the exact English line (markup included). When English copy changes,
the old translation no longer matches, the English line shows instead, and --check lists it.

Prices are never touched: they are written in US dollars in the copy and stay that way.
Legal pages, checkout terms and anything not in PAGES stay English on purpose.
"""
import json
import os
import re
import sys
from urllib.parse import urljoin, urlsplit

sys.path.insert(0, os.path.dirname(__file__))
from segs import segments  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
HERE = os.path.dirname(__file__)
SITE = 'https://deadworkstudio.com'

PAGES = ['home/', 'studio/', 'download/mac/', 'download/windows/'] + [
    f'products/{p}/' for p in ('stock-shredder', 'handoff', 'loadout', 'scene-lock', 'set-control', 'sound-driver')] + ['products/handoff/support/']

# (folder, hreflang / html lang, short code shown in the bar, name in its own language)
LANGS = [
    ('en', 'en', 'EN', 'English'),
    ('es', 'es', 'ES', 'Español'),
    ('fr', 'fr', 'FR', 'Français'),
    ('de', 'de', 'DE', 'Deutsch'),
    ('it', 'it', 'IT', 'Italiano'),
    ('zh', 'zh-Hans', '中文', '简体中文'),
    ('ja', 'ja', '日本語', '日本語'),
]
OG_LOCALE = {'en': 'en_US', 'es': 'es_ES', 'fr': 'fr_FR', 'de': 'de_DE', 'it': 'it_IT', 'zh': 'zh_CN', 'ja': 'ja_JP'}
ASSET_V = '20261116b'

HEAD_RE = re.compile(r'\n?<!-- i18n:head -->.*?<!-- /i18n:head -->', re.S)
PICK_RE = re.compile(r'\n?\s*<!-- i18n:picker -->.*?<!-- /i18n:picker -->', re.S)


def url_of(page, lang):
    return f'/{page}' if lang == 'en' else f'/{lang}/{page}'


def head_block(page, lang, dict_js):
    lines = ['<!-- i18n:head -->']
    for code, hl, _, _ in LANGS:
        lines.append(f'<link rel="alternate" hreflang="{hl}" href="{SITE}{url_of(page, code)}" />')
    lines.append(f'<link rel="alternate" hreflang="x-default" href="{SITE}{url_of(page, "en")}" />')
    lines.append(f'<link rel="stylesheet" href="/assets/css/lang.css?v={ASSET_V}" />')
    if dict_js:
        lines.append(f'<script>window.DW_I18N={dict_js};</script>')
    lines.append(f'<script src="/assets/js/lang.js?v={ASSET_V}"></script>')
    lines.append('<!-- /i18n:head -->')
    return '\n'.join(lines)


def picker(page, lang):
    cur = next(l for l in LANGS if l[0] == lang)
    items = []
    for code, hl, short, name in LANGS:
        attrs = f' aria-current="true"' if code == lang else ''
        items.append(f'<li><a href="{url_of(page, code)}" hreflang="{hl}" lang="{hl}" data-lang="{code}"{attrs}>'
                     f'<span>{name}</span><span class="lang-code">{short}</span></a></li>')
    # In the footer since 2026-11-15 (Daniel: "Move it to the footer"); it opens upward from there.
    return ('\n    <!-- i18n:picker --><div class="lang-tab lang-foot" data-lang-picker>'
            f'<button class="lang-trigger" type="button" aria-haspopup="true" aria-expanded="false" '
            f'aria-label="Language: {cur[3]}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.6 2.7 3.9 5.9 3.9 9.5s-1.3 6.8-3.9 9.5c-2.6-2.7-3.9-5.9-3.9-9.5s1.3-6.8 3.9-9.5z"/></svg><span>{cur[3]}</span></button>'
            f'<ul class="lang-menu" hidden>{"".join(items)}</ul></div><!-- /i18n:picker -->')


def strip_markers(src):
    return PICK_RE.sub('', HEAD_RE.sub('', src))


def add_head(src, block):
    # As early as possible in <head>, so a first-visit language redirect happens before paint.
    m = re.search(r'<meta charset[^>]*>\s*', src, re.I) or re.search(r'<head[^>]*>\s*', src, re.I)
    return src[:m.end()] + block + '\n' + src[m.end():]


def add_picker(src, block):
    # Last thing in the page's footer; pages without one (download pages) get it at the end of <main>.
    for close in ('</footer>', '</main>', '</body>'):
        end = src.rfind(close)
        if end != -1:
            return src[:end] + block + '\n  ' + src[end:]
    return src


def translate_segments(src, table, missing):
    out, last = [], 0
    for s, e, kind, text in segments(src):
        t = table.get(text)
        if t is None:
            missing.add(text)
            t = text
        out.append(src[last:s]); out.append(t); last = e
    out.append(src[last:])
    return ''.join(out)


def rewrite_links(src, page, lang):
    """Keep links between translated pages inside the language; everything else resolves
    against the English page (via <base>), so assets, scripts and untranslated pages just work."""
    here = f'{SITE}/{page}'
    targets = set(PAGES)

    def fix(m):
        attr, q, href = m.group(1), m.group(2), m.group(3)
        if href.startswith(('mailto:', 'tel:', 'javascript:', 'data:')):
            return m.group(0)
        if href.startswith('#'):
            return f'{attr}={q}/{lang}/{page}{href}{q}'
        absu = urljoin(here, href)
        parts = urlsplit(absu)
        if parts.netloc != urlsplit(SITE).netloc:
            return m.group(0)
        path = parts.path.lstrip('/')
        if path and not path.endswith('/') and '.' not in path.rsplit('/', 1)[-1]:
            path += '/'
        if path in targets:
            new = f'/{lang}/{path}' + (f'?{parts.query}' if parts.query else '') + (f'#{parts.fragment}' if parts.fragment else '')
            return f'{attr}={q}{new}{q}'
        return m.group(0)

    return re.sub(r'(?<![\w-])(href)=(["\'])([^"\']*)\2', fix, src)


def localize_page(src, page, lang, hl, table, missing):
    src = translate_segments(src, table, missing)
    src = rewrite_links(src, page, lang)
    src = re.sub(r'<html lang="en"', f'<html lang="{hl}"', src, count=1)
    src = re.sub(r'(<link rel="canonical" href=")[^"]*(")', lambda m: f'{m.group(1)}{SITE}/{lang}/{page}{m.group(2)}', src)
    src = re.sub(r'(<meta property="og:url" content=")[^"]*(")', lambda m: f'{m.group(1)}{SITE}/{lang}/{page}{m.group(2)}', src)
    if 'og:locale' not in src:
        src = re.sub(r'(<meta property="og:type"[^>]*>)', lambda m: m.group(1) + f'\n<meta property="og:locale" content="{OG_LOCALE[lang]}" />', src, count=1)
    # Relative URLs (assets, scripts, untranslated pages) resolve as if this were the English page.
    m = re.search(r'<head[^>]*>\s*', src, re.I)
    src = src[:m.end()] + f'<base href="/{page}" />\n' + src[m.end():]
    return src


def main():
    check_only = '--check' in sys.argv
    tables = {}
    for code, *_ in LANGS[1:]:
        path = os.path.join(HERE, 'translations', f'{code}.json')
        tables[code] = json.load(open(path, encoding='utf-8')) if os.path.exists(path) else {}
    report = {}
    for page in PAGES:
        en_path = os.path.join(ROOT, page, 'index.html')
        en = strip_markers(open(en_path, encoding='utf-8').read())
        if not check_only:
            with open(en_path, 'w', encoding='utf-8') as f:
                f.write(add_picker(add_head(en, head_block(page, 'en', None)), picker(page, 'en')))
        for code, hl, _, _ in LANGS[1:]:
            table = tables[code].get('pages', {})
            missing = set()
            out = localize_page(en, page, code, hl, table, missing)
            js = {k: v for k, v in tables[code].get('script', {}).items()}
            out = add_picker(add_head(out, head_block(page, code, json.dumps(js, ensure_ascii=False) if js else None)), picker(page, code))
            report.setdefault(code, set()).update(missing)
            if not check_only:
                dest = os.path.join(ROOT, code, page, 'index.html')
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                with open(dest, 'w', encoding='utf-8') as f:
                    f.write(out)
    for code, miss in report.items():
        print(f'{code}: {len(miss)} English lines without a translation')
        if check_only:
            for t in sorted(miss):
                print('   ', t[:140])


if __name__ == '__main__':
    main()
