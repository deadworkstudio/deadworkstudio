/* ==========================================================================
   Hero 01 · THE ARCHIVE
   Plays once on load (~8 s), then rests on six playing clips. Never loops back.

     0.0–0.8   wall dissolves up from the page
     0.0–5.8   wall drifts upward at a constant speed, easing to a stop at 3.8–5.8
     4.0–5.6   everything but the six keepers dims to ~18%
     4.5–5.4   690 TAKES -> 6 SELECTED (out, then in)
     5.8–6.2   held: the six selected, at rest
     6.2–7.2   six clips dissolve in over the darkened wall (they never travel)
     6.8–7.8   the wall's dark ground dissolves to the page, leaving today's cream gaps
     7.1–8.0   six captions in, 50 ms apart

   Review: ?t=SECONDS holds the clock at that moment and plays from there;
           ?t=SECONDS&freeze holds it there, videos parked on the matching frame.
   ========================================================================== */
(function () {
  'use strict';
  var fig = document.querySelector('[data-archive]');
  if (!fig) return;

  // ---- the wall: archive-wall.json, inlined so the page works from file:// too ----
  var MEDIA = '../media/v3/web/';
  var WALL = {
    src: MEDIA + 'archive-wall.jpg',
    cols: 24, rows: 20, tileW: 192, tileH: 101,
    totalRedTakes: 690,
    keepers: [ // in caption order (01–06)
      { id: 'sparks-cascade',     col: 3,  row: 4  },
      { id: 'waterjet-mist',      col: 10, row: 7  },
      { id: 'sewing-lamp',        col: 17, row: 5  },
      { id: 'ceiling-light-arcs', col: 6,  row: 13 },
      { id: 'deck-led-line',   col: 14, row: 15 },
      { id: 'empty-paint-booth',  col: 20, row: 12 }
    ]
  };
  var VIEW_COLS = 20, FIRST_COL = 2;            // cols 2–21 visible: keepers span 3–20, one spare column each side
  var RATIO = 2.39;
  var VIEW_ROWS = VIEW_COLS * WALL.tileW / (WALL.tileH * RATIO);   // ≈15.9, independent of size
  var REST_TOP = (4 + 16) / 2 - VIEW_ROWS / 2;  // keepers occupy rows 4–15: centre them when the drift stops
  var DRIFT_ROWS = 7;

  // ---- timeline (seconds) ----
  var T = {
    wallIn: [0, 0.8], cruiseEnd: 3.8, stop: 5.8,
    dim: [4.0, 5.6], hair: [4.6, 5.8], hairOut: [6.1, 6.6], countOut: [4.5, 4.85], countIn: [4.95, 5.4],
    play: 6.1, clipsIn: [6.2, 7.2], wallOut: [6.8, 7.8], metaOut: [6.2, 6.8],
    caps: 7.1, capDur: 0.6, capStep: 0.05, rest: 8.0
  };
  var DIM = 0.82;                               // non-keepers fall to ~18%
  // constant velocity, then velocity falls linearly to zero: d = v*cruise + v*decel/2
  var V = DRIFT_ROWS / (T.cruiseEnd + (T.stop - T.cruiseEnd) / 2);
  var START_TOP = REST_TOP - DRIFT_ROWS;

  var canvas = fig.querySelector('[data-archive-wall]');
  var ctx = canvas.getContext('2d');
  var cols = [].slice.call(fig.querySelectorAll('.archive-col'));
  var vids = cols.map(function (c) { return c.querySelector('video'); });
  var caps = [].slice.call(fig.querySelectorAll('[data-archive-captions] li'));
  var meta = fig.querySelector('[data-archive-meta]');
  var total = fig.querySelector('[data-archive-total]');
  var selected = fig.querySelector('[data-archive-selected]');
  total.textContent = WALL.totalRedTakes + ' takes';
  selected.textContent = WALL.keepers.length + ' selected';

  var qs = new URLSearchParams(location.search);
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var freeze = qs.has('freeze');
  var t0 = qs.has('t') ? Math.max(0, parseFloat(qs.get('t')) || 0) : 0;

  // ---- easing ----
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function seg(t, r) { return clamp01((t - r[0]) / (r[1] - r[0])); }
  function inOut(x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; } // dissolves, dims
  function out(x) { return 1 - Math.pow(1 - x, 3); }                                    // entrances
  function wallTop(t) {
    if (t <= T.cruiseEnd) return START_TOP + V * t;
    var D = T.stop - T.cruiseEnd, s = Math.min(t, T.stop) - T.cruiseEnd;
    return START_TOP + V * T.cruiseEnd + V * (s - s * s / (2 * D));
  }

  // ---- durations in the captions come from the files themselves ----
  vids.forEach(function (v) {
    v.addEventListener('loadedmetadata', function () {
      var el = fig.querySelector('[data-dur="' + v.dataset.clip + '"]');
      var s = Math.round(v.duration || 0);
      if (el && s) el.textContent = Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
    });
  });

  // ---- sprite, pre-scaled once per size into an offscreen sheet with its gutters baked in ----
  var sprite = new Image(), sheet = document.createElement('canvas'), sctx = sheet.getContext('2d');
  var tw = 0, th = 0, dpr = 1, ready = false;
  sprite.decoding = 'async';
  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = canvas.clientWidth || fig.clientWidth; if (!w) return;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(w / RATIO * dpr);
    tw = canvas.width / VIEW_COLS; th = tw * WALL.tileH / WALL.tileW;
    if (!sprite.complete || !sprite.naturalWidth) return;
    var g = Math.max(1, Math.round(tw * 0.035));      // near-black gutter: ~2 px on desktop, 1 px on phones
    sheet.width = Math.ceil(tw * WALL.cols); sheet.height = Math.ceil(th * WALL.rows);
    sctx.fillStyle = '#0E0E0D'; sctx.fillRect(0, 0, sheet.width, sheet.height);
    sctx.imageSmoothingEnabled = true; sctx.imageSmoothingQuality = 'high';
    for (var r = 0; r < WALL.rows; r++) for (var c = 0; c < WALL.cols; c++) {
      var x = Math.round(c * tw), y = Math.round(r * th), x2 = Math.round((c + 1) * tw), y2 = Math.round((r + 1) * th);
      sctx.drawImage(sprite, c * WALL.tileW, r * WALL.tileH, WALL.tileW, WALL.tileH, x + g / 2, y + g / 2, x2 - x - g, y2 - y - g);
    }
    ready = true;
    render(clock);
  }

  // Draws the wall with `top` (in rows, may be fractional/negative) at the top edge. The wall repeats
  // vertically, so a negative start shows the sheet's last rows — never the same frame twice in view.
  function drawWall(t) {
    var W = canvas.width, H = canvas.height, sheetH = th * WALL.rows;
    var top = wallTop(t), oy = ((top * th) % sheetH + sheetH) % sheetH, ox = FIRST_COL * tw;
    ctx.fillStyle = '#0E0E0D'; ctx.fillRect(0, 0, W, H);
    for (var y = -oy; y < H; y += sheetH) ctx.drawImage(sheet, -ox, y);

    var dim = DIM * inOut(seg(t, T.dim));
    if (dim <= 0) return;
    ctx.fillStyle = 'rgba(14,14,13,' + dim + ')'; ctx.fillRect(0, 0, W, H);
    var hair = .34 * inOut(seg(t, T.hair)) * (1 - inOut(seg(t, T.hairOut)));
    for (var i = 0; i < WALL.keepers.length; i++) {
      var k = WALL.keepers[i];
      var sx = Math.round(k.col * tw), sy = Math.round(k.row * th);
      var w = Math.round((k.col + 1) * tw) - sx, h = Math.round((k.row + 1) * th) - sy;
      var dx = sx - ox, dy = (k.row - top) * th;
      ctx.drawImage(sheet, sx, sy, w, h, dx, dy, w, h);
      if (hair > 0) {                          // the faintest hairline frame, sat in the gutter
        ctx.strokeStyle = 'rgba(241,236,226,' + hair + ')'; ctx.lineWidth = dpr;
        ctx.strokeRect(dx + dpr / 2, dy + dpr / 2, w - dpr, h - dpr);
      }
    }
  }

  // ---- one pure function of time ----
  var clock = t0;
  function render(t) {
    var wallA = out(seg(t, T.wallIn)) * (1 - inOut(seg(t, T.wallOut)));
    canvas.style.opacity = wallA;
    if (wallA > 0 && ready) drawWall(t);
    canvas.style.visibility = wallA > 0 ? '' : 'hidden';

    var clipsA = inOut(seg(t, T.clipsIn));
    for (var i = 0; i < cols.length; i++) cols[i].style.opacity = clipsA;

    total.style.opacity = 1 - inOut(seg(t, T.countOut));       // sequential, never superimposed
    selected.style.opacity = inOut(seg(t, T.countIn));
    meta.style.opacity = 1 - inOut(seg(t, T.metaOut));
    meta.style.visibility = t >= T.metaOut[1] ? 'hidden' : '';
    for (var j = 0; j < caps.length; j++) {
      var a = T.caps + j * T.capStep;
      caps[j].style.opacity = out(seg(t, [a, a + T.capDur]));
    }
  }

  // ---- video: load once the wall is moving, play just before the dissolve ----
  var loaded = false, playing = false;
  function loadVideos() {
    if (loaded) return; loaded = true;
    vids.forEach(function (v) { v.preload = 'auto'; v.load(); });
  }
  function clipTime(v, t) {
    var d = v.duration || 6, s = Math.max(0, t - T.play);
    return s % d;
  }
  function playVideos() {
    vids.forEach(function (v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); });
    playing = true;
  }
  function pauseVideos() { vids.forEach(function (v) { v.pause(); }); playing = false; }

  // ---- clock: advances only while the module is on screen ----
  var visible = false, raf = null, last = null;
  function frame(ts) {
    raf = null;
    if (!visible) return;
    if (last !== null) clock += Math.min(0.1, (ts - last) / 1000);  // a dropped tab never skips a beat
    last = ts;
    if (clock > 1) loadVideos();
    if (clock >= T.play && !playing) playVideos();
    render(Math.min(clock, T.rest));
    if (clock < T.rest) raf = requestAnimationFrame(frame);
  }
  function resume() {
    if (clock >= T.play) playVideos();
    if (clock < T.rest && raf === null) { last = null; raf = requestAnimationFrame(frame); }
  }

  // ---- boot ----
  if (reduce) {                                   // settled six, as stills (posters); no clock
    render(T.rest + 1);
    fig.dataset.archiveReady = '1';
    return;
  }

  if (freeze) {                                   // review mode: hold any moment, videos parked on the frame
    clock = t0;
    sprite.src = WALL.src;
    var pending = vids.length + 1;
    var done = function () { if (--pending <= 0 && ready) { render(t0); fig.dataset.archiveReady = '1'; } };
    vids.forEach(function (v) {
      v.preload = 'auto';
      v.addEventListener('loadedmetadata', function () {
        v.addEventListener('seeked', done, { once: true });
        v.currentTime = Math.min(clipTime(v, t0), Math.max(0, v.duration - 0.05));
      }, { once: true });
      v.addEventListener('error', done, { once: true });
      v.load();
    });
    sprite.decode ? sprite.decode().then(function () { size(); done(); }, done) : (sprite.onload = function () { size(); done(); });
    window.addEventListener('resize', size);
    render(t0);
    return;
  }

  render(clock);                                  // first paint: page colour (wall at 0)
  window.addEventListener('resize', size);
  function begin() {
    size();
    if (t0 >= T.play) loadVideos();
    if (!('IntersectionObserver' in window)) { visible = true; resume(); return; }
    new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        visible = en.isIntersecting;
        if (visible) resume(); else { pauseVideos(); if (raf !== null) { cancelAnimationFrame(raf); raf = null; } }
      });
    }, { threshold: 0.1 }).observe(fig);
  }
  // The clock waits for the sprite so the drift never starts mid-load.
  sprite.src = WALL.src;
  (sprite.decode ? sprite.decode() : new Promise(function (r) { sprite.onload = r; })).then(begin, begin);
})();
