// ==========================================================================
// Hero: IMPORT -> SHRED -> SEND, ~15.5 s, then a short fade back to the wall and it starts over.
// Push variant (the chosen one): wall 0–2 s, push 2–3 s, shred ~3–9.4 s, six panels held 6 s, loop.
//
//   0.0–3.5   IMPORT  the archive wall (the archive concept, unchanged): dissolves up, drifts, eases to a stop.
//                     One tile holds weld-1's frame: the take we are about to open.
//   3.5–~5.1  the take leaves the wall, three ways (?v=push | fade | cut, default push):
//               push  one continuous camera push on that tile (1.4 s), then a 4-frame handoff to the video
//               fade  the wall goes to near-black around the lit tile (0.8 s), the video dissolves up over it (0.8 s)
//               cut   the tile held a beat, a touch brighter than the rest, then a hard cut to the video
//   ~5–11.4   SHRED   the edit concept's scan: one hairline for the whole 5:18 take, a playhead, a hard cut
//                     and an ink mark at each of six moments (weld-5, the spark waterfall, holds longest)
//   11.4–13.1 SEND    the frame dissolves into six vertical panels (today's strip layout), captions in. Rest.
//
// One canvas draws everything (wall sprite + six videos), so there are only six <video> elements.
// Everything visible is a pure function of one clock, so ?t=SECONDS&freeze parks any moment exactly,
// videos included; ?t=SECONDS alone starts the clock there.
// ==========================================================================
(function () {
  'use strict';
  var fig = document.querySelector('[data-iss]'); if (!fig) return;

  var MEDIA = '../media/v3/web/';
  var RATIO = 2.39;

  // ---- the wall (archive-wall.json, inlined so the page works from file://) ----
  var WALL = { src: MEDIA + 'archive-wall.jpg', cols: 24, rows: 20, tileW: 192, tileH: 101, total: 690 };
  var VIEW_COLS = 20, FIRST_COL = 2;                               // the archive concept's window
  var VIEW_ROWS = VIEW_COLS * WALL.tileW / (WALL.tileH * RATIO);   // ≈15.9
  // The take's own frame (A002_C044_0217SC) sits at col 3,row 4, on the edge of the window. Its frame
  // moves to the middle (col 11,row 9) as weld-1; the tile it displaces moves to col 3,row 4, so the wall
  // still holds 480 different takes.
  var HERO = { col: 11, row: 9 }, ORIG = { col: 3, row: 4 };
  var REST_TOP = HERO.row + 0.5 - VIEW_ROWS / 2;                   // that tile's row centred when the drift stops
  var GUTTER = 0.035;                                              // near-black gutter, fraction of a tile

  // ---- the take ----
  var TAKE = 317.9, LEN = 7, FILE = 'A002_C044_0217SC';
  var IN = [60, 92, 145, 224, 249, 300];                           // weld-1..6 in-points within the take
  var DWELL = [0.7, 0.7, 0.7, 0.75, 1.35, 0.7];                   // wall-clock time on each 7 s moment (weld-5 longest)
  var SCRUB = 180;                                                 // take-seconds per second between moments
  var FOCAL = [0.36, 0.72, 0.58, 0.32, 0.46, 0.70];                // where each panel crops its clip (x, 0–1)

  // ---- variant + timeline (seconds) ----
  var q = new URLSearchParams(location.search);
  var VARIANT = ({ push: 1, fade: 1, cut: 1 })[q.get('v')] ? q.get('v') : 'push';
  var T = { wallIn: [0, 0.6], cruiseEnd: 1.3, stop: 2.0 };
  var DRIFT_V = 7 / (3.8 + (5.8 - 3.8) / 2);                       // the archive concept's drift speed (rows/s)
  var DRIFT_ROWS = DRIFT_V * (T.cruiseEnd + (T.stop - T.cruiseEnd) / 2);
  var START_TOP = REST_TOP - DRIFT_ROWS;
  var X = {                                                        // P = weld-1 starts playing, F = picture is full frame
    push: { push: [2.0, 3.0], xfade: [3.0, 3.0001], P: 2.0, F: 3.0 },  // weld-1 plays inside its tile for the whole push
    fade: { dim: [3.5, 4.3], dissolve: [4.3, 5.1], P: 4.3, F: 5.1 },
    cut:  { lift: [3.5, 3.95], cut: 4.5, P: 4.5, F: 4.5 }
  }[VARIANT];
  T.metaOut = VARIANT === 'cut' ? [X.F - 0.35, X.F] : [X.F - 0.6, X.F - 0.2];   // cut: the label goes with the picture
  T.scanIn = [X.F, X.F + 0.45];

  // Playhead schedule: segments of take position over wall-clock time. The playhead is already on 1:00
  // when the picture arrives (that is what is playing), dwells through each moment, scrubs between.
  var segs = [], arrive = [X.P], tt = X.P, pp = IN[0];
  function seg_(dt, p1) { segs.push({ t0: tt, t1: tt + dt, p0: pp, p1: p1 }); tt += dt; pp = p1; }
  seg_(X.F - X.P + 0.25 + DWELL[0], IN[0] + LEN);
  for (var k = 1; k < IN.length; k++) {
    seg_((IN[k] - pp) / SCRUB, IN[k]); arrive[k] = tt;
    seg_(DWELL[k], IN[k] + LEN);
  }
  seg_((TAKE - pp) / SCRUB, TAKE);
  var SCAN_END = tt, S = SCAN_END + 0.1;
  T.panelsIn = [S, S + 0.8]; T.fullOut = [S + 0.4, S + 1.2]; T.scanOut = [S, S + 0.5];
  T.caps = S + 0.8; T.capDur = 0.6; T.capStep = 0.05;
  T.rest = T.caps + 5 * T.capStep + T.capDur;
  T.HOLD = 6; T.LOOP = S + T.HOLD; T.loopOut = [T.LOOP - 0.6, T.LOOP];   // six panels held, then fade and start over

  // ---- elements ----
  var canvas = fig.querySelector('[data-iss-canvas]'), ctx = canvas.getContext('2d');
  var vids = [].slice.call(fig.querySelectorAll('[data-iss-src] video'));
  var meta = fig.querySelector('[data-iss-meta]'), scan = fig.querySelector('[data-iss-scan]');
  var marks = [].slice.call(fig.querySelectorAll('.iss-mark'));
  var rail = fig.querySelector('[data-iss-rail]'), rightEl = fig.querySelector('[data-iss-right]');
  var caps = [].slice.call(fig.querySelectorAll('[data-iss-caps] li'));
  marks.forEach(function (m, i) { m.style.left = (IN[i] / TAKE * 100) + '%'; m.style.width = (LEN / TAKE * 100) + '%'; });

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var freeze = q.has('freeze');
  var t0 = q.has('t') ? Math.max(0, parseFloat(q.get('t')) || 0) : 0;

  // ---- easing ----
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function seg(t, r) { return clamp01((t - r[0]) / (r[1] - r[0])); }
  function inOut(x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }   // dissolves, dims, the push
  function out(x) { return 1 - Math.pow(1 - x, 3); }                                       // entrances
  function wallTop(t) {
    if (t <= T.cruiseEnd) return START_TOP + DRIFT_V * t;
    var D = T.stop - T.cruiseEnd, s = Math.min(t, T.stop) - T.cruiseEnd;
    return START_TOP + DRIFT_V * T.cruiseEnd + DRIFT_V * (s - s * s / (2 * D));
  }

  // ---- labels ----
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tc(s) { var f = Math.min(23, Math.floor((s % 1) * 24)); s = Math.floor(s); return pad(Math.floor(s / 60)) + ':' + pad(s % 60) + ':' + pad(f); }
  function playheadAt(t) {
    if (t <= segs[0].t0) return segs[0].p0;
    for (var i = 0; i < segs.length; i++) { var s = segs[i]; if (t < s.t1) return s.p0 + (s.p1 - s.p0) * ((t - s.t0) / (s.t1 - s.t0)); }
    return TAKE;
  }
  function clipAt(t) { var c = 0; for (var i = 1; i < arrive.length; i++) if (t >= arrive[i]) c = i; return c; }

  // Where each video should be at time t (seconds into the clip), or -1 if it is not on screen.
  function localTimes(t) {
    var L = [-1, -1, -1, -1, -1, -1];
    var OFF0 = VARIANT === 'push' ? X.P : 0;                         // push: weld-1 runs from t = 0, inside its tile
    if (t < X.P) { if (OFF0) L[0] = t; return L; }
    if (t < S) { var c = clipAt(t); L[c] = t - arrive[c] + (c === 0 ? OFF0 : 0); return L; }
    for (var i = 0; i < 6; i++) L[i] = i === 5 ? t - arrive[5] : t - S;
    return L;
  }

  // ---- images: the wall sprite and the six first frames (posters; weld-1 is also the wall tile) ----
  var sprite = new Image(); sprite.decoding = 'async';
  var posters = vids.map(function (v) { var im = new Image(); im.decoding = 'async'; im.src = v.getAttribute('poster'); return im; });
  var weld = posters[0];

  // ---- the pre-scaled sheet: the archive concept's wall, gutters baked in, at the current size ----
  var sheet = document.createElement('canvas'), sctx = sheet.getContext('2d');
  var W = 0, H = 0, tw = 0, th = 0, g = 0, dpr = 1, ready = false;
  function cellSrc(c, r) {                                         // the sprite cell shown at (c, r), after the swap
    if (c === ORIG.col && r === ORIG.row) return [HERO.col, HERO.row];
    return [c, r];
  }
  // weld-1 cover-cropped into a w x h picture: at rest it is an ordinary tile (no letterbox); during the
  // push its picture opens from the tile's shape to the full 2.39 frame, so it lands on the exact video frame.
  function drawWeld(c, x, y, w, h) {
    var src = frameOf(0), iw = src.videoWidth || src.naturalWidth, ih = src.videoHeight || src.naturalHeight; if (!iw) return;
    var sw = iw, sh = iw * h / w; if (sh > ih) { sh = ih; sw = ih * w / h; }
    c.drawImage(src, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
  }
  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = canvas.clientWidth || fig.clientWidth; if (!w) return;
    canvas.width = W = Math.round(w * dpr); canvas.height = H = Math.round(w / RATIO * dpr);
    tw = W / VIEW_COLS; th = tw * WALL.tileH / WALL.tileW;
    g = Math.max(1, Math.round(tw * GUTTER));                      // ~2 px on desktop, 1 px on phones
    if (!sprite.naturalWidth) return;
    sheet.width = Math.ceil(tw * WALL.cols); sheet.height = Math.ceil(th * WALL.rows);
    sctx.fillStyle = '#0E0E0D'; sctx.fillRect(0, 0, sheet.width, sheet.height);
    sctx.imageSmoothingEnabled = true; sctx.imageSmoothingQuality = 'high';
    for (var r = 0; r < WALL.rows; r++) for (var c = 0; c < WALL.cols; c++) {
      var x = Math.round(c * tw), y = Math.round(r * th), x2 = Math.round((c + 1) * tw), y2 = Math.round((r + 1) * th);
      var dx = x + g / 2, dy = y + g / 2, dw = x2 - x - g, dh = y2 - y - g;
      if (c === HERO.col && r === HERO.row) {
        drawWeld(sctx, dx, dy, dw, dh);
        continue;
      }
      var src = cellSrc(c, r);
      sctx.drawImage(sprite, src[0] * WALL.tileW, src[1] * WALL.tileH, WALL.tileW, WALL.tileH, dx, dy, dw, dh);
    }
    ready = true;
  }

  // The wall at rest scale, `top` rows at the top edge; it repeats vertically (archive concept).
  function drawWall(t) {
    var sheetH = th * WALL.rows, top = wallTop(t);
    var oy = ((top * th) % sheetH + sheetH) % sheetH, ox = FIRST_COL * tw;
    ctx.fillStyle = '#0E0E0D'; ctx.fillRect(0, 0, W, H);
    for (var y = -oy; y < H; y += sheetH) ctx.drawImage(sheet, -ox, y);
  }
  // The hero tile's screen rect at rest (drift stopped), straight from the sheet's integer grid.
  function heroRest() {
    var sx = Math.round(HERO.col * tw), sy = Math.round(HERO.row * th);
    var w = Math.round((HERO.col + 1) * tw) - sx, h = Math.round((HERO.row + 1) * th) - sy;
    return { sx: sx, sy: sy, w: w, h: h, dx: sx - FIRST_COL * tw, dy: (HERO.row - REST_TOP) * th };
  }

  // ---- push: one scale of the whole wall about a fixed point, so the tile's picture ends exactly on the frame ----
  // Gutters grow with the square root of the zoom: the grid stays a contact sheet, never a heavy black cage.
  function drawPush(e) {
    var cx = (HERO.col - FIRST_COL + 0.5) * tw, cy = (HERO.row - REST_TOP + 0.5) * th;   // tile centre at rest
    var Z = W / tw;                                                // solve tw*Z - g*sqrt(Z) = W: picture width -> frame width
    for (var n = 0; n < 6; n++) Z -= (tw * Z - g * Math.sqrt(Z) - W) / (tw - g / (2 * Math.sqrt(Z)));
    var ox = (Z * cx - W / 2) / (Z - 1), oy = (Z * cy - H / 2) / (Z - 1);
    var z = Math.pow(Z, e), gs = g * Math.sqrt(z) * Math.pow(1 - e, 2);   // log-space: a steady push; gutters thin away as it lands
    ctx.fillStyle = '#0E0E0D'; ctx.fillRect(0, 0, W, H);
    var x0 = ox - ox / z, x1 = ox + (W - ox) / z, y0 = oy - oy / z, y1 = oy + (H - oy) / z;   // visible, rest-space
    var c0 = Math.floor(x0 / tw) + FIRST_COL, c1 = Math.floor(x1 / tw) + FIRST_COL;
    var r0 = Math.floor(y0 / th + REST_TOP), r1 = Math.floor(y1 / th + REST_TOP);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) {
      var rx = (c - FIRST_COL) * tw, ry = (r - REST_TOP) * th;     // rest-space corner of this cell
      var X0 = ox + (rx - ox) * z + gs / 2, Y0 = oy + (ry - oy) * z + gs / 2;
      var w = tw * z - gs, h = th * z - gs;
      var rr = ((r % WALL.rows) + WALL.rows) % WALL.rows, cc = ((c % WALL.cols) + WALL.cols) % WALL.cols;
      if (cc === HERO.col && rr === HERO.row) {
        if (e >= 1) { drawWeld(ctx, 0, 0, W, H); continue; }       // land exactly on the frame
        // The picture always covers whatever part of its tile is on screen (never a dark band), keeps
        // its own 2.39 shape, and at the end of the push that is exactly the full frame.
        var pcx = X0 + w / 2, pcy = Y0 + h / 2;
        var hw = Math.max(pcx - Math.max(X0, 0), Math.min(X0 + w, W) - pcx), hv = Math.max(pcy - Math.max(Y0, 0), Math.min(Y0 + h, H) - pcy);
        var ph = Math.max(2 * hv, 2 * hw / RATIO), pw = ph * RATIO;
        ctx.save(); ctx.beginPath(); ctx.rect(X0, Y0, w, h); ctx.clip();
        ctx.drawImage(frameOf(0), pcx - pw / 2, pcy - ph / 2, pw, ph);   // the live video itself: no image-to-video swap
        ctx.restore();
        continue;
      }
      var src = cellSrc(cc, rr);
      ctx.drawImage(sprite, src[0] * WALL.tileW, src[1] * WALL.tileH, WALL.tileW, WALL.tileH, X0, Y0, w, h);
    }
  }

  // ---- video frames ----
  function frameOf(i) { var v = vids[i]; return v.readyState >= 2 ? v : posters[i]; }   // never a black frame
  function drawFull(i, a) {
    if (a <= 0) return;
    ctx.globalAlpha = a; ctx.drawImage(frameOf(i), 0, 0, W, H); ctx.globalAlpha = 1;
  }
  function drawPanels(a) {
    if (a <= 0) return;
    var gap = W * 0.018, pw = (W - gap * 5) / 6;
    ctx.globalAlpha = a;
    for (var i = 0; i < 6; i++) {
      var src = frameOf(i), sw0 = src.videoWidth || src.naturalWidth, sh0 = src.videoHeight || src.naturalHeight;
      if (!sw0) continue;
      var x = i * (pw + gap), cw = sh0 * pw / H, sx = Math.max(0, Math.min(sw0 - cw, FOCAL[i] * sw0 - cw / 2));
      ctx.drawImage(src, sx, 0, cw, sh0, x, 0, pw, H);
    }
    ctx.globalAlpha = 1;
  }

  // ---- one pure function of time ----
  var lastDom = {};
  function setStyle(el, key, prop, val) { if (lastDom[key] !== val) { el.style[prop] = val; lastDom[key] = val; } }

  function render(t) {
    // DOM: the label row
    setStyle(meta, 'meta', 'opacity', String(1 - inOut(seg(t, T.metaOut))));
    var scanA = inOut(seg(t, T.scanIn)) * (1 - inOut(seg(t, T.scanOut)));
    setStyle(scan, 'scan', 'opacity', String(scanA));
    if (scanA > 0) {
      var ph = playheadAt(t);
      setStyle(rail, 'rail', 'transform', 'translateX(' + (ph / TAKE * 100).toFixed(3) + '%)');
      var label = tc(ph); if (rightEl.textContent !== label) rightEl.textContent = label;
      for (var m = 0; m < marks.length; m++) setStyle(marks[m], 'm' + m, 'transform', 'scaleX(' + clamp01((ph - IN[m]) / LEN).toFixed(4) + ')');
    }
    for (var j = 0; j < caps.length; j++) {
      var a = T.caps + j * T.capStep;
      setStyle(caps[j], 'c' + j, 'opacity', String(out(seg(t, [a, a + T.capDur])) * (1 - inOut(seg(t, T.loopOut)))));
    }

    // Canvas: the picture
    if (!ready || !W) return;
    var wallA = out(seg(t, T.wallIn));
    setStyle(canvas, 'cv', 'opacity', String(t < T.wallIn[1] ? wallA : 1 - inOut(seg(t, T.loopOut))));
    ctx.clearRect(0, 0, W, H);

    if (t < X.F) {                                                  // IMPORT + the transition
      if (VARIANT === 'push' && t >= X.push[0]) {
        drawPush(inOut(seg(t, X.push)));
        drawFull(0, inOut(seg(t, X.xfade)));
      } else {
        drawWall(t);
        if (VARIANT === 'push') {
          var sheetH = th * WALL.rows, ty = (((HERO.row - wallTop(t)) * th) % sheetH + sheetH) % sheetH;
          drawWeld(ctx, (HERO.col - FIRST_COL) * tw + g / 2, ty + g / 2, tw - g, th - g);
        }
        var hr = heroRest();
        if (VARIANT === 'fade' && t >= X.dim[0]) {
          ctx.fillStyle = 'rgba(14,14,13,' + (0.9 * inOut(seg(t, X.dim))) + ')'; ctx.fillRect(0, 0, W, H);
          ctx.drawImage(sheet, hr.sx, hr.sy, hr.w, hr.h, hr.dx, hr.dy, hr.w, hr.h);   // the tile stays lit, in place
          drawFull(0, inOut(seg(t, X.dissolve)));
        } else if (VARIANT === 'cut' && t >= X.lift[0]) {
          ctx.fillStyle = 'rgba(14,14,13,' + (0.26 * inOut(seg(t, X.lift))) + ')'; ctx.fillRect(0, 0, W, H);
          ctx.drawImage(sheet, hr.sx, hr.sy, hr.w, hr.h, hr.dx, hr.dy, hr.w, hr.h);
        }
      }
      return;
    }
    // SHRED, then SEND: the full frame under, the six panels dissolving up over it, the gaps opening to the page
    var full = 1 - inOut(seg(t, T.fullOut));
    drawFull(t < S ? clipAt(t) : 5, full);
    drawPanels(inOut(seg(t, T.panelsIn)));
  }

  // ---- video: preload during IMPORT, play exactly the clips on screen ----
  var loaded = false;
  function loadAll() {
    if (loaded) return; loaded = true;
    vids.forEach(function (v) { v.preload = 'auto'; v.load(); });
  }
  function syncVideos(t) {
    var L = localTimes(t);
    for (var i = 0; i < vids.length; i++) {
      var v = vids[i];
      if (L[i] >= 0) { if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } }
      else if (!v.paused) { v.pause(); try { v.currentTime = 0; } catch (e) {} }   // re-park on its first frame
    }
  }
  function pauseAll() { vids.forEach(function (v) { v.pause(); }); }

  // ---- reduced motion: the six panels as stills ----
  function whenImages(list) {
    return Promise.all(list.map(function (im) { return im.decode ? im.decode().catch(function () {}) : Promise.resolve(); }));
  }
  if (reduce) {
    whenImages(posters).then(function () {
      size(); ready = true; render(T.rest + 1);
      window.addEventListener('resize', function () { size(); ready = true; render(T.rest + 1); });
      fig.dataset.issReady = '1';
    });
    return;
  }

  sprite.src = WALL.src;
  var imagesReady = whenImages([sprite].concat(posters));
  window.addEventListener('resize', function () { size(); render(freeze ? t0 : clock); });

  // ---- freeze: hold any moment for review, videos parked on the right frame ----
  if (freeze) {
    var L = localTimes(t0), pending = [];
    L.forEach(function (lt, i) {
      if (lt < 0) return;
      var v = vids[i]; v.preload = 'auto';
      pending.push(new Promise(function (res) {
        v.addEventListener('loadedmetadata', function () {
          var d = v.duration || LEN;
          v.addEventListener('seeked', function () { res(); }, { once: true });
          v.currentTime = Math.min(lt % d, d - 0.05);
        }, { once: true });
        v.addEventListener('error', res, { once: true });
        v.load();
      }));
    });
    Promise.all([imagesReady].concat(pending)).then(function () {
      size(); render(t0);
      requestAnimationFrame(function () { requestAnimationFrame(function () { render(t0); fig.dataset.issReady = '1'; }); });
    });
    return;
  }

  // ---- live: one clock that advances only while the hero is on screen and the tab is visible ----
  var clock = t0, last = null, raf = null, onScreen = false, started = false;
  function frame(ts) {
    raf = null;
    if (!onScreen || document.hidden) return;
    if (last !== null) clock += Math.min(0.1, (ts - last) / 1000);  // a dropped tab never skips a beat
    last = ts;
    loadAll();
    if (clock >= T.LOOP) { clock = 0; vids.forEach(function (v) { v.pause(); try { v.currentTime = 0; } catch (e) {} }); }
    syncVideos(clock);
    render(clock);
    raf = requestAnimationFrame(frame);                              // keeps drawing the playing clips at rest
  }
  function go() { if (started && onScreen && !document.hidden && raf === null) { last = null; raf = requestAnimationFrame(frame); } }
  function halt() { if (raf !== null) cancelAnimationFrame(raf); raf = null; pauseAll(); }

  imagesReady.then(function () {
    size(); render(clock); started = true;
    if (t0 > 0) loadAll();
    document.addEventListener('visibilitychange', function () { if (document.hidden) halt(); else go(); });
    if (!('IntersectionObserver' in window)) { onScreen = true; go(); return; }
    new IntersectionObserver(function (es) {
      es.forEach(function (en) { onScreen = en.isIntersecting; if (onScreen) go(); else halt(); });
    }, { threshold: 0.1 }).observe(fig);
  });

  window.__iss = { T: T, X: X, arrive: arrive, SCAN_END: SCAN_END, S: S, variant: VARIANT };
})();
