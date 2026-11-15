# Finds translatable pieces of an HTML page as source ranges, so a translated copy can be made
# by replacing exactly those ranges and leaving every other byte (scripts, markup, prices) alone.
import re
from html.parser import HTMLParser

INLINE = {'a','span','em','strong','b','i','u','br','code','small','sup','sub','abbr','time','mark','kbd','s','wbr','q','cite','dfn','var','samp','bdi','bdo','data','label'}
SKIP = {'script','style','svg','noscript','template','math','code','pre','textarea','select'}
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
ATTRS = {'alt','title','aria-label','placeholder','data-tip','data-label'}
META_NAMES = {'description','og:title','og:description','twitter:title','twitter:description'}
HAS_WORD = re.compile(r'[A-Za-z]{2}')

class P(HTMLParser):
    def __init__(self, src):
        super().__init__(convert_charrefs=False)
        self.src = src
        self.lines = [0]
        for m in re.finditer('\n', src): self.lines.append(m.end())
        self.stack = []   # [tag, is_container, run_start, run_has_text]
        self.skip = 0
        self.ranges = []  # (start, end, kind)
    def off(self):
        l, c = self.getpos(); return self.lines[l-1] + c
    def container(self):
        for e in reversed(self.stack):
            if e[1]: return e
        return None
    def close_run(self, end):
        c = self.container()
        if c and c[2] is not None:
            if c[3]:
                s, e = c[2], end
                seg = self.src[s:e]
                ls = len(seg) - len(seg.lstrip()); rs = len(seg) - len(seg.rstrip())
                self.ranges.append((s+ls, e-rs, 'text'))
            c[2] = None; c[3] = False
    def handle_starttag(self, tag, attrs):
        start = self.off(); raw = self.get_starttag_text(); end = start + len(raw)
        if self.skip:
            if tag in SKIP: self.skip += 1
            return
        self.attr_ranges(tag, attrs, start, raw)
        if tag in SKIP:
            self.close_run(start); self.skip = 1; return
        if tag in INLINE:
            c = self.container()
            if c and c[2] is None: c[2] = start
            if tag not in VOID: self.stack.append([tag, False, None, False])
            return
        if tag in VOID:
            if tag in ('img','input','hr'): self.close_run(start)
            return
        self.close_run(start)
        self.stack.append([tag, True, None, False])
    def handle_startendtag(self, tag, attrs):
        start = self.off(); raw = self.get_starttag_text()
        if self.skip: return
        self.attr_ranges(tag, attrs, start, raw)
        if tag in INLINE:
            c = self.container()
            if c and c[2] is None: c[2] = start
        else:
            self.close_run(start)
    def handle_endtag(self, tag):
        start = self.off()
        if self.skip:
            if tag in SKIP: self.skip -= 1
            return
        if tag in INLINE:
            for i in range(len(self.stack)-1, -1, -1):
                if self.stack[i][0] == tag and not self.stack[i][1]:
                    del self.stack[i]; break
            return
        for i in range(len(self.stack)-1, -1, -1):
            if self.stack[i][0] == tag:
                # close runs of this container (and anything left open inside it)
                while len(self.stack) > i:
                    if self.stack[-1][1]: self.close_run(start)
                    self.stack.pop()
                break
    def handle_data(self, data):
        if self.skip: return
        if not data.strip(): return
        start = self.off()
        c = self.container()
        if c is None: return
        if c[0] == 'title':
            self.ranges.append((start + len(data)-len(data.lstrip()), start+len(data.rstrip()), 'text')); return
        if c[2] is None: c[2] = start
        if HAS_WORD.search(data): c[3] = True
    def handle_entityref(self, name):
        if self.skip: return
        c = self.container()
        if c and c[2] is None: c[2] = self.off()
    handle_charref = handle_entityref
    def attr_ranges(self, tag, attrs, start, raw):
        d = dict(attrs)
        names = set(ATTRS)
        if tag == 'meta' and (d.get('name') in META_NAMES or d.get('property') in META_NAMES): names.add('content')
        for m in re.finditer(r'(\s)([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|\'([^\']*)\')', raw):
            if m.group(2).lower() in names:
                g = 4 if m.group(4) is not None else 5
                v = m.group(g)
                if v and HAS_WORD.search(v):
                    self.ranges.append((start + m.start(g), start + m.end(g), 'attr'))

def segments(src):
    p = P(src); p.feed(src); p.close()
    out = []
    for s, e, k in sorted(set(p.ranges)):
        t = src[s:e]
        if not HAS_WORD.search(re.sub(r'<[^>]+>', '', t)): continue
        out.append((s, e, k, t))
    # drop ranges nested inside another range of the same kind
    res = []
    for r in out:
        if res and r[0] < res[-1][1] and r[2] == res[-1][2] == 'text': continue
        res.append(r)
    return res
