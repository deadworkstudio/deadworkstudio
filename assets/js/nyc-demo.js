// "Real footage" on the Stock Shredder page. One 5-10 s run the first time it scrolls into view:
// Takes and Minutes count up, then the 42 real clips appear one by one, left to right, while the Clips
// counter counts with them. Without JS, or with reduced motion, everything simply shows at rest.
(function () {
  document.querySelectorAll('[data-nyc-compare]').forEach(function (box) {
    var range = box.querySelector('input[type=range]');
    if (!range) return;
    var set = function (v) { box.style.setProperty('--pos', v + '%'); };
    range.addEventListener('input', function () { set(range.value); });
    set(range.value);
  });

  var run = document.querySelector('[data-nyc-run]');
  if (!run || !('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var tiles = Array.prototype.slice.call(run.querySelectorAll('.nyc-grid li'));
  var counts = Array.prototype.slice.call(run.querySelectorAll('[data-nyc-count]'));
  var clips = run.querySelector('[data-nyc-clips]');
  var replay = run.querySelector('[data-nyc-replay]');
  var cols = 6, timers = [];
  // Left to right: column by column, top to bottom inside each column.
  var order = tiles.map(function (_, i) { return i; }).sort(function (a, b) { return (a % cols) - (b % cols) || a - b; });

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function countUp(el, to, ms) {
    var t0 = performance.now();
    (function step(t) {
      var k = Math.min(1, (t - t0) / ms);
      el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) timers.push(requestAnimationFrame(step));
    })(t0);
  }
  function reset() {
    timers.forEach(function (t) { clearTimeout(t); cancelAnimationFrame(t); });
    timers = [];
    tiles.forEach(function (li) { li.classList.remove('is-on', 'is-flash'); });
    counts.forEach(function (el) { el.textContent = '0'; });
    if (clips) clips.textContent = '0';
  }
  function play() {
    reset();
    run.classList.add('is-armed', 'is-running');
    if (replay) replay.hidden = true;
    counts.forEach(function (el) { countUp(el, +el.getAttribute('data-nyc-count'), 900); });
    var start = 1000, step = 140; // 42 clips x 140 ms = about 6 s, about 7 s in all
    order.forEach(function (idx, n) {
      later(function () {
        var li = tiles[idx];
        li.classList.add('is-on', 'is-flash');
        later(function () { li.classList.remove('is-flash'); }, 120);
        if (clips) clips.textContent = String(n + 1);
      }, start + n * step);
    });
    later(function () {
      run.classList.remove('is-running');
      if (replay) replay.hidden = false;
    }, start + order.length * step + 300);
  }

  reset();
  run.classList.add('is-armed');
  var io = new IntersectionObserver(function (es) {
    if (es[0].isIntersecting) { io.disconnect(); play(); }
  }, { threshold: 0.4 });
  io.observe(run);
  if (replay) replay.addEventListener('click', play);
})();
