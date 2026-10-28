// DEADWORK — Round 2 / B: Cinematic Studio, Editorial Scale. Presentation only: hero video loading, the nav
// mega-menus, scroll reveals, the smart header and the slate clock. Signups are handled by the
// site's shared assets/js/notify.js, untouched.
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var root = document.documentElement;

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
     2. Mega-menus — Pre-Production / Production / Post-Production. Click/tap or keyboard to
        open, same tab again / Escape / outside click / tabbing away to close.
     --------------------------------------------------------------------------------------- */
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
    masthead.classList.remove('is-hidden');
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
     3. Wordmark = back to the opening title card (the live site's data-panel-reset).
     --------------------------------------------------------------------------------------- */
  var reset = document.querySelector('[data-reset]');
  if (reset) reset.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    closeMenu(false);
    if (location.hash) history.pushState(null, '', location.pathname + location.search);
    scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
  });

  // Choosing a chapter/credit link closes any open menu first.
  Array.prototype.forEach.call(document.querySelectorAll('a[href^="#"]'), function (a) {
    a.addEventListener('click', function () { closeMenu(false); });
  });

  /* ---------------------------------------------------------------------------------------
     4. Smart header — solid once past the opening, tucks away while scrolling down through
        the reel, returns the moment you scroll up.
     --------------------------------------------------------------------------------------- */
  var opening = document.querySelector('.opening');
  var lastY = scrollY, ticking = false;
  function onScroll() {
    ticking = false;
    var y = scrollY;
    var pastOpening = opening ? y > opening.offsetHeight - masthead.offsetHeight : y > 40;
    masthead.classList.toggle('is-solid', pastOpening);
    if (!openKey) {
      if (y > lastY + 6 && pastOpening) masthead.classList.add('is-hidden');
      else if (y < lastY - 6 || !pastOpening) masthead.classList.remove('is-hidden');
    }
    lastY = y;
  }
  addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();
  // Keyboard users tabbing back up into the header must always see it.
  masthead.addEventListener('focusin', function () { masthead.classList.remove('is-hidden'); });

  /* ---------------------------------------------------------------------------------------
     5. Scroll reveals — dissolves, shutters, focus pulls. Only armed when motion is allowed;
        otherwise every element is simply visible.
     --------------------------------------------------------------------------------------- */
  var revealables = document.querySelectorAll('[data-reveal]');
  if (!reduce.matches && 'IntersectionObserver' in window) {
    root.classList.add('reveal-ready');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add('is-in');
        io.unobserve(el);
        if (el.classList.contains('roster-split')) {
          setTimeout(function () { el.classList.add('is-settled'); }, 2200);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });
    Array.prototype.forEach.call(revealables, function (el) { io.observe(el); });

    // Arriving on a deep link (e.g. #stock-shredder): show the target immediately rather than
    // making someone wait for a dissolve on the thing they came for.
    if (location.hash) {
      var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      var block = target && (target.closest('[data-reveal]') || target.querySelector('[data-reveal]'));
      if (block) block.classList.add('is-in');
    }
  }

  /* ---------------------------------------------------------------------------------------
     6. Slate clock — Los Angeles time only (no date), 12-hour, PDT/PST, ticking on the second.
     --------------------------------------------------------------------------------------- */
  var clock = document.querySelector('[data-live-clock]');
  if (clock && window.Intl) {
    var hms = clock.querySelector('.slate-clock-hms');
    var suffix = clock.querySelector('.slate-clock-suffix');
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true, timeZoneName: 'short'
    });
    var tick = function () {
      var now = new Date();
      var p = {};
      fmt.formatToParts(now).forEach(function (part) { p[part.type] = part.value; });
      var hour = ('0' + p.hour).slice(-2);
      hms.textContent = hour + ':' + p.minute + ':' + p.second;
      suffix.textContent = (p.dayPeriod || '').toUpperCase() + ' ' + (p.timeZoneName || '');
      clock.setAttribute('datetime', now.toISOString());
      // Frame marker: blinks on alternate seconds (CSS ignores this under reduced motion).
      clock.classList.toggle('is-odd', Number(p.second) % 2 === 1);
      setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    tick();
  }
})();
