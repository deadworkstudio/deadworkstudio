// DEADWORK — Round 3 / A: Grid Refined. Presentation only: hero video loading, nav mega-menus,
// the in-place tool dossier, the wordmark reset and the Los Angeles clock. Signups are handled
// by the site's shared assets/js/notify.js, untouched.
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var root = document.documentElement;
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------------------------------------------------------------------------------------
     1. Hero video — the exact mechanism from the live home.js. No <source>/autoplay in the
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
     2. Mega-menus — click/tap or keyboard to open; same tab, Escape, outside click or tabbing
        away closes.
     --------------------------------------------------------------------------------------- */
  var masthead = document.querySelector('[data-masthead]');
  var menu = document.querySelector('[data-menu]');
  var triggers = $$('[data-menu-trigger]');
  var groups = {};
  $$('[data-menu-group]').forEach(function (g) { groups[g.dataset.menuGroup] = g; });
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

  /* ---------------------------------------------------------------------------------------
     3. Dossier — selecting a tool opens its full description, specs and signup in place,
        over the stage, without scrolling. Deep links (#scene-lock etc., like the live
        home/#scene-lock) open the same view. The stage and slate go inert while it's open.
     --------------------------------------------------------------------------------------- */
  var dossier = document.querySelector('[data-dossier]');
  var sheets = {};
  $$('[data-sheet]', dossier).forEach(function (s) { sheets[s.id] = s; s.tabIndex = -1; });
  var indexLinks = $$('.dossier-index [data-open]', dossier);
  var background = [document.querySelector('.stage'), document.querySelector('.slate')];
  var currentId = null, returnFocus = null;

  function openSheet(id, opts) {
    var sheet = sheets[id];
    if (!sheet) return;
    opts = opts || {};
    closeMenu(false);
    Object.keys(sheets).forEach(function (k) { sheets[k].classList.toggle('is-current', k === id); });
    indexLinks.forEach(function (a) {
      if (a.dataset.open === id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    if (!currentId) {
      dossier.classList.add('is-open');
      root.classList.add('dossier-open');
      background.forEach(function (el) { if (el) el.inert = true; });
    }
    currentId = id;
    dossier.scrollTop = 0;
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
    if (opts.focus !== false) sheet.focus({ preventScroll: true });
  }
  function closeSheet(restoreFocus) {
    if (!currentId) return;
    currentId = null;
    dossier.classList.remove('is-open');
    root.classList.remove('dossier-open');
    background.forEach(function (el) { if (el) el.inert = false; });
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    if (restoreFocus && returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  }

  $$('[data-open]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      if (!dossier.contains(a)) returnFocus = a;
      openSheet(a.dataset.open);
    });
  });
  $$('[data-close]', dossier).forEach(function (b) {
    b.addEventListener('click', function () { closeSheet(true); });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (openKey) closeMenu(true);
    else if (currentId) closeSheet(true);
  });

  function syncFromHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (sheets[id]) openSheet(id, { focus: false });
    else if (currentId) closeSheet(false);
  }
  addEventListener('hashchange', syncFromHash);
  if (location.hash) syncFromHash();

  /* ---------------------------------------------------------------------------------------
     4. Wordmark = back to the default view (the live site's data-panel-reset).
     --------------------------------------------------------------------------------------- */
  $$('[data-reset]').forEach(function (reset) {
    reset.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      closeMenu(false);
      closeSheet(false);
      scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
    });
  });

  /* ---------------------------------------------------------------------------------------
     5. Clock — Los Angeles time only (no date), 12-hour, PDT/PST, ticking on the second.
     --------------------------------------------------------------------------------------- */
  var clock = document.querySelector('[data-live-clock]');
  if (clock && window.Intl) {
    var hms = clock.querySelector('.clock-hms');
    var suffix = clock.querySelector('.clock-suffix');
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
      setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    tick();
  }
})();
