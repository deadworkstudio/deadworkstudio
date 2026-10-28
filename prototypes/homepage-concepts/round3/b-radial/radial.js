// DEADWORK — Round 3 / B: Radial. Presentation only: hero video loading, nav mega-menus, the
// dial drawing, the product readouts and the Los Angeles clock. Signups are handled by the
// site's shared assets/js/notify.js, untouched.
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------------------------------------------------------------------------------------
     1. Hero video — the live home.js mechanism. No <source>/autoplay in markup; reduced
        motion keeps the poster and never fetches video bytes; <= 800px gets the mobile cut.
     --------------------------------------------------------------------------------------- */
  var hero = document.querySelector('[data-hero-video]');
  if (hero && !reduce.matches) {
    var source = document.createElement('source');
    source.src = innerWidth <= 800 ? hero.dataset.srcMobile : hero.dataset.src;
    source.type = 'video/mp4';
    hero.appendChild(source);
    hero.preload = 'auto';
    hero.load();
    var playing = hero.play();
    if (playing && playing.catch) playing.catch(function () {});
  }

  /* ---------------------------------------------------------------------------------------
     2. Mega-menus — click/tap/keyboard to open; same tab, Escape, outside click or tabbing
        away closes.
     --------------------------------------------------------------------------------------- */
  var masthead = document.querySelector('[data-masthead]');
  var menu = document.querySelector('[data-menu]');
  var triggers = Array.prototype.slice.call(document.querySelectorAll('[data-menu-trigger]'));
  var groups = {};
  Array.prototype.forEach.call(document.querySelectorAll('[data-menu-group]'), function (g) {
    groups[g.dataset.menuGroup] = g;
  });
  var openKey = null;

  function openMenu(key) {
    openKey = key;
    triggers.forEach(function (t) { t.setAttribute('aria-expanded', String(t.dataset.menuTrigger === key)); });
    Object.keys(groups).forEach(function (k) { groups[k].hidden = k !== key; });
    var wasHidden = menu.hidden;
    menu.hidden = false;
    masthead.classList.add('is-menu-open');
    if (wasHidden) requestAnimationFrame(function () { menu.classList.add('is-open'); });
  }
  function closeMenu(restoreFocus) {
    if (!openKey) return;
    var trigger = triggers.filter(function (t) { return t.dataset.menuTrigger === openKey; })[0];
    openKey = null;
    triggers.forEach(function (t) { t.setAttribute('aria-expanded', 'false'); });
    menu.classList.remove('is-open');
    menu.hidden = true;
    masthead.classList.remove('is-menu-open');
    if (restoreFocus && trigger) trigger.focus();
  }
  triggers.forEach(function (t) {
    t.addEventListener('click', function () {
      if (openKey === t.dataset.menuTrigger) closeMenu(false); else openMenu(t.dataset.menuTrigger);
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openKey) closeMenu(true);
  });
  document.addEventListener('click', function (e) {
    if (openKey && !masthead.contains(e.target)) closeMenu(false);
  });
  masthead.addEventListener('focusout', function (e) {
    if (openKey && e.relatedTarget && !masthead.contains(e.relatedTarget)) closeMenu(false);
  });

  /* ---------------------------------------------------------------------------------------
     3. Readouts — each node opens its tool's full detail in a native modal <dialog>
        (focus trap, Escape and focus return come free). The hash tracks the open readout so
        #handoff etc. deep-link; without JS the same panels still open via CSS :target.
     --------------------------------------------------------------------------------------- */
  var readouts = {};
  Array.prototype.forEach.call(document.querySelectorAll('dialog.readout'), function (d) { readouts[d.id] = d; });
  var canModal = typeof HTMLDialogElement === 'function' && 'showModal' in HTMLDialogElement.prototype;
  var cleanUrl = function () { history.replaceState(null, '', location.pathname + location.search); };

  function openReadout(id) {
    var d = readouts[id];
    if (!d || !canModal) return false;
    closeMenu(false);
    Object.keys(readouts).forEach(function (k) { if (readouts[k].open && k !== id) readouts[k].close(); });
    if (!d.open) d.showModal();
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
    return true;
  }
  if (canModal) {
    Object.keys(readouts).forEach(function (id) {
      var d = readouts[id];
      d.addEventListener('close', function () { if (location.hash === '#' + id) cleanUrl(); });
      // A click on the backdrop lands on the <dialog> itself (the panel fills .readout-inner).
      d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
      Array.prototype.forEach.call(d.querySelectorAll('[data-readout-close]'), function (a) {
        a.addEventListener('click', function (e) { e.preventDefault(); d.close(); });
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-readout-open]'), function (a) {
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        if (openReadout(a.dataset.readoutOpen)) e.preventDefault();
      });
    });
    var fromHash = function () {
      var id = decodeURIComponent(location.hash.slice(1));
      if (readouts[id]) openReadout(id);
    };
    addEventListener('hashchange', fromHash);
    fromHash();
  }

  /* ---------------------------------------------------------------------------------------
     4. Wordmark = back to the default view (the live site's data-panel-reset).
     --------------------------------------------------------------------------------------- */
  var reset = document.querySelector('[data-reset]');
  if (reset) reset.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    closeMenu(false);
    Object.keys(readouts).forEach(function (k) { if (readouts[k].open) readouts[k].close(); });
    if (location.hash) cleanUrl();
    scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
  });

  /* ---------------------------------------------------------------------------------------
     5. The dial — drawn in pixel space so strokes and the mono labels stay crisp at every
        size. Radius comes from the CSS (--R via .dial-probe), so the labels the CSS places
        with sin()/cos() always sit on the ring this draws. Angles run clockwise from 12.
     --------------------------------------------------------------------------------------- */
  var NS = 'http://www.w3.org/2000/svg';
  var stage = document.querySelector('[data-stage]');
  var svg = document.querySelector('[data-dial]');
  var probe = document.querySelector('[data-dial-probe]');
  var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-node]'));
  var SECTORS = [
    { from: 240, to: 360, num: 'I', name: 'Pre-Production', mid: 300 },
    { from: 120, to: 240, num: 'II', name: 'Production', mid: 180 },
    { from: 0, to: 120, num: 'III', name: 'Post-Production', mid: 60 }
  ];
  var nodeGroups = [];
  var sweep = null;
  var drawn = false;
  var lastSecond = 0;

  var el = function (tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  var f = function (n) { return n.toFixed(2); };

  function draw() {
    if (!svg || getComputedStyle(svg).display === 'none') return;
    var w = stage.clientWidth, h = stage.clientHeight;
    var R = probe.offsetWidth;
    var gap = parseFloat(getComputedStyle(stage).getPropertyValue('--gap')) || 40;
    if (!R) return;
    var cx = w / 2, cy = h / 2;
    var pt = function (r, deg) {
      var a = deg * Math.PI / 180;
      return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
    };
    var arc = function (r, a1, a2, cw) {
      var p1 = pt(r, a1), p2 = pt(r, a2);
      var large = Math.abs(a2 - a1) > 180 ? 1 : 0;
      return 'M' + f(p1[0]) + ' ' + f(p1[1]) + ' A' + f(r) + ' ' + f(r) + ' 0 ' + large + ' ' + (cw ? 1 : 0) + ' ' + f(p2[0]) + ' ' + f(p2[1]);
    };
    var line = function (r1, r2, deg, cls, parent) {
      var a = pt(r1, deg), b = pt(r2, deg);
      return el('line', { x1: f(a[0]), y1: f(a[1]), x2: f(b[0]), y2: f(b[1]), 'class': cls }, parent);
    };

    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var defs = el('defs', {}, svg);

    // Guides: inner (clear of the lock-up) and the label orbit
    el('circle', { cx: f(cx), cy: f(cy), r: f(R * 0.74), 'class': 'guide guide--dash fade-on' }, svg);
    el('circle', { cx: f(cx), cy: f(cy), r: f(R + gap), 'class': 'guide guide--dash fade-on' }, svg);
    el('circle', { cx: f(cx), cy: f(cy), r: f(R), 'class': 'guide fade-on' }, svg);

    // Seconds ring: 60 ticks, a long one every 5 (every 30°)
    var ticks = el('g', { 'class': 'fade-on' }, svg);
    for (var i = 0; i < 60; i++) {
      var major = i % 5 === 0;
      line(R + 3, R + (major ? 13 : 7), i * 6, 'tick' + (major ? ' tick--major' : ''), ticks);
    }

    // Phase sectors: three 120° arcs with a bracket at each boundary, labelled along the ring
    SECTORS.forEach(function (s, idx) {
      var p = el('path', { d: arc(R, s.from + 4, s.to - 4, true), 'class': 'sector-arc draw-on' }, svg);
      var len = (2 * Math.PI * R) * (112 / 360);
      p.style.setProperty('--len', f(len));
      p.style.strokeDasharray = f(len);
      line(R - 6, R + 6, s.from + 4, 'sector-end fade-on', svg);
      line(R - 6, R + 6, s.to - 4, 'sector-end fade-on', svg);

      // Label path: clockwise across the top half so it reads left-to-right with glyphs
      // standing outward; counter-clockwise along the bottom so it isn't upside down.
      var bottom = s.mid > 90 && s.mid < 270;
      var span = 34;
      var id = 'arc-label-' + idx;
      var r = bottom ? R - 9 : R - 18;
      el('path', { id: id, d: bottom ? arc(r, s.mid + span, s.mid - span, false) : arc(r, s.mid - span, s.mid + span, true) }, defs);
      var t = el('text', { 'class': 'arc-label fade-on', 'text-anchor': 'middle' }, svg);
      var tp = el('textPath', { href: '#' + id, startOffset: '50%' }, t);
      el('tspan', { 'class': 'arc-num' }, tp).textContent = s.num + ' — ';
      tp.appendChild(document.createTextNode(s.name.toUpperCase()));
    });

    // Bearing numerals at the three boundaries
    [0, 120, 240].forEach(function (deg) {
      var p = pt(R + 27, deg);
      var t = el('text', { x: f(p[0]), y: f(p[1] + 3), 'text-anchor': 'middle', 'class': 'deg fade-on' }, svg);
      t.textContent = ('00' + deg).slice(-3) + '°';
    });

    // Spokes + leaders + pips, one per tool
    nodeGroups = nodes.map(function (node) {
      var deg = parseFloat(node.style.getPropertyValue('--a'));
      var g = el('g', { 'class': 'fade-on' }, svg);
      line(R * 0.74, R - 6, deg, 'spoke', g);
      line(R + 15, R + gap - 6, deg, 'leader', g);
      var p = pt(R, deg);
      el('rect', {
        x: f(p[0] - 3.5), y: f(p[1] - 3.5), width: 7, height: 7,
        transform: 'rotate(45 ' + f(p[0]) + ' ' + f(p[1]) + ')',
        'class': 'pip' + (node.classList.contains('node--live') ? ' pip--live' : '')
      }, g);
      return g;
    });

    // Seconds marker: a small index riding the outside of the tick ring
    sweep = el('g', { 'class': 'fade-on' }, svg);
    var tip = pt(R + 15, 0);
    el('path', {
      d: 'M' + f(tip[0]) + ' ' + f(tip[1]) + ' l-4 -7 h8 z', 'class': 'sweep'
    }, sweep);
    sweep.dataset.cx = cx; sweep.dataset.cy = cy;
    setSweep(lastSecond);

    if (!drawn) {
      drawn = true;
      if (!reduce.matches) {
        svg.classList.add('is-drawing');
        // Only the first draw animates; a resize redraw must not replay the entrance.
        setTimeout(function () { svg.classList.remove('is-drawing'); }, 2600);
      }
    }
  }

  function setSweep(sec) {
    lastSecond = sec;
    if (!sweep) return;
    sweep.setAttribute('transform', 'rotate(' + sec * 6 + ' ' + f(+sweep.dataset.cx) + ' ' + f(+sweep.dataset.cy) + ')');
  }

  if (svg && stage && probe) {
    var light = function (idx) {
      nodeGroups.forEach(function (g, i) { g.classList.toggle('is-lit', i === idx); });
    };
    nodes.forEach(function (node, i) {
      var link = node.querySelector('a');
      link.addEventListener('mouseenter', function () { light(i); });
      link.addEventListener('mouseleave', function () { light(-1); });
      link.addEventListener('focus', function () { light(i); });
      link.addEventListener('blur', function () { light(-1); });
    });
    draw();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    var rz;
    addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(draw, 100); });
  }

  /* ---------------------------------------------------------------------------------------
     6. Clock — Los Angeles time only (no date), 12-hour, PDT/PST, ticking on the second.
        The same second drives the marker on the dial's tick ring.
     --------------------------------------------------------------------------------------- */
  var clock = document.querySelector('[data-live-clock]');
  if (clock && window.Intl) {
    var hms = clock.querySelector('[data-clock-hms]');
    var suffix = clock.querySelector('[data-clock-suffix]');
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true, timeZoneName: 'short'
    });
    var tick = function () {
      var now = new Date();
      var p = {};
      fmt.formatToParts(now).forEach(function (part) { p[part.type] = part.value; });
      hms.textContent = ('0' + p.hour).slice(-2) + ':' + p.minute + ':' + p.second;
      suffix.textContent = (p.dayPeriod || '').toUpperCase() + ' ' + (p.timeZoneName || '');
      clock.setAttribute('datetime', now.toISOString());
      setSweep(parseInt(p.second, 10) || 0);
      setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    tick();
  }
})();
