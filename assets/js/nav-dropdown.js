// DEADWORK site — shared on every page. Drives the four header tabs (Pre-Production, Production,
// Post-Production, Studio) against ONE shared full-width mega-menu panel (not four separate
// per-tab panels) — opening any tab shows the same panel element in the same place, just with
// that tab's own content (.mega-menu-group[data-mega-group]) swapped to active. Opening one tab
// always implies closing/replacing whichever other tab was open, since there's only one panel.
// Closes on: toggle click, outside click, Escape, or clicking any link inside the open panel
// (including the home page's panel-swap words — this runs independently of assets/js/home.js, so
// it closes the menu regardless of whether the click also swaps a panel in place or triggers a
// real page navigation).
(function () {
  var triggers = Array.prototype.slice.call(document.querySelectorAll('[data-nav-trigger]'));
  var menu = document.querySelector('[data-mega-menu]');
  if (!triggers.length || !menu) return;

  var groups = {};
  Array.prototype.slice.call(menu.querySelectorAll('[data-mega-group]')).forEach(function (g) {
    groups[g.dataset.megaGroup] = g;
  });

  var openGroupKey = null;
  // H-1: a real mouse opens the menu on hover (see canHover below), then the SAME click that
  // naturally follows a hover — the user resting the pointer on a tab and clicking it — used to
  // be read as "toggle it closed" because isOpen()+openGroupKey already matched that tab. Track
  // when hover opened it so a click in the moment right after is treated as "yes, keep it open"
  // rather than a toggle; a click long after (no intervening hover-open) still toggles normally,
  // and touch/keyboard users (canHover false) always just get the plain toggle below.
  var openedByHoverAt = 0;
  var HOVER_GRACE_MS = 400;

  function isOpen() { return menu.classList.contains('is-open'); }

  // Swapping which group is active while the panel stays open is an instant swap, not a timed
  // cross-fade — simpler, and avoids any chance of both groups being visible mid-transition.
  function setActiveGroup(key) {
    Object.keys(groups).forEach(function (k) {
      groups[k].classList.toggle('is-active', k === key);
    });
    triggers.forEach(function (t) {
      t.setAttribute('aria-expanded', t.dataset.megaGroup === key ? 'true' : 'false');
    });
  }

  function open(key, byHover) {
    // H-21: distinguish "opening the panel from closed" (should animate the cards in) from
    // "swapping the active group while the panel was already open" (sweeping the pointer from
    // Pre to Production to Post — should swap instantly, not re-run a 340ms keyframe per tab,
    // since keyframes always restart from 0 and can't be interrupted). .was-open reflects the
    // state BEFORE this call, so nav-v2.css/home-tabs.css can scope the entrance animation to
    // `.mega-menu:not(.was-open)` — true only on the first open of a session.
    var reopening = isOpen();
    openGroupKey = key;
    setActiveGroup(key);
    menu.classList.toggle('was-open', reopening);
    menu.classList.add('is-open');
    if (byHover) openedByHoverAt = Date.now();
  }

  function close(returnFocusTrigger) {
    openGroupKey = null;
    menu.classList.remove('is-open');
    menu.classList.remove('was-open');
    openedByHoverAt = 0;
    triggers.forEach(function (t) { t.setAttribute('aria-expanded', 'false'); });
    if (returnFocusTrigger) returnFocusTrigger.focus();
  }

  triggers.forEach(function (trigger) {
    var key = trigger.dataset.megaGroup;
    trigger.addEventListener('click', function () {
      var justOpenedByHover = isOpen() && openGroupKey === key && (Date.now() - openedByHoverAt) < HOVER_GRACE_MS;
      if (isOpen() && openGroupKey === key && !justOpenedByHover) close(null);
      else open(key);
    });
  });

  // Real mouse (not touch, which reports a kind of fake "hover" on tap in some browsers) opens on
  // hover, like Fear of God's own nav. The close is delayed slightly, and shared across every
  // trigger and the panel itself, so moving the pointer from a trigger down into the panel (or
  // sideways into another trigger) never closes the menu mid-move.
  var canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var closeTimer = null;

  if (canHover) {
    var hoverables = triggers.concat([menu]);
    hoverables.forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        clearTimeout(closeTimer);
        if (el.hasAttribute('data-nav-trigger')) open(el.dataset.megaGroup, true);
      });
      el.addEventListener('mouseleave', function () {
        // Clear any already-pending close before scheduling a new one — without this, sweeping
        // the pointer across more than one trigger in a row (each firing its own mouseleave)
        // leaves earlier timers orphaned: closeTimer only ever remembers the LATEST id, so an
        // ENTER's clearTimeout can cancel that one but not timers scheduled before it, and an
        // orphaned one firing later closes a menu you've since correctly reopened.
        clearTimeout(closeTimer);
        closeTimer = setTimeout(function () { close(null); }, 150);
      });
    });
  }

  // Any link inside the panel closes the menu — before navigation happens for a real link, and
  // alongside whatever other click handler (e.g. home.js's panel swap) also fires.
  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) close(null);
  });

  document.addEventListener('click', function (e) {
    if (!isOpen()) return;
    var withinTrigger = triggers.some(function (t) { return t.contains(e.target); });
    if (withinTrigger || menu.contains(e.target)) return;
    close(null);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !isOpen()) return;
    var activeTrigger = triggers.filter(function (t) { return t.dataset.megaGroup === openGroupKey; })[0];
    close(activeTrigger || null);
  });

  // Resize past/under a breakpoint shouldn't strand the menu open with stale layout — but on
  // phones, scrolling toggles the URL bar and fires a HEIGHT-only resize (no width change), which
  // would otherwise slam an open menu shut mid-scroll for no reason. Only close on a real width
  // change (rotating, or an actual breakpoint crossing).
  var lastWidth = window.innerWidth;
  window.addEventListener('resize', function () {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    close(null);
  });

  // Menu photos/logos load eagerly now (no more loading="lazy" popping in late once the panel is
  // already open) — fade each one in the moment it's actually ready instead of having it pop in
  // as a hard cut whenever that finishes, whether before or after the panel opens.
  Array.prototype.slice.call(menu.querySelectorAll('.mega-menu-card-photo, .mega-menu-card-logo')).forEach(function (img) {
    if (img.complete) { img.classList.add('is-loaded'); return; }
    img.addEventListener('load', function () { img.classList.add('is-loaded'); }, { once: true });
  });
})();

