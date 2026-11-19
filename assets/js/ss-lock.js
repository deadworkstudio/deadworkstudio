/* Lock screen + Apple Watch demo on the Stock Shredder page: counts an export from 12 to 40 clips
   while in view, then starts over. Mirrors the iPhone app's Live Activity (percent, X/Y clips,
   "m:ss left"). Static at 12/40 for reduced motion. */
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
  var total = 40, start = 12, done = start, secPerClip = 9;
  var tpl = row.getAttribute('data-left-tpl') || '%@ left';
  function mmss(s) { var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
  function paint() {
    var pct = Math.round(done / total * 100);
    row.querySelectorAll('[data-la-done]').forEach(function (el) { el.textContent = done; });
    row.querySelectorAll('[data-la-pct]').forEach(function (el) { el.textContent = pct + '%'; });
    row.querySelectorAll('[data-la-fill]').forEach(function (el) { el.style.width = pct + '%'; });
    row.querySelectorAll('[data-la-left]').forEach(function (el) { el.textContent = tpl.replace('%@', mmss((total - done) * secPerClip)); });
  }
  paint();
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var timer = null, hold = 0;
  function tick() {
    if (done >= total) { if (++hold > 3) { done = 0; hold = 0; paint(); } return; }
    done++; paint();
  }
  function run(on) { if (on && !timer) timer = setInterval(tick, 900); if (!on && timer) { clearInterval(timer); timer = null; } }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { run(es[0].isIntersecting); }, { threshold: 0.3 }).observe(row);
  } else run(true);
})();
