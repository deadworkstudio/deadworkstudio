// DEADWORK — Option 05 "THE SLAB". Presentation only: hero video, header state, mega-menu,
// product doors (open/close + URL hash), and the live Los Angeles clock.
// Signups are handled by the site's shared assets/js/notify.js, untouched.
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Hero video — same mechanism as the live home.js ----------
     No <source>/autoplay in markup. Under reduced motion the poster is the whole experience and
     no video bytes are ever fetched; otherwise pick the mobile rendition under ~800px wide. */
  var hero = document.querySelector('[data-hero-video]');
  if (hero && !reduce.matches) {
    var source = document.createElement('source');
    source.src = innerWidth <= 800 ? hero.dataset.srcMobile : hero.dataset.src;
    source.type = 'video/mp4';
    hero.appendChild(source);
    hero.preload = 'auto';
    hero.load();
    var p = hero.play();
    if (p && p.catch) p.catch(function () {});
  }

  /* ---------- Header: transparent over the hero plate, solid ink over the slab ---------- */
  var head = document.querySelector('[data-head]');
  var plate = document.querySelector('[data-plate]');
  if (head && plate) {
    var queued = false;
    var paint = function () {
      queued = false;
      head.classList.toggle('is-over', plate.getBoundingClientRect().bottom > head.offsetHeight);
    };
    var onScroll = function () { if (!queued) { queued = true; requestAnimationFrame(paint); } };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll, { passive: true });
    paint();
  }

  /* ---------- Mega-menu ---------- */
  var mega = document.querySelector('[data-mega]');
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-tab]'));
  var groups = mega ? Array.prototype.slice.call(mega.querySelectorAll('[data-group]')) : [];
  var openTab = null;

  function closeMenu(returnFocus) {
    if (!openTab) return;
    var t = openTab;
    openTab = null;
    mega.hidden = true;
    head.classList.remove('has-menu');
    tabs.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (returnFocus) t.focus();
  }
  function openMenu(tab) {
    var key = tab.dataset.tab;
    groups.forEach(function (g) { g.classList.toggle('is-shown', g.dataset.group === key); });
    tabs.forEach(function (b) { b.setAttribute('aria-expanded', b === tab ? 'true' : 'false'); });
    mega.hidden = false;
    head.classList.add('has-menu');
    openTab = tab;
  }
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      openTab === tab ? closeMenu(false) : openMenu(tab);
    });
  });
  document.addEventListener('click', function (e) {
    if (openTab && !e.target.closest('[data-mega], [data-tab]')) closeMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openTab) { e.preventDefault(); closeMenu(true); }
  });
  // Keyboard users tabbing out of the menu entirely shouldn't leave it hanging open
  document.addEventListener('focusin', function (e) {
    if (openTab && !head.contains(e.target)) closeMenu(false);
  });

  /* ---------- Product doors ---------- */
  var lines = {};
  Array.prototype.forEach.call(document.querySelectorAll('[data-line]'), function (line) {
    lines[line.dataset.line] = {
      el: line,
      btn: line.querySelector('[data-word]'),
      door: line.querySelector('[data-door]')
    };
  });
  var baseTitle = document.title;
  var NAMES = { 'scene-lock': 'Scene Lock', 'set-control': 'Set Control', 'loadout': 'Loadout',
    'handoff': 'Handoff', 'sound-driver': 'Sound Driver', 'stock-shredder': 'Stock Shredder' };

  function setOpen(key, open) {
    var l = lines[key]; if (!l) return;
    l.el.classList.toggle('is-open', open);
    l.btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) l.door.removeAttribute('inert'); else l.door.setAttribute('inert', '');
  }
  function openKeys() {
    return Object.keys(lines).filter(function (k) { return lines[k].el.classList.contains('is-open'); });
  }
  function syncUrl(key) {
    var hash = key ? '#' + key : '';
    if (location.hash !== hash) history.pushState(null, '', hash || location.pathname + location.search);
    document.title = key ? 'DEADWORK — ' + NAMES[key] : baseTitle;
  }
  function toggle(key) {
    var open = !lines[key].el.classList.contains('is-open');
    setOpen(key, open);
    var still = openKeys();
    syncUrl(open ? key : (still.length ? still[still.length - 1] : ''));
  }
  function fromHash() {
    var k = decodeURIComponent(location.hash.slice(1));
    return lines[k] ? k : '';
  }
  function applyHash(scroll) {
    var k = fromHash();
    Object.keys(lines).forEach(function (key) { setOpen(key, key === k); });
    if (k && scroll) lines[k].el.scrollIntoView({ block: 'start', behavior: 'auto' });
  }

  Object.keys(lines).forEach(function (key) {
    var l = lines[key];
    l.btn.addEventListener('click', function () { toggle(key); });
    // The spec strip above each word is a larger, friendlier hit target for the same toggle
    var strip = l.el.querySelector('[data-strip]');
    if (strip) strip.addEventListener('click', function () { toggle(key); });
  });

  // Escape closes the most recently opened door (but never while typing an email)
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || openTab || e.defaultPrevented) return;
    if (e.target.closest('input, textarea, select')) return;
    var still = openKeys(); if (!still.length) return;
    var key = still[still.length - 1];
    setOpen(key, false);
    lines[key].btn.focus();
    var rest = openKeys();
    syncUrl(rest.length ? rest[rest.length - 1] : '');
  });

  // Wordmark: back to the default view — everything closed, menu shut, top of page
  var reset = document.querySelector('[data-reset]');
  if (reset) reset.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    closeMenu(false);
    Object.keys(lines).forEach(function (k) { setOpen(k, false); });
    syncUrl('');
    scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
  });

  addEventListener('popstate', function () { applyHash(true); });
  addEventListener('hashchange', function () { applyHash(true); });
  applyHash(true);

  /* ---------- IV — the live Los Angeles clock ----------
     12-hour, hh:mm:ss, AM/PM and PDT/PST. Always America/Los_Angeles, never the visitor's zone.
     Every glyph lives in a fixed-width cell, so the fitted line never reflows as it ticks. */
  var clock = document.querySelector('[data-clock]');
  if (clock) {
    var cells = {};
    Array.prototype.forEach.call(clock.querySelectorAll('[data-c]'), function (c) { cells[c.dataset.c] = c; });
    var sr = clock.querySelector('[data-clock-sr]');
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true, timeZoneName: 'short'
    });
    var set = function (key, ch) {
      var c = cells[key]; if (!c || c.textContent === ch) return;
      c.textContent = ch;
      if (!reduce.matches && c.classList.contains('cd')) {
        c.classList.remove('tick');
        void c.offsetWidth;            // restart the one-frame "cut in"
        c.classList.add('tick');
      }
    };
    var tick = function () {
      var parts = {};
      fmt.formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
      var h = ('0' + parts.hour).slice(-2), m = parts.minute, s = parts.second;
      var ap = (parts.dayPeriod || 'PM').toUpperCase();
      var zone = (parts.timeZoneName || 'PDT').toUpperCase();   // "PDT" or "PST"
      set('h1', h[0]); set('h2', h[1]);
      set('m1', m[0]); set('m2', m[1]);
      set('s1', s[0]); set('s2', s[1]);
      set('ap', ap[0]);
      set('z', zone.length === 3 ? zone[1] : 'D');
      if (sr) sr.textContent = h + ':' + m + ':' + s + ' ' + ap + ' ' + zone;
      setTimeout(tick, 1000 - (Date.now() % 1000) + 5);   // align to the real second boundary
    };
    tick();
  }
})();
