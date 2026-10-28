// DEADWORK — Round 2 / A: Cinematic Studio + Reel Index. Presentation only: hero video loading,
// the nav mega-menus, scroll reveals, the smart header, the reel index (state, scroll-spy,
// segment progress) and the slate clock. Signups are handled by the site's shared
// assets/js/notify.js, untouched.
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var root = document.documentElement;
  if (location.hash) root.classList.add('no-intro');

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
     4b. Reel index — one sticky bar, three states:
         hero   (top of page, sitting in the opening's lower letterbox)
         docked (stuck to the bottom of the screen while you read)
         landed (at rest above the slate footer)
         Plus: scroll-spy (aria-current on the product in view, stage header lit), a
         per-product segment line that fills as you read that product's scene, a reel that
         turns with scroll, and on phones a slimmer bar while scrolling down.
     --------------------------------------------------------------------------------------- */
  var index = document.querySelector('[data-reel-index]');
  var footer = document.querySelector('.foot');
  var reel = document.querySelector('[data-ri-reel]');
  var narrow = matchMedia('(max-width: 819px)');
  var links = Array.prototype.slice.call(document.querySelectorAll('[data-ri-link]'));
  var items = links.map(function (a) {
    return { link: a, scene: document.getElementById(a.dataset.riLink), seg: a.querySelector('.ri-seg span'), p: -1 };
  });
  var rails = {};
  Array.prototype.forEach.call(document.querySelectorAll('[data-ri-rail]'), function (r) { rails[r.dataset.riRail] = r; });
  var chapters = [
    { key: 'pre', el: document.getElementById('chapter-pre') },
    { key: 'production', el: document.getElementById('chapter-production') },
    { key: 'post', el: document.getElementById('chapter-post') }
  ];
  var indexLastY = scrollY, activeId = null, activeRail = null, rTicking = false;

  function updateIndex() {
    rTicking = false;
    if (!index) return;
    var y = scrollY, vh = innerHeight, mid = vh * 0.5;

    // State. "Landed" = the bar's natural slot (directly above the footer) is on screen.
    var landed = footer && y + vh >= footer.offsetTop - 1;
    var state = landed ? 'landed' : (y > 24 ? 'docked' : 'hero');
    if (index.dataset.state !== state) index.dataset.state = state;

    // Phones: slim down while scrolling down, full bar back on any scroll up.
    if (narrow.matches && state === 'docked') {
      if (y > indexLastY + 6) index.classList.add('is-compact');
      else if (y < indexLastY - 6) index.classList.remove('is-compact');
    } else {
      index.classList.remove('is-compact');
    }
    indexLastY = y;

    // Segment progress + which product is in the frame.
    var nextId = null;
    items.forEach(function (it) {
      if (!it.scene) return;
      var r = it.scene.getBoundingClientRect();
      var p = Math.min(1, Math.max(0, (mid - r.top) / r.height));
      if (state === 'landed') p = 1; // reached the end: the whole reel has played
      if (Math.abs(p - it.p) > 0.002) { it.p = p; it.seg.style.setProperty('--p', p.toFixed(4)); }
      if (r.top <= mid && r.bottom > mid) nextId = it.link.dataset.riLink;
    });
    if (nextId !== activeId) {
      links.forEach(function (a) {
        if (a.dataset.riLink === nextId) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      });
      activeId = nextId;
    }

    // Stage header lights for the whole chapter (title card included).
    var nextRail = null;
    chapters.forEach(function (c) {
      if (!c.el) return;
      var r = c.el.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) nextRail = c.key;
    });
    if (nextRail !== activeRail) {
      Object.keys(rails).forEach(function (k) { rails[k].classList.toggle('is-active', k === nextRail); });
      activeRail = nextRail;
    }

    // The reel turns with the film. Decorative, so it stays still for reduced motion.
    if (reel && !reduce.matches) reel.style.setProperty('--reel', (y * 0.18).toFixed(1) + 'deg');
  }
  if (index) {
    addEventListener('scroll', function () {
      if (!rTicking) { rTicking = true; requestAnimationFrame(updateIndex); }
    }, { passive: true });
    addEventListener('resize', updateIndex);
    addEventListener('load', updateIndex);
    updateIndex();
    // Any interaction with the bar brings the full bar back on phones.
    index.addEventListener('focusin', function () { index.classList.remove('is-compact'); });
    index.addEventListener('pointerenter', function () { index.classList.remove('is-compact'); });
  }

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
        if (el.classList.contains('billing-grid')) {
          setTimeout(function () { el.classList.add('is-settled'); }, 1800);
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
      setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    tick();
  }
})();
