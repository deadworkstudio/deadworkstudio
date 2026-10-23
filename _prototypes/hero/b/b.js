// Prototype B: the four readouts count up once, after the product has risen into frame.
(function () {
  var nums = document.querySelectorAll('.readouts .num[data-count]');
  if (!nums.length) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function run(el) {
    var target = Number(el.dataset.count) || 0;
    if (reduce) { el.textContent = String(target); return; }
    var start = null, dur = 700;
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min(1, (ts - start) / dur);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  setTimeout(function () { nums.forEach(run); }, reduce ? 0 : 1000);
})();
