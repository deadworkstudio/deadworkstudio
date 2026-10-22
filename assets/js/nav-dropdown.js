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

  function open(key) {
    openGroupKey = key;
    setActiveGroup(key);
    menu.classList.add('is-open');
  }

  function close(returnFocusTrigger) {
    openGroupKey = null;
    menu.classList.remove('is-open');
    triggers.forEach(function (t) { t.setAttribute('aria-expanded', 'false'); });
    if (returnFocusTrigger) returnFocusTrigger.focus();
  }

  triggers.forEach(function (trigger) {
    var key = trigger.dataset.megaGroup;
    trigger.addEventListener('click', function () {
      if (isOpen() && openGroupKey === key) close(null);
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
        if (el.hasAttribute('data-nav-trigger')) open(el.dataset.megaGroup);
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

  // Resize past/under a breakpoint shouldn't strand the menu open with stale layout.
  window.addEventListener('resize', function () { close(null); });
})();
