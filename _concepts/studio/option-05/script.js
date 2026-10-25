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
