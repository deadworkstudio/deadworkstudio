// DEADWORK — Round 7 / Experimental Editorial. Presentation only, no dependencies. Signups are handled by the shared assets/js/notify.js.
(function () {
  var onReset = null;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var each = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };

  /* ------------------------------------------------------------------ Hero video */
  // The live home.js mechanism: nothing is fetched under reduced motion.
  var hero = document.querySelector('[data-hero-video]');
  if (hero && !reduce.matches) {
    var source = document.createElement('source');
    source.src = innerWidth <= 800 ? hero.dataset.srcMobile : hero.dataset.src;
    source.type = 'video/mp4';
    hero.appendChild(source);
    hero.addEventListener('playing', function () { hero.classList.add('is-playing'); }, { once: true });
    hero.preload = 'auto';
    hero.load();
    var playing = hero.play();
    if (playing && playing.catch) playing.catch(function () {});
  }

  /* ------------------------------------------------------------------ Mega-menus */
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
    if (wasHidden) requestAnimationFrame(function () { menu.classList.add('is-open'); });
  }
  function closeMenu(restoreFocus) {
    if (!openKey) return;
    var trigger = triggers.filter(function (t) { return t.dataset.menuTrigger === openKey; })[0];
    openKey = null;
    triggers.forEach(function (t) { t.setAttribute('aria-expanded', 'false'); });
    menu.classList.remove('is-open');
    menu.hidden = true;
    if (restoreFocus && trigger) trigger.focus();
  }
  triggers.forEach(function (t) {
    t.addEventListener('click', function () {
      if (openKey === t.dataset.menuTrigger) closeMenu(false); else openMenu(t.dataset.menuTrigger);
    });
  });
  document.addEventListener('click', function (e) {
    if (openKey && !masthead.contains(e.target)) closeMenu(false);
  });
  masthead.addEventListener('focusout', function (e) {
    if (openKey && e.relatedTarget && !masthead.contains(e.relatedTarget)) closeMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openKey) { e.preventDefault(); closeMenu(true); }
  });

  /* ------------------------------------------------------------------ Sheets */
  // Native <dialog>s; the hash keeps deep links (#scene-lock) and the back button working.
  var sheets = {};
  each('dialog.sheet', function (d) { sheets[d.id] = d; });
  var keyOf = function (id) { return id.replace(/^sheet-/, ''); };
  var opener = null;

  function openSheet(id, push) {
    var d = sheets[id];
    if (!d || d.open) return;
    Object.keys(sheets).forEach(function (k) { if (sheets[k].open) sheets[k].close(); });
    closeMenu(false);
    d.showModal();
    if (push) history.pushState(null, '', '#' + keyOf(id));
  }
  function sheetFromHash() {
    var k = decodeURIComponent(location.hash.slice(1));
    var id = sheets[k] ? k : sheets['sheet-' + k] ? 'sheet-' + k : null;
    if (id) openSheet(id, false);
    else Object.keys(sheets).forEach(function (s) { if (sheets[s].open) sheets[s].close(); });
  }
  each('[data-open]', function (b) {
    b.addEventListener('click', function () { opener = b; openSheet(b.dataset.open, true); });
  });
  Object.keys(sheets).forEach(function (id) {
    var d = sheets[id];
    d.addEventListener('close', function () {
      if (location.hash.slice(1) === keyOf(id)) history.pushState(null, '', location.pathname + location.search);
      if (opener) { opener.focus({ preventScroll: true }); opener = null; }
    });
    // a click on the backdrop (the dialog box itself, outside its panel) closes it
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    d.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', function () { d.close(); }); });
  });
  addEventListener('popstate', sheetFromHash);
  addEventListener('hashchange', sheetFromHash);
  sheetFromHash();

  var reset = document.querySelector('[data-reset]');
  if (reset) reset.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    closeMenu(false);
    Object.keys(sheets).forEach(function (s) { if (sheets[s].open) sheets[s].close(); });
    if (typeof onReset === 'function') onReset();
    scrollTo(0, 0);
  });

  /* ------------------------------------------------------------------ LA clock */
  // Time only, always America/Los_Angeles with PDT/PST; fixed-width digit cells.
  var clock = document.querySelector('[data-live-clock]');
  if (clock && window.Intl) {
    var hms = clock.querySelector('[data-clock-hms]');
    var suffix = clock.querySelector('[data-clock-suffix]');
    var sr = clock.querySelector('[data-clock-sr]');
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true, timeZoneName: 'short'
    });
    var tick = function () {
      var now = new Date();
      var p = {};
      fmt.formatToParts(now).forEach(function (part) { p[part.type] = part.value; });
      var time = ('0' + p.hour).slice(-2) + ':' + p.minute + ':' + p.second;
      var tail = (p.dayPeriod || '').toUpperCase() + ' ' + (p.timeZoneName || '');
      hms.innerHTML = time.split('').map(function (ch, i) {
        return ch === ':' ? '<span class="c">:</span>' : '<span class="d' + (i > 5 ? ' s' : '') + '">' + ch + '</span>';
      }).join('');
      suffix.textContent = tail;
      sr.textContent = 'Los Angeles time ' + time + ' ' + tail;
      clock.setAttribute('datetime', now.toISOString());
      setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    tick();
  }
})();
