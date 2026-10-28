// DEADWORK — homepage prototype 01 (Refined Original). Plain JS, no dependencies.
// 1) Mega-menu tabs  — same behavior contract as assets/js/nav-dropdown.js (hover-intent on a real
//    mouse, click/keyboard/touch toggles, Escape, outside click, Tab walks into the open group).
// 2) Product sheets  — same contract as assets/js/home.js (in-place swap, URL hash + back button in
//    sync, modifier-clicks fall through to real navigation), plus a visible index, prev/next, close.
// 3) Hero video      — identical QA-21/H-15 mechanism: no bytes fetched under reduced motion.
// 4) LA clock        — time only (no date), America/Los_Angeles, PDT/PST resolved by Intl.
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var poster = document.querySelector('[data-poster]');

  /* ------------------------------------------------------------------ 1. Mega-menu */
  var triggers = [].slice.call(document.querySelectorAll('[data-nav-trigger]'));
  var menu = document.querySelector('[data-mega-menu]');
  var openKey = null, openedByHover = false, closeTimer = null;
  var groups = {};
  if (menu) [].slice.call(menu.querySelectorAll('[data-mega-group]')).forEach(function (g) { groups[g.dataset.megaGroup] = g; });

  function menuOpen() { return menu && menu.classList.contains('is-open'); }
  function openMenu(key, byHover) {
    var reopening = menuOpen();
    openKey = key;
    Object.keys(groups).forEach(function (k) { groups[k].classList.toggle('is-active', k === key); });
    triggers.forEach(function (t) { t.setAttribute('aria-expanded', t.dataset.megaGroup === key ? 'true' : 'false'); });
    menu.classList.toggle('was-open', reopening);
    menu.classList.add('is-open');
    openedByHover = !!byHover;
  }
  function closeMenu(focusEl) {
    if (!menu) return;
    openKey = null; openedByHover = false;
    menu.classList.remove('is-open', 'was-open');
    triggers.forEach(function (t) { t.setAttribute('aria-expanded', 'false'); });
    if (focusEl) focusEl.focus();
  }

  if (menu && triggers.length) {
    triggers.forEach(function (t) {
      t.addEventListener('click', function () {
        var key = t.dataset.megaGroup;
        if (menuOpen() && openKey === key) {
          if (openedByHover) { openedByHover = false; return; } // a click after hover confirms, never closes
          closeMenu(null);
        } else openMenu(key);
      });
    });

    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      triggers.concat([menu]).forEach(function (el) {
        el.addEventListener('mouseenter', function () {
          clearTimeout(closeTimer);
          if (el.hasAttribute('data-nav-trigger')) openMenu(el.dataset.megaGroup, true);
        });
        el.addEventListener('mouseleave', function () {
          clearTimeout(closeTimer);
          closeTimer = setTimeout(function () { if (openedByHover) closeMenu(null); }, 160);
        });
      });
    }

    menu.addEventListener('click', function (e) { if (e.target.closest('a')) closeMenu(null); });
    document.addEventListener('click', function (e) {
      if (!menuOpen()) return;
      if (triggers.some(function (t) { return t.contains(e.target); }) || menu.contains(e.target)) return;
      closeMenu(null);
    });
    document.addEventListener('keydown', function (e) {
      if (!menuOpen()) return;
      var active = triggers.filter(function (t) { return t.dataset.megaGroup === openKey; })[0];
      if (e.key === 'Escape') { closeMenu(active || null); return; }
      // Tab from the open tab steps into its cards; past the last card it moves on to the next tab
      if (e.key !== 'Tab' || !active) return;
      var links = [].slice.call(groups[openKey].querySelectorAll('a[href]'));
      var a = document.activeElement;
      if (!e.shiftKey && a === active) { e.preventDefault(); links[0].focus(); }
      else if (e.shiftKey && a === links[0]) { e.preventDefault(); active.focus(); }
      else if (!e.shiftKey && a === links[links.length - 1]) {
        e.preventDefault();
        var all = [].slice.call(document.querySelectorAll('.head .tab'));
        var next = all[all.indexOf(active) + 1];
        closeMenu(null);
        (next || active).focus();
      }
    });
    var lastW = innerWidth;
    addEventListener('resize', function () { if (innerWidth !== lastW) { lastW = innerWidth; closeMenu(null); } });
  }

  /* ------------------------------------------------------------------ 2. Product sheets */
  var root = document.querySelector('[data-panels]');
  if (root) {
    var status = root.querySelector('[data-panel-status]');
    var panels = {}, order = [];
    [].slice.call(root.querySelectorAll('[data-panel]')).forEach(function (p) {
      panels[p.dataset.panel] = p;
      if (p.dataset.panel !== 'default') order.push(p.dataset.panel);
    });
    var words = [].slice.call(document.querySelectorAll('[data-panel-target]'));
    var count = root.querySelector('[data-sheet-count]');
    var baseTitle = document.title;
    var stacked = matchMedia('(max-width: 639px)');
    var current = 'default';
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var fromHash = function () { var k = decodeURIComponent(location.hash.slice(1)); return panels[k] ? k : 'default'; };

    // Ids on the sheets exist only for the no-JS :target fallback; drop them so the browser's own
    // hash-jump never fights the in-place swap.
    order.forEach(function (k) { panels[k].removeAttribute('id'); });

    var show = function (key, o) {
      o = o || {};
      current = key;
      Object.keys(panels).forEach(function (k) {
        var on = k === key;
        panels[k].classList.toggle('is-active', on);
        if (on) panels[k].removeAttribute('aria-hidden'); else panels[k].setAttribute('aria-hidden', 'true');
        if ('inert' in panels[k]) panels[k].inert = !on;
      });
      words.forEach(function (w) { w.dataset.panelTarget === key ? w.setAttribute('aria-current', 'true') : w.removeAttribute('aria-current'); });
      poster.classList.toggle('has-sheet', key !== 'default');
      if (count && key !== 'default') count.textContent = pad(order.indexOf(key) + 1) + ' / ' + pad(order.length);
      var name = key === 'default' ? '' : (panels[key].dataset.title || '');
      document.title = name ? 'DEADWORK — ' + name : baseTitle;
      if (o.announce) status.textContent = name ? name + ', shown' : '';
      if (o.push) history.pushState(null, '', key === 'default' ? location.pathname + location.search : '#' + key);
      if (o.focus && key !== 'default') panels[key].focus({ preventScroll: true });
      // on a phone the sheet sits above the fold-line index; bring it into view
      if (o.reveal && stacked.matches) root.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
    };

    words.forEach(function (w) {
      w.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        if (current !== w.dataset.panelTarget) show(w.dataset.panelTarget, { push: true, announce: true, reveal: true });
      });
    });

    [].slice.call(root.querySelectorAll('[data-panel-step]')).forEach(function (b) {
      b.addEventListener('click', function () {
        var i = order.indexOf(current); if (i < 0) return;
        var n = order[(i + +b.dataset.panelStep + order.length) % order.length];
        show(n, { push: true, announce: true });
      });
    });

    var goHome = function () {
      var from = current;
      if (from === 'default') return;
      // if focus was inside the sheet being closed, hand it back to that tool's index entry
      var hadFocus = root.contains(document.activeElement);
      show('default', { push: true, announce: true });
      var w = words.filter(function (x) { return x.dataset.panelTarget === from; })[0];
      if (hadFocus && w) w.focus({ preventScroll: true });
    };
    var closeBtn = root.querySelector('[data-panel-close]');
    if (closeBtn) closeBtn.addEventListener('click', goHome);
    var reset = document.querySelector('[data-panel-reset]');
    if (reset) reset.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault(); goHome();
    });

    // Escape closes a sheet — but never while typing in its email field, and never while the
    // mega-menu is open (the menu owns Escape then). Capture phase so it sees the menu's real state.
    document.addEventListener('keydown', function (e) {
      if (current === 'default') return;
      if (e.key === 'Escape') {
        if (e.target.closest('input, textarea, select, [data-mega-menu]') || menuOpen()) return;
        goHome();
      } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.target.closest('input, textarea, select')) {
        var i = order.indexOf(current);
        show(order[(i + (e.key === 'ArrowRight' ? 1 : -1) + order.length) % order.length], { push: true, announce: true });
      }
    }, true);

    addEventListener('popstate', function () { show(fromHash(), { announce: true }); });
    addEventListener('hashchange', function () { show(fromHash(), { announce: true }); });
    show(fromHash());
  }

  /* ------------------------------------------------------------------ 3. Hero video */
  // No <source>/autoplay in the markup, so nothing is fetched by default. Under reduced motion the
  // poster frame is the whole experience; otherwise attach the right rendition and fade it in only
  // once it is actually playing (no black flash between poster and first frame).
  var hero = document.querySelector('[data-hero-video]');
  if (hero && !reduce.matches) {
    var source = document.createElement('source');
    source.src = innerWidth <= 800 ? hero.dataset.srcMobile : hero.dataset.src;
    source.type = 'video/mp4';
    hero.appendChild(source);
    hero.addEventListener('playing', function () { hero.classList.add('is-playing'); }, { once: true });
    hero.preload = 'auto';
    hero.load();
    var p = hero.play(); if (p && p.catch) p.catch(function () {});
  }

  /* ------------------------------------------------------------------ 4. LA clock */
  // Always studio time (America/Los_Angeles), never the visitor's. No aria-live: a per-second
  // announcement would only spam screen readers; the <time> carries a full readable label instead.
  var clock = document.querySelector('[data-clock]');
  if (clock && window.Intl) {
    var fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZoneName: 'short' });
    var elTime = clock.querySelector('[data-clock-time]');
    var elHM = clock.querySelector('[data-clock-hm]');
    var elS = clock.querySelector('[data-clock-s]');
    var elSuf = clock.querySelector('[data-clock-suffix]');
    var gate = clock.querySelector('.clock-gate');
    var mark = clock.querySelector('[data-clock-gate]');
    var lastSec = -1;
    var tick = function () {
      var parts = {};
      fmt.formatToParts(new Date()).forEach(function (x) { parts[x.type] = x.value; });
      var sec = +parts.second;
      elHM.textContent = parts.hour + ':' + parts.minute;
      elS.textContent = ':' + parts.second;
      elSuf.textContent = (parts.dayPeriod || '').toUpperCase() + ' ' + (parts.timeZoneName || '');
      elTime.setAttribute('aria-label', 'Los Angeles time ' + +parts.hour + ':' + parts.minute + ' ' + (parts.dayPeriod || '') + ' ' + (parts.timeZoneName || ''));
      // the mark sweeps forward each second, and snaps (no tween) when the minute rolls over
      gate.classList.toggle('is-ticking', lastSec !== -1 && sec > lastSec);
      mark.style.setProperty('--sec', sec);
      lastSec = sec;
    };
    tick();
    // align ticks to the real second boundary so the display never lags by most of a second
    setTimeout(function () { tick(); setInterval(tick, 1000); }, 1000 - (Date.now() % 1000) + 10);
  }
})();