// Keyboard: the menu panel sits after every tab in the page, so Tab from an open stage would skip
// its products. From an open stage, Tab steps into that stage's plates; past the last plate it
// closes and moves on to the next tab; Shift+Tab from the first plate returns to its stage.
(function () {
  var triggers = [].slice.call(document.querySelectorAll('[data-nav-tab] .nav-tab-trigger'));
  var menu = document.querySelector('[data-mega-menu]'); if (!menu || !triggers.length) return;
  function links() { var g = menu.querySelector('.mega-menu-group.is-active'); return g && menu.classList.contains('is-open') ? [].slice.call(g.querySelectorAll('a[href]')) : []; }
  function openTrigger() { return document.querySelector('[data-nav-trigger][aria-expanded="true"]'); }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var a = document.activeElement, L = links(), open = openTrigger(); if (!open || !L.length) return;
    if (!e.shiftKey && a === open) { e.preventDefault(); L[0].focus(); return; }
    if (e.shiftKey && a === L[0]) { e.preventDefault(); open.focus(); return; }
    if (!e.shiftKey && a === L[L.length - 1]) {
      e.preventDefault();
      var next = triggers[triggers.indexOf(open) + 1];
      open.click();                                   // the same toggle a click uses: closes the panel
      (next || open).focus();
    }
  });
})();

