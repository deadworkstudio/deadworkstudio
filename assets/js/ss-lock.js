/* Lock screen + Apple Watch workflow on the Stock Shredder page (Daniel 2026-11-19: "lets have the
   workflow, the clips going on the lockscreen ... clips going on the watch").
   Loop while in view: step 1 (approve + GO, empty lock screen) -> step 2 (the Live Activity card
   lands and counts 0 -> 40 clips) -> step 3 (the Apple Watch card joins at clip 8 and counts along)
   -> hold on 40/40, then start over. Mirrors the iPhone app's card: percent, X/40, "m:ss left".
   Reduced motion: static at 12/40 with no loop. */
(function () {
  var row = document.querySelector('[data-lockrow]');
  if (!row) return;
  var lang = document.documentElement.lang || 'en';
  try {
    var d = new Date();
    var fmt = new Intl.DateTimeFormat(lang, { weekday: 'long', month: 'long', day: 'numeric' }).format(d);
    var t = new Intl.DateTimeFormat(lang, { hour: 'numeric', minute: '2-digit' }).format(d).replace(/\s?[AaPp]\.?[Mm]\.?$/, '');
    row.querySelectorAll('[data-lock-date]').forEach(function (el) { el.textContent = fmt; });
    row.querySelectorAll('[data-lock-time]').forEach(function (el) { el.textContent = t; });
  } catch (e) {}
  var total = 40, done = 12, secPerClip = 9;
  var tpl = row.getAttribute('data-left-tpl') || '%@ left';
  var steps = row.querySelectorAll('.lockflow li');
  function mmss(s) { var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
  function each(sel, fn) { row.querySelectorAll(sel).forEach(fn); }
  function paint(tick) {
    var pct = Math.round(done / total * 100);
    each('[data-la-done]', function (el) { el.textContent = done; });
    each('[data-la-pct]', function (el) { el.textContent = pct + '%'; });
    each('[data-la-fill]', function (el) { el.style.width = pct + '%'; });
    each('[data-la-left]', function (el) { el.textContent = tpl.replace('%@', mmss((total - done) * secPerClip)); });
    if (tick) each('.la-count, .wa-pct', function (el) { el.classList.remove('is-tick'); void el.offsetWidth; el.classList.add('is-tick'); });
  }
  function step(n) {
    row.classList.toggle('is-s2', n >= 2);
    row.classList.toggle('is-s3', n >= 3);
    steps.forEach(function (li) {
      var k = +li.getAttribute('data-step');
      li.classList.toggle('is-on', n === 1 ? k === 1 : k >= 2 && k <= n);
    });
  }
  paint(false);
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    steps.forEach(function (li) { li.classList.add('is-on'); });
    return;
  }
  row.classList.add('is-anim');
  // One tick = 300 ms. 0-6 step 1, then the card lands; one clip per tick; watch joins at 8.
  var tick = 0, timer = null;
  function frame() {
    if (tick === 0) { done = 0; paint(false); step(1); }
    else if (tick === 6) step(2);
    else if (tick > 8 && done < total) { done++; paint(true); if (done === 8) step(3); }
    else if (done >= total && tick > 8) { if (!row._hold) row._hold = tick; if (tick - row._hold > 12) { row._hold = 0; tick = -1; } }
    tick++;
  }
  function run(on) { if (on && !timer) timer = setInterval(frame, 300); if (!on && timer) { clearInterval(timer); timer = null; } }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { run(es[0].isIntersecting); }, { threshold: 0.3 }).observe(row);
  } else run(true);
})();
