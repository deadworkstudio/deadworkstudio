// "Real footage" on the Stock Shredder page. An ~8 s loop while it's on screen:
// Takes and Minutes count up, the 42 real clips fill the wall left to right with the Clips counter,
// then the wall turns into the 32 takes as lines with the moments it kept shown in color (each one
// the clip's own frame), holds a few seconds, and starts over. Without JS, or with reduced motion,
// the finished wall simply shows at rest.
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
  var stage = run.querySelector('[data-nyc-stage]');
  var tiles = Array.prototype.slice.call(run.querySelectorAll('.nyc-grid li'));
  var counts = Array.prototype.slice.call(run.querySelectorAll('[data-nyc-count]'));
  var clips = run.querySelector('[data-nyc-clips]');

  // The real cut of the 32 takes: [take length s, [start s, length s] per clip], clips in wall order.
  var TAKES = [[13.2,[[0,13]]],[49.9,[[0,30],[30,19]]],[17.5,[[0,17]]],[26.9,[[2,24]]],[9.3,[[0,9]]],[58.1,[[0,28],[28,30]]],[30.2,[[0,30]]],[108.2,[[0,30],[30,30],[60,30],[90,18]]],[36.6,[[9,27]]],[15.1,[[0,15]]],[25.7,[[0,25]]],[16.5,[[8,8]]],[4.6,[]],[19.8,[[2,17]]],[13.1,[[0,13]]],[11.6,[[0,11]]],[14.3,[[0,14]]],[17.5,[[3,14]]],[37.1,[[2,30],[32,5]]],[36.9,[[0,30]]],[38.1,[[0,30],[30,8]]],[27.6,[[2,25]]],[61.7,[[2,5],[9,11],[26,28],[54,7]]],[40.7,[[0,30],[30,10]]],[21.2,[[0,21]]],[13.7,[[0,13]]],[24.9,[[0,24]]],[23.2,[[2,21]]],[33.5,[[0,30]]],[23.9,[[0,23]]],[23.6,[[0,23]]],[23.6,[[0,23]]]];
  var longest = 108.2, chips = [];
  if (stage) {
    var box = document.createElement('div');
    box.className = 'nyc-moments';
    box.setAttribute('aria-hidden', 'true');
    var k = 0, pct = function (s) { return (s / longest * 100).toFixed(2) + '%'; };
    TAKES.forEach(function (t, row) {
      var line = document.createElement('div');
      line.className = 'nyc-take';
      var raw = document.createElement('b');
      raw.style.width = pct(t[0]);
      line.appendChild(raw);
      t[1].forEach(function (c) {
        var img = tiles[k++] && tiles[k - 1].querySelector('img');
        var chip = document.createElement('i');
        chip.style.left = pct(c[0]);
        chip.style.width = pct(c[1]);
        chip.style.transitionDelay = (row * 22) + 'ms';
        if (img) chip.setAttribute('data-src', img.getAttribute('src'));
        chips.push(chip);
        line.appendChild(chip);
      });
      box.appendChild(line);
    });
    stage.appendChild(box);
  }

  var cols = 6, timers = [], live = false;
  // Left to right: column by column, top to bottom inside each column.
  var order = tiles.map(function (_, i) { return i; }).sort(function (a, b) { return (a % cols) - (b % cols) || a - b; });

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function countUp(el, to, ms) {
    var t0 = performance.now();
    (function step(t) {
      var f = Math.min(1, (t - t0) / ms);
      el.textContent = String(Math.round(to * (1 - Math.pow(1 - f, 3))));
      if (f < 1) timers.push(requestAnimationFrame(step));
    })(t0);
  }
  function stop() {
    timers.forEach(function (t) { clearTimeout(t); cancelAnimationFrame(t); });
    timers = [];
  }
  function reset() {
    stop();
    run.classList.remove('is-moments', 'is-fade');
    tiles.forEach(function (li) { li.classList.remove('is-on', 'is-flash'); });
    counts.forEach(function (el) { el.textContent = '0'; });
    if (clips) clips.textContent = '0';
  }
  function play() {
    reset();
    run.classList.add('is-armed', 'is-running');
    counts.forEach(function (el) { countUp(el, +el.getAttribute('data-nyc-count'), 600); });
    var start = 500, step = 50; // 42 clips x 50 ms: the wall fills in about 2 s
    order.forEach(function (idx, n) {
      later(function () {
        var li = tiles[idx];
        li.classList.add('is-on', 'is-flash');
        later(function () { li.classList.remove('is-flash'); }, 90);
        if (clips) clips.textContent = String(n + 1);
      }, start + n * step);
    });
    var filled = start + order.length * step;
    later(function () { run.classList.remove('is-running'); }, filled);
    later(function () {
      chips.forEach(function (c) {
        var src = c.getAttribute('data-src');
        if (src) { c.style.backgroundImage = 'url("' + src + '")'; c.removeAttribute('data-src'); }
      });
      run.classList.add('is-moments');
    }, filled + 700);
    later(function () { run.classList.add('is-fade'); }, filled + 700 + 4200);
    later(function () { if (live) play(); }, filled + 700 + 4200 + 450);
  }

  reset();
  run.classList.add('is-armed');
  new IntersectionObserver(function (es) {
    var on = es[0].isIntersecting;
    if (on && !live) { live = true; play(); }
    else if (!on && live) { live = false; stop(); }
  }, { threshold: 0.35 }).observe(run);
})();
