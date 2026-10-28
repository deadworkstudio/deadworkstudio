// DEADWORK — Homepage (Refined Original direction). Presentation only, no dependencies. Signups are handled by the shared assets/js/notify.js.
(function () {
  var onReset = null;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var each = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };

  /* ------------------------------------------------------------------ Hero video */
  // The live home.js mechanism: nothing is fetched under reduced motion.
  var hero = document.querySelector('[data-hero-video]');
  if (hero && !reduce.matches) {
    var source = document.createElement('source');
    source.src = innerWidth <= 800 ? hero.dataset.srcMobile : hero.dataset.src;
    source.type = 'video/mp4';
    hero.appendChild(source);
    hero.addEventListener('playing', function () { hero.classList.add('is-playing'); }, { once: true });
    hero.preload = 'auto';
    hero.load();
    var playing = hero.play();
    if (playing && playing.catch) playing.catch(function () {});
  }

  /* ------------------------------------------------------------------ Nav tabs */
  // The Pre-Production / Production / Post-Production tabs and their mega-menu are the site's
  // own (nav-dropdown.js: opens on hover with a real mouse, click/keyboard/touch otherwise).
  // Opening a sheet or resetting just needs that menu closed.
  function closeMenu() {
    var open = document.querySelector('.mega-menu.is-open');
    if (open) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  }

  /* ------------------------------------------------------------------ Sheets */
  // Native <dialog>s; the hash keeps deep links (#scene-lock) and the back button working.
  var sheets = {};
  each('dialog.sheet', function (d) { sheets[d.id] = d; });
  var keyOf = function (id) { return id.replace(/^sheet-/, ''); };
  var opener = null;

  function openSheet(id, push) {
    var d = sheets[id];
    if (!d || d.open) return;
    Object.keys(sheets).forEach(function (k) { if (sheets[k].open) sheets[k].close(); });
    closeMenu(false);
    d.showModal();
    if (push) history.pushState(null, '', '#' + keyOf(id));
  }
  function sheetFromHash() {
    var k = decodeURIComponent(location.hash.slice(1));
    var id = sheets[k] ? k : sheets['sheet-' + k] ? 'sheet-' + k : null;
    if (id) openSheet(id, false);
    else Object.keys(sheets).forEach(function (s) { if (sheets[s].open) sheets[s].close(); });
  }
  each('[data-open]', function (b) {
    b.addEventListener('click', function () { opener = b; openSheet(b.dataset.open, true); });
  });
  Object.keys(sheets).forEach(function (id) {
    var d = sheets[id];
    d.addEventListener('close', function () {
      if (location.hash.slice(1) === keyOf(id)) history.pushState(null, '', location.pathname + location.search);
      if (opener) { opener.focus({ preventScroll: true }); opener = null; }
    });
    // a click on the backdrop (the dialog box itself, outside its panel) closes it
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    d.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', function () { d.close(); }); });
  });
  addEventListener('popstate', sheetFromHash);
  addEventListener('hashchange', sheetFromHash);
  sheetFromHash();

  var reset = document.querySelector('[data-reset]');
  if (reset) reset.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    closeMenu(false);
    Object.keys(sheets).forEach(function (s) { if (sheets[s].open) sheets[s].close(); });
    if (typeof onReset === 'function') onReset();
    scrollTo(0, 0);
  });

  /* ------------------------------------------------------------------ LA clock */
  // The footer clock as it always looked: plain mono time, America/Los_Angeles, PDT/PST.
  // No date. data-home-clock (not data-live-clock) so main.js doesn't write the date back in.
  var clock = document.querySelector('[data-home-clock]');
  if (clock && window.Intl) {
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true, timeZoneName: 'short'
    });
    var tick = function () {
      clock.textContent = fmt.format(new Date());
      setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    tick();
  }
})();
