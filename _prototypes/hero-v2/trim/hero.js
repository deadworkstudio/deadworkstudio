/* Stock Shredder hero, variation TRIM.
   Beat by beat (T = seconds since the take started):
     0.0 - 2.0  the real click shot fills the frame; the press lands at T = 2.0 (file time 4.004).
     2.0 - 3.3  the click is the head of one raw reel; the reel transports left and comes to rest,
                drone shots spliced edge to edge, no gaps, no labels.
     2.9 - 3.4  hairline cut marks drop in, left to right; the dead stretches around each good moment
                wash back toward the page colour.
     3.35- 4.45 the dead stretches close up; the reel draws together into six evenly spaced clips.
     4.3 - 5.0  labels fade in under each clip. Then it rests: six clips looping, the click never returns.
   Review: ?t=SECONDS&freeze holds the whole thing at T with every video parked on the right frame. */
(function () {
  'use strict';
  var fig = document.querySelector('[data-trim]'); if (!fig) return;
  var cv = fig.querySelector('[data-trim-canvas]'), ctx = cv.getContext('2d');
  var click = fig.querySelector('[data-trim-click]');
  var drones = [].slice.call(fig.querySelectorAll('[data-trim-drone]'));
  var N = drones.length, RATIO = 2.39, LABEL = 0.09, GAP = 0.018;
  var PRESS_FILE = 4.004, PRESS = 2.0, CLICK_IN = PRESS_FILE - PRESS; // click file time at T = 0
  var DRONE_IN = 1.4; // drones start rolling (unseen) just before the press so they are decoding

  // Timeline (seconds of T)
  var MOVE0 = PRESS + 0.08, MOVE1 = 3.3;   // reel transport
  var CUT0 = 2.9, CUT_STEP = 0.045, CUT_DUR = 0.22; // cut marks
  var CLOSE0 = 3.35, CLOSE1 = 4.45;        // dead stretches close up
  var LAB0 = 4.3, LAB_STEP = 0.06, LAB_DUR = 0.4;
  var SETTLED = LAB0 + LAB_STEP * (N - 1) + LAB_DUR;

  var qs = new URLSearchParams(location.search);
  var freeze = qs.has('freeze'), fixedT = qs.has('t') ? Math.max(0, parseFloat(qs.get('t')) || 0) : null;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) fixedT = SETTLED + 1;

  // Posters stand in for any video that has no decoded frame yet.
  function poster(v) { var i = new Image(); i.onload = draw; i.src = v.getAttribute('poster'); return i; }
  var clickPoster = poster(click), dronePosters = drones.map(poster);
  function srcOf(v, p) { return v.readyState >= 2 && !reduce ? v : (p.complete && p.naturalWidth ? p : null); }

  // ---- easing: the codebase's curves, evaluated as real cubic-beziers ----
  function bezier(x1, y1, x2, y2) {
    function a(p1, p2) { return 1 - 3 * p2 + 3 * p1; } function b(p1, p2) { return 3 * p2 - 6 * p1; } function c(p1) { return 3 * p1; }
    function at(t, p1, p2) { return ((a(p1, p2) * t + b(p1, p2)) * t + c(p1)) * t; }
    function slope(t, p1, p2) { return 3 * a(p1, p2) * t * t + 2 * b(p1, p2) * t + c(p1); }
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      var t = x; for (var i = 0; i < 8; i++) { var s = slope(t, x1, x2); if (Math.abs(s) < 1e-6) break; t -= (at(t, x1, x2) - x) / s; }
      return at(Math.min(1, Math.max(0, t)), y1, y2);
    };
  }
  var easeDrawer = bezier(0.32, 0.72, 0, 1);    // transport: answers the press at once, long settle
  var easeInOut = bezier(0.77, 0, 0.175, 1);   // close-up: precise, machine
  var easeOut = bezier(0.23, 1, 0.32, 1);      // cut marks, labels
  function prog(T, t0, t1) { return Math.min(1, Math.max(0, (T - t0) / (t1 - t0))); }

  var LABELS_L = drones.map(function (_, i) { return 'CLIP 0' + (i + 1); });
  var LABELS_S = drones.map(function (_, i) { return '0' + (i + 1); });
  var DUR = drones.map(function (v) { return '0:06'; });

  var dpr = 1, T = fixedT !== null ? fixedT : 0;
  function size() {
    var w = cv.clientWidth || fig.clientWidth; dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(w / RATIO * (1 + LABEL) * dpr); draw();
  }

  // Draws the source region of a video that a slab of width w at height H would show, centred on
  // the source's horizontal position cx (0..1 of source width), offset by dx display px.
  function blit(src, cxFrac, dxFrom, w, x, H) {
    var sw0 = src.videoWidth || src.naturalWidth, sh0 = src.videoHeight || src.naturalHeight; if (!sw0 || w <= 0.5) return;
    var k = sh0 / H, sx = sw0 * cxFrac + dxFrom * k, sw = w * k;
    sx = Math.max(0, Math.min(sw0 - sw, sx));
    ctx.drawImage(src, sx, 0, sw, sh0, x, 0, w, H);
  }

  function draw() {
    var W = cv.width, H = W / RATIO; ctx.clearRect(0, 0, W, H * (1 + LABEL));
    var g = W * GAP, cw = (W - g * (N - 1)) / N;        // settled column, identical to today's strip
    var D = Math.min(W * 0.56 - cw, (W - cw) * 0.9);     // dead footage around each good moment
    var move = easeDrawer(prog(T, MOVE0, MOVE1));
    var close = easeInOut(prog(T, CLOSE0, CLOSE1));
    var x0 = W * (1 - move);                             // left edge of drone reel (click leader sits before it)
    var d = D * (1 - close), gap = g * close, pitch = cw + d + gap;
    var wash = 0.4 * easeOut(prog(T, CUT0 + 0.1, CLOSE0)) * (1 - close);

    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    // click leader: full frame, the head of the reel
    if (x0 > 0) { var cs = srcOf(click, clickPoster); if (cs) ctx.drawImage(cs, 0, 0, cs.videoWidth || cs.naturalWidth, cs.videoHeight || cs.naturalHeight, x0 - W, 0, W, H); }
    for (var i = 0; i < N; i++) {
      var sx = x0 + i * pitch; if (sx > W || sx + cw + d < 0) continue;
      var s = srcOf(drones[i], dronePosters[i]); if (!s) continue;
      var kx = sx + d / 2;                                // left edge of the keep
      blit(s, 0.5, -cw / 2 - d / 2, d / 2, sx, H);        // dead, left
      blit(s, 0.5, -cw / 2, cw, kx, H);                   // the good moment
      blit(s, 0.5, cw / 2, d / 2, kx + cw, H);            // dead, right
      if (wash > 0 && d > 0.5) {
        ctx.fillStyle = 'rgba(244,241,234,' + wash.toFixed(3) + ')';
        ctx.fillRect(sx, 0, d / 2, H); ctx.fillRect(kx + cw, 0, d / 2, H);
      }
    }
    ctx.restore();

    // cut marks: a hairline at each edge of every good moment, dropped in left to right, plus a
    // small ink tick under the frame so the mark reads on any footage. Gone once closed.
    var markFade = 1 - prog(T, CLOSE1 - 0.15, CLOSE1 + 0.15);
    if (T >= CUT0 && markFade > 0) {
      var hair = Math.max(1, Math.round(dpr)), tick = H * 0.045;
      var order = 0;
      for (var j = 0; j < N; j++) {
        var kx2 = x0 + j * pitch + d / 2, edges = [kx2, kx2 + cw];
        for (var e = 0; e < 2; e++) {
          var ex = Math.round(edges[e] - (e ? hair : 0));
          if (ex < -2 || ex > W + 2) continue;
          var lp = easeOut(prog(T, CUT0 + order * CUT_STEP, CUT0 + order * CUT_STEP + CUT_DUR)); order++;
          if (lp <= 0) continue;
          ctx.globalAlpha = markFade;
          ctx.fillStyle = 'rgba(241,236,226,0.92)'; ctx.fillRect(ex, 0, hair, H * lp);
          ctx.fillStyle = '#141412'; ctx.fillRect(ex, H, hair, tick * lp);
          ctx.globalAlpha = 1;
        }
      }
    }

    // labels, today's mono style: 'CLIP 01   0:06' (trimmed length); phones keep just the number
    if (T >= LAB0) {
      var fs = Math.round(Math.max(10 * dpr, W * 0.0105)), short = cw / dpr < 96;
      ctx.font = '500 ' + fs + 'px ui-monospace, SF Mono, Menlo, monospace'; ctx.fillStyle = '#4A4741';
      for (var m = 0; m < N; m++) {
        var a = easeOut(prog(T, LAB0 + m * LAB_STEP, LAB0 + m * LAB_STEP + LAB_DUR)); if (a <= 0) continue;
        var lx = m * (cw + g), ly = H + W * 0.026;
        ctx.globalAlpha = a;
        ctx.fillText(short ? LABELS_S[m] : LABELS_L[m] + '   ' + DUR[m], lx, ly);
        ctx.globalAlpha = 1;
      }
    }
  }

  // ---- clock + video choreography ----
  // Before the press, T is read straight off the click video, so the drawn press and the filmed
  // press can never drift apart. After it, a frame clock that only advances while on screen.
  var running = false, rafId = null, lastTs = null, firstTs = null, armed = false;
  window.__trim = { pressClickTime: null, T: function () { return T; } };
  function playSafe(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }

  function tick(ts) {
    if (!running) return;
    if (firstTs === null) firstTs = ts;
    var blocked = click.paused && ts - firstTs > 1500; // autoplay refused (e.g. Low Power Mode)
    if (T < PRESS && !blocked) {
      if (!click.paused && click.readyState >= 2 && !click.seeking) T = Math.max(T, click.currentTime - CLICK_IN);
      if (T >= PRESS) window.__trim.pressClickTime = click.currentTime;
    } else if (lastTs !== null) {
      T += Math.min(0.1, (ts - lastTs) / 1000);
    }
    lastTs = ts;
    if (T >= DRONE_IN) drones.forEach(function (v) { if (v.paused) playSafe(v); });
    if (T > MOVE1 && !click.paused) click.pause(); // the click is off the reel for good
    draw();
    rafId = requestAnimationFrame(tick);
  }
  function start() {
    if (running) return; running = true; lastTs = null; firstTs = null;
    if (!armed) { armed = true; click.currentTime = CLICK_IN; drones.forEach(function (v) { v.currentTime = 0; }); }
    if (T < MOVE1) playSafe(click);
    if (T >= DRONE_IN) drones.forEach(playSafe);
    rafId = requestAnimationFrame(tick);
  }
  function stop() {
    running = false; if (rafId !== null) cancelAnimationFrame(rafId); rafId = null;
    click.pause(); drones.forEach(function (v) { v.pause(); });
  }

  // ---- frozen review frame / reduced motion: park every video on the right frame and draw once ----
  function park() {
    var jobs = [];
    function seek(v, t) {
      return new Promise(function (res) {
        function go() { var done = function () { v.removeEventListener('seeked', done); res(); }; v.addEventListener('seeked', done); v.currentTime = t; setTimeout(res, 3000); }
        if (v.readyState >= 1) go(); else v.addEventListener('loadedmetadata', go, { once: true });
      });
    }
    jobs.push(seek(click, Math.min(click.duration || 10, CLICK_IN + Math.min(T, MOVE1))));
    drones.forEach(function (v) { jobs.push(seek(v, Math.max(0, T - DRONE_IN) % 6)); });
    Promise.all(jobs).then(function () { draw(); fig.setAttribute('data-ready', ''); });
  }

  size(); window.addEventListener('resize', size);
  [click].concat(drones).forEach(function (v) { v.addEventListener('loadeddata', draw); });

  if (reduce) { // stills: the settled six from each drone poster, nothing plays
    drones.concat(click).forEach(function (v) { v.preload = 'none'; });
    draw(); fig.setAttribute('data-ready', ''); return;
  }
  if (freeze) { park(); return; }
  if (!('IntersectionObserver' in window)) { start(); return; }
  new IntersectionObserver(function (es) { es.forEach(function (en) { en.isIntersecting ? start() : stop(); }); }, { threshold: 0.1 }).observe(fig);
})();
