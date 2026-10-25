/* Stock Shredder hero, variation "Sequence".
   Beat sheet (seconds from start):
     0.00  the real click take fills the frame (file starts at 2.004 s so the press lands at 2.00)
     2.05  hard cut on the press: the raw pile, six drone shots as full-frame hard cuts, 0.38 s each
     4.33  the pile is dealt into a 3 x 2 grid inside the same footprint, one cell every 0.09 s,
           each cell travelling from the full frame to its place, then the labels fade in once all six have landed
     5.48  all landed; labels in by 5.93. Settled: six labelled clips, looping. Never returns to the click.
   Review: ?t=SECONDS&freeze holds that moment with every video parked on the right frame;
   ?t=SECONDS alone starts playback from that moment. One canvas, seven videos, DPR capped at 2. */
(function () {
  var fig = document.querySelector('[data-seq]'); if (!fig) return;
  var cv = fig.querySelector('[data-seq-canvas]'), ctx = cv.getContext('2d');
  var click = fig.querySelector('[data-seq-click]');
  var drones = Array.prototype.slice.call(fig.querySelectorAll('[data-seq-drone]'));
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var q = new URLSearchParams(location.search);
  var qT = q.has('t') ? Math.max(0, parseFloat(q.get('t')) || 0) : null, freeze = q.has('freeze');

  // ---- timeline ----
  var PRESS_IN_FILE = 4.004, PRESS = 2.0, CLICK_IN = PRESS_IN_FILE - PRESS;
  var CUT = 2.05;                       // a frame after the press bottoms out: cut on the action
  var FLASH = 0.38;                     // raw pile, per shot
  var PILE = [5, 4, 3, 2, 1, 0];        // pile builds bottom-up so 01 ends on top, then deals in reading order
  var DEAL = CUT + FLASH * PILE.length; // 4.33
  var STAGGER = 0.09, MOVE = 0.7;
  var SETTLED = DEAL + STAGGER * 5 + MOVE;
  var DRONE_ROLL = 1.6;                 // drones start rolling a beat early so the cut lands on moving frames
  var OFFSET = [0.6, 1.2, 0.4, 0.9, 0.5, 0.8]; // in-points into each 6 s shot
  var DUR = 6.0;

  // ---- geometry: same constants as the live strip ----
  var RATIO = 2.39, LABEL = 0.09, GAP = 0.018, dpr = 1;
  function size() {
    var w = cv.clientWidth || fig.clientWidth; dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(w / RATIO * (1 + LABEL) * dpr);
    draw(curT);
  }
  // Settled cell rects: 3 columns with the strip's gap, 2 rows each followed by its own label band
  // (the band height is the strip's label row), so rows + bands fill frame + label row exactly.
  function cellRect(i, W, H) {
    var band = (W / RATIO) * LABEL, gap = W * GAP;
    var cw = (W - gap * 2) / 3, ch = (H - band * 2) / 2;
    var c = i % 3, r = (i / 3) | 0;
    return { x: c * (cw + gap), y: r * (ch + band), w: cw, h: ch };
  }

  // ---- easing: the strip's own ease-in-out cubic, for on-screen movement ----
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  // ---- drawing ----
  var curT = 0, started = false, useStills = reduce;
  var posters = drones.map(function (v) { var im = new Image(); im.onload = function () { draw(curT); }; im.src = v.getAttribute('poster'); return im; });
  var clickPoster = new Image(); clickPoster.onload = function () { draw(curT); }; clickPoster.src = click.getAttribute('poster');
  function ok(im) { return im.complete && im.naturalWidth > 0; }
  function srcOf(v, im) {
    if (!useStills && v.readyState >= 2) return v;
    return ok(im) ? im : (v.readyState >= 2 ? v : null);
  }
  // cover-crop src into rect (x, y, w, h)
  function cover(src, x, y, w, h) {
    var sw = src.videoWidth || src.naturalWidth, sh = src.videoHeight || src.naturalHeight;
    if (!sw || w <= 0 || h <= 0) return;
    var s = Math.max(w / sw, h / sh), cw = w / s, ch = h / s;
    ctx.drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, x, y, w, h);
  }
  // Label under each cell, in the strip's type and colour. One form for all six (never mixed):
  // the longest that fits every cell with breathing room. Phones fall back to "01   0:06", then "01".
  var FORMS = [function (n, name) { return n + '   ' + name + '   0:06'; }, function (n) { return n + '   0:06'; }, function (n) { return n; }];
  function labelText(i, f) { return FORMS[f]('0' + (i + 1), drones[i].getAttribute('data-label').toUpperCase()); }
  function labels(W, H, alpha) {
    ctx.font = '500 ' + Math.round(Math.max(10 * dpr, W * 0.0105)) + 'px ui-monospace, SF Mono, Menlo, monospace';
    var room = cellRect(0, W, H).w - W * 0.012, f = 0, i;
    for (; f < FORMS.length - 1; f++) { var fits = true; for (i = 0; i < 6; i++) if (ctx.measureText(labelText(i, f)).width > room) fits = false; if (fits) break; }
    ctx.fillStyle = '#4A4741';
    for (i = 0; i < 6; i++) {
      if (alpha[i] <= 0) continue; var r = cellRect(i, W, H);
      ctx.globalAlpha = alpha[i]; ctx.fillText(labelText(i, f), r.x, r.y + r.h + W * 0.026);
    }
    ctx.globalAlpha = 1;
  }
  function draw(t) {
    var W = cv.width, H = cv.height, FH = W / RATIO;
    ctx.clearRect(0, 0, W, H);
    if (t < CUT) {
      var cs = (started && click.readyState >= 2) ? click : (ok(clickPoster) ? clickPoster : null);
      if (cs) cover(cs, 0, 0, W, FH);
      return;
    }
    if (t < DEAL) {
      var k = PILE[Math.min(PILE.length - 1, Math.floor((t - CUT) / FLASH))], s = srcOf(drones[k], posters[k]);
      if (s) cover(s, 0, 0, W, FH);
      return;
    }
    // Deal: the top of the pile (lowest unmoved index) sits full frame underneath;
    // moving and landed cells draw over it, earlier cells on top (they were higher in the pile).
    var u = [], top = -1, i;
    for (i = 0; i < 6; i++) { u[i] = clamp01((t - DEAL - i * STAGGER) / MOVE); if (u[i] === 0 && top < 0) top = i; }
    if (top >= 0) { var st = srcOf(drones[top], posters[top]); if (st) cover(st, 0, 0, W, FH); }
    for (i = 5; i >= 0; i--) {
      if (u[i] === 0) continue;
      var e = ease(u[i]), c = cellRect(i, W, H);
      var sj = srcOf(drones[i], posters[i]);
      if (sj) cover(sj, c.x * e, c.y * e, W + (c.w - W) * e, FH + (c.h - FH) * e);
    }
    // Labels wait until every cell has landed (nothing slides under live type), then fade in, 40 ms apart.
    labels(W, H, u.map(function (v, k) { return clamp01((t - SETTLED - k * 0.04) / 0.25); }));
  }

  // ---- clock & playback ----
  curT = reduce ? SETTLED + 1 : (qT !== null ? qT : 0);
  var running = false, rafId = null, anchor = null; // anchor: performance.now() at t = 0
  function droneTime(i, t) { return (OFFSET[i] + Math.max(0, t - DRONE_ROLL)) % DUR; }
  function play(v) { var p = v.play(); if (p && p.catch) p.catch(onBlocked); }
  function onBlocked(err) { // autoplay refused (e.g. Low Power Mode): rest on the settled grid as stills
    if (err && err.name === 'AbortError') return; // a pause() interrupting play(), not a refusal
    if (useStills) return; useStills = true; stop_(); curT = SETTLED + 1; draw(curT);
  }
  function tick(now) {
    if (!running) return;
    if (curT < CUT && !click.paused && click.readyState >= 2) {
      // Before the press the take itself is the clock, so the press frame and the cut can't drift apart.
      curT = click.currentTime - CLICK_IN; anchor = now - curT * 1000;
    } else {
      if (anchor === null) anchor = now - curT * 1000;
      curT = (now - anchor) / 1000;
    }
    if (curT >= DRONE_ROLL) drones.forEach(function (v) { if (v.paused) play(v); });
    if (curT >= CUT && !click.paused) click.pause();
    draw(curT);
    rafId = requestAnimationFrame(tick);
  }
  function start_() {
    if (running || useStills) return;
    running = true; anchor = null;
    if (curT < CUT) { started = true; play(click); }
    if (curT >= DRONE_ROLL) drones.forEach(play);
    rafId = requestAnimationFrame(tick);
  }
  function stop_() {
    running = false; if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    click.pause(); drones.forEach(function (v) { v.pause(); });
  }
  function seek(v, time) {
    return new Promise(function (res) {
      function go() {
        if (Math.abs(v.currentTime - time) < 0.001 && v.readyState >= 2) return res();
        v.addEventListener('seeked', function () { res(); }, { once: true }); v.currentTime = time;
      }
      if (v.readyState >= 1) go(); else v.addEventListener('loadedmetadata', go, { once: true });
    });
  }
  function park(t) { // put every video on the frame it should show at time t
    return Promise.all([seek(click, CLICK_IN + Math.min(t, CUT))]
      .concat(drones.map(function (v, i) { return seek(v, droneTime(i, t)); })));
  }

  size(); window.addEventListener('resize', size);
  click.addEventListener('loadeddata', function () { draw(curT); });
  drones.forEach(function (v) { v.addEventListener('loadeddata', function () { draw(curT); }); });

  if (reduce) { draw(curT); return; }
  if (freeze) {
    park(curT).then(function () { started = true; draw(curT); window.__seqReady = { t: curT, click: click.currentTime }; });
    return;
  }
  window.__seq = { t: function () { return curT; }, click: click };
  park(curT).then(function () {
    started = true; draw(curT);
    if (!('IntersectionObserver' in window)) return start_();
    new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) start_(); else stop_(); });
    }, { threshold: 0.1 }).observe(fig);
  });
})();
