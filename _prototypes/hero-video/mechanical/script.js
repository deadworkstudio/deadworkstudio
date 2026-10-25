// Stock Shredder hero — MECHANICAL.
// One <canvas> draws every frame from the shared HeroTimeline state. No timers of our own:
// every position below is a pure function of state.t, so ?t=…&freeze reproduces any frame exactly.
(function () {
  'use strict';
  var C = window.HERO_CONFIG;
  var CLIPS = C.broll;                         // 13 clips, index 01–13 in config order
  var N = CLIPS.length;

  /* ---------------------------------------------------------------- timing */
  var CLICK_IN = 2.6;          // click shot starts framing into its cell
  var CLICK_OPEN = 0.34;       // shutter-open duration
  var SWEEP = 1.0;             // guillotine bar: grid top → bottom
  var MOVE = 0.46;             // one clip indexing into its slot
  var SCAN_FROM = 6.6, SCAN_STEP = 0.36;        // register check in ORDER
  var RESET = C.orderHoldUntil;                 // 11.4: back toward chaos

  // B-roll that actually decodes (≤ 8 videos playing at once, click included). The rest draw posters.
  var LIVE_CHAOS = ['la-coast', 'palms', 'nyc', 'waves', 'reel', 'modular', 'set-bts'];
  var LIVE_ORDER_EXTRA = 'engineer';            // joins once the click shot has stopped decoding

  /* ---------------------------------------------------------------- easing */
  // Strong ease-in-out (0.77, 0, 0.175, 1), solved numerically.
  function bezier(p1x, p1y, p2x, p2y) {
    function a(a1, a2) { return 1 - 3 * a2 + 3 * a1; }
    function b(a1, a2) { return 3 * a2 - 6 * a1; }
    function c(a1) { return 3 * a1; }
    function calc(t, a1, a2) { return ((a(a1, a2) * t + b(a1, a2)) * t + c(a1)) * t; }
    function slope(t, a1, a2) { return 3 * a(a1, a2) * t * t + 2 * b(a1, a2) * t + c(a1); }
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      var t = x;
      for (var i = 0; i < 6; i++) { var s = slope(t, p1x, p2x); if (s === 0) break; t -= (calc(t, p1x, p2x) - x) / s; }
      return calc(t, p1y, p2y);
    };
  }
  var inOut = bezier(0.77, 0, 0.175, 1);
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  // Machined easing: a strong in-out, quantised into n detents — reads as an indexing mechanism, never bounces.
  function machined(p, n) { var e = inOut(clamp(p, 0, 1)); return n ? Math.round(e * n) / n : e; }

  /* ---------------------------------------------------------------- chaos poses */
  // Hand-placed so the wall overlaps, ignores the grid and mixes crops. x/y centre in grid-area units,
  // w as a fraction of grid width, a = crop aspect, r = rotation (deg), z = stacking order.
  var CHAOS = {
    'la-coast':   { x: .30, y: .37, w: .40, a: 1.78, r: -3.5, z: 4 },
    'palms':      { x: .75, y: .24, w: .27, a: 0.80, r: 4.0,  z: 7 },
    'nyc':        { x: .53, y: .63, w: .34, a: 2.35, r: 1.5,  z: 9 },
    'sunrise':    { x: .12, y: .79, w: .23, a: 1.33, r: -6.0, z: 2 },
    'waves':      { x: .88, y: .72, w: .25, a: 1.00, r: -2.0, z: 5 },
    'reel':       { x: .58, y: .18, w: .21, a: 1.50, r: 7.0,  z: 3 },
    'modular':    { x: .19, y: .13, w: .25, a: 2.00, r: 2.5,  z: 6 },
    'mixing':     { x: .39, y: .87, w: .29, a: 1.78, r: -1.0, z: 8 },
    'typewriter': { x: .94, y: .36, w: .15, a: 0.66, r: -8.0, z: 10 },
    'product':    { x: .07, y: .45, w: .17, a: 0.90, r: 5.0,  z: 11 },
    'jars':       { x: .71, y: .91, w: .21, a: 2.40, r: 3.0,  z: 1 },
    'engineer':   { x: .45, y: .41, w: .17, a: 1.20, r: -5.0, z: 12 },
    'set-bts':    { x: .84, y: .49, w: .22, a: 1.60, r: 1.0,  z: 13 }
  };
  var TAU = Math.PI * 2;

  /* ---------------------------------------------------------------- DOM + media */
  var rig = document.querySelector('[data-rig]');
  var stage = document.querySelector('[data-stage]');
  var canvas = document.querySelector('[data-canvas]');
  var ctx = canvas.getContext('2d');
  var tcEl = document.querySelector('[data-tc]');
  var headEl = document.querySelector('[data-head]');
  var rulerEl = document.querySelector('[data-ruler]');
  var phaseEls = {};
  Array.prototype.forEach.call(document.querySelectorAll('[data-phase]'), function (el) { phaseEls[el.getAttribute('data-phase')] = el; });
  var sources = document.querySelector('[data-sources]');

  function makeVideo(src, poster) {
    var v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    if (poster) v.poster = poster;
    v.src = src;
    sources.appendChild(v);
    return v;
  }
  function makeImage(src) { var i = new Image(); i.decoding = 'async'; i.src = src; return i; }

  var clips = CLIPS.map(function (c, i) {
    var live = LIVE_CHAOS.indexOf(c.id) >= 0 || c.id === LIVE_ORDER_EXTRA;
    return {
      id: c.id, label: c.label, index: i, num: (i + 1 < 10 ? '0' : '') + (i + 1),
      poster: makeImage(c.poster),
      video: (!HeroTimeline.reduce && live) ? makeVideo(c.src, c.poster) : null,
      orderOnly: c.id === LIVE_ORDER_EXTRA,
      shift: (i * 0.77) % 5,                       // each clip plays from a different moment
      chaos: CHAOS[c.id], seed: i * 1.913 + 0.4
    };
  });
  var clickVideo = HeroTimeline.reduce ? null : makeVideo(C.click.src, C.click.poster);
  var clickPoster = makeImage(C.click.poster);

  function frameSource(clip) {
    var v = clip.video;
    if (v && v.readyState >= 2) return v;
    return clip.poster.complete && clip.poster.naturalWidth ? clip.poster : null;
  }

  /* ---------------------------------------------------------------- layout */
  var L = null, dpr = 1;
  function cellRect(c, r, w, h) {
    return { x: L.gx + c * (L.cw + L.gap), y: L.gy + r * (L.ch + L.gap),
             w: w * L.cw + (w - 1) * L.gap, h: h * L.ch + (h - 1) * L.gap };
  }
  function measure(W) {
    var narrow = W < 600;
    var g = narrow ? { cols: 3, rows: 7, f: { c: 0, r: 0, w: 3, h: 3 } }
                   : { cols: 4, rows: 4, f: { c: 1, r: 1, w: 2, h: 2 } };
    var m = Math.round(clamp(W * 0.036, 16, 44));
    var gap = Math.round(clamp(W * 0.008, 5, 10));
    var gw = W - m * 2;
    var cw = (gw - (g.cols - 1) * gap) / g.cols, ch = cw * 9 / 16;
    var gh = g.rows * ch + (g.rows - 1) * gap;
    return { W: W, H: Math.round(gh + m * 2), m: m, gap: gap, gx: m, gy: m, gw: gw, gh: gh, cw: cw, ch: ch,
             cols: g.cols, rows: g.rows, f: g.f, narrow: narrow };
  }
  function layout() {
    var avail = rig.parentElement.clientWidth - parseFloat(getComputedStyle(rig.parentElement).paddingLeft) * 2;
    var W = Math.min(avail, 1280);
    var probe = measure(W);
    // Fit headline + instrument in one laptop screen (landscape only; phones scroll naturally).
    if (!probe.narrow && innerWidth > innerHeight) {
      var bars = 2 * rig.querySelector('.rig-bar').offsetHeight;
      var room = innerHeight - rig.getBoundingClientRect().top - window.scrollY - bars - 28;
      if (probe.H > room && room > 240) W = Math.max(600, Math.floor(W * room / probe.H));
    }
    L = measure(W);
    rig.style.width = W + 'px';
    stage.style.height = L.H + 'px';
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(L.W * dpr); canvas.height = Math.round(L.H * dpr);

    // Slots: clip 01 owns the feature cell (where the click shot lands); 02–13 fill the rest in reading order.
    var f = L.f, k = 1;
    L.feature = cellRect(f.c, f.r, f.w, f.h);
    clips[0].slot = L.feature; clips[0].slotRow = f.r; clips[0].slotCol = f.c;
    for (var r = 0; r < L.rows; r++) for (var c = 0; c < L.cols; c++) {
      if (c >= f.c && c < f.c + f.w && r >= f.r && r < f.r + f.h) continue;
      if (k < N) { clips[k].slot = cellRect(c, r, 1, 1); clips[k].slotRow = r; clips[k].slotCol = c; k++; }
    }
    // The guillotine seats a row each time it cuts past that row's lower edge.
    L.rowDur = SWEEP / L.rows;
    clips.forEach(function (cl) {
      cl.start = C.clickAt + (cl.slotRow + 1) * L.rowDur * 0.92 + cl.slotCol * 0.035;
    });
    L.dropAt = C.clickAt + (f.r + f.h) * L.rowDur;   // bar has cleared the click cell
    L.strips = L.narrow ? 6 : 8;
    L.fs = clamp(L.cw * 0.045, 8, 11);
  }

  /* ---------------------------------------------------------------- poses */
  function chaosPose(cl, t) {
    var p = cl.chaos, s = cl.seed;
    var wf = L.narrow ? Math.min(p.w * 1.75, 0.78) : p.w;
    var w = wf * L.gw;
    // Slow periodic drift (whole cycles per 12 s loop, so the seam is invisible).
    var ph = (t / C.duration) * TAU;
    var dx = Math.sin(ph + s) * 0.012 * L.gw;
    var dy = Math.cos(ph * 2 + s * 1.7) * 0.010 * L.gh;
    return { cx: L.gx + p.x * L.gw + dx, cy: L.gy + p.y * L.gh + dy, w: w, h: w / p.a,
             r: (p.r + Math.sin(ph + s * 2.3) * 0.8) * Math.PI / 180 };
  }
  function slotPose(cl) { var s = cl.slot; return { cx: s.x + s.w / 2, cy: s.y + s.h / 2, w: s.w, h: s.h, r: 0 }; }
  var DIM = 0.34;
  function dimAt(t) { return 1 - (1 - DIM) * machined((t - CLICK_IN) / CLICK_OPEN, 6); }

  // Returns the clip's pose + alpha + how "seated" it is (0..1) for label timing.
  function poseAt(cl, t) {
    if (t >= RESET) {
      var k = inOut(clamp((t - RESET - cl.index * 0.012) / 0.46, 0, 1));
      var a = slotPose(cl), b = chaosPose(cl, 0);
      return { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k), r: lerp(0, b.r, k), alpha: 1, seated: 0 };
    }
    if (t < cl.start) { var c = chaosPose(cl, t); c.alpha = dimAt(t); c.seated = 0; return c; }
    var p = (t - cl.start) / MOVE;
    if (p >= 1) { var s = slotPose(cl); s.alpha = 1; s.seated = 1; return s; }
    // Two machined stages: square up + trim to the slot's frame in place, then index across to the slot.
    var from = chaosPose(cl, cl.start), to = slotPose(cl);
    var a1 = machined(p / 0.48, 6), a2 = machined((p - 0.48) / 0.52, 7);
    return { cx: lerp(from.cx, to.cx, a2), cy: lerp(from.cy, to.cy, a2),
             w: lerp(from.w, to.w, a1), h: lerp(from.h, to.h, a1), r: lerp(from.r, 0, a1),
             alpha: lerp(DIM, 1, a2), seated: 0 };
  }

  /* ---------------------------------------------------------------- drawing helpers */
  var BG = '#0E0E0D', INK = '241,236,226', GREEN = '#8FD687';
  function ink(a) { return 'rgba(' + INK + ',' + a + ')'; }
  function px(v) { return Math.round(v) + 0.5; }             // crisp 1px hairlines
  function mono(size, weight) { return (weight || 500) + ' ' + size + 'px ui-monospace, "SF Mono", Menlo, Monaco, monospace'; }

  // Cover-fit a source into (x,y,w,h); sx/sw optionally restrict to a horizontal slice of the destination.
  function drawCover(src, x, y, w, h) {
    var iw = src.videoWidth || src.naturalWidth, ih = src.videoHeight || src.naturalHeight;
    if (!iw || !ih) return;
    var s = Math.max(w / iw, h / ih), cw = w / s, ch = h / s;
    ctx.drawImage(src, (iw - cw) / 2, (ih - ch) / 2, cw, ch, x, y, w, h);
  }
  function fitText(text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    var t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t.replace(/[\s,]+$/, '') + '…';
  }
  function brackets(r, off, len, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.beginPath();
    var x0 = px(r.x - off), y0 = px(r.y - off), x1 = px(r.x + r.w + off) - 1, y1 = px(r.y + r.h + off) - 1;
    ctx.moveTo(x0, y0 + len); ctx.lineTo(x0, y0); ctx.lineTo(x0 + len, y0);
    ctx.moveTo(x1 - len, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + len);
    ctx.moveTo(x1, y1 - len); ctx.lineTo(x1, y1); ctx.lineTo(x1 - len, y1);
    ctx.moveTo(x0 + len, y1); ctx.lineTo(x0, y1); ctx.lineTo(x0, y1 - len);
    ctx.stroke();
  }

  /* ---------------------------------------------------------------- layers */
  function drawGrid() {
    var m = L.m, W = L.W, H = L.H;
    ctx.lineWidth = 1;
    // gutter centre-lines, running edge to edge
    ctx.strokeStyle = ink(0.07); ctx.beginPath();
    for (var c = 1; c < L.cols; c++) { var x = px(L.gx + c * (L.cw + L.gap) - L.gap / 2); ctx.moveTo(x, m * 0.55); ctx.lineTo(x, H - m * 0.55); }
    for (var r = 1; r < L.rows; r++) { var y = px(L.gy + r * (L.ch + L.gap) - L.gap / 2); ctx.moveTo(m * 0.55, y); ctx.lineTo(W - m * 0.55, y); }
    ctx.stroke();
    // grid boundary
    ctx.strokeStyle = ink(0.14); ctx.strokeRect(px(L.gx - L.gap / 2), px(L.gy - L.gap / 2), Math.round(L.gw + L.gap) - 1, Math.round(L.gh + L.gap) - 1);
    // registration crosses at every interior intersection
    ctx.strokeStyle = ink(0.32); ctx.beginPath();
    var arm = Math.max(3, Math.round(L.gap * 0.7));
    for (var ci = 1; ci < L.cols; ci++) for (var ri = 1; ri < L.rows; ri++) {
      var cx = px(L.gx + ci * (L.cw + L.gap) - L.gap / 2), cy = px(L.gy + ri * (L.ch + L.gap) - L.gap / 2);
      ctx.moveTo(cx - arm, cy); ctx.lineTo(cx + arm, cy); ctx.moveTo(cx, cy - arm); ctx.lineTo(cx, cy + arm);
    }
    ctx.stroke();
    // rulers: top and left, minor tick every 1/8 cell, major at each cell edge
    ctx.beginPath(); ctx.strokeStyle = ink(0.22);
    var stepX = (L.cw + L.gap) / 8, stepY = (L.ch + L.gap) / 8, top = L.gy - L.gap / 2, left = L.gx - L.gap / 2;
    for (var i = 0; i <= L.cols * 8; i++) { var tx = px(left + i * stepX), len = i % 8 === 0 ? m * 0.42 : (i % 4 === 0 ? m * 0.26 : m * 0.14); ctx.moveTo(tx, top - 3); ctx.lineTo(tx, top - 3 - len); }
    for (var j = 0; j <= L.rows * 8; j++) { var ty = px(top + j * stepY), ln = j % 8 === 0 ? m * 0.42 : (j % 4 === 0 ? m * 0.26 : m * 0.14); ctx.moveTo(left - 3, ty); ctx.lineTo(left - 3 - ln, ty); }
    ctx.stroke();
  }

  function drawClip(cl, pose, t) {
    var src = frameSource(cl); if (!src) return;
    ctx.save();
    ctx.translate(pose.cx, pose.cy); ctx.rotate(pose.r);
    var x = -pose.w / 2, y = -pose.h / 2;
    drawCover(src, x, y, pose.w, pose.h);
    // Powered-down feeds stay opaque (no ghosting through each other) and are shaded instead.
    if (pose.alpha < 1) { ctx.fillStyle = 'rgba(14,14,13,' + (1 - pose.alpha).toFixed(3) + ')'; ctx.fillRect(x, y, pose.w, pose.h); }
    if (!pose.seated) { ctx.strokeStyle = ink(0.22); ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, pose.w - 1, pose.h - 1); }
    ctx.restore();
  }

  function drawLabel(cl, t, active) {
    var appear = clamp((t - (cl.start + MOVE + 0.04)) / 0.18, 0, 1);
    var leave = 1 - clamp((t - RESET) / 0.14, 0, 1);
    var a = appear * leave; if (a <= 0) return;
    var s = cl.slot, fs = cl.index === 0 ? Math.min(L.fs + 1, 12) : L.fs;
    var padX = Math.round(fs * 0.75), h = Math.round(fs * 2.1);
    ctx.font = mono(fs, 500);
    var gapTxt = fs * 1.1, numW = ctx.measureText(cl.num).width;
    var labelMax = s.w - padX * 2 - numW - gapTxt - 6;
    var label = labelMax > fs * 2 ? fitText(cl.label.toUpperCase(), labelMax) : '';
    var w = Math.ceil(padX * 2 + numW + (label ? gapTxt + ctx.measureText(label).width : 0));
    var x = Math.round(s.x), y = Math.round(s.y + s.h - h);
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = active ? 'rgb(' + INK + ')' : 'rgba(14,14,13,.88)'; ctx.fillRect(x, y, w, h);
    ctx.textBaseline = 'middle';
    ctx.fillStyle = active ? 'rgba(14,14,13,.55)' : ink(0.5); ctx.fillText(cl.num, x + padX, y + h / 2 + 0.5);
    if (label) { ctx.fillStyle = active ? BG : ink(0.92); ctx.fillText(label, x + padX + numW + gapTxt, y + h / 2 + 0.5); }
    ctx.restore();
  }

  function drawClickCell(t) {
    if (t < CLICK_IN) return;
    var r = L.feature;
    var stripEnd = L.dropAt + (L.strips - 1) * 0.03 + 0.32;
    if (t > stripEnd + 0.2) return;
    var src = (clickVideo && clickVideo.readyState >= 2) ? clickVideo : (clickPoster.complete ? clickPoster : null);
    var o = machined((t - CLICK_IN) / CLICK_OPEN, 8);
    var fade = 1 - clamp((t - stripEnd) / 0.2, 0, 1);

    // Brackets travel in to register the frame, then hold 6px outside it.
    var off = 6 + (1 - o) * 26, len = Math.round(clamp(r.w * 0.04, 10, 18));
    ctx.save(); ctx.globalAlpha = fade;
    brackets(r, off, len, ink(0.9));
    // Trigger indicator: armed (hollow) until the press, fired (green) from 4.0 s.
    var d = 5, ix = Math.round(r.x - off), iy = Math.round(r.y - off - 9 - d);
    if (t >= C.clickAt) { ctx.fillStyle = GREEN; ctx.fillRect(ix, iy, d, d); }
    else { ctx.strokeStyle = ink(0.7); ctx.strokeRect(ix + 0.5, iy + 0.5, d - 1, d - 1); }
    ctx.restore();

    if (!src) return;
    var visW = r.w * o, vx = r.x + (r.w - visW) / 2;
    if (t < L.dropAt) {
      ctx.save(); ctx.beginPath(); ctx.rect(vx, r.y, visW, r.h); ctx.clip();
      ctx.fillStyle = BG; ctx.fillRect(r.x, r.y, r.w, r.h);
      drawCover(src, r.x, r.y, r.w, r.h);
      ctx.restore();
    } else {
      // Shredded: the frame falls away in equal strips, left to right, into the cell's lower edge.
      ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
      var sw = r.w / L.strips;
      for (var j = 0; j < L.strips; j++) {
        var k = machined((t - L.dropAt - j * 0.03) / 0.32, 7);
        if (k >= 1) continue;
        var dy = k * r.h * 1.02;
        ctx.save(); ctx.beginPath(); ctx.rect(r.x + j * sw, r.y + dy, sw, r.h); ctx.clip();
        ctx.fillStyle = BG; ctx.fillRect(r.x + j * sw, r.y + dy, sw, r.h);
        drawCover(src, r.x, r.y + dy, r.w, r.h);
        ctx.restore();
      }
      ctx.restore();
    }

    // Cut lines: drawn down through the frame as the bar passes, they divide it into equal strips.
    if (t >= C.clickAt) {
      var barY = barYAt(t), sw2 = r.w / L.strips, bottom = Math.min(barY, r.y + r.h);
      if (bottom > r.y && t < L.dropAt + 0.05) {
        ctx.strokeStyle = ink(0.85); ctx.lineWidth = 1; ctx.beginPath();
        for (var s = 1; s < L.strips; s++) { var lx = px(r.x + s * sw2); ctx.moveTo(lx, r.y); ctx.lineTo(lx, bottom); }
        ctx.stroke();
      }
      // The press itself: a single hard frame flash.
      var flash = 1 - clamp((t - C.clickAt) / 0.22, 0, 1);
      if (flash > 0) { ctx.strokeStyle = ink(flash); ctx.lineWidth = 2; ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2); }
    }
  }

  // Guillotine bar position: moves a row, dwells (the cut), moves the next row. Stepped, never smooth-scrolling.
  function rowEdge(k) { return k <= 0 ? L.gy - L.gap / 2 : (k >= L.rows ? L.gy + L.gh + L.gap / 2 : L.gy + k * (L.ch + L.gap) - L.gap / 2); }
  function barYAt(t) {
    var e = t - C.clickAt; if (e < 0) return -1;
    var k = Math.floor(e / L.rowDur); if (k >= L.rows) return rowEdge(L.rows);
    var local = (e - k * L.rowDur) / L.rowDur;
    return lerp(rowEdge(k), rowEdge(k + 1), local < 0.62 ? inOut(local / 0.62) : 1);
  }
  function drawBar(t) {
    var e = t - C.clickAt; if (e < 0) return false;
    var end = SWEEP + 0.18; if (e > end + 0.4) return true;
    var y = barYAt(t), xL = L.m * 0.3, xR = L.W - L.m * 0.3;
    // Cut marks: each row edge the bar has passed, flashing then settling to a faint residue.
    for (var k = 1; k <= L.rows; k++) {
      var tk = C.clickAt + k * L.rowDur * 0.62 + (k - 1) * L.rowDur * 0.38;
      var age = t - tk; if (age < 0) continue;
      var a = Math.max(0, 0.75 * (1 - age / 0.35)) + 0.0;
      var ry = px(rowEdge(k));
      if (a > 0) { ctx.strokeStyle = ink(a); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xL, ry); ctx.lineTo(xR, ry); ctx.stroke(); }
      // ruler detent ticks stay lit through the sweep
      ctx.fillStyle = ink(0.85 * (1 - clamp((e - end) / 0.4, 0, 1))); ctx.fillRect(Math.round(L.m * 0.18), Math.round(ry) - 1, Math.round(L.m * 0.32), 2);
    }
    if (e <= end) {
      var fade = 1 - clamp((e - SWEEP) / 0.18, 0, 1);
      ctx.save(); ctx.globalAlpha = fade;
      // trailing wash above the blade
      var g = ctx.createLinearGradient(0, y - 22, 0, y);
      g.addColorStop(0, ink(0)); g.addColorStop(1, ink(0.09));
      ctx.fillStyle = g; ctx.fillRect(L.gx - L.gap / 2, y - 22, L.gw + L.gap, 22);
      // the blade
      ctx.fillStyle = ink(1); ctx.fillRect(xL, Math.round(y), xR - xL, 1);
      // carriages riding the side rails
      var cw = Math.max(4, Math.round(L.m * 0.22)), chh = Math.max(10, Math.round(L.m * 0.42));
      ctx.fillRect(Math.round(xL) - cw, Math.round(y - chh / 2), cw, chh);
      ctx.fillRect(Math.round(xR), Math.round(y - chh / 2), cw, chh);
      ctx.restore();
    }
    return true;
  }

  function drawStageMarks() {
    // Outer crop marks on the instrument corners.
    var o = Math.round(L.m * 0.28), len = Math.round(L.m * 0.42);
    brackets({ x: o, y: o, w: L.W - o * 2, h: L.H - o * 2 }, 0, len, ink(0.4));
  }

  /* ---------------------------------------------------------------- frame */
  var lastTc = '', lastPhase = '';
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function updateBezel(t) {
    var f = Math.floor(t * 24 + 1e-6), tc = pad2(Math.floor(f / 1440)) + ':' + pad2(Math.floor(f / 24) % 60) + ':' + pad2(f % 24);
    if (tc !== lastTc) { tcEl.textContent = tc; lastTc = tc; }
    var ph = t < CLICK_IN ? 'chaos' : t < C.clickAt ? 'click' : t < C.shredEnds ? 'shred' : 'order';
    if (ph !== lastPhase) {
      for (var k in phaseEls) phaseEls[k].classList.toggle('is-on', k === ph);
      lastPhase = ph;
    }
    headEl.style.transform = 'translateX(' + (rulerEl.clientWidth * (t / C.duration)).toFixed(1) + 'px)';
  }

  function syncVideos(state) {
    var t = state.t;
    clips.forEach(function (cl) {
      var v = cl.video; if (!v) return;
      var on = cl.orderOnly ? (t >= 5.4 && t < 12) : true;
      if (!on) { if (!v.paused) v.pause(); return; }
      var d = v.duration || 5;
      state.follow(v, 0, (t + cl.shift) % Math.max(0.5, d - 0.06));
    });
    if (clickVideo) {
      // Only decode the click shot around its moment on screen; park it ready beforehand.
      if (t >= CLICK_IN - 0.25 && t < 5.4) state.follow(clickVideo, state.clickOffset, t);
      else if (!clickVideo.paused) clickVideo.pause();
    }
  }

  function render(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, L.W, L.H);
    drawGrid();

    var order = clips.slice().sort(function (a, b) { return a.chaos.z - b.chaos.z; });
    var poses = {};
    // seated clips underneath, moving/chaotic ones on top
    order.forEach(function (cl) { poses[cl.id] = poseAt(cl, t); });
    order.filter(function (cl) { return poses[cl.id].seated; }).forEach(function (cl) { drawClip(cl, poses[cl.id], t); });
    order.filter(function (cl) { return !poses[cl.id].seated; }).forEach(function (cl) { drawClip(cl, poses[cl.id], t); });

    // Register check: a bracket steps through 01 → 13 while the order holds.
    var active = -1;
    if (t >= SCAN_FROM && t < RESET) {
      active = Math.floor((t - SCAN_FROM) / SCAN_STEP);
      if (active >= N) active = -1;
    }
    clips.forEach(function (cl) { if (poses[cl.id].seated || t >= RESET) drawLabel(cl, t, cl.index === active); });
    if (active >= 0) brackets(clips[active].slot, 3, Math.round(clamp(clips[active].slot.w * 0.06, 8, 16)), ink(0.95));

    drawClickCell(t);
    var begun = drawBar(t);
    drawStageMarks();

    window.__mech = { t: t, shredBegun: t >= C.clickAt && begun, barY: barYAt(t),
                      clickTime: clickVideo ? clickVideo.currentTime : null };
  }

  /* ---------------------------------------------------------------- boot */
  layout();
  var resizeRaf = 0;
  window.addEventListener('resize', function () {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(function () { layout(); if (HeroTimeline.reduce) renderStatic(); });
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);

  function renderStatic() { render(SCAN_FROM - 0.1); updateBezel(C.orderHoldUntil); }

  HeroTimeline.start({
    onFrame: function (state) {
      syncVideos(state);
      render(state.t);
      updateBezel(state.t);
    },
    // Reduced motion: the finished register, drawn once from posters (and again as they load).
    onStatic: function () {
      renderStatic();
      clips.forEach(function (cl) { cl.poster.addEventListener('load', renderStatic); });
    }
  });
})();
