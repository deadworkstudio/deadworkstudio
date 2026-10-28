// DEADWORK — Round 5 / B: One-Line Roster. Presentation only, no dependencies.
// 1) Hero video   — the live home.js mechanism: nothing fetched under reduced motion.
// 2) Mega-menus   — same contract as round4/b-split-editorial (click/keyboard, Escape, outside click).
// 3) Fit-to-frame — every headline is sized to fill its cell exactly, so the page never grows.
// 4) Sheets       — a roster name swaps its sheet into the statement's cell; hash + back button in sync.
// 5) LA clock     — time only, America/Los_Angeles, PDT/PST; fixed-width digits; 60-step gate.
// Signups are handled by the shared assets/js/notify.js.
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var locked = matchMedia('(min-width: 900px) and (min-height: 620px)');
  var frame = document.querySelector('[data-frame]');
  var each = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };

  /* ------------------------------------------------------------------ 1. Hero video */
  var hero = document.querySelector('[data-hero-video]');
  if (hero && !reduce.matches) {
    var source = document.createElement('source');
    source.src = innerWidth <= 800 ? hero.dataset.srcMobile : hero.dataset.src;
    source.type = 'video/mp4';
    hero.appendChild(source);
    // fade in only once frames are actually playing: no black flash after the poster
    hero.addEventListener('playing', function () { hero.classList.add('is-playing'); }, { once: true });
    hero.preload = 'auto';
    hero.load();
    var playing = hero.play();
    if (playing && playing.catch) playing.catch(function () {});
  }

  /* ------------------------------------------------------------------ 2. Mega-menus */
  var masthead = document.querySelector('[data-masthead]');
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
  document.addEventListener('click', function (e) {
    if (openKey && !masthead.contains(e.target)) closeMenu(false);
  });
  masthead.addEventListener('focusout', function (e) {
    if (openKey && e.relatedTarget && !masthead.contains(e.relatedTarget)) closeMenu(false);
  });

  /* ------------------------------------------------------------------ 3. Fit-to-frame */
  // On a locked (desktop) frame each headline gets the largest size at which it fits its cell
  // in both width and height. Taglines are capped at the statement's size so the brand line is
  // always the loudest thing on the page. Unlocked (phones/tablets) falls back to CSS sizes.
  var fits = Array.prototype.slice.call(document.querySelectorAll('[data-fit-text]'));
  var statement = document.querySelector('.headline--statement');
  function fitOne(el, cap) {
    var box = el.parentElement;
    var w = box.clientWidth, h = box.clientHeight;
    if (!w || !h) return 0;
    // the statement's lines are overflow-masked (for the entrance), so check each line too
    var lines = Array.prototype.slice.call(el.querySelectorAll('.line'));
    var fitsNow = function () {
      if (el.scrollWidth > w + 0.5 || el.offsetHeight > h) return false;
      return lines.every(function (l) { return l.scrollWidth <= l.clientWidth + 0.5; });
    };
    var lo = 24, hi = cap;
    for (var i = 0; i < 14; i++) {
      var mid = (lo + hi) / 2;
      el.style.fontSize = mid + 'px';
      if (fitsNow()) lo = mid; else hi = mid;
    }
    el.style.fontSize = Math.floor(lo) + 'px';
    return Math.floor(lo);
  }
  function fitAll() {
    if (!locked.matches) { fits.forEach(function (el) { el.style.fontSize = ''; }); return; }
    var top = fitOne(statement, 320);
    fits.forEach(function (el) { if (el !== statement) fitOne(el, top || 320); });
  }
  var fitTimer;
  addEventListener('resize', function () { clearTimeout(fitTimer); fitTimer = setTimeout(fitAll, 60); });
  fitAll();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);

  /* ------------------------------------------------------------------ 4. Sheets */
  var stage = document.querySelector('[data-stage]');
  var status = stage.querySelector('[data-stage-status]');
  var panels = {}, order = [];
  each('[data-panel]', function (p) {
    panels[p.dataset.panel] = p;
    if (p.dataset.panel !== 'home') order.push(p.dataset.panel);
  });
  var names = Array.prototype.slice.call(document.querySelectorAll('[data-target]'));
  var baseTitle = document.title;
  var current = 'home';
  var fromHash = function () { var k = decodeURIComponent(location.hash.slice(1)); return panels[k] ? k : 'home'; };

  // The ids only exist for the no-JS :target fallback; drop them so the browser's own hash
  // jump never fights the in-place swap.
  order.forEach(function (k) { panels[k].removeAttribute('id'); });

  function show(key, o) {
    o = o || {};
    current = key;
    Object.keys(panels).forEach(function (k) {
      var on = k === key;
      panels[k].classList.toggle('is-active', on);
      if (on) panels[k].removeAttribute('aria-hidden'); else panels[k].setAttribute('aria-hidden', 'true');
      if ('inert' in panels[k]) panels[k].inert = !on;
    });
    names.forEach(function (n) { n.dataset.target === key ? n.setAttribute('aria-current', 'true') : n.removeAttribute('aria-current'); });
    frame.classList.toggle('has-sheet', key !== 'home');
    var title = key === 'home' ? '' : panels[key].dataset.title;
    document.title = title ? 'DEADWORK — ' + title : baseTitle;
    if (o.announce) status.textContent = title ? title + ', shown' : '';
    if (o.push) history.pushState(null, '', key === 'home' ? location.pathname + location.search : '#' + key);
    if (o.focus && key !== 'home') panels[key].focus({ preventScroll: true });
    // unlocked layouts show only the active panel, so its headline needs re-measuring
    if (!locked.matches) fitAll();
  }

  function closeSheet() {
    if (current === 'home') return;
    var from = current;
    var hadFocus = panels[from].contains(document.activeElement);
    show('home', { push: true, announce: true });
    var n = names.filter(function (x) { return x.dataset.target === from; })[0];
    if (hadFocus && n) n.focus({ preventScroll: true });
  }

  names.forEach(function (n) {
    n.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      closeMenu(false);
      // the chosen name toggles: click it again to return to the statement
      if (current === n.dataset.target) closeSheet();
      else show(n.dataset.target, { push: true, announce: true, focus: true });
    });
  });
  each('[data-close]', function (b) { b.addEventListener('click', closeSheet); });

  var reset = document.querySelector('[data-reset]');
  if (reset) reset.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    closeMenu(false);
    closeSheet();
  });

  // Escape: the open menu owns it first; never while typing in an email field.
  // ← → step through the six tools while a sheet is open.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (openKey) { closeMenu(true); return; }
      if (current !== 'home' && !e.target.closest('input')) closeSheet();
      return;
    }
    if (current === 'home' || openKey || e.target.closest('input, textarea, select')) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      var i = order.indexOf(current);
      show(order[(i + (e.key === 'ArrowRight' ? 1 : -1) + order.length) % order.length], { push: true, announce: true, focus: true });
    }
  });

  addEventListener('popstate', function () { show(fromHash(), { announce: true }); });
  addEventListener('hashchange', function () { show(fromHash(), { announce: true }); });
  show(fromHash());

  /* ------------------------------------------------------------------ 5. LA clock */
  var clock = document.querySelector('[data-live-clock]');
  if (clock && window.Intl) {
    var hms = clock.querySelector('[data-clock-hms]');
    var suffix = clock.querySelector('[data-clock-suffix]');
    var sr = clock.querySelector('[data-clock-sr]');
    var gate = document.querySelector('.clock-gate');
    var mark = document.querySelector('[data-clock-gate]');
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true, timeZoneName: 'short'
    });
    var cells = function (str) {
      return str.split('').map(function (ch, i) {
        if (ch === ':') return '<span class="c">:</span>';
        return '<span class="d' + (i > 5 ? ' s' : '') + '">' + ch + '</span>';
      }).join('');
    };
    var lastSec = -1;
    var tick = function () {
      var now = new Date();
      var p = {};
      fmt.formatToParts(now).forEach(function (part) { p[part.type] = part.value; });
      var time = ('0' + p.hour).slice(-2) + ':' + p.minute + ':' + p.second;
      var tail = (p.dayPeriod || '').toUpperCase() + ' ' + (p.timeZoneName || '');
      var sec = +p.second;
      hms.innerHTML = cells(time);
      suffix.textContent = tail;
      sr.textContent = 'Los Angeles time ' + time + ' ' + tail;
      clock.setAttribute('datetime', now.toISOString());
      // the gate mark sweeps forward each second and snaps back (no tween) at the minute
      if (gate && mark) {
        gate.classList.toggle('is-ticking', lastSec !== -1 && sec > lastSec);
        mark.style.setProperty('--sec', sec);
      }
      lastSec = sec;
      setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    tick();
  }
})();
