// Concept 01 — Editorial Minimalism
// Slow, soft reveals: elements fade up once as they enter the viewport. Items that enter in
// the same frame are lightly staggered (90ms). Reduced motion: no observer, everything shown.
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;

  var items = Array.prototype.slice.call(document.querySelectorAll('#main [data-reveal]'));
  if (!items.length) return;
  root.classList.add('ed-js');

  var STAGGER = 90, MAX_DELAY = 360;

  var io = new IntersectionObserver(function (entries) {
    var entering = entries.filter(function (e) { return e.isIntersecting; })
      .map(function (e) { return e.target; })
      .sort(function (a, b) { return items.indexOf(a) - items.indexOf(b); });
    entering.forEach(function (el, i) {
      el.style.setProperty('--ed-delay', Math.min(i * STAGGER, MAX_DELAY) + 'ms');
      el.classList.add('is-in');
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

  items.forEach(function (el) { io.observe(el); });
})();
