// DEADWORK — home page only. Swaps the right-hand panel in place when a word in the left
// index is clicked (no scroll, no reload) in fixed "poster" mode, keeps the URL hash and back
// button in sync, and falls back to real navigation for everyone/everything else (no-JS,
// modifier-key clicks, middle-clicks). Contact shows its panel like any other word; the actual
// mailto: link only lives on the email address inside that panel.
(function () {
  var root = document.querySelector('[data-panels]'); if (!root) return;
  var index = document.querySelector('[data-index]'), status = root.querySelector('[data-panel-status]');
  var words = document.querySelectorAll('[data-panel-target]'), panels = {}, baseTitle = document.title;
  root.querySelectorAll('[data-panel]').forEach(function (p) { panels[p.dataset.panel] = p; });
  var fixed = matchMedia('(min-width:720px) and (min-height:640px)');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var fromHash = function () { var k = decodeURIComponent(location.hash.slice(1)); return panels[k] ? k : 'default'; };

  function show(key, o) {
    o = o || {};
    Object.keys(panels).forEach(function (k) { panels[k].classList.toggle('is-active', k === key); });
    words.forEach(function (w) { w.dataset.panelTarget === key ? w.setAttribute('aria-current', 'true') : w.removeAttribute('aria-current'); });
    if (index) index.classList.toggle('has-active', key !== 'default');   // the old word index is gone from the page
    var name = key === 'default' ? '' : (panels[key].dataset.title || '');
    document.title = name ? 'DEADWORK — ' + name : baseTitle;
    if (o.announce) status.textContent = name ? name + ', shown' : '';
    if (o.push) history.pushState(null, '', key === 'default' ? location.pathname + location.search : '#' + key);
    if (o.reveal && !fixed.matches && root.getBoundingClientRect().top > innerHeight * 0.6)
      root.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
  }

  words.forEach(function (w) {
    w.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      if (!w.hasAttribute('aria-current')) show(w.dataset.panelTarget, { push: true, announce: true, reveal: true });
    });
  });
  var reset = document.querySelector('[data-panel-reset]');
  if (reset) reset.addEventListener('click', function (e) { e.preventDefault(); if (fromHash() !== 'default') show('default', { push: true }); });
  // H-2: this Escape handler used to fire no matter where focus was, so pressing Escape while
  // typing in a panel's email field (a completely ordinary "never mind, let me reconsider" key
  // press) wiped the whole panel back to default — losing the typed email and the open product
  // along with it. Bail out when focus is in a form control (the field itself should keep
  // Escape's usual "clear/blur" behavior, not trigger navigation) or the mega-menu is open
  // (nav-dropdown.js already owns Escape for that case).
  //
  // This listener is registered on the CAPTURE phase deliberately. nav-dropdown.js isn't
  // deferred, so it runs (and registers its own Escape listener) before this deferred script
  // even exists — meaning its bubble-phase listener would always close the mega-menu first, and
  // the ".mega-menu.is-open" check below would see it already gone no matter how the two scripts
  // are ordered. Capture-phase listeners on document run before ANY bubble-phase listener on
  // document, regardless of registration order, so this always sees the menu's real state before
  // nav-dropdown.js's own (bubble-phase) handler has a chance to close it.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || fromHash() === 'default') return;
    if (e.target.closest('input, textarea, select, [data-mega-menu]')) return;
    if (document.querySelector('.mega-menu.is-open')) return;
    show('default', { push: true });
  }, true);
  addEventListener('popstate', function () { show(fromHash(), { announce: true }); });
  addEventListener('hashchange', function () { show(fromHash(), { announce: true }); });
  show(fromHash());
})();
