// DEADWORK — Round 4 / B: Split Editorial. Presentation only: hero video loading, nav
// mega-menus, solid masthead on scroll, scroll reveals, product sheets (dialogs), wordmark
// reset, and the Los Angeles clock. Signups are handled by the shared assets/js/notify.js.
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var each = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };

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
     2. Masthead — transparent over the cover, solid once the page scrolls under it.
     --------------------------------------------------------------------------------------- */
  var masthead = document.querySelector('[data-masthead]');
  var onScroll = function () { masthead.classList.toggle('is-solid', scrollY > 24); };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------------------------------------------------------------------------------
     3. Mega-menus — click/tap or keyboard to open; same tab again, Escape, outside click or
        tabbing away closes.
     --------------------------------------------------------------------------------------- */
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
     4. Scroll reveals — each tool rises in once as it enters. CSS only hides [data-reveal]
        under html.motion, so no-JS / reduced motion always shows everything.
     --------------------------------------------------------------------------------------- */
  var reveals = document.querySelectorAll('[data-reveal]');
  if (document.documentElement.classList.contains('motion') && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    Array.prototype.forEach.call(reveals, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(reveals, function (el) { el.classList.add('is-in'); });
  }

  /* ---------------------------------------------------------------------------------------
     5. Product sheets — each entry's Specs button opens its <dialog> (full description,
        specs, signup). Deep links (#scene-lock etc.) open the matching sheet on arrival;
        closing clears the hash. Backdrop click closes.
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
    // Make sure the entry behind the sheet is visible when it closes, even if the reveal
    // observer hasn't fired yet (deep links land before any scroll).
    var opener = document.querySelector('[data-open="' + id + '"]');
    var entry = opener && opener.closest('[data-reveal]');
    if (entry) entry.classList.add('is-in');
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
     6. Wordmark = back to the default view (the live site's data-panel-reset).
     --------------------------------------------------------------------------------------- */
  var reset = document.querySelector('[data-reset]');
  if (reset) reset.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    closeMenu(false);
    closeSheets();
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
  });

  /* ---------------------------------------------------------------------------------------
     7. Clock — Los Angeles time only (no date), 12-hour, PDT/PST, ticking on the second.
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
      if (dot) { dot.classList.remove('is-tick'); void dot.offsetWidth; dot.classList.add('is-tick'); }
      setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    tick();
  }
})();
