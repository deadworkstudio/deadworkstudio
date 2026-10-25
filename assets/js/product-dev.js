// DEADWORK — shared behavior for the five in-development product pages: one quiet entrance for
// the whole composition (logo/slogan/problem/solution/email), once, respecting reduced motion.
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var el = document.querySelector('.dev-reveal');
  if (!el) return;
  if (reduce) { el.classList.add('is-in'); return; }
  requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('is-in'); }); });
})();

// film block: full-resolution only on wide or high-density screens; plays only while on screen; still under reduced motion
(function () {
  var v = document.querySelector('[data-dev-film]'); if (!v) return;
  if (v.hasAttribute('data-hd') && window.innerWidth * (window.devicePixelRatio || 1) > 2000) { var s = v.querySelector('source'); if (s) { s.src = v.getAttribute('data-hd'); v.load(); } }
  if ((window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause(); }); }, { threshold: 0.15 }).observe(v);
})();
