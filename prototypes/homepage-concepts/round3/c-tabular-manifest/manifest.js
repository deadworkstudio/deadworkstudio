// DEADWORK — Round 3 / C: Tabular Manifest. Presentation only: hero video loading, the nav
// mega-menus, the spec-sheet dialog for each manifest line, and the Los Angeles clock.
// Signups are handled by the site's shared assets/js/notify.js, untouched.
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');

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
    hero.addEventListener('playing', function () { hero.classList.add('is-playing'); }, { once: true });
    hero.load();
    var playing = hero.play();
    if (playing && playing.catch) playing.catch(function () {});
  }

  /* ---------------------------------------------------------------------------------------
     2. Mega-menus — click/tap or keyboard to open; same tab again / Escape / outside click /
        tabbing away to close. The menu overlays the sheet, so nothing below ever moves.
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
    if (wasHidden) requestAnimationFrame(function () { menu.classList.add('is-open'); });
  }
  function closeMenu(restoreFocus) {
    if (!openKey) return;
    var trigger = triggers.filter(function (t) { return t.dataset.menuTrigger === openKey; })[0];
    openKey = null;
    triggers.forEach(function (t) { t.setAttribute('aria-expanded', 'false'); });
    menu.classList.remove('is-open');
    menu.hidden = true;
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
     3. Spec sheet — each manifest line opens its full entry in a modal side sheet. The hash
        (#scene-lock etc.) stays the shareable address: arriving on it opens that entry.
     --------------------------------------------------------------------------------------- */
  var sheet = document.querySelector('[data-spec]');
  var panels = Array.prototype.slice.call(document.querySelectorAll('[data-entry-panel]'));
  var order = panels.map(function (p) { return p.dataset.entryPanel; });
  var names = {};
  var links = {};
  Array.prototype.forEach.call(document.querySelectorAll('[data-entry]'), function (a) {
    links[a.dataset.entry] = a;
    names[a.dataset.entry] = a.querySelector('.line-name').textContent;
  });
  var pos = document.querySelector('[data-spec-pos]');
  var prevLabel = document.querySelector('[data-spec-prev-label]');
  var nextLabel = document.querySelector('[data-spec-next-label]');
  var current = null;
  var opener = null;
  var supportsDialog = sheet && typeof sheet.showModal === 'function';

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function show(id) {
    var i = order.indexOf(id);
    if (i === -1) return;
    current = id;
    panels.forEach(function (p) { p.classList.toggle('is-active', p.dataset.entryPanel === id); });
    Object.keys(links).forEach(function (k) {
      if (k === id) links[k].setAttribute('aria-current', 'true'); else links[k].removeAttribute('aria-current');
    });
    var prev = order[(i - 1 + order.length) % order.length];
    var next = order[(i + 1) % order.length];
    pos.textContent = pad(i + 1) + ' / ' + pad(order.length);
    prevLabel.textContent = names[prev];
    nextLabel.textContent = names[next];
    sheet.setAttribute('aria-label', names[id] + ' specification');
    var active = panels[i];
    active.scrollTop = 0;
  }

  function openSheet(id, fromHash) {
    if (!supportsDialog || order.indexOf(id) === -1) return false;
    closeMenu(false);
    show(id);
    if (!sheet.open) {
      opener = fromHash ? null : document.activeElement;
      sheet.showModal();
      // Focus the close control rather than the first form field, so the keyboard never
      // pops on phones just from opening a spec.
      sheet.querySelector('[data-spec-close]').focus();
      if (!reduce.matches) requestAnimationFrame(function () { sheet.classList.add('is-in'); });
    }
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
    return true;
  }

  function closeSheet() {
    if (!sheet || !sheet.open) return;
    var finish = function () {
      sheet.close();
      if (current && links[current]) links[current].removeAttribute('aria-current');
      // Return focus to the line now on screen (the visitor may have stepped to another tool).
      var back = (current && links[current]) || opener;
      current = null;
      if (back && back.focus) back.focus();
      opener = null;
    };
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    if (reduce.matches || !document.documentElement.classList.contains('motion')) { sheet.classList.remove('is-in'); finish(); return; }
    sheet.classList.remove('is-in');
    setTimeout(finish, 240);
  }

  if (supportsDialog) {
    Object.keys(links).forEach(function (id) {
      links[id].addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        if (openSheet(id, false)) e.preventDefault();
      });
    });
    sheet.querySelector('[data-spec-close]').addEventListener('click', closeSheet);
    // Escape: animate out instead of the browser's instant close.
    sheet.addEventListener('cancel', function (e) { e.preventDefault(); closeSheet(); });
    // Clicking the dimmed backdrop (the dialog element itself, outside the panel) closes it.
    sheet.addEventListener('click', function (e) { if (e.target === sheet) closeSheet(); });
    Array.prototype.forEach.call(sheet.querySelectorAll('[data-spec-step]'), function (b) {
      b.addEventListener('click', function () {
        var i = order.indexOf(current);
        var next = order[(i + Number(b.dataset.specStep) + order.length) % order.length];
        show(next);
        history.replaceState(null, '', '#' + next);
      });
    });
    // Arrow keys step through the manifest while the sheet is open (not while typing).
    sheet.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        sheet.querySelector('[data-spec-step="' + (e.key === 'ArrowRight' ? 1 : -1) + '"]').click();
      }
    });

    var fromHash = function () {
      var id = decodeURIComponent(location.hash.slice(1));
      if (id && order.indexOf(id) !== -1) openSheet(id, true);
    };
    addEventListener('hashchange', fromHash);
    fromHash();
  } else {
    // Very old browsers without <dialog>: fall back to the no-JS in-page layout.
    document.documentElement.classList.remove('js');
  }

  /* ---------------------------------------------------------------------------------------
     4. Wordmark = back to the default view (the live site's data-panel-reset).
     --------------------------------------------------------------------------------------- */
  var reset = document.querySelector('[data-reset]');
  if (reset) reset.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    closeMenu(false);
    closeSheet();
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
  });

  /* ---------------------------------------------------------------------------------------
     5. Clock — Los Angeles time only (no date), 12-hour, PDT/PST, ticking on the second,
        with a 60-tick seconds rail. Updates under reduced motion too (it's information, not
        decoration); only the CSS transitions are dropped.
     --------------------------------------------------------------------------------------- */
  var clock = document.querySelector('[data-live-clock]');
  var rail = document.querySelector('[data-clock-ticks]');
  var ticks = [];
  if (rail) {
    for (var t = 0; t < 60; t++) ticks.push(rail.appendChild(document.createElement('span')));
  }
  if (clock && window.Intl) {
    var hms = clock.querySelector('[data-clock-hms]');
    var suffix = clock.querySelector('[data-clock-suffix]');
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true, timeZoneName: 'short'
    });
    var lastSec = -1;
    var tick = function () {
      var now = new Date();
      var p = {};
      fmt.formatToParts(now).forEach(function (part) { p[part.type] = part.value; });
      hms.textContent = ('0' + p.hour).slice(-2) + ':' + p.minute + ':' + p.second;
      suffix.textContent = (p.dayPeriod || '').toUpperCase() + ' ' + (p.timeZoneName || '');
      clock.setAttribute('datetime', now.toISOString());
      var s = Number(p.second);
      if (ticks.length && s !== lastSec) {
        ticks.forEach(function (el, i) {
          el.classList.toggle('is-past', i < s);
          el.classList.toggle('is-now', i === s);
        });
        lastSec = s;
      }
      setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    tick();
  }
})();
