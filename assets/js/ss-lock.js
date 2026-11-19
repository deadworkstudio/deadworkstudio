/* Stock Shredder Remote: the phone recording turns into the lock screen, then the phone and the
   Apple Watch slide apart to show both working together (Daniel 2026-11-19).
   Loop while on screen:
     1. phone in front, watch peeking from behind; the recording plays  step 1
     2. the moment the clip's playhead reaches the end of its timeline
        (LOCK_AT in the recording), the phone locks and the export
        card lands on the lock screen                                  step 2
     3. phone and watch slide apart; both count 0 -> 40 clips          step 3
     4. hold on 40/40, slide back together, unlock, play again.
   Mirrors the iPhone app's Live Activity (percent, X/40, "m:ss left"). The bar and percent move
   every frame; clips and time left change once per clip so nothing flickers.
   Reduced motion: no loop; recording still, both devices shown at 30%. */
(function () {
  var row = document.querySelector('[data-lockrow]');
  if (!row) return;
  var video = row.querySelector('[data-lock-video]');
  var phone = row.querySelector('.phone'), watch = row.querySelector('.lock-watch');
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

  var TOTAL = 40, SEC_PER_CLIP = 9;               // the card's story: 40 clips, about 6 minutes
  var LOCK_AT = 4.0;                              // playhead hits the end of the clip in remote-flow.mp4
  // Whole loop ~10.5 s (Daniel 2026-11-19): clip plays 0-4 s, phone locks at 4 s, the reveal glides
  // for 1 s on Apple's iOS sheet curve, the count lands on 100% at 9 s of the loop (5 s after lock),
  // holds 1 s, then snaps back to the starting placement in 0.45 s.
  var LAND_MS = 120, SPLIT_MS = 150, RUN_START = 700, RUN_MS = 4300, HOLD_MS = 1000, JOIN_MS = 450;
  var tpl = row.getAttribute('data-left-tpl') || '%@ left';
  var pctEls = row.querySelectorAll('[data-la-pct]'), fillEls = row.querySelectorAll('[data-la-fill]');
  var leftEls = row.querySelectorAll('[data-la-left]'), doneEls = row.querySelectorAll('[data-la-done]');
  var edgeEls = row.querySelectorAll('[data-la-edge]');   // watch face D: the screen edge is the progress line
  var last = { pct: -1, done: -1 };

  function mmss(s) { var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
  function paint(f) {
    var pct = Math.floor(f * 100 + 1e-9), done = Math.floor(f * TOTAL + 1e-9);
    fillEls.forEach(function (el) { el.style.transform = 'scaleX(' + f.toFixed(4) + ')'; });
    edgeEls.forEach(function (el) { el.style.setProperty('--p', f.toFixed(4)); });
    if (pct !== last.pct) { last.pct = pct; pctEls.forEach(function (el) { el.textContent = pct + '%'; }); }
    if (done !== last.done) {
      last.done = done;
      var left = tpl.replace('%@', mmss((TOTAL - done) * SEC_PER_CLIP));
      doneEls.forEach(function (el) { el.textContent = done; });
      leftEls.forEach(function (el) { el.textContent = left; });
    }
  }
  function step(n) {
    row.classList.toggle('is-s2', n >= 2);
    row.classList.toggle('is-s3', n >= 3);
    row.classList.toggle('is-split', n >= 3);
    steps.forEach(function (li) {
      var k = +li.getAttribute('data-step');
      li.classList.toggle('is-on', n === 1 ? k === 1 : k >= 2 && k <= n);
    });
  }
  // Offsets that tuck the watch partly behind the phone at rest.
  function measure() {
    if (!phone || !watch) return;
    var gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    var pw = phone.offsetWidth, ww = watch.offsetWidth;
    // At rest ~45% of the watch peeks out to the right of the phone and the pair is centered.
    var tuck = gap + ww * 0.55;
    row.style.setProperty('--phone-shift', (tuck / 2) + 'px');
    row.style.setProperty('--watch-shift', (-tuck / 2) + 'px');
  }

  paint(0.3);
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !video || !('IntersectionObserver' in window)) {
    row.classList.add('is-s3');
    steps.forEach(function (li) { li.classList.add('is-on'); });
    return;
  }
  measure();
  window.addEventListener('resize', measure);
  row.classList.add('is-anim'); if (flow) flow.classList.add('is-anim');

  var phase = 'video', t0 = 0, raf = 0, visible = false, pausedAt = 0;
  function playVideo() { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
  function startVideo() {
    phase = 'video'; row.classList.remove('is-locked'); step(1);
    try { video.currentTime = 0; } catch (e) {}
    playVideo();
  }
  function frame(now) {
    raf = 0; if (!visible) return;
    if (phase === 'video') {
      if (video.currentTime >= LOCK_AT || video.ended) {
        phase = 'lock'; t0 = now; video.pause(); paint(0); row.classList.add('is-locked');
      }
    } else if (phase === 'lock') {
      var el = now - t0;
      if (el >= LAND_MS && !row.classList.contains('is-s2')) step(2);
      if (el >= SPLIT_MS && !row.classList.contains('is-s3')) step(3);
      paint(Math.max(0, Math.min(1, (el - RUN_START) / RUN_MS)));
      if (el > RUN_START + RUN_MS + HOLD_MS) { phase = 'join'; t0 = now; row.classList.add('is-joining'); row.classList.remove('is-split'); }
    } else if (phase === 'join') {
      if (now - t0 > JOIN_MS) { row.classList.remove('is-joining'); startVideo(); }
    }
    raf = requestAnimationFrame(frame);
  }
  new IntersectionObserver(function (es) {
    var on = es[0].isIntersecting;
    if (on === visible) return;
    visible = on;
    if (on) {
      if (phase === 'video') playVideo(); else t0 += performance.now() - pausedAt;
      if (!raf) raf = requestAnimationFrame(frame);
    } else { pausedAt = performance.now(); video.pause(); }
  }, { threshold: 0.3 }).observe(row);
  step(1);
})();
