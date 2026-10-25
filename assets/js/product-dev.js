// DEADWORK — shared behavior for the five in-development product pages: one quiet entrance for
// the whole composition (logo/slogan/problem/solution/email), once, respecting reduced motion.
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var el = document.querySelector('.dev-reveal');
  if (!el) return;
  if (reduce) { el.classList.add('is-in'); return; }
  requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('is-in'); }); });
})();
