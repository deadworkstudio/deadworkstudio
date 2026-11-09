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
  var CLIP_R = 2.39;                                               // the footage's own shape (full frame covers the 16:9; tiles show it whole)

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
  // Daniel: no image on the wall may repeat. The sprite holds 360 different shots (its last two rows
  // repeat the first two, a few are near-identical frames of one shot), and a 20-wide window showed ~23
  // rows, so the wall wrapped and rows came back. Now the window is 16 tiles wide (20 rows on screen over
  // the whole drift), and every cell is laid out from WALL_MAP: 319 checked-distinct sprite cells
  // (index = row * 24 + col), none of them the take itself, which only ever appears as the hero tile.
  var VIEW_COLS = 16, FIRST_COL = 0;
  var VIEW_ROWS = VIEW_COLS * WALL.tileW / (WALL.tileH * RATIO);   // ≈17.1
  var HERO = { col: 8, row: 10 };                                  // the take's tile, centred on screen at rest
  var REST_TOP = HERO.row + 0.5 - VIEW_ROWS / 2;                   // that tile's row centred when the drift stops
  var SHEET_ROWS = 20;                                             // rows laid out (the drift never shows more)
  var WALL_MAP = [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,98,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,122,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,146,147,148,149,151,152,153,154,157,158,159,160,161,162,163,164,165,170,171,172,173,174,175,176,177,178,179,181,182,183,184,185,186,187,188,189,194,195,196,197,198,199,200,201,202,204,206,207,208,209,210,211,212,213,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,242,243,244,245,246,248,249,251,252,253,254,255,256,258,259,260,261,266,267,268,269,271,272,274,275,276,277,278,279,280,281,283,284,285,290,291,292,293,294,295,298,299,300,301,302,303,304,305,306,308,309,314,315,316,317,318,319,320,321,322,323,324,325,326,327,328,329,330,331,332,333,339,340,341,342,343,344,345,346,347,348,349,351,352,353,354,355,356,357,362,363,364,366,367,368,369,370,371,372,373,374,375,376,377,378,380,381,386,387,388,389,390,391,392,393,394,395,396,397,398,399,400,401,402,403,404,405];
  var GUTTER = 0.035;                                              // near-black gutter, fraction of a tile

  // ---- the take ----
  // Motorcycle In The Mountains, 3:22. The scan opens on the rider from behind (01), marks each moment in a
  // quick pass, and settles on the canyon shot (06), which is the frame that gets cut into twelve.
  var TAKE = 202.4, FILE = 'MOTORCYCLE_IN_THE_MOUNTAINS';
  // Twelve shots from the finished film (moto-01..12): the six riding moments, then six from later in the film.
  var IN = [72.91, 70.87, 64.49, 68.37, 69.74, 72.90, 183.0, 186.0, 118.0, 80.0, 126.0, 78.95];   // in-points in the film (s)
  var LENS = [3.74, 1.94, 2.69, 1.27, 1.03, 4.67, 2.5, 2.5, 2.5, 2.0, 2.5, 7.05];                  // each shot's length (s)
  var N = IN.length, LAST = N - 1;
  var SHRED = 5;                                                   // the riding shot that fills the frame and gets cut into twelve
  var PLAYER = LAST;                                               // the clip that lands in the app's player (selected in the capture)
  // clip 01 and the shred shot are the same riding moment, so the wall tile, the push and the full frame all
  // use the shred shot: it starts as the push begins and plays once, start to end, then gets cut into twelve
  // (Daniel: no repeating the shot, play its whole length).
  var HERO_CLIP = SHRED;
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
  var DWELL = IN.map(function (v, i) { return i === 0 ? 1.6 : i === SHRED ? 0.7 : 0.12; });   // wall-clock time on each moment
  var SCRUB = 260;                                                 // take-seconds per second between moments
  var FOCAL = [0.50, 0.68, 0.98, 0.60, 0.70, 0.50, 0.50, 0.58, 0.50, 0.50, 0.50, 0.50];   // where each panel crops its clip (x, 0–1)

  // ---- variant + timeline (seconds) ----
  var q = new URLSearchParams(location.search);
  var CAPTURE = q.has('capture');                                  // review renders: videos are seeked, never played
  var VARIANT = ({ push: 1, fade: 1, cut: 1 })[q.get('v')] ? q.get('v') : 'push';
  // Options under review (Daniel 2026-11-05): ?splice=cuts|timeline|shutter|gate|clap and ?end=cut|tile|matte|approve|slate
  var SPLICE = ({ process: 1, cuts: 1, timeline: 1, shutter: 1, gate: 1, clap: 1 })[q.get('splice')] ? q.get('splice') : 'process';
  var END = ({ export: 1, cut: 1, tile: 1, matte: 1, approve: 1, slate: 1 })[q.get('end')] ? q.get('end') : 'export';
  var looped = false;                                              // true once the hero has gone round once
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
  // Fit the scan into the hero shot's own length so the cut lands right as the shot ends (one play, no loop).
  var SCAN_END = X.P + LENS[HERO_CLIP] - 1.1,   // the cut starts a second before the shot ends, so it never freezes
      fitK = (SCAN_END - X.P) / (tt - X.P);
  segs.forEach(function (s) { s.t0 = X.P + (s.t0 - X.P) * fitK; s.t1 = X.P + (s.t1 - X.P) * fitK; });
  arrive = arrive.map(function (a) { return X.P + (a - X.P) * fitK; });
  var S = SCAN_END + 0.1;
  // SHRED: red cut lines run across the full frame (the last shot) along the 4 x 3 grid, the pieces pull apart
  // into the grid, and each piece is cut over to its own clip by a red line sweeping down it. No dissolves.
  var COLS = 3, ROWS = 4;                                          // twelve widescreen tiles fill a 16:9 frame exactly
  T.cut = [S, S + 0.5]; T.part = [S + 0.5, S + 1.1];
  T.reveal0 = S + 0.95; T.revealStep = 0.035; T.revealDur = 0.32;
  T.split = [S, T.reveal0 + LAST * T.revealStep + T.revealDur];
  var SPLICE_D = { blade: 0, process: 0, cuts: 1.5, timeline: 1.7, shutter: 1.2, gate: 1.5, clap: 0.9 }[SPLICE];
  if (SPLICE_D) T.split = [S, S + SPLICE_D];
  var PROCESS_AT = T.split.length;                                 // (process length is set once its schedule is built)
  T.panelsIn = T.split; T.fullOut = T.split; T.scanOut = [S, S + 0.5];
  T.caps = S + 0.8; T.capDur = 0.6; T.capStep = 0.05;
  T.rest = T.caps + 5 * T.capStep + T.capDur;
  // The six clips sit as a 3 x 2 grid of horizontal frames, then fly into the app: clip 5 grows into the
  // player, the other five shrink into the clip list. The app holds a couple of seconds, then it starts over.
  T.labels = [T.split[1], T.split[1] + 0.45];
  T.toApp = [T.split[1] + 2.9, T.split[1] + 3.8];
  // clip 12 starts from its first frame as it flies into the player and plays its whole length once;
  // the loop ends with its last frame (Daniel: start at 0:00, play the entire clip).
  T.playerIn = T.toApp[0];
  T.clipEnd = T.playerIn + LENS[PLAYER];
  var END_D = { fade: 0, export: 3.6, cut: 0.75, tile: 2.0, matte: 0.95, approve: 1.3, slate: 1.7 }[END];
  T.LOOP = T.clipEnd + END_D;
  T.loopOut = END === 'fade' ? [T.LOOP - 0.6, T.LOOP] : [1e9, 1e9 + 1];
  var RESTART = { fade: 0, export: 0.4, cut: 0.4, tile: 1.1, matte: 0, approve: 0, slate: 0.4 }[END];

  // ---- elements ----
  fig.issTimeline = T;                                             // for review tooling (?t=…&freeze)
  var canvas = fig.querySelector('[data-iss-canvas]'), ctx = canvas.getContext('2d', q.has('capture') ? { willReadFrequently: true } : undefined);   // capture: a software canvas, so seeked video frames always redraw
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

  // Where each video should be at time t (seconds into the clip), or -1 if it is not on screen.
  function localTimes(t) {
    var L = IN.map(function () { return -1; });
    // the hero shot sits on its first frame on the wall and starts playing as the zoom begins, then plays
    // straight through the full frame (one take, never restarted) until it is cut
    if (t < S) { if (t >= X.P) L[HERO_CLIP] = t - X.P; return L; }
    for (var i = 0; i < N; i++) L[i] = i === HERO_CLIP ? t - X.P : i === PLAYER && t >= T.playerIn ? Math.min(t - T.playerIn, LENS[PLAYER] - 0.04) : t - S;
    return L;
  }

  // ---- images: the wall sprite and the six first frames (posters; weld-1 is also the wall tile) ----
  var sprite = new Image(); sprite.decoding = 'async';
  var posters = vids.map(function (v) { var im = new Image(); im.decoding = 'async'; im.src = v.getAttribute('poster'); return im; });
  var app = new Image(); app.decoding = 'async';
  var ssLogo = new Image(); ssLogo.decoding = 'async'; ssLogo.src = '../../assets/img/products/stock-shredder/logo-bone.png';

  // ---- the pre-scaled sheet: the archive concept's wall, gutters baked in, at the current size ----
  var sheet = document.createElement('canvas'), sctx = sheet.getContext('2d');
  var W = 0, H = 0, tw = 0, th = 0, g = 0, dpr = 1, ready = false;
  function cellSrc(c, r) {                                         // the sprite cell shown at sheet cell (c, r)
    var n = r * VIEW_COLS + c; if (r > HERO.row || (r === HERO.row && c > HERO.col)) n--;   // the hero cell takes no sprite tile
    var k = WALL_MAP[n % WALL_MAP.length]; return [k % WALL.cols, Math.floor(k / WALL.cols)];
  }
  // weld-1 cover-cropped into a w x h picture: at rest it is an ordinary tile (no letterbox); during the
  // push its picture opens from the tile's shape to the full 2.39 frame, so it lands on the exact video frame.
  function drawWeld(c, x, y, w, h) { drawWeldOf(c, HERO_CLIP, x, y, w, h); }
  function drawWeldOf(c, i, x, y, w, h) {
    var src = frameOf(i), iw = src.videoWidth || src.naturalWidth, ih = src.videoHeight || src.naturalHeight; if (!iw) return;
    // fills the frame edge to edge (Daniel: no black bars): cover, trimming only the sides
    var sc = Math.max(w / iw, h / ih), pw = iw * sc, ph = ih * sc;
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    c.drawImage(src, x + (w - pw) / 2, y + (h - ph) / 2, pw, ph);
    c.restore();
  }
  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = canvas.clientWidth || fig.clientWidth; if (!w) return;
    canvas.width = W = Math.round(w * dpr); canvas.height = H = Math.round(w / RATIO * dpr);
    tw = W / VIEW_COLS; th = tw * WALL.tileH / WALL.tileW;
    g = Math.max(1, Math.round(tw * GUTTER));                      // ~2 px on desktop, 1 px on phones
    if (!sprite.naturalWidth) return;
    sheet.width = Math.ceil(tw * VIEW_COLS); sheet.height = Math.ceil(th * SHEET_ROWS);
    sctx.fillStyle = '#0E0E0D'; sctx.fillRect(0, 0, sheet.width, sheet.height);
    sctx.imageSmoothingEnabled = true; sctx.imageSmoothingQuality = 'high';
    for (var r = 0; r < SHEET_ROWS; r++) for (var c = 0; c < VIEW_COLS; c++) {
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
    var sheetH = th * SHEET_ROWS, top = wallTop(t);
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
  function drawPush(e, heroFn) {
    var cx = (HERO.col - FIRST_COL + 0.5) * tw, cy = (HERO.row - REST_TOP + 0.5) * th;   // tile centre at rest
    // solve s*Z - g*sqrt(Z) = F for both sides, and take the larger: the tile lands covering the whole frame
    // (no strip of the row above or below peeking in), trimming only its sides, like the full frame does
    function solveZ(s, F) { var z = F / s; for (var n = 0; n < 6; n++) z -= (s * z - g * Math.sqrt(z) - F) / (s - g / (2 * Math.sqrt(z))); return z; }
    var Z = Math.max(solveZ(tw, W), solveZ(th, H));
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
      var rr = ((r % SHEET_ROWS) + SHEET_ROWS) % SHEET_ROWS, cc = ((c % VIEW_COLS) + VIEW_COLS) % VIEW_COLS;
      if (cc === HERO.col && rr === HERO.row) {
        if (heroFn) { heroFn(X0, Y0, w, h, e); continue; }
        if (e >= 1) { drawWeld(ctx, 0, 0, W, H); continue; }       // land exactly on the frame
        // The picture always covers whatever part of its tile is on screen (never a dark band), keeps
        // its own 2.39 shape, and at the end of the push that is exactly the full frame.
        var pcx = X0 + w / 2, pcy = Y0 + h / 2;
        var hw = Math.max(pcx - Math.max(X0, 0), Math.min(X0 + w, W) - pcx), hv = Math.max(pcy - Math.max(Y0, 0), Math.min(Y0 + h, H) - pcy);
        var pw = Math.max(2 * hw, 2 * hv * CLIP_R), ph = pw / CLIP_R;   // cover: no black above or below
        ctx.save(); ctx.beginPath(); ctx.rect(X0, Y0, w, h); ctx.clip(); ctx.fillStyle = '#0E0E0D'; ctx.fillRect(X0, Y0, w, h);
        ctx.drawImage(frameOf(HERO_CLIP), pcx - pw / 2, pcy - ph / 2, pw, ph);   // the live video itself: no image-to-video swap
        ctx.restore();
        continue;
      }
      var src = cellSrc(cc, rr);
      ctx.drawImage(sprite, src[0] * WALL.tileW, src[1] * WALL.tileH, WALL.tileW, WALL.tileH, X0, Y0, w, h);
    }
  }

  // ---- video frames ----
  function frameOf(i) { var v = vids[i]; return CAPTURE || v.readyState >= 2 || !(posters[i].complete && posters[i].naturalWidth) ? v : posters[i]; }
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
  var APP_PLAYER = [578 * K, 575 * K, 2676 * K, 1121 * K];
  var APP_THUMB_Y = [326, 457, 588, 719, 850, 981, 1112, 1243, 1374, 1505, 1636, 1767].map(function (y) { return y * K; });
  var APP_THUMB = [24 * K, 128 * K, 72 * K];
  var APP_TRIM = [606 * K, 3226 * K], APP_PH = [1916 * K, 2008 * K];   // trim track x range and the playhead's y span
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
  function drawGrid(a, t, skip) {
    if (a <= 0) return;
    var e = inOut(seg(t, T.toApp)), la = out(seg(t, T.labels)) * (1 - clamp01(e * 3));
    drawAppBg(a, e, t);
    ctx.globalAlpha = a;
    for (var i = 0; i < N; i++) {
      if (i === skip) continue;
      var rc = e > 0 ? lerpRect(gridRect(i), appRect(i), e) : gridRect(i);
      drawCover(i, rc.x, rc.y, rc.w, rc.h);
    }
    ctx.globalAlpha = 1;
    if (SPLICE !== 'process') for (var j = 0; j < N; j++) drawLabel(j, gridRect(j), a * la);
  }
  // the Review screen behind the clips, faded in by e (its own dark background fills the frame)
  function drawAppBg(a, e, t) {
    if (e > 0 && app.complete && app.naturalWidth) {
      var b = appBox(), sc = 1 + 0.04 * (1 - e), w = b.w * sc, h = b.h * sc;
      // the app's own dark background fills the whole widescreen frame, so no page shows beside the window
      ctx.globalAlpha = a * e; ctx.fillStyle = '#0E0E0E'; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(app, (W - w) / 2, (H - h) / 2, w, h);
      // the trim bar's playhead runs with the clip in the player (the capture has it erased)
      var vp = vids[PLAYER], d0 = (vp && vp.duration) || LENS[PLAYER];
      var p = t >= T.playerIn && vp && vp.readyState >= 1 ? Math.min(1, vp.currentTime / d0) : 0, ks = h / APP_H, ox = (W - w) / 2, oy = (H - h) / 2;
      var px = ox + (APP_TRIM[0] + (APP_TRIM[1] - APP_TRIM[0]) * p) * ks;
      ctx.fillStyle = '#EBE5D8';                                     // the dark theme's playhead: bone, a thin line under a small notch
      ctx.fillRect(px - 1.5 * K * ks, oy + APP_PH[0] * ks, 3 * K * ks, (APP_PH[1] - APP_PH[0]) * ks);
      ctx.beginPath(); ctx.moveTo(px - 9 * K * ks, oy + APP_PH[0] * ks); ctx.lineTo(px + 9 * K * ks, oy + APP_PH[0] * ks); ctx.lineTo(px, oy + (APP_PH[0] + 13 * K) * ks); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
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

  // ---- splice options (Daniel 2026-11-05): the riding shot is cut into twelve, five ways ----
  function pieceRect(k) { var c = k % COLS, r = Math.floor(k / COLS); return { x: c * W / COLS, y: r * H / ROWS, w: W / COLS, h: H / ROWS }; }
  function drawPiece(k, rc) { var p = pieceRect(k); ctx.drawImage(full, p.x, p.y, p.w, p.h, rc.x, rc.y, rc.w, rc.h); }
  function clipIn(k, rc, fn) { ctx.save(); ctx.beginPath(); ctx.rect(rc.x, rc.y, rc.w, rc.h); ctx.clip(); fn(); ctx.restore(); }
  var CUT_ORDER = [5, 0, 7, 2, 10, 3, 8, 1, 11, 4, 9, 6];
  function drawSplice(t) {
    if (full.width !== W || full.height !== H) { full.width = W; full.height = H; }
    drawWeldOf(fctx, HERO_CLIP, 0, 0, W, H);
    var u = t - S, k, rc, g0;
    ctx.fillStyle = '#0E0E0D'; ctx.fillRect(0, 0, W, H);
    if (SPLICE === 'cuts') {
      // Editor's cuts: no lines, no motion. Twelve hard cuts, two frames apart, in edit order; then the gaps open.
      var go = inOut(seg(u, [1.15, 1.45]));
      for (k = 0; k < N; k++) {
        rc = lerpRect(pieceRect(k), gridRect(k), go);
        if (u >= 0.15 + CUT_ORDER.indexOf(k) / 12) drawCover(k, rc.x, rc.y, rc.w, rc.h); else drawPiece(k, rc);
      }
    } else if (SPLICE === 'timeline') {
      // Into the timeline: the frame folds down into an edit bar, twelve marks land on it, and each clip rises out of its mark.
      var e1 = inOut(seg(u, [0, 0.5])), bx = W * 0.04, bw = W * 0.92, by = H * 0.9, bh = Math.max(2, H * 0.012);
      var barA = 1 - seg(u, [0.9, 1.3]);
      if (barA > 0) {
        var fr = lerpRect({ x: 0, y: 0, w: W, h: H }, { x: bx, y: by, w: bw, h: bh }, e1);
        ctx.globalAlpha = barA; ctx.drawImage(full, fr.x, fr.y, fr.w, fr.h);
        ctx.fillStyle = '#C8584B';
        for (k = 0; k < N; k++) { var mk = out(seg(u, [0.3 + k * 0.02, 0.45 + k * 0.02])); if (mk > 0) ctx.fillRect(bx + bw * (k + 0.5) / N - 1, by - bh * 2 * mk, Math.max(2, dpr * 1.5), bh * 5 * mk); }
        ctx.globalAlpha = 1;
      }
      for (k = 0; k < N; k++) {
        var s1 = out(seg(u, [0.5 + k * 0.05, 1.05 + k * 0.05])); if (s1 <= 0) continue;
        g0 = gridRect(k); var sw = W * 0.05, mx = bx + bw * (k + 0.5) / N;
        rc = lerpRect({ x: mx - sw / 2, y: by - sw * g0.h / g0.w, w: sw, h: sw * g0.h / g0.w }, g0, s1);
        drawCover(k, rc.x, rc.y, rc.w, rc.h);
      }
    } else if (SPLICE === 'shutter') {
      // Rotary shutter: the frame parts into twelve, and a black shutter blade passes over each piece, leaving its own clip behind.
      var gs = inOut(seg(u, [0, 0.3]));
      for (k = 0; k < N; k++) {
        var c = k % COLS, r = Math.floor(k / COLS); rc = lerpRect(pieceRect(k), gridRect(k), gs);
        var st = 0.25 + (c + r * 1.2) * 0.07, sp = seg(u, [st, st + 0.24]);
        if (sp <= 0) { drawPiece(k, rc); continue; }
        if (sp >= 1) { drawCover(k, rc.x, rc.y, rc.w, rc.h); continue; }
        var bw2 = rc.w * 0.35, bl = rc.x - bw2 + (rc.w + bw2) * sp;
        clipIn(k, { x: rc.x, y: rc.y, w: Math.max(0, bl - rc.x), h: rc.h }, function () { drawCover(k, rc.x, rc.y, rc.w, rc.h); });
        clipIn(k, { x: bl + bw2, y: rc.y, w: Math.max(0, rc.x + rc.w - bl - bw2), h: rc.h }, function () { drawPiece(k, rc); });
        ctx.fillStyle = '#0A0A09'; ctx.fillRect(Math.max(rc.x, bl), rc.y, Math.min(rc.x + rc.w, bl + bw2) - Math.max(rc.x, bl), rc.h);
      }
    } else if (SPLICE === 'gate') {
      // The gate: the frame opens into three columns, each column into four, then every piece cuts to its own clip, one frame apart.
      var ea = inOut(seg(u, [0, 0.45])), eb = inOut(seg(u, [0.4, 0.85]));
      for (k = 0; k < N; k++) {
        var p0 = pieceRect(k); g0 = gridRect(k);
        rc = { x: p0.x + (g0.x - p0.x) * ea, w: p0.w + (g0.w - p0.w) * ea, y: p0.y + (g0.y - p0.y) * eb, h: p0.h + (g0.h - p0.h) * eb };
        if (u >= 0.9 + k / 24) drawCover(k, rc.x, rc.y, rc.w, rc.h); else drawPiece(k, rc);
      }
    } else if (SPLICE === 'clap') {
      // Slate clap: a clapper stick swings shut across the top of the frame; on the clap it is twelve clips.
      var shut = 0.33, sh = H * 0.075;
      if (u < shut) {
        ctx.drawImage(full, 0, 0);
        var a = -0.5 * (1 - Math.pow(seg(u, [0, shut]), 2));
        drawStick(a, 0, 1, sh);
      } else {
        for (k = 0; k < N; k++) { g0 = gridRect(k); drawCover(k, g0.x, g0.y, g0.w, g0.h); }
        if (u < shut + 1 / 24) { ctx.fillStyle = 'rgba(245,242,235,.55)'; ctx.fillRect(0, 0, W, H); }
        var lift = inOut(seg(u, [0.4, 0.75]));
        if (lift < 1) drawStick(0, -sh * 1.6 * lift, 1 - lift, sh);
      }
    }
  }
  function drawStick(a, dy, alpha, sh) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(0, sh + dy); ctx.rotate(a);
    ctx.fillStyle = '#EBE5D8'; ctx.fillRect(0, -sh, W, sh);
    ctx.fillStyle = '#0E0E0D';
    for (var x = -sh; x < W + sh; x += sh * 1.6) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + sh * 0.8, 0); ctx.lineTo(x + sh * 1.6, -sh); ctx.lineTo(x + sh * 0.8, -sh); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }

  // ---- splice option: the process (Daniel: "more like the process than a slideshow") ----
  // The take folds down into an edit timeline. A playhead scans it in film order; at each moment it sets an
  // in-point, runs to the out-point, and the cut lifts out of the timeline into its slot, where it plays.
  // The first three are taken at reading speed, then it speeds up like an editor in rhythm. Then the
  // timeline drops away and the twelve open to full frame.
  var P_ORDER = IN.map(function (v, i) { return i; }).sort(function (a, b) { return IN[a] - IN[b] || a - b; });
  // Daniel 2026-11-09: no empty-grid beat; the first cut starts as the timeline draws in, and each clip lands faster.
  var P_START = 0.2, P_EV = [], pu = P_START;
  P_ORDER.forEach(function (k, j) {
    var travel = 0.05, dwell = 0.12;                               // one steady rhythm, no pauses (Daniel)
    pu += travel; P_EV[k] = { a: pu, b: pu + dwell, j: j }; pu += dwell;
  });
  var P_LIFT = 0.28, P_END = pu + P_LIFT, P_D = P_END + 0.9;   // last 0.9 s: the clips fly into the app
  function pStrip() { return { x: W * 0.04, y: H * 0.865, w: W * 0.92, h: H * 0.075 }; }
  function pX(film) { var s = pStrip(); return s.x + s.w * vx(film) / 100; }
  function pSlot(k, open) {                                        // the grid squeezed above the timeline, opening to full frame
    var g = gridRect(k), top = H * 0.03, avail = H * 0.8, sc = avail / H;
    var sq = { x: W * 0.5 + (g.x - W * 0.5) * sc, y: top + g.y * sc, w: g.w * sc, h: g.h * sc };
    // Daniel 2026-11-06: no twelve-up grid; once the last clip is picked they fly straight into the app
    return lerpRect(sq, appRect(k), open);
  }
  function pPlayhead(u) {
    var prev = { film: VIEW0, at: P_START };
    for (var j = 0; j < P_ORDER.length; j++) {
      var k = P_ORDER[j], ev = P_EV[k];
      if (u < ev.a) return prev.film + (IN[k] - prev.film) * clamp01((u - prev.at) / (ev.a - prev.at));
      if (u < ev.b) return IN[k] + LENS[k] * (u - ev.a) / (ev.b - ev.a);
      prev = { film: IN[k] + LENS[k], at: ev.b };
    }
    return prev.film + (VIEW1 - prev.film) * clamp01((u - prev.at) / 0.3);
  }
  function drawProcess(t) {
    if (full.width !== W || full.height !== H) { full.width = W; full.height = H; }
    drawWeldOf(fctx, HERO_CLIP, 0, 0, W, H);
    var u = t - S, st = pStrip(), k, j;
    var open = inOut(seg(u, [P_END, P_D])), stripA = 1 - inOut(seg(u, [P_END - 0.1, P_END + 0.3]));
    // no fold: the take keeps playing where it is and dims back while the timeline draws in under it
    var fold = out(seg(u, [0, 0.3])), dim = inOut(seg(u, [0.05, 0.35]));
    ctx.fillStyle = '#0E0E0D'; ctx.fillRect(0, 0, W, H);
    if (dim < 1) { ctx.globalAlpha = 1 - dim; ctx.drawImage(full, 0, 0); ctx.globalAlpha = 1; }
    if (open > 0) drawAppBg(1, open, t);
    // empty slots, waiting
    if (fold > 0 && open < 1) {
      ctx.strokeStyle = 'rgba(235,229,216,' + (0.14 * fold * (1 - open)) + ')'; ctx.lineWidth = Math.max(1, dpr);
      for (k = 0; k < N; k++) { var es = pSlot(k, open); ctx.strokeRect(es.x + 0.5, es.y + 0.5, es.w - 1, es.h - 1); }
    }
    // the timeline: the take as a filmstrip (the used moments bright, the rest of the film dim)
    if (stripA > 0) {
      ctx.save(); ctx.globalAlpha = stripA;
      var dy = H * 0.06 * (1 - stripA);
      if (fold > 0) {
        var NC = 46, cw = st.w / NC, fa = 1;
        ctx.save(); ctx.beginPath(); ctx.rect(st.x - st.h, 0, (st.w + st.h * 2) * fold, H); ctx.clip();   // draws in left to right
        ctx.globalAlpha = stripA * fa;
        for (var c = 0; c < NC; c++) {
          var film = VIEW0 + (c + 0.5) / NC * (VIEW1 - VIEW0), near = 0, bd = 1e9;
          for (k = 0; k < N; k++) { var dd = Math.abs(film - (IN[k] + LENS[k] / 2)); if (dd < bd) { bd = dd; near = k; } }
          var im = posters[near], iw = im.naturalWidth, ih = im.naturalHeight; if (!iw) continue;
          var sw = iw, sh = iw * st.h / cw; if (sh > ih) { sh = ih; sw = ih * cw / st.h; }
          ctx.drawImage(im, (iw - sw) / 2, (ih - sh) / 2, sw, sh, st.x + c * cw + 0.5, st.y + dy, cw - 1, st.h);
        }
        ctx.fillStyle = 'rgba(14,14,13,.55)'; ctx.fillRect(st.x, st.y + dy, st.w, st.h);   // unused footage sits back
        // the cuts so far: bright, with in and out brackets
        var ph = pPlayhead(u), RED = '#C8584B', lw = Math.max(1, Math.round(1.5 * dpr));
        for (k = 0; k < N; k++) {
          var ev = P_EV[k]; if (u < ev.a) continue;
          var x0 = pX(IN[k]), x1 = pX(Math.min(IN[k] + LENS[k], u < ev.b ? ph : IN[k] + LENS[k]));
          var lifted = out(seg(u, [ev.b, ev.b + P_LIFT]));
          if (lifted < 1) { ctx.save(); ctx.beginPath(); ctx.rect(x0, st.y + dy, Math.max(1, x1 - x0), st.h); ctx.clip(); ctx.globalAlpha = stripA * fa * (1 - lifted); drawCover(k, x0, st.y + dy, Math.max(st.h * 2.39, x1 - x0), st.h); ctx.restore(); ctx.globalAlpha = stripA * fa; }
          ctx.fillStyle = RED;
          ctx.fillRect(x0 - lw, st.y + dy - st.h * 0.18, lw * 2, st.h * 1.36);                  // in
          if (u >= ev.b) ctx.fillRect(x1 - lw, st.y + dy - st.h * 0.18, lw * 2, st.h * 1.36);   // out
          ctx.fillRect(x0, st.y + dy - st.h * 0.18, x1 - x0, lw);
        }
        // playhead
        var px = pX(ph); ctx.fillStyle = '#EBE5D8';
        ctx.fillRect(px - lw / 2, st.y + dy - st.h * 0.45, lw, st.h * 1.7);
        ctx.beginPath(); ctx.moveTo(px - st.h * 0.16, st.y + dy - st.h * 0.45); ctx.lineTo(px + st.h * 0.16, st.y + dy - st.h * 0.45); ctx.lineTo(px, st.y + dy - st.h * 0.25); ctx.closePath(); ctx.fill();
        // slate text: the file, the clip count, the timecode
        var fs = Math.round(Math.max(9 * dpr, W * 0.0078)), done = 0;
        for (k = 0; k < N; k++) if (u >= P_EV[k].b) done++;
        ctx.font = '500 ' + fs + 'px "JetBrains Mono", ui-monospace, monospace'; ctx.textBaseline = 'alphabetic';
        if ('letterSpacing' in ctx) ctx.letterSpacing = Math.round(fs * 0.2) + 'px';
        ctx.fillStyle = 'rgba(235,229,216,.6)'; ctx.textAlign = 'left'; ctx.fillText(FILE, st.x, st.y + dy - st.h * 0.6);
        ctx.textAlign = 'right'; ctx.fillStyle = '#EBE5D8';
        ctx.fillText(pad2(done) + ' / 12 CLIPS    ' + tc(ph), st.x + st.w, st.y + dy - st.h * 0.6);
        ctx.restore();
      }
      ctx.restore();
    }
    // each cut lifts out of the timeline into its slot and plays there
    for (k = 0; k < N; k++) {
      var e2 = P_EV[k], lf = out(seg(u, [e2.b, e2.b + P_LIFT])); if (lf <= 0) continue;
      var a0 = pX(IN[k]), a1 = pX(IN[k] + LENS[k]), from = { x: a0, y: st.y, w: Math.max(st.h * 1.8, a1 - a0), h: st.h };
      var rc = lerpRect(from, pSlot(k, open), lf);
      drawCover(k, rc.x, rc.y, rc.w, rc.h);
    }
  }

  if (SPLICE === 'process') { T.split = [S, S + P_D]; T.labels = [T.split[1], T.split[1] + 0.001]; T.toApp = [T.split[1] - 0.002, T.split[1] - 0.001]; T.playerIn = S + P_END; T.clipEnd = T.playerIn + LENS[PLAYER]; T.LOOP = T.clipEnd + END_D; if (END === 'fade') T.loopOut = [T.LOOP - 0.6, T.LOOP]; }

  // ---- ending options: what happens after the app has played clip 12 to its last frame ----
  var snap = document.createElement('canvas'), snapCtx = snap.getContext('2d');
  function appSnap(skip) {                                         // the app at the end of the take, as one picture
    if (snap.width !== W || snap.height !== H) { snap.width = W; snap.height = H; }
    var keep = ctx; ctx = snapCtx; ctx.clearRect(0, 0, W, H); drawGrid(1, T.clipEnd - 0.001, skip); ctx = keep;
    return snap;
  }
  function drawMatte(m, lineA) {                                   // m: 0 open .. 1 closed to a line
    var bh = H / 2 * m;
    ctx.fillStyle = '#0A0A09'; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
    if (lineA > 0) { ctx.fillStyle = 'rgba(235,229,216,' + lineA + ')'; var lw = W * lineA; ctx.fillRect((W - lw) / 2, H / 2 - dpr, lw, 2 * dpr); }
  }
  function drawEnd(t) {
    var u = t - T.clipEnd, b = appBox();
    if (END === 'cut') {
      // Cut to black: hold the last frame a beat, eight frames of black, cut straight into the archive.
      if (u < 0.25) ctx.drawImage(appSnap(), 0, 0); else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
    } else if (END === 'tile') {
      // Back to the archive: the app pulls back into its tile on the wall, one shot among the archive again, and it starts over.
      var img = appSnap(), e = 1 - inOut(seg(u, [0.15, 1.4]));
      drawPush(e, function (x, y, w, h) {
        var sc = Math.max(w / W, h / H), pw = W * sc, ph = H * sc;
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.drawImage(img, x + (w - pw) / 2, y + (h - ph) / 2, pw, ph); ctx.restore();
      });
    } else if (END === 'matte') {
      // The matte closes: black bars close from top and bottom to a hairline, the line draws in, and it opens on the archive.
      ctx.drawImage(appSnap(), 0, 0);
      drawMatte(inOut(seg(u, [0.05, 0.6])), 1 - inOut(seg(u, [0.6, 0.9])));
    } else if (END === 'approve') {
      // Approved: the Approve button takes the press, the clip drops into the clip list, and it cuts back to the archive.
      ctx.drawImage(appSnap(PLAYER), 0, 0);
      var ab = { x: b.x + 433 * b.s, y: b.y + 1534 * b.s, w: 995 * b.s, h: 63 * b.s };
      if (u < 0.12) { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(ab.x, ab.y, ab.w, ab.h); }
      else { var gl = 1 - seg(u, [0.12, 0.5]); if (gl > 0) { ctx.fillStyle = 'rgba(190,240,180,' + (0.45 * gl) + ')'; ctx.fillRect(ab.x, ab.y, ab.w, ab.h); } }
      var th12 = { x: b.x + APP_THUMB[0] * b.s, y: b.y + APP_THUMB_Y[PLAYER] * b.s, w: APP_THUMB[1] * b.s, h: APP_THUMB[2] * b.s };
      var rp = lerpRect(appRect(PLAYER), th12, inOut(seg(u, [0.3, 0.85])));
      drawCover(PLAYER, rp.x, rp.y, rp.w, rp.h);
      if (u >= 1.1) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
    } else if (END === 'export') {
      // The process to the end: Approve takes the press, the twelve export one by one (each a file, a bar, a tick),
      // then the tail slate, then straight back into the archive.
      if (u < 0.35) {
        ctx.drawImage(appSnap(), 0, 0);
        var ab2 = { x: b.x + 433 * b.s, y: b.y + 1534 * b.s, w: 995 * b.s, h: 63 * b.s };
        if (u < 0.1) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(ab2.x, ab2.y, ab2.w, ab2.h); }
        else { ctx.fillStyle = 'rgba(200,245,190,' + (0.5 * (1 - seg(u, [0.1, 0.35]))) + ')'; ctx.fillRect(ab2.x, ab2.y, ab2.w, ab2.h); }
        return;
      }
      ctx.fillStyle = '#0A0A09'; ctx.fillRect(0, 0, W, H);
      // the list always fits its box: on a phone it widens to the edges, and the type shrinks until a file name,
      // its bar and DONE sit side by side on one line, with all twelve rows inside the frame
      var narrow = W / dpr < 700, x0 = narrow ? W * 0.06 : W * 0.2, x1 = narrow ? W * 0.94 : W * 0.8;
      var fs2 = Math.round(Math.max(9 * dpr, W * 0.0088));
      ctx.save(); ctx.textBaseline = 'middle';
      function exFont() { ctx.font = '500 ' + fs2 + 'px "JetBrains Mono", ui-monospace, monospace'; if ('letterSpacing' in ctx) ctx.letterSpacing = Math.round(fs2 * 0.16) + 'px'; }
      exFont();
      var nameW = ctx.measureText(FILE + '_12.mov').width, stW = ctx.measureText('100%').width, need = nameW + stW + Math.max(W * 0.06, fs2 * 4) + fs2 * 3;
      if (need > x1 - x0) { fs2 = Math.max(4, Math.floor(fs2 * (x1 - x0) / need)); exFont(); nameW = ctx.measureText(FILE + '_12.mov').width; stW = ctx.measureText('100%').width; }
      var lh = Math.min(fs2 * 2.15, H * 0.86 / 13.6), y0 = H * 0.5 - lh * 6.6;
      var bx = Math.max(W * 0.6, x0 + nameW + fs2 * 1.5), bw = Math.min(W * 0.14, x1 - stW - fs2 * 1.5 - bx);
      if (u < 2.35) {
        var ex0 = 0.45, done2 = 0;
        for (var i2 = 0; i2 < N; i2++) {
          var dur = i2 < 2 ? 0.28 : 0.09, gap = i2 < 2 ? 0.06 : 0.025;
          var s0 = ex0, pr = seg(u, [s0, s0 + dur]); ex0 += dur + gap;
          if (u < s0) break;
          var yy = y0 + (i2 + 1) * lh;
          ctx.textAlign = 'left'; ctx.fillStyle = pr >= 1 ? '#EBE5D8' : 'rgba(235,229,216,.7)';
          ctx.fillText(FILE + '_' + pad2(i2 + 1) + '.mov', x0, yy);
          ctx.fillStyle = 'rgba(235,229,216,.14)'; ctx.fillRect(bx, yy - dpr, bw, 2 * dpr);
          ctx.fillStyle = '#EBE5D8'; ctx.fillRect(bx, yy - dpr, bw * pr, 2 * dpr);
          ctx.textAlign = 'right'; ctx.fillStyle = pr >= 1 ? '#8FD687' : 'rgba(235,229,216,.45)';
          ctx.fillText(pr >= 1 ? 'DONE' : Math.round(pr * 100) + '%', x1, yy);
          if (pr >= 1) done2++;
        }
        ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(235,229,216,.55)'; ctx.fillText(narrow ? 'EXPORT  ·  4K  ·  PRORES 422 HQ' : 'EXPORT  ·  4K  ·  PRORES 422 HQ  ·  GRADED', x0, y0 - lh * 0.4);
        ctx.textAlign = 'right'; ctx.fillText(pad2(done2) + ' / 12', x1, y0 - lh * 0.4);
      } else {
        var fb2 = Math.round(Math.max(W * 0.03, fs2 * 1.9));
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = 'rgba(235,229,216,.55)';
        if (ssLogo.complete && ssLogo.naturalWidth) {               // the Stock Shredder logo heads the slate (Daniel)
          var lh2 = fb2 * 1.5, lw2 = lh2 * ssLogo.naturalWidth / ssLogo.naturalHeight;
          ctx.drawImage(ssLogo, (W - lw2) / 2, H / 2 - fb2 * 1.2 - lh2, lw2, lh2);
        }
        ctx.fillStyle = '#EBE5D8'; ctx.font = '500 ' + fb2 + 'px "JetBrains Mono", ui-monospace, monospace';
        if ('letterSpacing' in ctx) ctx.letterSpacing = Math.round(fb2 * 0.18) + 'px';
        ctx.fillText('12 CLIPS', W / 2, H / 2 + fb2 * 0.35);
        ctx.fillStyle = 'rgba(235,229,216,.55)'; ctx.font = '500 ' + fs2 + 'px "JetBrains Mono", ui-monospace, monospace';
        if ('letterSpacing' in ctx) ctx.letterSpacing = Math.round(fs2 * 0.3) + 'px';
        ctx.fillText('EXPORTED  ·  4K PRORES 422 HQ', W / 2, H / 2 + fb2 * 1.3);
      }
      ctx.restore();
    } else if (END === 'slate') {
      // Tail slate: cut to black, a quiet end slate, cut straight into the archive.
      if (u < 0.2) { ctx.drawImage(appSnap(), 0, 0); return; }
      ctx.fillStyle = '#0A0A09'; ctx.fillRect(0, 0, W, H);
      var fs = Math.round(W * 0.011), fb = Math.round(W * 0.03);
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = 'rgba(235,229,216,.55)';
      ctx.font = '500 ' + fs + 'px "JetBrains Mono", ui-monospace, monospace';
      if ('letterSpacing' in ctx) ctx.letterSpacing = Math.round(fs * 0.3) + 'px';
      ctx.fillText(FILE, W / 2, H / 2 - fb * 0.9);
      ctx.fillStyle = '#EBE5D8'; ctx.font = '500 ' + fb + 'px "JetBrains Mono", ui-monospace, monospace';
      if ('letterSpacing' in ctx) ctx.letterSpacing = Math.round(fb * 0.18) + 'px';
      ctx.fillText('12 CLIPS', W / 2, H / 2 + fb * 0.35);
      ctx.fillStyle = 'rgba(235,229,216,.55)'; ctx.font = '500 ' + fs + 'px "JetBrains Mono", ui-monospace, monospace';
      if ('letterSpacing' in ctx) ctx.letterSpacing = Math.round(fs * 0.3) + 'px';
      ctx.fillText('READY FOR EXPORT', W / 2, H / 2 + fb * 1.3);
      ctx.restore();
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
    if (looped && END !== 'fade' && END !== 'approve') wallA = 1;   // these endings cut or open straight onto the wall
    setStyle(canvas, 'cv', 'opacity', String(t < T.wallIn[1] ? wallA : 1 - inOut(seg(t, T.loopOut))));
    ctx.clearRect(0, 0, W, H);

    if (t < X.F) {                                                  // IMPORT + the transition
      if (VARIANT === 'push' && t >= X.push[0]) {
        drawPush(inOut(seg(t, X.push)));
        drawFull(HERO_CLIP, inOut(seg(t, X.xfade)));
      } else {
        drawWall(t);
        if (VARIANT === 'push') {
          var sheetH = th * SHEET_ROWS, ty = (((HERO.row - wallTop(t)) * th) % sheetH + sheetH) % sheetH;
          drawWeld(ctx, (HERO.col - FIRST_COL) * tw + g / 2, ty + g / 2, tw - g, th - g);
        }
        var hr = heroRest();
        if (VARIANT === 'fade' && t >= X.dim[0]) {
          ctx.fillStyle = 'rgba(14,14,13,' + (0.9 * inOut(seg(t, X.dim))) + ')'; ctx.fillRect(0, 0, W, H);
          ctx.drawImage(sheet, hr.sx, hr.sy, hr.w, hr.h, hr.dx, hr.dy, hr.w, hr.h);   // the tile stays lit, in place
          drawFull(HERO_CLIP, inOut(seg(t, X.dissolve)));
        } else if (VARIANT === 'cut' && t >= X.lift[0]) {
          ctx.fillStyle = 'rgba(14,14,13,' + (0.26 * inOut(seg(t, X.lift))) + ')'; ctx.fillRect(0, 0, W, H);
          ctx.drawImage(sheet, hr.sx, hr.sy, hr.w, hr.h, hr.dx, hr.dy, hr.w, hr.h);
        }
      }
      if (END === 'matte' && looped && t < 0.6) drawMatte(1 - inOut(seg(t, [0, 0.6])), 0);
      return;
    }
    if (t < S) { drawFull(HERO_CLIP, 1); return; }
    if (t < T.split[1]) { if (SPLICE === 'blade') drawShred(t); else if (SPLICE === 'process') drawProcess(t); else drawSplice(t); return; }
    if (t >= T.clipEnd && END !== 'fade') { drawEnd(t); return; }
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
    loadClip(HERO_CLIP);                                            // playing inside the wall tile from the push on
    // the rest start loading as soon as the hero shot has a head start (slow connections sat on stills before)
    if (t >= 0.3 || vids[HERO_CLIP].readyState >= 4) for (var i = 0; i < vids.length; i++) loadClip(i);
  }
  function loadAll() { for (var i = 0; i < vids.length; i++) loadClip(i); }   // deep-link (?t=) fallback only
  var playerRestarted = false;
  function syncVideos(t) {
    var L = localTimes(t);
    // clip 12 rewinds to its first frame once, as it starts its flight into the player
    if (t < T.playerIn) playerRestarted = false;
    else if (!playerRestarted) { playerRestarted = true; var vp = vids[PLAYER]; try { vp.currentTime = 0; } catch (e) {} if (vp.paused) { var pp_ = vp.play(); if (pp_ && pp_.catch) pp_.catch(function () {}); } }
    for (var i = 0; i < vids.length; i++) {
      var v = vids[i];
      if (L[i] >= 0) {
        // panels up: keep the short clips moving. The hero shot holds its last frame under the cut until the
        // panels are up; clip 12 plays once in the player and holds its last frame (never loops back).
        var loopFrom = i === HERO_CLIP ? T.split[1] : S;
        if (v.ended && t >= loopFrom && !(i === PLAYER && t >= T.playerIn)) { try { v.currentTime = 0; } catch (e) {} }
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
  app.src = MEDIA + 'app-review-169.webp?v=2';
  // start as soon as the wall and the hero shot's first frame are in; the rest arrive while the wall plays
  var imagesReady = whenImages([sprite, posters[HERO_CLIP]]);
  window.addEventListener('resize', function () { size(); render(freeze ? t0 : clock); });

  window.__iss = { T: T, X: X, arrive: arrive, SCAN_END: SCAN_END, S: S, variant: VARIANT, splice: SPLICE, end: END, RESTART: RESTART };
  // ---- capture: frame-exact renders for review videos (window.__issCap(t) -> JPEG data URL) ----
  if (q.has('capture')) {
    // each clip is fetched whole and played from memory, so every seek lands (a plain dev server can't serve byte ranges)
    var metas = vids.map(function (v) { return new Promise(function (res) { v.preload = 'auto'; v.addEventListener('loadeddata', res, { once: true }); v.addEventListener('error', res, { once: true }); v.load(); }).then(function () {
      return fetch(v.currentSrc).then(function (r) { return r.blob(); }).then(function (bl) { return new Promise(function (res) {
        v.addEventListener('loadeddata', res, { once: true }); v.addEventListener('error', res, { once: true }); v.src = URL.createObjectURL(bl); v.load(); }); });
    }); });
    Promise.all([imagesReady].concat(metas)).then(function () {
      size();
      window.__issCap = function (vt) {
        var tt = vt; looped = false;
        if (vt >= T.LOOP) { tt = vt - T.LOOP + RESTART; looped = true; }
        var L = localTimes(tt), waits = [];
        L.forEach(function (lt, i) {
          if (lt < 0) return;
          var v = vids[i], d = v.duration || LENS[i];
          var target = (i === HERO_CLIP && tt < T.split[1]) || (i === PLAYER && tt >= T.playerIn) ? Math.min(lt, d - 0.04) : lt % d;
          if (Math.abs(v.currentTime - target) > 0.001) waits.push(new Promise(function (res) {
            var done = false, fin = function () { if (!done) { done = true; res(); } };
            if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(fin);   // the new frame is actually decoded
            v.addEventListener('seeked', function () { setTimeout(fin, 250); }, { once: true });
            v.currentTime = target;
          }));
        });
        return Promise.all(waits).then(function () { lastDom = {}; render(tt); return canvas.toDataURL('image/jpeg', 0.92); });
      };
      fig.dataset.issReady = '1';
    });
    return;
  }

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
    if (last !== null) {
      var nc = clock + Math.min(0.1, (ts - last) / 1000);           // a dropped tab never skips a beat
      // the zoom waits on the wall until the hero shot can actually play, so it never jumps from a still to video
      if (clock < X.P && nc >= X.P && vids[HERO_CLIP].readyState < 3) nc = X.P - 0.001;
      clock = nc;
    }
    last = ts;
    loadScheduled(clock);
    if (clock >= T.LOOP) { clock = RESTART; looped = true; vids.forEach(function (v) { v.pause(); try { v.currentTime = 0; } catch (e) {} }); }
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

})();
