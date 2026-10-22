// DEADWORK site — shared on every page. Drives the four header tabs (Pre-Production, Production,
// Post-Production, Studio), each its own independent toggle over its own [data-nav-tab] wrapper
// (button + dropdown panel). Opening one tab's panel closes any other tab's panel that's
// currently open — standard single-open-at-a-time tab behavior. Closes on: toggle click, outside
// click, Escape, or clicking any link inside an open panel (including the home page's panel-swap
// words — this runs independently of assets/js/home.js, so it closes the dropdown regardless of
// whether the click also swaps a panel in place or triggers a real page navigation).
(function () {
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-nav-tab]'));
  if (!tabs.length) return;

  function triggerOf(tab) { return tab.querySelector('[data-nav-trigger]'); }
  function panelOf(tab) { return tab.querySelector('[data-nav-panel]'); }

  function isOpen(tab) {
    var trigger = triggerOf(tab);
    return !!trigger && trigger.getAttribute('aria-expanded') === 'true';
  }

  function close(tab, returnFocus) {
    if (!isOpen(tab)) return;
    var trigger = triggerOf(tab), panel = panelOf(tab);
    trigger.setAttribute('aria-expanded', 'false');
    panel.classList.remove('is-open');
    if (returnFocus) trigger.focus();
  }

  function closeOthers(tab) {
    tabs.forEach(function (t) { if (t !== tab) close(t, false); });
  }

  function open(tab) {
    closeOthers(tab);
    triggerOf(tab).setAttribute('aria-expanded', 'true');
    panelOf(tab).classList.add('is-open');
  }

  tabs.forEach(function (tab) {
    var trigger = triggerOf(tab), panel = panelOf(tab);
    if (!trigger || !panel) return;

    trigger.addEventListener('click', function () {
      if (isOpen(tab)) close(tab, false);
      else open(tab);
    });

    // Any link inside this tab's panel closes every tab — before navigation happens for a real
    // link, and alongside whatever other click handler (e.g. home.js's panel swap) also fires.
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a')) tabs.forEach(function (t) { close(t, false); });
    });
  });

  // Outside click: anything that isn't inside any currently-open tab (its trigger or its panel).
  document.addEventListener('click', function (e) {
    tabs.forEach(function (tab) {
      if (!isOpen(tab)) return;
      if (tab.contains(e.target)) return;
      close(tab, false);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    tabs.forEach(function (tab) { if (isOpen(tab)) close(tab, true); });
  });

  // Resize past/under a breakpoint shouldn't strand a dropdown open with stale layout.
  window.addEventListener('resize', function () {
    tabs.forEach(function (tab) { close(tab, false); });
  });
})();
