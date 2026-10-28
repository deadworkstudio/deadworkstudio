// DEADWORK — Round 4 / A: Stacked Roster. Presentation only: hero video loading, nav
// mega-menus, masthead state, wordmark reset, and the Los Angeles clock.
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
    hero.addEventListener('playing', function () { hero.classList.add('is-playing'); }, { once: true });
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

  /* 3. Masthead turns solid once the hero headline has scrolled away. */
  var heroSection = document.querySelector('.hero');
  if (heroSection && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      masthead.classList.toggle('is-solid', !entries[0].isIntersecting);
    }, { rootMargin: '-120px 0px 0px 0px', threshold: 0.35 }).observe(heroSection);
  }

  /* 4. Wordmark = back to the default view (the live site's data-panel-reset). */
  var reset = document.querySelector('[data-reset]');
  if (reset) reset.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    closeMenu(false);
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
  });

  /* 5. Clock — Los Angeles time only (no date), 12-hour, PDT/PST, ticking on the second.
        Drives every [data-live-clock] on the page (hero corner + footer readout). */
  var clocks = Array.prototype.slice.call(document.querySelectorAll('[data-live-clock]'));
  if (clocks.length && window.Intl) {
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true, timeZoneName: 'short'
    });
    var tick = function () {
      var now = new Date();
      var p = {};
      fmt.formatToParts(now).forEach(function (part) { p[part.type] = part.value; });
      var hms = ('0' + p.hour).slice(-2) + ':' + p.minute + ':' + p.second;
      var suffix = (p.dayPeriod || '').toUpperCase() + ' ' + (p.timeZoneName || '');
      clocks.forEach(function (c) {
        c.querySelector('[data-clock-hms]').textContent = hms;
        c.querySelector('[data-clock-suffix]').textContent = suffix;
        c.setAttribute('datetime', now.toISOString());
      });
      setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    tick();
  }
})();
