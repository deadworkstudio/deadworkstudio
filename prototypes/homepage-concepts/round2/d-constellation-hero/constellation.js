// DEADWORK — Round 2 / D: Constellation Hero. Presentation only: hero video loading, the nav
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
     3. Wordmark = back to the constellation hero (the live site's data-panel-reset).
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
    // The hero's giant wordmark is the brand mark until it's mostly scrolled away.
    masthead.classList.toggle('is-over-hero', !!opening && y < opening.offsetHeight * 0.45);
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
  /* ---------------------------------------------------------------------------------------
     7. Constellation lines — one hairline from each product name into the wordmark, three
        converging on each side. Decorative only (aria-hidden). Measured with offset* values
        so the entrance transforms never skew the geometry; redrawn on resize/font load.
        Hidden on phones by CSS, where the names sit under the lock-up instead.
     --------------------------------------------------------------------------------------- */
  var field = document.querySelector('[data-constellation]');
  if (field) {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'constellation-lines');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    field.insertBefore(svg, field.firstChild);
    var core = field.querySelector('.constellation-core');
    var mark = field.querySelector('.constellation-mark');
    var stars = Array.prototype.slice.call(field.querySelectorAll('.star'));
    var groupsByStar = [];
    var drawn = false;

    var mk = function (tag, parent) { var el = document.createElementNS(NS, tag); parent.appendChild(el); return el; };
    var node = function (r, x, y) {
      r.setAttribute('x', (x - 2.5).toFixed(1)); r.setAttribute('y', (y - 2.5).toFixed(1));
      r.setAttribute('width', 5); r.setAttribute('height', 5);
    };
    // Build the elements once; draw() only moves them, so a re-measure (fonts, resize)
    // never restarts the draw-on.
    stars.forEach(function () {
      var g = mk('g', svg);
      groupsByStar.push({ g: g, line: mk('line', g), dot: mk('rect', g) });
    });
    var hubGroup = mk('g', svg), hubL = mk('rect', hubGroup), hubR = mk('rect', hubGroup);

    // Pure layout math (offsetTop/Left/Height) so the entrance transforms never skew it.
    var draw = function () {
      if (getComputedStyle(svg).display === 'none') return;
      svg.setAttribute('viewBox', '0 0 ' + field.clientWidth + ' ' + field.clientHeight);
      var cy = core.offsetTop + mark.offsetTop + mark.offsetHeight / 2;
      var gap = 18;
      var hubs = { left: core.offsetLeft - gap, right: core.offsetLeft + core.offsetWidth + gap };
      stars.forEach(function (star, i) {
        var li = star.parentNode;
        var col = li.parentNode;
        var isLeft = col.classList.contains('constellation-col--left');
        var cs = getComputedStyle(star);
        var nameMid = parseFloat(cs.paddingTop) + star.querySelector('.star-cat').offsetHeight +
          parseFloat(cs.rowGap || 0) + star.querySelector('.star-name').offsetHeight / 2;
        var sx = isLeft ? col.offsetLeft + col.offsetWidth + gap : col.offsetLeft - gap;
        var sy = col.offsetTop + li.offsetTop + nameMid;
        var hx = isLeft ? hubs.left : hubs.right;
        var l = groupsByStar[i].line;
        // drawn from the hub outward, so the draw-on reads as light leaving the logo
        l.setAttribute('x1', hx.toFixed(1)); l.setAttribute('y1', cy.toFixed(1));
        l.setAttribute('x2', sx.toFixed(1)); l.setAttribute('y2', sy.toFixed(1));
        var len = Math.hypot(sx - hx, sy - cy).toFixed(1);
        l.style.setProperty('--len', len);
        l.style.strokeDasharray = len;
        node(groupsByStar[i].dot, sx, sy);
      });
      node(hubL, hubs.left, cy); node(hubR, hubs.right, cy);
      if (!drawn) { drawn = true; if (!reduce.matches) svg.classList.add('is-drawing'); }
    };

    var light = function (idx) {
      groupsByStar.forEach(function (o, i) {
        var g = o.g;
        g.classList.toggle('is-lit', i === idx);
        g.classList.toggle('is-dim', idx !== -1 && i !== idx);
      });
    };
    stars.forEach(function (star, i) {
      star.addEventListener('mouseenter', function () { light(i); });
      star.addEventListener('mouseleave', function () { light(-1); });
      star.addEventListener('focus', function () { light(i); });
      star.addEventListener('blur', function () { light(-1); });
    });

    draw();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    addEventListener('load', draw);
    var rz;
    addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(draw, 120); });
  }
})();
