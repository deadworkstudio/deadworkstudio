/* Stock Shredder hero — CINEMATIC prototype.
   One <canvas> draws every frame from a small pool of <video> elements (max 8 decoding) and posters.
   All timing comes from the shared HeroTimeline; this file only maps state.t to pictures.

   CHAOS  0 – 2.6 s   hard-cut montage of layered, mismatched B-roll
   CLICK  2.6 – 4.0   the real click shot holds the whole frame; press lands on 4.0
   SHRED  4.0 – 6.4   the frame tears into horizontal film-strip bands that race apart,
                      revealing strips of B-roll frames, then six selects lock into register
   ORDER  6.4 – 11.4  a clean filmstrip of selects, each with its library label
   RESET  11.4 – 12   selects fade out to black, loop                                        */
(function () {
  'use strict';
  var TL = window.HeroTimeline, C = TL.config;
  var canvas = document.getElementById('canvas');
  var frame = document.getElementById('frame');
  var pool = document.getElementById('pool');
  var ctx = canvas.getContext('2d', { alpha: false });

  /* ---------- easing (Emil's curves, via a small cubic-bezier solver) ---------- */
  function bezier(x1, y1, x2, y2) {
    function a(p1, p2) { return 1 - 3 * p2 + 3 * p1; }
    function b(p1, p2) { return 3 * p2 - 6 * p1; }
    function c(p1) { return 3 * p1; }
    function calc(t, p1, p2) { return ((a(p1, p2) * t + b(p1, p2)) * t + c(p1)) * t; }
    function slope(t, p1, p2) { return 3 * a(p1, p2) * t * t + 2 * b(p1, p2) * t + c(p1); }
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      var t = x;
      for (var i = 0; i < 8; i++) { var s = slope(t, x1, x2); if (Math.abs(s) < 1e-6) break; t -= (calc(t, x1, x2) - x) / s; }
      return calc(t, y1, y2);
    };
  }
  var EIO = bezier(0.77, 0, 0.175, 1);     // strong ease-in-out: weighty on-screen travel
  var EOUT = bezier(0.23, 1, 0.32, 1);     // strong ease-out: the tear snap, fades
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function seg(v, a, b) { return clamp((v - a) / (b - a), 0, 1); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ---------- media ---------- */
  var BROLL = C.broll;
  var byId = {}; BROLL.forEach(function (c, i) { byId[c.id] = i; });
  // The six selects that end up in the filmstrip, plus one extra live clip for the montage.
  var SELECTS = ['la-coast', 'reel', 'nyc', 'modular', 'waves', 'set-bts'].map(function (id) { return byId[id]; });
  var LIVE = SELECTS.concat([byId.mixing]);            // 7 decoding B-roll + 1 click = 8 videos
  var LIVE_SET = {}; LIVE.forEach(function (i, n) { LIVE_SET[i] = n; });

  var posters = BROLL.map(function (c) { var im = new Image(); im.decoding = 'async'; im.src = c.poster; return im; });
  var clickPoster = new Image(); clickPoster.src = C.click.poster;

  function makeVideo(src, poster) {
    var v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('preload', 'auto');
    if (poster) v.poster = poster;
    v.src = src; pool.appendChild(v); return v;
  }

  var videos = {};              // broll index -> <video>
  var clickVideo = null;
  if (!TL.reduce) {
    LIVE.forEach(function (i) { videos[i] = makeVideo(BROLL[i].src, BROLL[i].poster); });
    var wide = frame.clientWidth * (window.devicePixelRatio || 1) > 1600;
    clickVideo = makeVideo(wide ? C.click.srcHd : C.click.src, C.click.poster);
    clickVideo.id = 'click-video';
  }

  // Best available picture for a clip: live video frame if it has one, else its poster.
  function srcFor(i, postersOnly) {
    var v = videos[i];
    if (!postersOnly && v && v.readyState >= 2) return v;
    var p = posters[i]; return p.complete && p.naturalWidth ? p : null;
  }
  function dims(s) { return s.videoWidth ? [s.videoWidth, s.videoHeight] : [s.naturalWidth, s.naturalHeight]; }
  // object-fit: cover crop with a focus point
  function drawCover(s, x, y, w, h, fx, fy, zoom) {
    if (!s || w <= 0 || h <= 0) return;
    var d = dims(s), sw = d[0], sh = d[1]; if (!sw) return;
    var k = Math.max(w / sw, h / sh) * (zoom || 1), cw = w / k, ch = h / k;
    ctx.drawImage(s, (sw - cw) * (fx == null ? 0.5 : fx), (sh - ch) * (fy == null ? 0.5 : fy), cw, ch, x, y, w, h);
  }

  /* ---------- layout (recomputed on resize) ---------- */
  var W = 0, H = 0, DPR = 1, L = null;
  function layout() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = frame.clientWidth; H = frame.clientHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    var narrow = W / H < 2;                   // 16:9 phone frame -> two strips of three
    var R = 2, Cn = 3, n = R * Cn;           // two strips of three selects
    var gap = Math.max(6, W * (narrow ? 0.02 : 0.014));
    var cw = (W * (narrow ? 0.86 : 0.8) - gap * (Cn - 1)) / Cn, ch = cw * 9 / 16;
    var capFs = narrow ? clamp(W * 0.012, 7.5, 10) : clamp(W * 0.0074, 9, 11);
    var baseH = ch * 1.3, capH = capFs * 2.8, rowGap = narrow ? 4 : H * 0.01;
    var block = R * (baseH + capH) + (R - 1) * rowGap;
    if (block > H * 0.88) { var sc = H * 0.88 / block; cw *= sc; ch *= sc; baseH = ch * 1.3; block = R * (baseH + capH) + (R - 1) * rowGap; gap *= sc; }
    var rowW = Cn * cw + (Cn - 1) * gap, x0 = (W - rowW) / 2, y0 = (H - block) / 2;
    var cells = [], rows = [];
    for (var r = 0; r < R; r++) {
      var by = y0 + r * (baseH + capH + rowGap);
      rows.push({ x: -2, y: by, w: W + 4, h: baseH });   // strips run full-bleed, off both edges
      for (var c = 0; c < Cn; c++) cells.push({ x: x0 + c * (cw + gap), y: by + (baseH - ch) / 2, w: cw, h: ch, capY: by + baseH + capFs * 1.5 });
    }
    // Shred bands: the click frame splits into B horizontal bands
    var B = narrow ? 6 : 7, bandH = H / B, rand = rng(7);
    var bands = [];
    for (var k = 0; k < B; k++) {
      var amp = 0.75 + rand() * 0.5;
      bands.push({ k: k, y: k * bandH, dir: k % 2 ? 1 : -1, delay: 0.015 + rand() * 0.05,
        dmax: W * (1.08 + 0.32 * amp), seed: Math.floor(rand() * 1e6) });
    }
    L = { R: R, Cn: Cn, n: n, cells: cells, rows: rows, B: B, bandH: bandH, bands: bands, capFs: capFs, narrow: narrow };
    // Each select is carried by one band; pick the frame on that band nearest its final cell.
    L.hero = [];
    for (var i = 0; i < n; i++) {
      var kk = n === 1 ? 0 : Math.round(i * (B - 1) / (n - 1));
      var best = 0, bd = 1e9, cx = cells[i].x + cells[i].w / 2;
      for (var j = 0; j < 40; j++) { var fr = stripFrame(bands[kk], j, 0.7); var dd = Math.abs(fr.x + fr.w / 2 - cx); if (dd < bd) { bd = dd; best = j; } }
      L.hero.push({ k: kk, j: best });
    }
    L.heroAt = {}; L.hero.forEach(function (h, i) { L.heroAt[h.k + ':' + h.j] = i; });
    buildChaos();
  }

  /* ---------- CHAOS: hard-cut montage, accelerating; every cut ≥ 0.22 s (> 6 frames) ---------- */
  var CUTS = [0.42, 0.36, 0.32, 0.30, 0.28, 0.24, 0.24, 0.22, 0.22];   // sums to 2.6
  var chaos = [];
  function buildChaos() {
    chaos = []; var at = 0, rand = rng(1337), aspects = [16 / 9, 1, 9 / 16, 4 / 3, 2.39, 16 / 9];
    var allIdx = BROLL.map(function (c, i) { return i; });
    CUTS.forEach(function (d, ci) {
      var bg = LIVE[(ci * 3) % LIVE.length];
      var layers = [], count = 2 + (ci % 3) + (ci > 5 ? 1 : 0);
      for (var l = 0; l < count; l++) {
        var a = aspects[Math.floor(rand() * aspects.length)];
        var w = W * (0.18 + rand() * 0.34), h = w / a;
        if (h > H * 0.95) { h = H * (0.6 + rand() * 0.3); w = h * a; }
        var live = l < 2;               // two live layers per cut, the rest are posters
        var idx = live ? LIVE[(ci * 2 + l * 5 + 1) % LIVE.length] : allIdx[Math.floor(rand() * allIdx.length)];
        layers.push({ i: idx, live: live, w: w, h: h,
          x: -w * 0.25 + rand() * (W - w * 0.5), y: -h * 0.2 + rand() * (H - h * 0.6),
          vx: (rand() - 0.5) * W * 0.06, vy: (rand() - 0.5) * H * 0.04,
          rot: rand() < 0.35 ? (rand() - 0.5) * 0.07 : 0, fx: rand(), fy: 0.3 + rand() * 0.4,
          dim: 0.75 + rand() * 0.25 });
      }
      chaos.push({ start: at, end: at + d, bg: bg, bgDim: 0.38 + rand() * 0.2, bgZoom: 1 + rand() * 0.25, layers: layers });
      at += d;
    });
  }

  function drawChaos(t, postersOnly) {
    var cut = chaos[chaos.length - 1];
    for (var i = 0; i < chaos.length; i++) if (t < chaos[i].end) { cut = chaos[i]; break; }
    var lt = t - cut.start;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = cut.bgDim;
    drawCover(srcFor(cut.bg, postersOnly), 0, 0, W, H, 0.5, 0.5, cut.bgZoom);
    cut.layers.forEach(function (ly) {
      var s = ly.live ? srcFor(ly.i, postersOnly) : srcFor(ly.i, true);
      var x = ly.x + ly.vx * lt, y = ly.y + ly.vy * lt;
      ctx.save();
      ctx.globalAlpha = ly.dim;
      ctx.translate(x + ly.w / 2, y + ly.h / 2); ctx.rotate(ly.rot);
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 24;
      ctx.fillStyle = '#000'; ctx.fillRect(-ly.w / 2, -ly.h / 2, ly.w, ly.h);
      ctx.shadowBlur = 0;
      drawCover(s, -ly.w / 2, -ly.h / 2, ly.w, ly.h, ly.fx, ly.fy);
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  /* ---------- CLICK: the real shot, a slow push-in ---------- */
  var CLICK_FX = 0.5, CLICK_FY = 0.66;
  function clickZoom(t) { return 1 + 0.05 * EOUT(seg(t, 2.6, C.clickAt + 0.6)); }
  function clickSrc() { return clickVideo && clickVideo.readyState >= 2 ? clickVideo : (clickPoster.complete ? clickPoster : null); }
  function drawClick(t) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    // hard cut in, with a two-frame lift from black so the cut reads as a cut, not a glitch
    ctx.globalAlpha = 0.6 + 0.4 * seg(t, 2.6, 2.68);
    drawCover(clickSrc(), 0, 0, W, H, CLICK_FX, CLICK_FY, clickZoom(t));
    ctx.globalAlpha = 1;
  }

  /* ---------- SHRED geometry ---------- */
  // band k at shred progress s: rect + horizontal travel
  function bandState(b, s) {
    var J = EOUT(seg(s, 0, 0.16));                                   // the tear snaps open on the click
    var travel = EIO(seg(s, b.delay, b.delay + 0.5));
    var inset = J * L.bandH * 0.16 + EOUT(seg(s, 0.1, 0.5)) * L.bandH * 0.1;
    var spread = (b.k - (L.B - 1) / 2) * L.bandH * 0.05 * J;
    return { x: b.dir * (J * W * 0.022 + travel * b.dmax), y: b.y + inset / 2 + spread, h: L.bandH - inset, ySrc: b.y + inset / 2 };
  }
  // frame j of the film strip that trails band b
  function stripFrame(b, j, s) {
    var st = bandState(b, s), fh = st.h * 0.72, fw = fh * 16 / 9, g = st.h * 0.14, p = fw + g;
    var x = b.dir < 0 ? st.x + W + g + j * p : st.x - (j + 1) * p + g;
    return { x: x, y: st.y + (st.h - fh) / 2, w: fw, h: fh, st: st, p: p };
  }
  function clipFor(b, j) { var h = L.heroAt[b.k + ':' + j]; if (h != null) return { i: SELECTS[h], live: true }; var r = (b.seed + j * 7919) % BROLL.length; return { i: r, live: LIVE_SET[r] != null }; }

  function sprockets(x, y, w, h, m) {
    // film perforations along both margins of a strip (one path, one fill)
    var hw = m * 0.5, hh = m * 0.32, step = m * 1.5;
    if (hh < 1.2) return;
    var start = x + ((-x % step) + step) % step;
    ctx.beginPath();
    for (var px = start; px < x + w - hw; px += step) {
      ctx.rect(px, y + (m - hh) / 2, hw, hh);
      ctx.rect(px, y + h - m + (m - hh) / 2, hw, hh);
    }
    ctx.fill();
  }

  function drawShred(t, s, freeze) {
    // motion trail: don't fully clear while the bands are moving fast (cheap "motion blur")
    var bell = Math.sin(Math.PI * seg(s, 0, 0.72));
    var keep = freeze ? 0 : 0.58 * bell;
    ctx.globalAlpha = 1 - keep; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;

    var e2 = EIO(seg(s, 0.36, 0.97));               // selects travel into register
    var fadeRest = 1 - EOUT(seg(s, 0.48, 0.86));    // everything else dissolves
    var cs = clickSrc(), cd = cs ? dims(cs) : null;

    // the click frame's cover crop, so each band shows its own slice of the same picture
    var crop = null;
    if (cd && cd[0]) {
      var z = clickZoom(t), k = Math.max(W / cd[0], H / cd[1]) * z, cw = W / k, ch = H / k;
      crop = { sx: (cd[0] - cw) * CLICK_FX, sy: (cd[1] - ch) * CLICK_FY, sw: cw, sh: ch, k: k };
    }

    if (fadeRest > 0.001) L.bands.forEach(function (b) {
      var st = bandState(b, s);
      ctx.globalAlpha = fadeRest;
      // film base behind the trailing frames
      var x0 = b.dir < 0 ? st.x + W : st.x - b.dmax - W, bw = b.dmax + W * 0.2;
      ctx.fillStyle = '#0d0d0c'; ctx.fillRect(Math.max(-2, x0), st.y, Math.min(W + 4, bw), st.h);
      ctx.fillStyle = 'rgba(235,229,216,.16)'; sprockets(Math.max(0, x0), st.y, Math.min(W, bw), st.h, st.h * 0.14);
      // the click slice itself
      if (crop && st.x < W && st.x + W > 0) {
        ctx.drawImage(cs, crop.sx, crop.sy + (st.ySrc / H) * crop.sh, crop.sw, (st.h / H) * crop.sh, st.x, st.y, W, st.h);
      }
      // trailing frames (non-select)
      for (var j = 0; j < 30; j++) {
        var fr = stripFrame(b, j, s);
        if (fr.x > W || fr.x + fr.w < 0) { if ((b.dir < 0 && fr.x > W) || (b.dir > 0 && fr.x + fr.w < 0)) break; continue; }
        if (L.heroAt[b.k + ':' + j] != null) continue;
        var c = clipFor(b, j);
        drawCover(srcFor(c.i, !c.live), fr.x, fr.y, fr.w, fr.h);
      }
    });
    ctx.globalAlpha = 1;

    // filmstrip bases for the final rows fade in under the landing selects
    var baseA = EOUT(seg(s, 0.62, 1));
    if (baseA > 0) drawRows(baseA);

    // the six selects: from their place on the moving strip into their cell
    L.hero.forEach(function (h, i) {
      var fr = stripFrame(L.bands[h.k], h.j, s), cell = L.cells[i];
      var x = lerp(fr.x, cell.x, e2), y = lerp(fr.y, cell.y, e2), w = lerp(fr.w, cell.w, e2), hh = lerp(fr.h, cell.h, e2);
      if (x > W || x + w < 0) return;
      drawCover(srcFor(SELECTS[i]), x, y, w, hh);
    });
  }

  /* ---------- ORDER ---------- */
  function drawRows(a) {
    ctx.globalAlpha = a;
    L.rows.forEach(function (r) {
      ctx.fillStyle = '#0d0d0c'; ctx.fillRect(r.x, r.y, r.w, r.h);
      var m = (r.h - L.cells[0].h) / 2;
      ctx.fillStyle = 'rgba(235,229,216,.11)'; sprockets(r.x + m * 0.4, r.y, r.w - m * 0.8, r.h, m);
    });
    ctx.globalAlpha = 1;
  }
  function fitText(str, maxW) {
    if (ctx.measureText(str).width <= maxW) return str;
    while (str.length > 1 && ctx.measureText(str + '…').width > maxW) str = str.slice(0, -1);
    return str.replace(/[ ,]+$/, '') + '…';
  }
  function drawOrder(t, postersOnly) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    var out = seg(t, C.orderHoldUntil, C.duration);          // quiet reset at the end of the loop
    drawRows(1 - EOUT(seg(out, 0.25, 0.85)));
    ctx.font = '500 ' + L.capFs + 'px ui-monospace, "SF Mono", Menlo, Monaco, monospace';
    if ('letterSpacing' in ctx) ctx.letterSpacing = (L.capFs * (W < 520 ? 0.04 : 0.14)).toFixed(1) + 'px';
    ctx.textBaseline = 'middle';
    L.cells.forEach(function (cell, i) {
      var fo = EOUT(seg(out, i * 0.07, i * 0.07 + 0.55));
      ctx.globalAlpha = 1 - fo;
      drawCover(srcFor(SELECTS[i], postersOnly), cell.x, cell.y - fo * 6, cell.w, cell.h);
      // caption: library label, typed in after the selects lock
      var ca = postersOnly ? 1 : EOUT(seg(t, C.shredEnds - 0.25 + i * 0.07, C.shredEnds + 0.25 + i * 0.07)) * (1 - EOUT(seg(out, 0, 0.3)));
      if (ca > 0) {
        ctx.globalAlpha = ca * 0.78; ctx.fillStyle = '#EBE5D8';
        ctx.fillText(fitText(BROLL[SELECTS[i]].label.toUpperCase(), cell.w), cell.x, cell.capY);
      }
    });
    ctx.globalAlpha = 1;
  }

  /* ---------- clock -> videos ---------- */
  function syncVideos(state) {
    var t = state.t;
    LIVE.forEach(function (i, n) {
      var v = videos[i]; if (!v) return;
      var dur = (v.duration || 5) - 0.12;
      var lt = (t + n * 0.71) % dur;                    // each clip loops on the master clock
      state.follow(v, t - lt, t);
    });
    if (clickVideo) {
      if (t >= 2.3 && t <= C.shredEnds) state.follow(clickVideo, state.clickOffset, t);
      else if (!clickVideo.paused) clickVideo.pause();
    }
  }

  /* ---------- phase markers ---------- */
  var marks = {}; document.querySelectorAll('.reel__phases li').forEach(function (li) { marks[li.dataset.phase] = li; });
  var lastMark = '';
  function setMark(t) {
    var m = t < 2.6 ? 'chaos' : t < C.clickAt ? 'click' : t < C.shredEnds ? 'shred' : 'order';
    if (m === lastMark) return; lastMark = m;
    for (var k in marks) marks[k].classList.toggle('is-on', k === m);
  }

  /* ---------- grain: one 128px noise tile, re-rolled every 3rd frame ---------- */
  var grainEl = document.querySelector('.reel__grain'), noise = document.createElement('canvas');
  noise.width = noise.height = 128;
  var nctx = noise.getContext('2d'), nimg = nctx.createImageData(128, 128), grainTick = 0;
  function rollGrain() {
    var d = nimg.data;
    for (var p = 0; p < d.length; p += 4) { var v = Math.random() * 255 | 0; d[p] = d[p + 1] = d[p + 2] = v; d[p + 3] = 255; }
    nctx.putImageData(nimg, 0, 0);
    grainEl.style.backgroundImage = 'url(' + noise.toDataURL() + ')';
  }
  rollGrain();
  function stepGrain() { if (++grainTick % 3) return; grainEl.style.backgroundPosition = (Math.random() * 128 | 0) + 'px ' + (Math.random() * 128 | 0) + 'px'; }

  /* ---------- render ---------- */
  window.__cine = { shredBegun: false, t: 0 };
  function render(t, postersOnly) {
    if (!L) return;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var shred = t >= C.clickAt && t < C.shredEnds;
    window.__cine.t = t; window.__cine.shredBegun = shred || t >= C.shredEnds;
    if (t < 2.6) drawChaos(t, postersOnly);
    else if (t < C.clickAt) drawClick(t);
    else if (shred) drawShred(t, (t - C.clickAt) / (C.shredEnds - C.clickAt), !!window.__heroFreeze);
    else drawOrder(t, postersOnly);
  }

  layout();
  var ro = new ResizeObserver(function () { layout(); if (TL.reduce) renderStatic(); });
  ro.observe(frame);

  function renderStatic() { render(8, true); setMark(8); }

  TL.start({
    onFrame: function (state) {
      syncVideos(state);
      render(state.t, false);
      setMark(state.t);
      stepGrain();
    },
    onStatic: function () {
      // reduced motion: a still, finished ORDER composition from posters
      renderStatic();
      posters.forEach(function (p) { if (!p.complete) p.addEventListener('load', renderStatic); });
    }
  });
})();
