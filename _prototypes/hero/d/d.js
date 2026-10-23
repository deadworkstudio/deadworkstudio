// Direction D behaviour: hero plate variants (review aid), smart navigation, the phone tools sheet,
// and one section entrance. No libraries.
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- hero plate variants: ?plate=engine|set|light|video (default: set) ----
  var PLATES = {
    engine: { still: '../../../assets/img/products/stock-shredder/bg.jpg', cap: 'DW–06 — Stock Shredder — Post-production — Beta' },
    set: { still: '../shared/media/plate-set.jpg', cap: 'On set — Los Angeles' },
    light: { still: '../shared/media/plate-light.jpg', cap: 'On set — Los Angeles' },
    video: { still: '../shared/media/poster-portrait-1080.jpg', video: '../shared/media/plate-video-1080.mp4', cap: 'On set — Los Angeles — 2026' }
  };
  var key = new URLSearchParams(location.search).get('plate');
  if (!PLATES[key]) key = 'set';
  var plate = PLATES[key];
  var still = document.querySelector('[data-plate-still]');
  var video = document.querySelector('[data-plate-video]');
  var cap = document.querySelector('[data-plate-cap]');
  if (still) still.src = plate.still;
  if (cap) cap.textContent = plate.cap;
  document.querySelectorAll('[data-plate-opt]').forEach(function (a) { if (a.dataset.plateOpt === key) a.setAttribute('aria-current', 'true'); });
  if (plate.video && video && !reduce) {
    video.hidden = false;
    video.src = plate.video;
    video.addEventListener('playing', function () { video.classList.add('is-playing'); }, { once: true });
    var p = video.play(); if (p && p.catch) p.catch(function () {});
  }

  // ---- smart navigation: visible at load, hides on a deliberate scroll down, returns on scroll up ----
  var dh = document.querySelector('[data-dh]');
  if (dh) {
    var lastY = window.scrollY, acc = 0, ticking = false;
    var HIDE_AFTER = 120;   // never hide while the header is still over the top of the page
    var THRESHOLD = 10;     // px of travel in one direction before acting (filters wobble)
    var CONDENSE_AT = 24;
    function apply() {
      var y = window.scrollY, dy = y - lastY;
      lastY = y; ticking = false;
      dh.classList.toggle('is-condensed', y > CONDENSE_AT);
      if (y <= HIDE_AFTER) { dh.classList.remove('is-hidden'); acc = 0; return; }
      if (dy > 0) { acc = Math.max(acc, 0) + dy; if (acc > THRESHOLD) dh.classList.add('is-hidden'); }
      else if (dy < 0) { acc = Math.min(acc, 0) + dy; if (-acc > THRESHOLD) dh.classList.remove('is-hidden'); }
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(apply); } }, { passive: true });
    // Keyboard users tabbing into the header always get it back.
    dh.addEventListener('focusin', function () { dh.classList.remove('is-hidden'); });
    apply();
  }

  // ---- phone tools sheet ----
  var btn = document.querySelector('[data-dh-toggle]');
  var sheet = document.querySelector('[data-dh-sheet]');
  if (btn && sheet) {
    function setOpen(open) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      sheet.hidden = !open;
      document.body.classList.toggle('dh-open', open);
      if (open) { dh.classList.remove('is-hidden'); sheet.querySelector('a').focus(); } else { btn.focus(); }
    }
    btn.addEventListener('click', function () { setOpen(sheet.hidden); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) setOpen(false); });
    sheet.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    matchMedia('(min-width: 1024px)').addEventListener('change', function (m) { if (m.matches && !sheet.hidden) setOpen(false); });
  }

  // ---- one entrance for the system section ----
  var sections = document.querySelectorAll('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) { sections.forEach(function (s) { s.classList.add('is-in'); }); }
  else {
    var io = new IntersectionObserver(function (entries) { entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }); }, { rootMargin: '0px 0px -12% 0px' });
    sections.forEach(function (s) { io.observe(s); });
  }
})();
