// Shared frame behaviour (from ss-page.js): header visible at load, hides on a deliberate
// scroll down, returns on scroll up; dropdown keeps it shown.
(function () {
  var sh = document.querySelector('[data-sh]');
  if (!sh) return;
  var lastY = window.scrollY, acc = 0, ticking = false, HIDE_AFTER = 120, THRESHOLD = 10;
  function apply() {
    var y = window.scrollY, dy = y - lastY; lastY = y; ticking = false;
    sh.classList.toggle('is-scrolled', y > 8);
    if (document.querySelector('.mega-menu.is-open')) return;
    if (y <= HIDE_AFTER) { sh.classList.remove('is-hidden'); acc = 0; return; }
    if (dy > 0) { acc = Math.max(acc, 0) + dy; if (acc > THRESHOLD) sh.classList.add('is-hidden'); }
    else if (dy < 0) { acc = Math.min(acc, 0) + dy; if (-acc > THRESHOLD) sh.classList.remove('is-hidden'); }
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(apply); } }, { passive: true });
  sh.addEventListener('focusin', function () { sh.classList.remove('is-hidden'); });
  apply();
})();

// Concept 05 — DEADWORK Evolved
// Quiet scroll reveals (opacity/transform only) and the film block's photo settle.
(function () {
  // opener film: plays only while on screen, and never under reduced motion (poster stays)
  var film = document.querySelector('[data-opener-film]');
  if (film && !matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { var p = film.play(); if (p && p.catch) p.catch(function () {}); } else film.pause(); }); }, { threshold: 0.1 }).observe(film);
  }
  var root = document.documentElement;
  if (!('IntersectionObserver' in window)) return;
  root.classList.add('js-reveal');

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

  // value rows that enter together cascade by 60ms
  var rows = document.querySelectorAll('.value-row');
  Array.prototype.forEach.call(rows, function (row, i) { row.style.transitionDelay = (i % 3) * 60 + 'ms'; });

  Array.prototype.forEach.call(document.querySelectorAll('[data-reveal], .film'), function (el) { io.observe(el); });

  // the photo fades in only once decoded, so it never paints half-loaded
  var img = document.querySelector('.film-img');
  if (img) {
    var done = function () { img.classList.add('is-loaded'); };
    if (img.complete && img.naturalWidth) done();
    else { img.addEventListener('load', done); img.addEventListener('error', done); }
  }
})();
