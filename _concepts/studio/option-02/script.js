// Concept 02 — NASA / Industrial
// Each sheet powers on once when it scrolls into view. CSS owns all the motion; this only flips a class.
(function () {
  var sheets = document.querySelectorAll('[data-o2-reveal]');
  if (!sheets.length) return;

  function on(el) {
    if (el.classList.contains('is-on')) return;
    el.classList.add('is-on');
    // once the power-on stagger has run, drop the per-module delays so hover feels immediate
    setTimeout(function () { el.classList.add('is-settled'); }, 1200);
  }

  if (!('IntersectionObserver' in window)) { Array.prototype.forEach.call(sheets, on); return; }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) { on(entry.target); io.unobserve(entry.target); }
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });

  Array.prototype.forEach.call(sheets, function (el) { io.observe(el); });
})();
