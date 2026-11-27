// "Real footage" on the Stock Shredder page: the 42-clip wall fills in left to right the first time it is seen,
// and the raw/graded compare slider. Without JS (or IntersectionObserver) the wall simply shows.
(function () {
  document.querySelectorAll('[data-nyc-compare]').forEach(function (box) {
    var range = box.querySelector('input[type=range]');
    if (!range) return;
    var set = function (v) { box.style.setProperty('--pos', v + '%'); };
    range.addEventListener('input', function () { set(range.value); });
    set(range.value);
  });
  var grid = document.querySelector('[data-nyc-grid]');
  if (!grid || !('IntersectionObserver' in window)) return;
  var cols = 6;
  Array.prototype.forEach.call(grid.querySelectorAll('img'), function (img, i) {
    // Left to right: each column a step later, rows only slightly offset.
    img.style.setProperty('--i', (i % cols) * 3 + Math.floor(i / cols));
  });
  grid.classList.add('is-armed');
  var io = new IntersectionObserver(function (es) {
    if (es[0].isIntersecting) { grid.classList.add('is-seen'); io.disconnect(); }
  }, { threshold: 0.25 });
  io.observe(grid);
})();
