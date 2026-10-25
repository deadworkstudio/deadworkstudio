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
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && fromHash() !== 'default') show('default', { push: true }); });
  addEventListener('popstate', function () { show(fromHash(), { announce: true }); });
  addEventListener('hashchange', function () { show(fromHash(), { announce: true }); });
  show(fromHash());
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
