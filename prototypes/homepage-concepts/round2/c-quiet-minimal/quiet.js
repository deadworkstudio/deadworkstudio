// DEADWORK — Round 2 / C: Cinematic Studio, Quiet. Presentation only: hero video loading,
// the nav mega-menus, the billing-block product viewer and the Los Angeles clock.
// Signups are handled entirely by the site's shared assets/js/notify.js, untouched.
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');

  /* -------------------------------------------------------------------------------------
     1. Hero video — the exact mechanism from the live home.js. No <source>/autoplay in the
        markup; reduced motion keeps the poster only and never fetches video bytes; phones
        (<= 800px) get the mobile rendition.
     ------------------------------------------------------------------------------------- */
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

  /* -------------------------------------------------------------------------------------
     2. Mega-menus — click/tap or keyboard to open; same tab, Escape, outside click or
        tabbing away closes.
     ------------------------------------------------------------------------------------- */
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
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && openKey) closeMenu(true); });
  document.addEventListener('click', function (e) { if (openKey && !masthead.contains(e.target)) closeMenu(false); });
  masthead.addEventListener('focusout', function (e) {
    if (openKey && e.relatedTarget && !masthead.contains(e.relatedTarget)) closeMenu(false);
  });

  // Hairline under the masthead once the page has moved.
  var ticking = false;
  function onScroll() { ticking = false; masthead.classList.toggle('is-scrolled', scrollY > 8); }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* -------------------------------------------------------------------------------------
     3. The bill — six credits, one stage. Choosing a credit shows that product's card in
        the center; the URL hash follows so old links like #stock-shredder still work.
        Without JS, credits are plain anchors and every card is visible.
     ------------------------------------------------------------------------------------- */
  var credits = Array.prototype.slice.call(document.querySelectorAll('[data-credit]'));
  var cards = Array.prototype.slice.call(document.querySelectorAll('[data-card]'));
  var stage = document.querySelector('[data-stage]');
  var DEFAULT = 'stock-shredder'; // the one product people can buy today leads the bill
  var current = null;

  function hasCard(id) { return cards.some(function (c) { return c.id === id; }); }

  function show(id, opts) {
    opts = opts || {};
    if (!hasCard(id)) id = DEFAULT;
    if (id === current) return;
    current = id;
    cards.forEach(function (c) {
      var on = c.id === id;
      c.hidden = !on;
      c.classList.remove('is-entering');
      if (on && opts.animate) { void c.offsetWidth; c.classList.add('is-entering'); }
    });
    credits.forEach(function (a) {
      if (a.dataset.credit === id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  credits.forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      var id = a.dataset.credit;
      show(id, { animate: true });
      history.replaceState(null, '', '#' + id);
      // On a phone the stage sits below the credits — bring its top into view if it isn't.
      var top = stage.getBoundingClientRect().top;
      if (top > innerHeight * 0.6 || top < 0) {
        var card = document.getElementById(id);
        card.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
      }
    });
  });

  function fromHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (hasCard(id)) {
      show(id);
      document.getElementById(id).scrollIntoView({ block: 'start' });
    }
  }
  show(DEFAULT);
  if (location.hash) fromHash();
  addEventListener('hashchange', fromHash);

  // Wordmark = back to the title card (the live site's data-panel-reset).
  var reset = document.querySelector('[data-reset]');
  if (reset) reset.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    closeMenu(false);
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    show(DEFAULT);
    scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
  });

  /* -------------------------------------------------------------------------------------
     4. Clock — Los Angeles time only (no date), 12-hour, PDT/PST, ticking on the second.
     ------------------------------------------------------------------------------------- */
  var clock = document.querySelector('[data-live-clock]');
  if (clock && window.Intl) {
    var hms = clock.querySelector('[data-clock-hms]');
    var suffix = clock.querySelector('[data-clock-suffix]');
    var dot = document.querySelector('.clock-dot');
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true, timeZoneName: 'short'
    });
    var tick = function () {
      var now = new Date();
      var p = {};
      fmt.formatToParts(now).forEach(function (part) { p[part.type] = part.value; });
      hms.textContent = ('0' + p.hour).slice(-2) + ':' + p.minute + ':' + p.second;
      suffix.innerHTML = '';
      [(p.dayPeriod || '').toUpperCase(), p.timeZoneName || ''].forEach(function (t) {
        var s = document.createElement('span'); s.textContent = t; suffix.appendChild(s); suffix.appendChild(document.createTextNode(' '));
      });
      clock.setAttribute('datetime', now.toISOString());
      if (dot) { dot.classList.remove('is-tick'); void dot.offsetWidth; dot.classList.add('is-tick'); }
      setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    tick();
  }
})();
