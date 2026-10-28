// DEADWORK: Round 5 / A, Constellation Refined. Presentation only: hero video loading, nav
// mega-menus, constellation spokes + focus mode, product sheets (dialogs), wordmark reset, and
// the Los Angeles clock. Signups are handled by the shared assets/js/notify.js, untouched.
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var each = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };

  /* ---------------------------------------------------------------------------------------
     1. Hero video: the exact mechanism from the live home.js. No <source>/autoplay in the
        markup; reduced motion keeps the poster only and never fetches video bytes; phones
        (<= 800px) get the mobile rendition.
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
     2. Mega-menus: click/tap or keyboard to open; same tab again, Escape, outside click or
        tabbing away closes. The menu overlays the poster rather than pushing it down.
     --------------------------------------------------------------------------------------- */
  var masthead = document.querySelector('[data-masthead]');
  var menu = document.querySelector('[data-menu]');
  var triggers = Array.prototype.slice.call(document.querySelectorAll('[data-menu-trigger]'));
  var groups = {};
  each('[data-menu-group]', function (g) { groups[g.dataset.menuGroup] = g; });
  var openKey = null;

  function openMenu(key) {
    openKey = key;
    triggers.forEach(function (t) { t.setAttribute('aria-expanded', String(t.dataset.menuTrigger === key)); });
    Object.keys(groups).forEach(function (k) { groups[k].hidden = k !== key; });
    var wasHidden = menu.hidden;
    menu.hidden = false;
    masthead.classList.add('has-menu');
    if (wasHidden) requestAnimationFrame(function () { menu.classList.add('is-open'); });
  }
  function closeMenu(restoreFocus) {
    if (!openKey) return;
    var trigger = triggers.filter(function (t) { return t.dataset.menuTrigger === openKey; })[0];
    openKey = null;
    triggers.forEach(function (t) { t.setAttribute('aria-expanded', 'false'); });
    menu.classList.remove('is-open');
    menu.hidden = true;
    masthead.classList.remove('has-menu');
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
     3. Constellation spokes: one hairline from each name into the core, stopping at a
        bracketed frame around it (the hub). Decorative only (aria-hidden). Measured with
        offset* values so the entrance transforms never skew the geometry; redrawn on
        resize / font load. Hidden by CSS in the stacked (phone) layout.
     --------------------------------------------------------------------------------------- */
  var stage = document.querySelector('[data-stage]');
  var core = document.querySelector('[data-core]');
  var stars = Array.prototype.slice.call(document.querySelectorAll('[data-star]'));
  var NS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'spokes');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  stage.insertBefore(svg, stage.firstChild);
  var mk = function (tag, parent) { var el = document.createElementNS(NS, tag); parent.appendChild(el); return el; };
  var spokes = stars.map(function () {
    var g = mk('g', svg);
    return { g: g, line: mk('line', g), a: mk('rect', g), b: mk('rect', g) };
  });
  var frame = mk('path', svg);
  var drawn = false;

  function node(r, x, y, s) {
    r.setAttribute('x', (x - s / 2).toFixed(1)); r.setAttribute('y', (y - s / 2).toFixed(1));
    r.setAttribute('width', s); r.setAttribute('height', s);
  }

  function draw() {
    if (getComputedStyle(svg).display === 'none') return;
    var W = stage.clientWidth, H = stage.clientHeight;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

    // hub frame: the core's box, inflated
    var pad = 18;
    var x0 = core.offsetLeft - pad, y0 = core.offsetTop - pad / 2;
    var x1 = core.offsetLeft + core.offsetWidth + pad, y1 = core.offsetTop + core.offsetHeight + pad / 2;
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    var k = 14; // bracket arm length
    frame.setAttribute('d', [
      'M', x0, y0 + k, 'V', y0, 'H', x0 + k,
      'M', x1 - k, y0, 'H', x1, 'V', y0 + k,
      'M', x1, y1 - k, 'V', y1, 'H', x1 - k,
      'M', x0 + k, y1, 'H', x0, 'V', y1 - k
    ].join(' '));

    stars.forEach(function (star, i) {
      var name = star.querySelector('[data-star-name]');
      var top = star.classList.contains('star--top');
      var gap = 14;
      // name's horizontal centre; just below the tagline (top row) or above the index (bottom row)
      var nameLeft = star.offsetLeft + name.offsetLeft;
      var ax = nameLeft + name.offsetWidth / 2;
      var ay = top ? star.offsetTop + star.offsetHeight + gap : star.offsetTop - gap;
      if (!top && star.classList.contains('star--live')) {
        ay = star.offsetTop - gap; // the CTA sits below, the spoke still leaves from the top
      }
      // where the segment anchor -> hub centre first meets the hub frame
      var dx = cx - ax, dy = cy - ay;
      var tx = dx ? Math.min((x0 - ax) / dx, (x1 - ax) / dx) : -Infinity;
      var ty = dy ? Math.min((y0 - ay) / dy, (y1 - ay) / dy) : -Infinity;
      var t = Math.max(0, Math.min(1, Math.max(tx, ty)));
      var bx = ax + dx * t, by = ay + dy * t;

      var s = spokes[i];
      // drawn from the hub outward, so the draw-on reads as light leaving the core
      s.line.setAttribute('x1', bx.toFixed(1)); s.line.setAttribute('y1', by.toFixed(1));
      s.line.setAttribute('x2', ax.toFixed(1)); s.line.setAttribute('y2', ay.toFixed(1));
      var len = Math.hypot(ax - bx, ay - by).toFixed(1);
      s.line.style.setProperty('--len', len);
      node(s.a, ax, ay, 5);
      node(s.b, bx, by, 5);
    });
    if (!drawn) { drawn = true; if (!reduce.matches) svg.classList.add('is-drawing'); }
  }

  // focus mode: pointing at (or tabbing to) a name lights its spoke and quiets the rest
  function light(idx) {
    stage.classList.toggle('is-focusing', idx !== -1);
    stars.forEach(function (star, i) {
      star.classList.toggle('is-lit', i === idx);
      spokes[i].g.classList.toggle('is-lit', i === idx);
      spokes[i].g.classList.toggle('is-dim', idx !== -1 && i !== idx);
    });
  }
  stars.forEach(function (star, i) {
    star.addEventListener('mouseenter', function () { light(i); });
    star.addEventListener('mouseleave', function () { light(-1); });
    star.addEventListener('focusin', function () { light(i); });
    star.addEventListener('focusout', function () { light(-1); });
  });

  draw();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  addEventListener('load', draw);
  var rz;
  addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(draw, 100); });

  /* ---------------------------------------------------------------------------------------
     4. Product sheets: clicking a name opens its <dialog> (full description, specs, signup).
        Deep links (#scene-lock etc.) open the matching sheet on arrival; closing clears the
        hash. Backdrop click closes.
     --------------------------------------------------------------------------------------- */
  var sheets = {};
  each('dialog.sheet', function (d) {
    sheets[d.id] = d;
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    d.addEventListener('close', function () {
      if (location.hash === '#' + d.id) history.replaceState(null, '', location.pathname + location.search);
      var opener = document.querySelector('[data-open="' + d.id + '"]');
      if (opener) opener.focus({ preventScroll: true });
    });
    Array.prototype.forEach.call(d.querySelectorAll('[data-close]'), function (b) {
      b.addEventListener('click', function () { d.close(); });
    });
  });
  function closeSheets() { Object.keys(sheets).forEach(function (k) { if (sheets[k].open) sheets[k].close(); }); }
  function openSheet(id) {
    var d = sheets[id];
    if (!d || d.open) return;
    closeMenu(false);
    closeSheets();
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
  }
  each('[data-open]', function (b) { b.addEventListener('click', function () { openSheet(b.dataset.open); }); });
  function fromHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (sheets[id]) openSheet(id);
  }
  addEventListener('hashchange', fromHash);
  fromHash();

  /* ---------------------------------------------------------------------------------------
     5. Wordmark = back to the default view (the live site's data-panel-reset).
     --------------------------------------------------------------------------------------- */
  var reset = document.querySelector('[data-reset]');
  if (reset) reset.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    closeMenu(false);
    closeSheets();
    light(-1);
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
  });

  /* ---------------------------------------------------------------------------------------
     6. Clock: Los Angeles time only (no date), 12-hour, PDT/PST, ticking on the second.
        Digits render in fixed-width cells (no jitter); screen readers get one plain string.
     --------------------------------------------------------------------------------------- */
  var clock = document.querySelector('[data-live-clock]');
  if (clock && window.Intl) {
    var hms = clock.querySelector('[data-clock-hms]');
    var suffix = clock.querySelector('[data-clock-suffix]');
    var sr = clock.querySelector('[data-clock-sr]');
    var dot = document.querySelector('.clock-dot');
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true, timeZoneName: 'short'
    });
    var cells = function (str) {
      return str.split('').map(function (ch) {
        return ch === ':' ? '<span class="c">:</span>' : '<span class="d">' + ch + '</span>';
      }).join('');
    };
    var tick = function () {
      var now = new Date();
      var p = {};
      fmt.formatToParts(now).forEach(function (part) { p[part.type] = part.value; });
      var time = ('0' + p.hour).slice(-2) + ':' + p.minute + ':' + p.second;
      var tail = (p.dayPeriod || '').toUpperCase() + ' ' + (p.timeZoneName || '');
      hms.innerHTML = cells(time);
      suffix.textContent = tail;
      sr.textContent = 'Los Angeles time ' + time + ' ' + tail;
      clock.setAttribute('datetime', now.toISOString());
      if (dot && !reduce.matches) { dot.classList.remove('is-tick'); void dot.offsetWidth; dot.classList.add('is-tick'); }
      setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    tick();
  }
})();
