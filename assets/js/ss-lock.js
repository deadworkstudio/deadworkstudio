/* Stock Shredder Remote: the phone recording turns into the lock screen, Apple Watch beside it.
   Loop while on screen:
     1. the recording plays (approve, then GO)                      step 1
     2. at LOCK_AT the phone "locks": the export card lands on the
        lock screen and counts 0 -> 40 clips, smoothly, every frame   step 2
     3. at 20% the Apple Watch card joins and counts along          step 3
     4. hold on 40/40, unlock, start the recording again.
   Mirrors the iPhone app's Live Activity (percent, X/40, "m:ss left").
   Reduced motion: the recording stays as its still, the watch shows 12/40, all steps on. */
(function () {
  var row = document.querySelector('[data-lockrow]');
  if (!row) return;
  var video = row.querySelector('[data-lock-video]');
  var flow = document.querySelector('.lockflow');
  var steps = flow ? flow.querySelectorAll('li') : [];
  var lang = document.documentElement.lang || 'en';
  try {
    var d = new Date();
    var fmt = new Intl.DateTimeFormat(lang, { weekday: 'long', month: 'long', day: 'numeric' }).format(d);
    var t = new Intl.DateTimeFormat(lang, { hour: 'numeric', minute: '2-digit' }).format(d).replace(/\s?[AaPp]\.?[Mm]\.?$/, '');
    row.querySelectorAll('[data-lock-date]').forEach(function (el) { el.textContent = fmt; });
    row.querySelectorAll('[data-lock-time]').forEach(function (el) { el.textContent = t; });
  } catch (e) {}

  var TOTAL = 40, EXPORT_SECONDS = 360;          // what the card says: 40 clips, about 6 minutes
  var LOCK_AT = 5.0, LAND_MS = 700, RUN_MS = 9000, WATCH_AT = 0.2, HOLD_MS = 2400;
  var tpl = row.getAttribute('data-left-tpl') || '%@ left';
  var pctEls = row.querySelectorAll('[data-la-pct]'), fillEls = row.querySelectorAll('[data-la-fill]');
  var leftEls = row.querySelectorAll('[data-la-left]'), rolls = row.querySelectorAll('[data-la-done]');
  var last = { pct: -1, left: '', done: -1 };

  function mmss(s) { var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
  function roll(el, text, animate) {
    var cur = el.querySelector('span:not(.out)');
    el.querySelectorAll('.out').forEach(function (o) { o.remove(); });
    if (!animate || !cur) { el.classList.remove('go'); el.innerHTML = '<span>' + text + '</span>'; return; }
    el.classList.remove('go');
    el.querySelectorAll('.in').forEach(function (n) { n.classList.remove('in'); });
    cur = el.querySelector('span');
    var nx = document.createElement('span'); nx.className = 'in'; nx.textContent = text; el.appendChild(nx);
    void el.offsetWidth;
    cur.classList.add('out'); el.classList.add('go');
    setTimeout(function () { if (cur.parentNode) cur.remove(); }, 220);
  }
  function paint(f, animate) {
    var pct = Math.floor(f * 100), done = Math.floor(f * TOTAL + 1e-9), left = tpl.replace('%@', mmss(Math.ceil((1 - f) * EXPORT_SECONDS)));
    fillEls.forEach(function (el) { el.style.transform = 'scaleX(' + f.toFixed(4) + ')'; });
    if (pct !== last.pct) { pctEls.forEach(function (el) { el.textContent = pct + '%'; }); last.pct = pct; }
    if (left !== last.left) { leftEls.forEach(function (el) { el.textContent = left; }); last.left = left; }
    if (done !== last.done) { rolls.forEach(function (el) { roll(el, String(done), animate); }); last.done = done; }
  }
  function step(n) {
    row.classList.toggle('is-s2', n >= 2);
    row.classList.toggle('is-s3', n >= 3);
    steps.forEach(function (li) {
      var k = +li.getAttribute('data-step');
      li.classList.toggle('is-on', n === 1 ? k === 1 : k >= 2 && k <= n);
    });
  }

  paint(0.3, false);
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !video || !('IntersectionObserver' in window)) {
    row.classList.add('is-s3');
    steps.forEach(function (li) { li.classList.add('is-on'); });
    return;
  }
  row.classList.add('is-anim'); if (flow) flow.classList.add('is-anim');

  var phase = 'video', t0 = 0, raf = 0, visible = false;
  function startVideo() {
    phase = 'video'; row.classList.remove('is-locked'); step(1);
    try { video.currentTime = 0; } catch (e) {}
    var p = video.play(); if (p && p.catch) p.catch(function () {});
  }
  function lock(now) {
    phase = 'lock'; t0 = now; video.pause();
    paint(0, false); row.classList.add('is-locked'); step(1);
  }
  function frame(now) {
    raf = 0; if (!visible) return;
    if (phase === 'video') {
      if (video.currentTime >= LOCK_AT || video.ended) lock(now);
    } else {
      var el = now - t0;
      if (el >= LAND_MS * .6 && !row.classList.contains('is-s2')) step(2);
      var f = Math.max(0, Math.min(1, (el - LAND_MS) / RUN_MS));
      paint(f, true);
      if (f >= WATCH_AT && !row.classList.contains('is-s3')) step(3);
      if (el > LAND_MS + RUN_MS + HOLD_MS) startVideo();
    }
    raf = requestAnimationFrame(frame);
  }
  new IntersectionObserver(function (es) {
    visible = es[0].isIntersecting;
    if (visible) {
      if (phase === 'video') { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
      else t0 = performance.now() - Math.min(performance.now() - t0, LAND_MS + RUN_MS); // resume where it was
      if (!raf) raf = requestAnimationFrame(frame);
    } else { video.pause(); }
  }, { threshold: 0.3 }).observe(row);
  step(1);
})();
