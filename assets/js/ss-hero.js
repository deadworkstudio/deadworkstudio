// ==========================================================================
// Hero: IMPORT -> SHRED -> SEND -> THE APP, ~11.4 s, then a short fade back to the wall and it starts over.
// Push variant (the chosen one): wall 0-1.1 s, push 1.1-1.9 s, shred ~1.9-5.5 s, clips 5.5-7.9 s, app 7.9-11.4 s.
//
//   0.0-1.1   IMPORT  the archive wall dissolves up, drifts, eases to a stop on weld-1's tile.
//   1.1-1.9   push    one continuous camera push on that tile, landing on the playing video (?v=fade|cut still exist)
//   1.9-5.5   SHRED   one hairline for the whole take, a playhead, an ink mark at each of six moments
//   5.5-7.9   SEND    the frame dissolves into six horizontal clips (3 x 2), each labelled with its length
//   7.9-11.4  APP     the six clips fly into Stock Shredder's Review screen: clip 5 into the player,
//                     the others into the clip list. Held a couple of seconds, then fade and loop.
//
// One canvas draws everything (wall sprite + six videos), so there are only six <video> elements.
// Everything visible is a pure function of one clock, so ?t=SECONDS&freeze parks any moment exactly,
// videos included; ?t=SECONDS alone starts the clock there.
// ==========================================================================
(function () {
  'use strict';
  var fig = document.querySelector('[data-iss]'); if (!fig) return;

  var MEDIA = '../../assets/img/products/stock-shredder/hero/';
  var RATIO = 16 / 9;                                             // the whole frame (and the app window)
  var CLIP_R = 2.39;                                               // the footage itself: always full widescreen, never cropped

  // ---- the wall (archive-wall.json, inlined so the page works from file://) ----
  // WEB-02: same breakpoint as the <link preload media> pair in the page head, so whichever one
  // the browser already fetched for LCP is the exact one this Image() reuses — never both. The
  // sprite sheet is a grid, so tileW/tileH (the source pixel size of one cell) must shrink by the
  // same ratio as the whole sheet, or every cellSrc() lookup below samples the wrong patch of it.
  var WALL_FULL_W = 4608, WALL_TILE_W = 192, WALL_TILE_H = 101;
  var WALL_W = (window.innerWidth || document.documentElement.clientWidth) <= 767 ? 800 : 1600;
  var WALL_FILE = WALL_W === 800 ? 'archive-wall-800.webp' : 'archive-wall-1600.webp';
  var WALL_SCALE = WALL_W / WALL_FULL_W;
  var WALL = { src: MEDIA + WALL_FILE + '?v=1', cols: 24, rows: 20, tileW: WALL_TILE_W * WALL_SCALE, tileH: WALL_TILE_H * WALL_SCALE, total: 360 };
  var VIEW_COLS = 20, FIRST_COL = 2;                               // the archive concept's window
  var VIEW_ROWS = VIEW_COLS * WALL.tileW / (WALL.tileH * RATIO);   // ≈15.9
  // The take's own frame (A002_C044_0217SC) sits at col 3,row 4, on the edge of the window. Its frame
  // moves to the middle (col 11,row 9) as weld-1; the tile it displaces moves to col 3,row 4, so the wall
  // still holds 480 different takes.
  var HERO = { col: 11, row: 9 }, ORIG = { col: 3, row: 4 };
  var REST_TOP = HERO.row + 0.5 - VIEW_ROWS / 2;                   // that tile's row centred when the drift stops
  var GUTTER = 0.035;                                              // near-black gutter, fraction of a tile

  // ---- the take ----
  // Motorcycle In The Mountains, 3:22. The scan opens on the rider from behind (01), marks each moment in a
  // quick pass, and settles on the canyon shot (06), which is the frame that gets cut into twelve.
  var TAKE = 202.4, FILE = 'MOTORCYCLE_IN_THE_MOUNTAINS';
  // Twelve shots from the finished film (moto-01..12): the six riding moments, then six from later in the film.
  var IN = [72.91, 70.87, 64.49, 68.37, 69.74, 77.71, 183.0, 186.0, 118.0, 80.0, 126.0, 147.0];   // in-points in the film (s)
  var LENS = [3.74, 1.94, 2.69, 1.27, 1.03, 1.15, 2.5, 2.5, 2.5, 2.0, 2.5, 2.0];                  // each shot's length (s)
  var N = IN.length, LAST = N - 1;
  var SHRED = 5;                                                   // the riding shot that fills the frame and gets cut into twelve
  var PLAYER = LAST;                                               // the clip that lands in the app's player (selected in the capture)
  // The scan line shows only the stretch of the film around the six shots (not the whole 3:22), so the
  // marks spread across the full width and you can watch it pick them; the timecode still reads the real time.
  var VIEW0 = Math.min.apply(null, IN) - 2, VIEW1 = Math.max.apply(null, IN.map(function (v, i) { return v + LENS[i]; })) + 2;
  function vx(p) { return Math.max(0, Math.min(100, (p - VIEW0) / (VIEW1 - VIEW0) * 100)); }
  // The riding plays at its real 24 fps (slowing it in the browser showed ~14 frames a second and
  // stuttered). During the scan each plays once; once the six panels are up, each clip loops so the
  // strip never sits on a frozen frame.
  var RATE = 1;
  // Full screen shows only the first shot and the last one; the four between are marked on the scan line
  // in a quick pass while the first shot keeps playing.
  var DWELL = IN.map(function (v, i) { return i === 0 ? 1.6 : i === SHRED ? 0.85 : 0.12; });   // wall-clock time on each moment
  var SCRUB = 260;                                                 // take-seconds per second between moments
  var FOCAL = [0.50, 0.68, 0.98, 0.60, 0.70, 0.50, 0.50, 0.58, 0.50, 0.50, 0.50, 0.22];   // where each panel crops its clip (x, 0–1)

  // ---- variant + timeline (seconds) ----
  var q = new URLSearchParams(location.search);
  var VARIANT = ({ push: 1, fade: 1, cut: 1 })[q.get('v')] ? q.get('v') : 'push';
  var T = { wallIn: [0, 0.4], cruiseEnd: 0.7, stop: 1.1 };
  var DRIFT_V = 7 / (3.8 + (5.8 - 3.8) / 2);                       // the archive concept's drift speed (rows/s)
  var DRIFT_ROWS = DRIFT_V * (T.cruiseEnd + (T.stop - T.cruiseEnd) / 2);
  var START_TOP = REST_TOP - DRIFT_ROWS;
  var X = {                                                        // P = weld-1 starts playing, F = picture is full frame
    push: { push: [1.1, 1.9], xfade: [1.9, 1.9001], P: 1.1, F: 1.9 },  // weld-1 plays inside its tile for the whole push
    fade: { dim: [3.5, 4.3], dissolve: [4.3, 5.1], P: 4.3, F: 5.1 },
    cut:  { lift: [3.5, 3.95], cut: 4.5, P: 4.5, F: 4.5 }
  }[VARIANT];
  T.metaOut = VARIANT === 'cut' ? [X.F - 0.35, X.F] : [X.F - 0.6, X.F - 0.2];   // cut: the label goes with the picture
  T.scanIn = [X.F, X.F + 0.45];

  // Playhead schedule: segments of take position over wall-clock time. The playhead is already on 1:00
  // when the picture arrives (that is what is playing), dwells through each moment, scrubs between.
  var segs = [], arrive = [X.P], tt = X.P, pp = IN[0];
  function seg_(dt, p1) { segs.push({ t0: tt, t1: tt + dt, p0: pp, p1: p1 }); tt += dt; pp = p1; }
  seg_(X.F - X.P + 0.25 + DWELL[0], IN[0] + LENS[0]);
  for (var k = 1; k < IN.length; k++) {
    seg_(Math.abs(IN[k] - pp) / SCRUB, IN[k]); arrive[k] = tt;
    seg_(DWELL[k], IN[k] + LENS[k]);
  }
  // The last shot is only 1.15 s long: zip the playhead to the end so the shot is still playing as the
  // panels open, instead of running out, freezing, and jumping back to its start mid-split.
  seg_(Math.min((TAKE - pp) / SCRUB, 0.25), TAKE);
  var SCAN_END = tt, S = SCAN_END + 0.1;
  // SHRED: red cut lines run across the full frame (the last shot) along the 4 x 3 grid, the pieces pull apart
  // into the grid, and each piece is cut over to its own clip by a red line sweeping down it. No dissolves.
  var COLS = 3, ROWS = 4;                                          // twelve widescreen tiles fill a 16:9 frame exactly
  T.cut = [S, S + 0.5]; T.part = [S + 0.5, S + 1.1];
  T.reveal0 = S + 0.95; T.revealStep = 0.035; T.revealDur = 0.32;
  T.split = [S, T.reveal0 + LAST * T.revealStep + T.revealDur];
  T.panelsIn = T.split; T.fullOut = T.split; T.scanOut = [S, S + 0.5];
  T.caps = S + 0.8; T.capDur = 0.6; T.capStep = 0.05;
  T.rest = T.caps + 5 * T.capStep + T.capDur;
  // The six clips sit as a 3 x 2 grid of horizontal frames, then fly into the app: clip 5 grows into the
  // player, the other five shrink into the clip list. The app holds a couple of seconds, then it starts over.
  T.labels = [T.split[1], T.split[1] + 0.45];
  T.toApp = [T.split[1] + 2.9, T.split[1] + 3.8];
  T.LOOP = T.toApp[1] + 3.6; T.loopOut = [T.LOOP - 0.6, T.LOOP];

  // ---- elements ----
  fig.issTimeline = T;                                             // for review tooling (?t=…&freeze)
  var canvas = fig.querySelector('[data-iss-canvas]'), ctx = canvas.getContext('2d');
  var vids = [].slice.call(fig.querySelectorAll('[data-iss-src] video'));
  vids.forEach(function (v) { v.defaultPlaybackRate = RATE; v.playbackRate = RATE; v.addEventListener('loadedmetadata', function () { v.playbackRate = RATE; }); });
  var meta = fig.querySelector('[data-iss-meta]'), scan = fig.querySelector('[data-iss-scan]');
  var marks = [].slice.call(fig.querySelectorAll('.iss-mark'));
  var rail = fig.querySelector('[data-iss-rail]'), rightEl = fig.querySelector('[data-iss-right]');
  var caps = [].slice.call(fig.querySelectorAll('[data-iss-caps] li'));
  marks.forEach(function (m, i) { m.style.left = vx(IN[i]) + '%'; m.style.width = (LENS[i] / (VIEW1 - VIEW0) * 100) + '%'; });

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
  function pad2(n) { return pad(n); }
  function tc(s) { var f = Math.min(23, Math.floor((s % 1) * 24)); s = Math.floor(s); return pad(Math.floor(s / 60)) + ':' + pad(s % 60) + ':' + pad(f); }
  function playheadAt(t) {
    if (t <= segs[0].t0) return segs[0].p0;
    for (var i = 0; i < segs.length; i++) { var s = segs[i]; if (t < s.t1) return s.p0 + (s.p1 - s.p0) * ((t - s.t0) / (s.t1 - s.t0)); }
    return TAKE;
  }
  function clipAt(t) { return t >= arrive[SHRED] ? SHRED : 0; }  // full frame: the first shot, then the one that gets shredded

  // Where each video should be at time t (seconds into the clip), or -1 if it is not on screen.
  function localTimes(t) {
    var L = IN.map(function () { return -1; });
    // clip 1 sits on its first frame on the wall and starts playing as the zoom begins, so the zoom is never frozen
    if (t < X.F) { if (t >= X.P) L[0] = t - X.P; return L; }
    if (t < S) { var c = clipAt(t); L[c] = c === 0 ? t - X.P : t - arrive[c]; return L; }
    for (var i = 0; i < N; i++) L[i] = i === SHRED ? t - arrive[SHRED] : t - S;
    return L;
  }

  // ---- images: the wall sprite and the six first frames (posters; weld-1 is also the wall tile) ----
  var sprite = new Image(); sprite.decoding = 'async';
  var posters = vids.map(function (v) { var im = new Image(); im.decoding = 'async'; im.src = v.getAttribute('poster'); return im; });
  var weld = posters[0];
  var app = new Image(); app.decoding = 'async';

  // ---- the pre-scaled sheet: the archive concept's wall, gutters baked in, at the current size ----
  var sheet = document.createElement('canvas'), sctx = sheet.getContext('2d');
  var W = 0, H = 0, tw = 0, th = 0, g = 0, dpr = 1, ready = false;
  function cellSrc(c, r) {                                         // the sprite cell shown at (c, r), after the swap
    if (c === ORIG.col && r === ORIG.row) return [HERO.col, HERO.row];
    return [c, r];
  }
  // weld-1 cover-cropped into a w x h picture: at rest it is an ordinary tile (no letterbox); during the
  // push its picture opens from the tile's shape to the full 2.39 frame, so it lands on the exact video frame.
  function drawWeld(c, x, y, w, h) { drawWeldOf(c, 0, x, y, w, h); }
  function drawWeldOf(c, i, x, y, w, h) {
    var src = frameOf(i), iw = src.videoWidth || src.naturalWidth, ih = src.videoHeight || src.naturalHeight; if (!iw) return;
    // letterboxed, never cropped: the full widescreen picture across the width, black above and below
    var ph = Math.min(h, w * ih / iw), pw = ph * iw / ih;
    c.fillStyle = '#0E0E0D'; c.fillRect(x, y, w, h);
    c.drawImage(src, x + (w - pw) / 2, y + (h - ph) / 2, pw, ph);
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
        var pw = 2 * hw, ph = pw / CLIP_R;                         // width-fit: the widescreen picture, black above and below
        ctx.save(); ctx.beginPath(); ctx.rect(X0, Y0, w, h); ctx.clip(); ctx.fillStyle = '#0E0E0D'; ctx.fillRect(X0, Y0, w, h);
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
    ctx.globalAlpha = a; drawWeldOf(ctx, i, 0, 0, W, H); ctx.globalAlpha = 1;
  }
  // A picture cover-cropped into any rect; FOCAL keeps each clip's subject in frame when the rect is narrower.
  function drawCover(i, x, y, w, h) {
    var src = frameOf(i), sw0 = src.videoWidth || src.naturalWidth, sh0 = src.videoHeight || src.naturalHeight;
    if (!sw0 || w <= 0 || h <= 0) return;
    var sw = sw0, sh = sw0 * h / w; if (sh > sh0) { sh = sh0; sw = sh0 * w / h; }
    var sx = Math.max(0, Math.min(sw0 - sw, FOCAL[i] * sw0 - sw / 2)), sy = (sh0 - sh) / 2;
    ctx.drawImage(src, sx, sy, sw, sh, x, y, w, h);
  }
  function gridRect(i) {
    var gap = Math.round(W * 0.01), cw = (W - gap * (COLS - 1)) / COLS, ch = (H - gap * (ROWS - 1)) / ROWS;
    return { x: (i % COLS) * (cw + gap), y: Math.floor(i / COLS) * (ch + gap), w: cw, h: ch };
  }
  // app-review-169.webp: the Review screen in a 16:9 window (1920 x 1080 CSS) with all twelve clips listed,
  // clip 12 selected. Numbers are in the webp's own pixels (2880 x 1620 = the 2x capture at 0.75).
  var APP_W = 2880, APP_H = 1620, K = 0.75;
  var APP_PLAYER = [580 * K, 553 * K, 2672 * K, 1119 * K];
  var APP_THUMB_Y = [326, 457, 588, 719, 850, 981, 1112, 1243, 1374, 1505, 1636, 1767].map(function (y) { return y * K; });
  var APP_THUMB = [24 * K, 128 * K, 72 * K];
  var APP_TRIM = [620 * K, 3214 * K], APP_PH = [1866 * K, 1962 * K];   // trim track x range and the playhead's y span
  function appBox() { var h = H, w = h * APP_W / APP_H; return { x: (W - w) / 2, y: 0, s: h / APP_H, w: w, h: h }; }
  function appRect(i) {
    var b = appBox(), r = i === PLAYER ? APP_PLAYER : [APP_THUMB[0], APP_THUMB_Y[i], APP_THUMB[1], APP_THUMB[2]];
    // The player keeps the full widescreen frame: 2.39:1 fitted inside the player, centred, nothing cropped.
    if (i === PLAYER) { var pw = Math.min(r[2], r[3] * CLIP_R), ph = pw / CLIP_R; r = [r[0] + (r[2] - pw) / 2, r[1] + (r[3] - ph) / 2, pw, ph]; }
    return { x: b.x + r[0] * b.s, y: b.y + r[1] * b.s, w: r[2] * b.s, h: r[3] * b.s };
  }
  function lerpRect(a, b, e) { return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, w: a.w + (b.w - a.w) * e, h: a.h + (b.h - a.h) * e }; }
  var CAPS = LENS.map(function (l) { return (l + 5).toFixed(1); });   // shown lengths (Daniel: every clip reads 5 s+)
  function drawLabel(i, rc, a) {
    if (a <= 0) return;
    // a quiet slate: soft shade along the bottom edge, small tracked type, number left and length right
    var fs = Math.round(Math.max(9 * dpr, W * 0.0074)), pad = Math.round(fs * 1.5), sh = Math.round(fs * 5);
    ctx.save(); ctx.globalAlpha = a;
    var gr = ctx.createLinearGradient(0, rc.y + rc.h - sh, 0, rc.y + rc.h);
    gr.addColorStop(0, 'rgba(10,10,9,0)'); gr.addColorStop(1, 'rgba(10,10,9,.5)');
    ctx.fillStyle = gr; ctx.fillRect(rc.x, rc.y + rc.h - sh, rc.w, sh);
    ctx.font = '500 ' + fs + 'px "JetBrains Mono", ui-monospace, monospace';
    ctx.textBaseline = 'alphabetic'; ctx.fillStyle = 'rgba(235,229,216,.92)';
    if ('letterSpacing' in ctx) ctx.letterSpacing = Math.round(fs * 0.2) + 'px';
    var y = rc.y + rc.h - pad;
    ctx.textAlign = 'left'; ctx.fillText('CLIP ' + pad2(i + 1), rc.x + pad, y);
    if ('letterSpacing' in ctx) ctx.letterSpacing = Math.round(fs * 0.04) + 'px';
    ctx.textAlign = 'right'; ctx.fillText(CAPS[i] + 's', rc.x + rc.w - pad, y);
    ctx.restore();
  }
  function drawGrid(a, t) {
    if (a <= 0) return;
    var e = inOut(seg(t, T.toApp)), la = out(seg(t, T.labels)) * (1 - clamp01(e * 3));
    if (e > 0 && app.naturalWidth) {
      var b = appBox(), sc = 1 + 0.04 * (1 - e), w = b.w * sc, h = b.h * sc;
      // the app's own dark background fills the whole widescreen frame, so no page shows beside the window
      ctx.globalAlpha = a * e; ctx.fillStyle = '#0E0E0E'; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(app, (W - w) / 2, (H - h) / 2, w, h);
      // the trim bar's playhead runs with the clip in the player (the capture has it erased)
      var l0 = localTimes(t)[PLAYER], d0 = (vids[PLAYER] && vids[PLAYER].duration) || LENS[PLAYER];
      var p = l0 >= 0 ? (l0 % d0) / d0 : 0, ks = h / APP_H, ox = (W - w) / 2, oy = (H - h) / 2;
      var px = ox + (APP_TRIM[0] + (APP_TRIM[1] - APP_TRIM[0]) * p) * ks;
      ctx.fillStyle = '#EBE5D8';                                     // the dark theme's playhead: bone, a thin line under a small notch
      ctx.fillRect(px - 1.5 * K * ks, oy + APP_PH[0] * ks, 3 * K * ks, (APP_PH[1] - APP_PH[0]) * ks);
      ctx.beginPath(); ctx.moveTo(px - 9 * K * ks, oy + APP_PH[0] * ks); ctx.lineTo(px + 9 * K * ks, oy + APP_PH[0] * ks); ctx.lineTo(px, oy + (APP_PH[0] + 13 * K) * ks); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = a;
    for (var i = 0; i < N; i++) {
      var rc = e > 0 ? lerpRect(gridRect(i), appRect(i), e) : gridRect(i);
      drawCover(i, rc.x, rc.y, rc.w, rc.h);
    }
    ctx.globalAlpha = 1;
    for (var j = 0; j < N; j++) drawLabel(j, gridRect(j), a * la);
  }

  // ---- SHRED: cut lines, pieces apart, each piece cut over to its own clip ----
  var full = document.createElement('canvas'), fctx = full.getContext('2d');
  function drawShred(t) {
    if (full.width !== W || full.height !== H) { full.width = W; full.height = H; }
    drawWeldOf(fctx, SHRED, 0, 0, W, H);
    var ep = inOut(seg(t, T.part)), lw = Math.max(1, Math.round(1.5 * dpr)), RED = '#C8584B';
    for (var k = 0; k < N; k++) {
      var c = k % COLS, r = Math.floor(k / COLS), g = gridRect(k);
      var piece = { x: c * W / COLS, y: r * H / ROWS, w: W / COLS, h: H / ROWS }, rc = lerpRect(piece, g, ep);
      ctx.drawImage(full, piece.x, piece.y, piece.w, piece.h, rc.x, rc.y, rc.w, rc.h);
      var er = out(seg(t, [T.reveal0 + k * T.revealStep, T.reveal0 + k * T.revealStep + T.revealDur]));
      if (er > 0) {
        var hh = g.h * er;
        ctx.save(); ctx.beginPath(); ctx.rect(g.x, g.y, g.w, hh); ctx.clip(); drawCover(k, g.x, g.y, g.w, g.h); ctx.restore();
        if (er < 1) { ctx.fillStyle = RED; ctx.fillRect(g.x, g.y + hh - lw / 2, g.w, lw); }
      }
    }
    if (ep > 0) return;
    // the blades: three vertical cuts top to bottom, then two across, each a hairline with a bright tip
    ctx.fillStyle = RED;
    for (var v = 1; v < COLS; v++) {
      var e = out(seg(t, [S + (v - 1) * 0.06, S + 0.3 + (v - 1) * 0.06])), x = Math.round(v * W / COLS - lw / 2);
      if (e > 0) ctx.fillRect(x, 0, lw, H * e);
    }
    for (var h = 1; h < ROWS; h++) {
      var e2 = out(seg(t, [S + 0.16 + (h - 1) * 0.06, S + 0.46 + (h - 1) * 0.06])), y = Math.round(h * H / ROWS - lw / 2);
      if (e2 > 0) ctx.fillRect(0, y, W * e2, lw);
    }
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
      setStyle(rail, 'rail', 'transform', 'translateX(' + vx(ph).toFixed(3) + '%)');
      var label = tc(ph); if (rightEl.textContent !== label) rightEl.textContent = label;
      for (var m = 0; m < marks.length; m++) setStyle(marks[m], 'm' + m, 'transform', 'scaleX(' + clamp01((ph - IN[m]) / LENS[m]).toFixed(4) + ')');
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
    if (t < S) { drawFull(clipAt(t), 1); return; }
    if (t < T.split[1]) { drawShred(t); return; }
    drawGrid(1, t);
  }

  // ---- video: load clip 1 with the wall (it's already playing inside its tile from t=0), then
  // each later clip just-in-time — a little before its own arrival, never all six at once. Six
  // small clips (~4 MB total) don't need the old loadAll() eager-preload-everything approach; the
  // real cost was asking for six files the instant the hero appeared instead of spreading the ask
  // out over the ~7 s it actually takes to reach each one. ----
  var videoLoaded = IN.map(function () { return false; });
  var LOAD_LEAD = 1.5;   // seconds of wall-clock lead time before a clip is first needed
  function loadClip(i) {
    if (videoLoaded[i]) return; videoLoaded[i] = true;
    var v = vids[i]; v.preload = 'auto'; v.load();
  }
  function loadScheduled(t) {
    loadClip(0);                                                    // playing inside the wall tile from t = 0
    for (var i = 1; i < vids.length; i++) if (t >= arrive[i] - LOAD_LEAD) loadClip(i);
  }
  function loadAll() { for (var i = 0; i < vids.length; i++) loadClip(i); }   // deep-link (?t=) fallback only
  function syncVideos(t) {
    var L = localTimes(t);
    for (var i = 0; i < vids.length; i++) {
      var v = vids[i];
      if (L[i] >= 0) {
        // panels up: keep every clip moving. The last shot is also the full frame fading out under the
        // panels, so it holds its final frame until that fade is done instead of jumping back mid-dissolve.
        if (v.ended && t >= (i === SHRED ? T.split[1] : S)) { try { v.currentTime = 0; } catch (e) {} }
        if (v.paused && !v.ended) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      }
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
      size(); ready = true; render(T.labels[1] + 0.1);
      window.addEventListener('resize', function () { size(); ready = true; render(T.labels[1] + 0.1); });
      fig.dataset.issReady = '1';
    });
    return;
  }

  sprite.src = WALL.src;
  app.src = MEDIA + 'app-review-169.webp?v=1';
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
          var d = v.duration || LENS[i];
          v.addEventListener('seeked', function () { res(); }, { once: true });
          v.currentTime = Math.min(lt * RATE, d - 0.05);
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
    loadScheduled(clock);
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
