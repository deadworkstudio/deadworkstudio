// DEADWORK — Round 4 / C: Sequential Names. Presentation only: hero video loading, nav
// mega-menus, wordmark reset, masthead solidify, title-card entrances, and the LA clock.
// Signups are handled by the site's shared assets/js/notify.js, untouched.
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');

  /* 1. Hero video — the exact mechanism from the live home.js. No <source>/autoplay in the
        markup; reduced motion keeps the poster only and never fetches video bytes; phones
        (<= 800px) get the mobile rendition. */
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

  /* 2. Mega-menus — click/tap or keyboard to open; same tab again, Escape, outside click or
        tabbing away closes. */
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
    masthead.classList.add('is-menu');
    if (wasHidden) requestAnimationFrame(function () { menu.classList.add('is-open'); });
  }
  function closeMenu(restoreFocus) {
    if (!openKey) return;
    var trigger = triggers.filter(function (t) { return t.dataset.menuTrigger === openKey; })[0];
    openKey = null;
    triggers.forEach(function (t) { t.setAttribute('aria-expanded', 'false'); });
    menu.classList.remove('is-open');
    menu.hidden = true;
    masthead.classList.remove('is-menu');
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

  /* 3. Wordmark = back to the default view (the live site's data-panel-reset). */
  var reset = document.querySelector('[data-reset]');
  if (reset) reset.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    closeMenu(false);
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
  });

  /* 4. Masthead goes solid once the opening title is scrolled past its top edge. */
  var solid = function () { masthead.classList.toggle('is-solid', scrollY > 24); };
  addEventListener('scroll', solid, { passive: true });
  solid();

  /* 5. Title cards cut in as they reach the screen (once). Without html.motion the CSS
        never hides anything, so this is purely an enhancement. */
  var cards = document.querySelectorAll('[data-card]');
  if (document.documentElement.classList.contains('motion') && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -18% 0px', threshold: 0 });
    Array.prototype.forEach.call(cards, function (c) { io.observe(c); });
  } else {
    Array.prototype.forEach.call(cards, function (c) { c.classList.add('is-in'); });
  }

  /* 6. Los Angeles clock — time only (no date), 12-hour, PDT/PST, ticking on the second.
        Each glyph gets a fixed-width cell so the giant numerals never jitter. Screen
        readers get a quiet, minute-level version instead of a per-second announcement. */
  var clock = document.querySelector('[data-live-clock]');
  if (clock && window.Intl) {
    var hms = clock.querySelector('[data-clock-hms]');
    var suffix = clock.querySelector('[data-clock-suffix]');
    var sr = clock.querySelector('[data-clock-sr]');
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true, timeZoneName: 'short'
    });
    var cells = [];
    var lastSr = '';
    var tick = function () {
      var now = new Date();
      var p = {};
      fmt.formatToParts(now).forEach(function (part) { p[part.type] = part.value; });
      var text = ('0' + p.hour).slice(-2) + ':' + p.minute + ':' + p.second;
      if (!cells.length) {
        hms.textContent = '';
        for (var i = 0; i < text.length; i++) {
          var s = document.createElement('span');
          s.className = text[i] === ':' ? 'c' : 'd';
          hms.appendChild(s);
          cells.push(s);
        }
      }
      for (var j = 0; j < cells.length; j++) {
        if (cells[j].textContent !== text[j]) cells[j].textContent = text[j];
      }
      var tail = (p.dayPeriod || '').toUpperCase() + ' ' + (p.timeZoneName || '');
      suffix.textContent = tail;
      var spoken = ('0' + p.hour).slice(-2) + ':' + p.minute + ' ' + tail + ', Los Angeles';
      if (spoken !== lastSr) { sr.textContent = spoken; lastSr = spoken; }
      clock.setAttribute('datetime', now.toISOString());
      setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    tick();
  }
})();
