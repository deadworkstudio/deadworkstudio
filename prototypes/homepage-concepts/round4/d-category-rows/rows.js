// DEADWORK — Round 4 / D: Category Rows. Presentation only: hero video loading, header
// state, nav mega-menus, product sheets (dialogs), wordmark reset, scroll reveals and the
// Los Angeles clock. Signups are handled by the site's shared assets/js/notify.js, untouched.
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

  /* 2. Header — transparent over the film, solid ink once scrolled. */
  var header = document.querySelector('[data-header]');
  function onScroll() { header.classList.toggle('is-solid', scrollY > 24); }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* 3. Mega-menus — click/tap or keyboard to open; same tab again, Escape, outside click or
        tabbing away closes. */
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
    header.classList.add('has-menu');
    if (wasHidden) requestAnimationFrame(function () { menu.classList.add('is-open'); });
  }
  function closeMenu(restoreFocus) {
    if (!openKey) return;
    var trigger = triggers.filter(function (t) { return t.dataset.menuTrigger === openKey; })[0];
    openKey = null;
    triggers.forEach(function (t) { t.setAttribute('aria-expanded', 'false'); });
    menu.classList.remove('is-open');
    menu.hidden = true;
    header.classList.remove('has-menu');
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
    if (openKey && !header.contains(e.target)) closeMenu(false);
  });
  header.addEventListener('focusout', function (e) {
    if (openKey && e.relatedTarget && !header.contains(e.relatedTarget)) closeMenu(false);
  });

  /* 4. Product sheets — each tool's Details button opens its <dialog> (specs + signup).
        Deep links (#scene-lock etc.) open the matching sheet; closing clears the hash.
        Backdrop click closes. */
  var sheets = {};
  Array.prototype.forEach.call(document.querySelectorAll('dialog.sheet'), function (d) {
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
  function openSheet(id) {
    var d = sheets[id];
    if (!d || d.open) return;
    closeMenu(false);
    Object.keys(sheets).forEach(function (k) { if (sheets[k].open) sheets[k].close(); });
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-open]'), function (b) {
    b.addEventListener('click', function () { openSheet(b.dataset.open); });
  });
  function fromHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (sheets[id]) openSheet(id);
  }
  addEventListener('hashchange', fromHash);
  fromHash();

  /* 5. Wordmark = back to the default view (the live site's data-panel-reset). */
  Array.prototype.forEach.call(document.querySelectorAll('[data-reset]'), function (reset) {
    reset.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      closeMenu(false);
      Object.keys(sheets).forEach(function (k) { if (sheets[k].open) sheets[k].close(); });
      if (location.hash) history.replaceState(null, '', location.pathname + location.search);
      scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
    });
  });

  /* 6. Scroll reveals — only when html.motion is set (motion allowed + JS running).
        Within a band, items stagger left to right. */
  var reveals = document.querySelectorAll('[data-reveal]');
  if (document.documentElement.classList.contains('motion') && 'IntersectionObserver' in window) {
    Array.prototype.forEach.call(document.querySelectorAll('.hero-content, .band-inner, .footer-inner'), function (scope) {
      Array.prototype.forEach.call(scope.querySelectorAll('[data-reveal]'), function (el, i) {
        el.style.setProperty('--d', (i * 110) + 'ms');
      });
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    Array.prototype.forEach.call(reveals, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(reveals, function (el) { el.classList.add('is-in'); });
  }

  /* 7. Clock — Los Angeles time only (no date), 12-hour, PDT/PST, ticking on the second.
        Each digit sits in a fixed-width cell so Anton's proportional figures don't jitter. */
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
    var lastMinute = '';
    var tick = function () {
      var now = new Date();
      var p = {};
      fmt.formatToParts(now).forEach(function (part) { p[part.type] = part.value; });
      var time = ('0' + p.hour).slice(-2) + ':' + p.minute + ':' + p.second;
      var tail = (p.dayPeriod || '').toUpperCase() + ' ' + (p.timeZoneName || '');
      hms.innerHTML = cells(time);
      suffix.textContent = tail;
      clock.setAttribute('datetime', now.toISOString());
      // Screen readers get the time once a minute, not a chatter of seconds.
      var minuteKey = p.hour + p.minute;
      if (minuteKey !== lastMinute) { lastMinute = minuteKey; sr.textContent = 'Los Angeles time ' + p.hour + ':' + p.minute + ' ' + tail; }
      if (dot) { dot.classList.remove('is-tick'); void dot.offsetWidth; dot.classList.add('is-tick'); }
      setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    tick();
  }
})();
