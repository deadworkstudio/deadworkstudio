// Concept 04 — Brutalist / Architectural
// Scroll reveal: slabs slide into place once, as they enter the viewport. Transform/opacity only.
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return; // everything simply stays visible

  var els = document.querySelectorAll('[data-b4-slab], [data-b4-rule]');
  if (!els.length) return;
  document.documentElement.classList.add('b4-js');

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

  Array.prototype.forEach.call(els, function (el) { io.observe(el); });
})();
