/* ---- hero: SPLICE ----
   The real take of a hand clicking a mouse fills the frame. On the press the frame is cut into
   six vertical slices (today's strip geometry), the slices part with today's calm gap, and the
   cut travels left to right: each slice hard-cuts to its own drone shot. Then it rests, six
   labelled clips playing. One canvas, seven videos, plays once.

   Review: ?t=SECONDS holds or starts the timeline there; add &freeze to hold it. */
(function () {
  var fig = document.querySelector('[data-splice]'); if (!fig) return;
  var cv = fig.querySelector('canvas'), ctx = cv.getContext('2d');
  var MEDIA = '../media/';
  var SHOTS = [
    ['santa-monica', 'Santa Monica'], ['beverly-hills', 'Beverly Hills'], ['century-city', 'Century City'],
    ['lower-manhattan', 'Lower Manhattan'], ['hollywood-hills', 'Hollywood Hills'], ['sunrise', 'Sunrise']
  ];
  var N = 6, RATIO = 2.39, LABEL = 0.09;
  var PRESS = 2.0;              // timeline second the finger lands
  var CLICK_IN = 4.004 - PRESS; // so the press in the file (4.004 s) lands on PRESS
  var SPLIT = 1.1;              // gap opens over this long, same curve as today
  var CUT0 = 0.04, STAGGER = 0.07; // first slice swaps one frame after the press, then 70 ms apart
  var DRONE_IN = 1.0;           // drones enter one second in, past any slow first frames
  var DRONE_LEN = 6.0;
  var END = PRESS + SPLIT;

  var q = new URLSearchParams(location.search);
  var qT = q.has('t') ? Math.max(0, parseFloat(q.get('t')) || 0) : null;
  var freeze = q.has('freeze') && qT !== null;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- sources ----
  function img(src) { var i = new Image(); i.decoding = 'async'; i.src = src; i.onload = draw; return i; }
  var clickPoster = img(MEDIA + 'click-wide.jpg');
  var posters = SHOTS.map(function (s) { return img(MEDIA + 'drone/' + s[0] + '.jpg'); });
  var click = null, drones = [];
  function vid(src, loop) {
    var v = document.createElement('video');
    v.className = 'splice-src'; v.muted = true; v.playsInline = true; v.loop = !!loop; v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
    v.src = src; fig.appendChild(v); v.addEventListener('loadeddata', draw); v.addEventListener('seeked', draw);
    return v;
  }
  if (!reduce) {
    click = vid(MEDIA + 'click-wide.mp4', false);
    drones = SHOTS.map(function (s) { return vid(MEDIA + 'drone/' + s[0] + '.mp4', true); });
  }

  // ---- timeline ----
  var t = reduce ? END + 1 : (qT !== null ? qT : 0);
  var t0 = null, running = false, settledPlaying = false, failed = false;
  function ease(x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function progress(tt) { return tt < PRESS ? 0 : ease(Math.min(1, (tt - PRESS) / SPLIT)); }
  function droneTime(tt) { return (DRONE_IN + Math.max(0, tt - PRESS)) % DRONE_LEN; }
  function ready(v) { return v && v.readyState >= 2 && v.videoWidth; }

  // ---- drawing ----
  var curDpr = 1;
  function size() {
    var w = cv.clientWidth || fig.clientWidth, dpr = Math.min(2, window.devicePixelRatio || 1);
    curDpr = dpr; cv.width = Math.round(w * dpr); cv.height = Math.round(w / RATIO * (1 + LABEL) * dpr); draw();
  }
  // Cover-crop a source into a destination rect, centred.
  function cover(src, sw, sh, dx, dy, dw, dh) {
    var s = Math.max(dw / sw, dh / sh), cw = dw / s, ch = dh / s;
    ctx.drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, dx, dy, dw, dh);
  }
  function droneSrc(i) {
    if (ready(drones[i])) return drones[i];
    return posters[i].complete && posters[i].naturalWidth ? posters[i] : null;
  }
  function labelFor(i, maxW) {
    var n = '0' + (i + 1), full = n + '  ' + SHOTS[i][1].toUpperCase();
    return ctx.measureText(full).width <= maxW ? full : n;
  }
  function draw() {
    var W = cv.width, H = cv.height, slabH = Math.round(W / RATIO);
    ctx.clearRect(0, 0, W, H);
    var p = progress(t), pressed = t >= PRESS;
    // the cut is visible on the press frame itself (a hairline), then eases open to today's gap
    var gap = pressed ? Math.max(1.5 * curDpr, W * 0.018 * p) : 0;
    var sliceW = (W - gap * (N - 1)) / N;
    var hand = ready(click) ? click : (clickPoster.complete && clickPoster.naturalWidth ? clickPoster : null);
    var hw = hand && (hand.videoWidth || hand.naturalWidth), hh = hand && (hand.videoHeight || hand.naturalHeight);

    if (!pressed) { if (hand) cover(hand, hw, hh, 0, 0, W, slabH); return; }

    ctx.font = '500 ' + Math.round(Math.max(10 * curDpr, W * 0.0105)) + 'px ui-monospace, SF Mono, Menlo, monospace';
    for (var i = 0; i < N; i++) {
      var x0 = Math.round(i * (sliceW + gap)), x1 = Math.round(i * (sliceW + gap) + sliceW), w = x1 - x0;
      if (t < PRESS + CUT0 + i * STAGGER) {
        // still the hand: crop (never squeeze) the part of the frame this slice sat over
        if (hand) {
          var k = hw / W, cx = (i + 0.5) / N * hw, sw = w * k;
          ctx.drawImage(hand, cx - sw / 2, 0, sw, hh, x0, 0, w, slabH);
        }
      } else {
        var d = droneSrc(i);
        if (d) cover(d, d.videoWidth || d.naturalWidth, d.videoHeight || d.naturalHeight, x0, 0, w, slabH);
      }
      if (p > 0.55) {
        ctx.globalAlpha = Math.min(1, (p - 0.55) / 0.45);
        ctx.fillStyle = '#4A4741';
        ctx.fillText(labelFor(i, w), x0, slabH + W * 0.026);
        ctx.globalAlpha = 1;
      }
    }
  }

  // ---- playback ----
  function playSafe(v) { var pr = v.play(); if (pr && pr.catch) pr.catch(onBlocked); return pr; }
  function onBlocked() {
    // Autoplay refused (e.g. iPhone Low Power Mode): rest on the settled stills, no half-states.
    if (failed) return; failed = true; t = END + 1; stopAll(); draw();
  }
  function seek(v, s) { try { if (Math.abs(v.currentTime - s) > 0.02) v.currentTime = s; } catch (e) {} }
  function syncDronesTo(tt) { drones.forEach(function (v) { seek(v, droneTime(tt)); }); }

  var raf = null;
  function tick(now) {
    raf = null; if (!running) return;
    if (t0 === null) t0 = now - t * 1000;
    t = (now - t0) / 1000;
    // During the click, the film is the clock: re-anchor if the video drifts or stalls.
    if (click && !click.paused && t < PRESS + 0.6 && click.readyState >= 3) {
      var vt = click.currentTime - CLICK_IN;
      if (Math.abs(vt - t) > 0.12) { t = vt; t0 = now - t * 1000; }
    }
    // Drones roll just before they are needed so the first frame they show is already moving.
    if (!settledPlaying && t >= PRESS - 0.4) { syncDronesTo(t); drones.forEach(playSafe); settledPlaying = true; }
    // The hand is gone from every slice: stop decoding it.
    if (click && !click.paused && t > PRESS + CUT0 + N * STAGGER + 0.1) click.pause();
    draw();
    raf = requestAnimationFrame(tick);
  }
  function start() {
    if (running || failed) return; running = true;
    if (t >= PRESS + CUT0 + N * STAGGER + 0.1) {
      if (!settledPlaying) syncDronesTo(t);
      settledPlaying = true; drones.forEach(playSafe);
      t0 = null; raf = requestAnimationFrame(tick); return;
    }
    // Hold on the opening frame until the take can actually play, so the press lands on the beat.
    seek(click, CLICK_IN + t);
    var go = function () {
      if (!running) return;
      var pr = playSafe(click);
      var anchor = function () { if (running) { t0 = null; if (!raf) raf = requestAnimationFrame(tick); } };
      if (pr && pr.then) pr.then(anchor); else anchor();
    };
    if (click.readyState >= 3) go(); else click.addEventListener('canplay', go, { once: true });
    if (t >= PRESS - 0.4) { syncDronesTo(t); settledPlaying = true; drones.forEach(playSafe); }
  }
  function stopAll() {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    if (click) click.pause(); drones.forEach(function (v) { v.pause(); });
    settledPlaying = false; t0 = null;
  }

  // ---- review: hold at ?t=…&freeze with every video parked on the right frame ----
  function parkAll() {
    if (t < PRESS + CUT0 + N * STAGGER + 0.1) seek(click, Math.min(click.duration || 10, CLICK_IN + t));
    syncDronesTo(t); draw();
  }

  window.__splice = {
    get t() { return t; }, PRESS: PRESS,
    get clickTime() { return click ? click.currentTime : null; },
    get droneTimes() { return drones.map(function (v) { return v.currentTime; }); }
  };

  size(); window.addEventListener('resize', size);
  if (reduce) { draw(); return; }
  if (freeze) {
    var park = function () { parkAll(); };
    [click].concat(drones).forEach(function (v) { v.addEventListener('loadedmetadata', park, { once: true }); });
    parkAll(); return;
  }
  if (!('IntersectionObserver' in window)) { start(); return; }
  new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) start(); else if (running) stopAll(); });
  }, { threshold: 0.1 }).observe(fig);
})();
