// DEADWORK — Option 03 (Industrial Minimalism) prototype script.
// Four jobs only: nav menus, wordmark reset, hero video (same no-fetch-under-reduced-motion
// mechanism as the live home.js), and the Los Angeles time readout. Signups are handled by the
// site's shared assets/js/notify.js, loaded separately.
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Nav menus (click to open, one at a time) ---------- */
  var triggers = Array.prototype.slice.call(document.querySelectorAll('[data-menu-trigger]'));
  var menus = {};
  Array.prototype.forEach.call(document.querySelectorAll('[data-menu]'), function (m) { menus[m.dataset.menu] = m; });
  var openKey = null;

  function setMenu(key) {
    openKey = key;
    triggers.forEach(function (t) {
      var on = t.dataset.menuTrigger === key;
      t.setAttribute('aria-expanded', on ? 'true' : 'false');
      menus[t.dataset.menuTrigger].hidden = !on;
    });
  }

  triggers.forEach(function (t) {
    t.addEventListener('click', function () {
      setMenu(openKey === t.dataset.menuTrigger ? null : t.dataset.menuTrigger);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !openKey) return;
    var trigger = document.querySelector('[data-menu-trigger="' + openKey + '"]');
    setMenu(null);
    if (trigger) trigger.focus();
  });

  document.addEventListener('click', function (e) {
    if (openKey && !e.target.closest('[data-hdr]')) setMenu(null);
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-menu-jump]'), function (a) {
    a.addEventListener('click', function () { setMenu(null); });
  });

  /* ---------- Wordmark: back to the default view ---------- */
  var reset = document.querySelector('[data-reset]');
  if (reset) reset.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    setMenu(null);
    history.pushState(null, '', location.pathname + location.search);
    window.scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
  });

  /* ---------- Hero video (mirrors live home.js QA-21/H-15) ----------
     No <source> in markup. Under reduced motion we never attach one, so no video bytes are
     fetched and the poster is the whole experience. Otherwise pick the mobile rendition under
     ~800px wide and start playback. */
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

  /* ---------- Los Angeles time readout (time only, no date) ---------- */
  var clocks = document.querySelectorAll('[data-clock]');
  if (!clocks.length) return;
  var fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true, timeZoneName: 'short'
  });

  // Build the 60-step seconds scale once.
  var scales = document.querySelectorAll('[data-clock-ticks]');
  Array.prototype.forEach.call(scales, function (s) {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 60; i++) frag.appendChild(document.createElement('i'));
    s.appendChild(frag);
  });

  function tick() {
    var parts = {};
    fmt.formatToParts(new Date()).forEach(function (pt) { parts[pt.type] = pt.value; });
    var hms = parts.hour + ':' + parts.minute + ':' + parts.second;
    var sec = parseInt(parts.second, 10);
    Array.prototype.forEach.call(clocks, function (c) {
      var h = c.querySelector('[data-clock-hms]'), a = c.querySelector('[data-clock-ampm]'), z = c.querySelector('[data-clock-tz]');
      if (h) h.textContent = hms;
      if (a) a.textContent = (parts.dayPeriod || '').toUpperCase();
      if (z) z.textContent = parts.timeZoneName || '';
      var ticks = c.querySelectorAll('[data-clock-ticks] i');
      for (var i = 0; i < ticks.length; i++) {
        ticks[i].className = i < sec ? 'is-past' : (i === sec ? 'is-now' : '');
      }
    });
  }
  tick();
  // Align to the second boundary so the readout flips exactly when the second changes.
  setTimeout(function () { tick(); setInterval(tick, 1000); }, 1000 - (Date.now() % 1000));
})();
