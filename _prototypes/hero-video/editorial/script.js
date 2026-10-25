/* Stock Shredder hero — Editorial prototype.
   CHAOS → CLICK → SHRED → ORDER, drawn on one <canvas> from real <video> sources.
   All timing comes from the shared HeroTimeline engine (state.t); nothing here owns a clock. */
(function () {
  'use strict';

  var C = window.HERO_CONFIG;
  var TL = window.HeroTimeline;

  var film = document.querySelector('[data-film]');
  var canvas = document.querySelector('[data-canvas]');
  var ctx = canvas.getContext('2d');
  var capsEl = document.querySelector('[data-captions]');
  var sourcesEl = document.querySelector('[data-sources]');
  var phaseEls = Array.prototype.slice.call(document.querySelectorAll('[data-phases] li'));

  /* ---------- palette (from ss-page.css) ---------- */
  var BG = '#F4F1EA', INK = '#141412', PAPER = '#FBFAF6';

  /* ---------- easing: the two curves from the motion system ---------- */
  function bezier(x1, y1, x2, y2) {
    function a(p1, p2) { return 1 - 3 * p2 + 3 * p1; }
    function b(p1, p2) { return 3 * p2 - 6 * p1; }
    function c(p1) { return 3 * p1; }
    function at(t, p1, p2) { return ((a(p1, p2) * t + b(p1, p2)) * t + c(p1)) * t; }
    function slope(t, p1, p2) { return 3 * a(p1, p2) * t * t + 2 * b(p1, p2) * t + c(p1); }
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      var t = x;
      for (var i = 0; i < 6; i++) { var s = slope(t, x1, x2); if (Math.abs(s) < 1e-6) break; t -= (at(t, x1, x2) - x) / s; }
      return at(t, y1, y2);
    };
  }
  var easeOut = bezier(0.23, 1, 0.32, 1);       // entrances
  var easeInOut = bezier(0.77, 0, 0.175, 1);    // on-screen movement (the knife, the strips)
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }

  /* ---------- sources ----------
     Budget: 7 B-roll videos + the click video = 8 decoders. The other 6 prints are posters. */
  var VIDEO_COUNT = 7;          // broll[0..6] are live video; broll[0..5] also fill the ORDER grid
  var GRID_COUNT = 6;
  var broll = C.broll.map(function (clip, i) {
    var img = new Image(); img.src = clip.poster; img.onload = requestStatic;
    var entry = { clip: clip, img: img, video: null };
    if (i < VIDEO_COUNT) entry.video = makeVideo(clip.src, clip.poster);
    return entry;
  });

  var clickPoster = new Image(); clickPoster.src = C.click.poster; clickPoster.onload = requestStatic;
  var clickVideo = null; // created after first layout so we can pick SD or HD for the plate size

  function makeVideo(src, poster) {
    var v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('preload', 'auto');
    if (poster) v.poster = poster;
    v.src = src;
    sourcesEl.appendChild(v);
    return v;
  }
  function frameOf(entry) {
    var v = entry.video;
    if (v && v.readyState >= 2) return { el: v, w: v.videoWidth, h: v.videoHeight };
    if (entry.img.complete && entry.img.naturalWidth) return { el: entry.img, w: entry.img.naturalWidth, h: entry.img.naturalHeight };
    return null;
  }

  /* ---------- the messy table: 13 prints, hand-placed so the pile reads as careless, not random noise ----------
     [centre x, centre y, width] as fractions of the module; rotation in degrees. Drop order = array order. */
  var TABLE = [
    [0.18, 0.31, 0.24, -6], [0.41, 0.22, 0.20, 4], [0.64, 0.27, 0.26, -3], [0.85, 0.35, 0.22, 7],
    [0.28, 0.63, 0.27, 3], [0.53, 0.56, 0.23, -8], [0.76, 0.67, 0.25, 5], [0.09, 0.74, 0.19, -4],
    [0.93, 0.78, 0.17, -9], [0.46, 0.83, 0.21, 6], [0.33, 0.41, 0.17, -11], [0.70, 0.46, 0.18, 10],
    [0.60, 0.81, 0.16, -2]
  ];

  /* ---------- layout ---------- */
  var L = null, dpr = 1;
  var caps = broll.slice(0, GRID_COUNT).map(function (b) {
    var p = document.createElement('p'); p.className = 'cap'; p.textContent = b.clip.label; capsEl.appendChild(p); return p;
  });

  function layout() {
    var r = film.getBoundingClientRect();
    var W = r.width, H = r.height;
    if (!W || !H) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    var ratio = W / H;
    var narrow = ratio < 1;

    // ORDER grid: 3×2 on wide modules, 2×3 on portrait phones. Cells are 16:9 with a caption row.
    var cols = narrow ? 2 : 3, rows = GRID_COUNT / cols;
    var pad = narrow ? 14 : Math.max(24, W * 0.035);
    var gut = narrow ? 12 : Math.max(16, W * 0.022);
    var capH = narrow ? 26 : 32;
    var cw = Math.min((W - 2 * pad - (cols - 1) * gut) / cols, ((H - 2 * pad - (rows - 1) * gut) / rows - capH) * 16 / 9);
    var ch = cw * 9 / 16;
    var gw = cols * cw + (cols - 1) * gut, gh = rows * (ch + capH) + (rows - 1) * gut;
    var gx = (W - gw) / 2, gy = (H - gh) / 2;
    var cells = [];
    for (var j = 0; j < GRID_COUNT; j++) {
      var c = j % cols, rr = Math.floor(j / cols);
      cells.push({ x: gx + c * (cw + gut), y: gy + rr * (ch + capH + gut), w: cw, h: ch });
    }

    // CLICK plate: calm, large, centred. Wide crop on desktop, 4:3 on a phone so the hand stays big.
    var pAspect = narrow ? 4 / 3 : 1.9;
    var pw = Math.min(W * (narrow ? 0.88 : ratio < 1.8 ? 0.7 : 0.58), H * 0.8 * pAspect);
    var ph = pw / pAspect;
    var plate = { x: (W - pw) / 2, y: (H - ph) / 2, w: pw, h: ph };

    // the table scales up on smaller modules so prints stay legible
    var scale = ratio >= 1.8 ? 1 : narrow ? 1.75 : 1.3;
    var prints = TABLE.map(function (p, i) {
      var w = p[2] * W * scale;
      return { i: i, cx: p[0] * W, cy: p[1] * H, w: w, h: w * 9 / 16, rot: p[3] * Math.PI / 180 };
    });

    var strips = narrow ? 5 : 8;
    L = { W: W, H: H, narrow: narrow, cells: cells, capH: capH, plate: plate, prints: prints, strips: strips };

    caps.forEach(function (el, j) { el.style.width = cells[j].w + 'px'; });

    if (!clickVideo) {
      var src = pw * dpr > 1000 ? C.click.srcHd : C.click.src;
      clickVideo = makeVideo(src, C.click.poster);
    }
    requestStatic();
  }

  /* ---------- drawing helpers ---------- */
  // draw a source "cover"-fitted into a rect; returns the source crop used (for slicing strips)
  function coverCrop(sw, sh, w, h, fx, fy) {
    var s = Math.max(w / sw, h / sh);
    var cw = w / s, chh = h / s;
    return { sx: (sw - cw) * (fx == null ? 0.5 : fx), sy: (sh - chh) * (fy == null ? 0.5 : fy), sw: cw, sh: chh };
  }
  function drawCover(f, x, y, w, h, fx, fy) {
    var k = coverCrop(f.w, f.h, w, h, fx, fy);
    ctx.drawImage(f.el, k.sx, k.sy, k.sw, k.sh, x, y, w, h);
  }

  // a contact print: footage on a paper border with a soft table shadow
  function drawPrint(p, f, alpha, dx, dy, sc, extraRot) {
    if (alpha <= 0.001) return;
    var b = Math.max(4, p.w * 0.035);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.cx + dx, p.cy + dy);
    ctx.rotate(p.rot + extraRot);
    ctx.scale(sc, sc);
    ctx.shadowColor = 'rgba(20, 20, 18, 0.16)';
    ctx.shadowBlur = 16 * dpr; ctx.shadowOffsetY = 5 * dpr;
    ctx.fillStyle = PAPER;
    ctx.fillRect(-p.w / 2 - b, -p.h / 2 - b, p.w + 2 * b, p.h + 2 * b);
    ctx.shadowColor = 'transparent';
    if (f) drawCover(f, -p.w / 2, -p.h / 2, p.w, p.h);
    else { ctx.fillStyle = '#D8D2C5'; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); }
    ctx.restore();
  }

  /* ---------- the four acts ---------- */

  // CHAOS: prints land one after another on the table and keep slowly sliding — too many, unsorted.
  function drawChaos(t, exitP) {
    var W = L.W, H = L.H;
    for (var i = 0; i < L.prints.length; i++) {
      var p = L.prints[i];
      var land = 0.05 + i * 0.17;                       // the pile keeps growing until ~2.1 s
      var e = easeOut(seg(t, land, land + 0.7));
      if (e <= 0) continue;
      var drift = Math.min(t, 6) - land;               // gentle table drift after landing
      var dx = Math.sin(drift * 0.45 + i * 1.7) * 5;
      var dy = Math.cos(drift * 0.38 + i * 2.3) * 4 - (1 - e) * 16;
      var rot = Math.sin(drift * 0.3 + i) * 0.006;
      // on the shred, the table clears outward and fades
      var x = easeInOut(exitP);
      dx += (p.cx - W / 2) * 0.08 * x; dy += (p.cy - H / 2) * 0.08 * x;
      // opacity lands fast (no see-through ghosts); position and scale settle on the slower curve
      var a = seg(t, land, land + 0.16);
      drawPrint(p, frameOf(broll[i]), a * (1 - x), dx, dy, 1 + (1 - e) * 0.05, rot);
    }
  }

  // the click plate, whole or sliced into vertical strips
  function drawPlate(t, s) {
    var P = L.plate;
    var f = clickVideo && clickVideo.readyState >= 2 ? { el: clickVideo, w: clickVideo.videoWidth, h: clickVideo.videoHeight }
      : (clickPoster.complete && clickPoster.naturalWidth ? { el: clickPoster, w: clickPoster.naturalWidth, h: clickPoster.naturalHeight } : null);
    if (!f) return;
    var k = coverCrop(f.w, f.h, P.w, P.h, 0.5, 0.58);

    if (s < 0) {
      // arrival 2.6 → 3.3 s: rises a few px into place, nothing more
      var e = easeOut(seg(t, 2.6, 3.3));
      if (e <= 0) return;
      ctx.save();
      ctx.globalAlpha = e;
      var sc = 0.97 + 0.03 * e;
      ctx.translate(P.x + P.w / 2, P.y + P.h / 2 + (1 - e) * 10);
      ctx.scale(sc, sc);
      ctx.drawImage(f.el, k.sx, k.sy, k.sw, k.sh, -P.w / 2, -P.h / 2, P.w, P.h);
      ctx.restore();
      return;
    }

    // SHRED: the knife (0 → .4 s), the strips part (.42 → 1.0 s), then each strip feeds down into a slot
    // at the plate's bottom edge, centre strips first (1.0 → 1.6 s). Strips stay opaque: paper, not ghosts.
    var N = L.strips, sw = P.w / N, ssw = k.sw / N;
    var gapMax = L.narrow ? 7 : 12;
    var sep = easeInOut(seg(s, 0.42, 1.0));
    for (var i = 0; i < N; i++) {
      var d = (i - (N - 1) / 2);
      var ox = d * gapMax * sep;
      var oy = (i % 2 ? 1 : -1) * 4 * sep * (1 - seg(s, 1.0, 1.2));
      var delay = Math.abs(d) / ((N - 1) / 2) * 0.16;
      var out = easeInOut(seg(s, 1.0 + delay, 1.42 + delay));
      if (out >= 1) continue;
      var vis = 1 - out;
      ctx.drawImage(f.el, k.sx + i * ssw, k.sy, ssw, k.sh * vis, P.x + i * sw + ox, P.y + oy + P.h * out, sw + 0.5, P.h * vis);
    }
    ctx.globalAlpha = 1;

    // the knife: clean paper-coloured cuts top→bottom, with ink crop marks above and below the plate
    var cutAlpha = 1 - seg(s, 0.95, 1.25);
    if (cutAlpha <= 0) return;
    for (var c = 1; c < N; c++) {
      var cp = easeInOut(seg(s, (c - 1) * 0.025, (c - 1) * 0.025 + 0.24));
      if (cp <= 0) continue;
      var dc = c - N / 2;
      var cx = P.x + c * sw + dc * gapMax * sep;   // cut sits in the centre of its gap
      // paper showing through the cut (only while it's thinner than the opening gap)
      if (sep < 0.2) {
        ctx.fillStyle = BG;
        ctx.globalAlpha = 1;
        ctx.fillRect(cx - 0.75, P.y - 6, 1.5, (P.h + 12) * cp);
      }
      // crop marks: 10 px ink ticks outside the plate, top and bottom
      ctx.globalAlpha = cutAlpha * 0.85;
      ctx.fillStyle = INK;
      var tick = L.narrow ? 7 : 11, gap = 6;
      ctx.fillRect(cx - 0.5, P.y - gap - tick, 1, tick * Math.min(1, cp * 3));
      if (cp > 0.85) ctx.fillRect(cx - 0.5, P.y + P.h + gap, 1, tick * seg(cp, 0.85, 1));
    }
    ctx.globalAlpha = 1;
  }

  // ORDER: a precise 3×2 grid, each clip revealed top-down; a hairline under each shows its playhead
  function drawOrder(t, revealFor, alpha, sc, still) {
    var W = L.W, H = L.H;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -H / 2);
    for (var j = 0; j < GRID_COUNT; j++) {
      var cell = L.cells[j];
      var r = revealFor(j);
      if (r <= 0) continue;
      var e = easeOut(r);
      var f = still ? (broll[j].img.complete ? { el: broll[j].img, w: broll[j].img.naturalWidth, h: broll[j].img.naturalHeight } : null) : frameOf(broll[j]);
      ctx.save();
      ctx.beginPath(); ctx.rect(cell.x, cell.y, cell.w, cell.h * e); ctx.clip();
      if (f && f.w) drawCover(f, cell.x, cell.y + (1 - e) * 8, cell.w, cell.h);
      ctx.restore();
      // trim hairline: track + playhead within the clip
      var lineA = seg(r, 0.5, 1);
      if (lineA > 0) {
        var ly = cell.y + cell.h + 7;
        ctx.globalAlpha = alpha * lineA;
        ctx.fillStyle = 'rgba(20, 20, 18, 0.14)';
        ctx.fillRect(cell.x, ly, cell.w, 1);
        var v = broll[j].video, prog = still ? 1 : (v && v.duration ? clamp(v.currentTime / v.duration, 0, 1) : 0);
        ctx.fillStyle = INK;
        ctx.fillRect(cell.x, ly, cell.w * prog, 1);
        ctx.globalAlpha = alpha;
      }
    }
    ctx.restore();
  }

  function placeCaptions(capFor, alpha, sc) {
    var W = L.W, H = L.H;
    for (var j = 0; j < caps.length; j++) {
      var cell = L.cells[j];
      var a = capFor(j);
      var y = cell.y + cell.h + 15 + (1 - easeOut(a)) * 4;
      var x = W / 2 + (cell.x - W / 2) * sc, yy = H / 2 + (y - H / 2) * sc;
      caps[j].style.opacity = (easeOut(a) * alpha).toFixed(3);
      caps[j].style.transform = 'translate(' + x.toFixed(1) + 'px,' + yy.toFixed(1) + 'px)';
    }
  }

  /* ---------- phase markers ---------- */
  var lastPhase = '';
  function setPhase(name) {
    if (name === lastPhase) return;
    lastPhase = name;
    phaseEls.forEach(function (li) { li.classList.toggle('is-on', li.getAttribute('data-phase') === name); });
  }

  /* ---------- keep the decoders on the master clock ---------- */
  function syncVideos(state) {
    var t = state.t;
    for (var k = 0; k < VIDEO_COUNT; k++) {
      var v = broll[k].video;
      var needed = k < GRID_COUNT || t < 5.4;
      if (!needed) { if (!v.paused) v.pause(); continue; }
      // each clip runs its own 5 s loop, staggered so the pile never cuts in unison.
      // The same formula spans CHAOS and ORDER, so a clip never jumps when it moves from table to grid.
      state.follow(v, 0, (t + k * 0.7) % 5);
    }
    if (clickVideo) {
      if (t >= 2.3 && t < 6.2) state.follow(clickVideo, state.clickOffset, t);
      else if (!clickVideo.paused) clickVideo.pause();
    }
  }

  /* ---------- per-frame render ---------- */
  function render(state) {
    if (!L) return;
    var t = state.t, s = t - state.clickAt;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, L.W, L.H);

    // CHAOS table (and its exit once the knife lands)
    if (t < state.clickAt + 1.3) drawChaos(t, s >= 0 ? seg(s, 0.25, 1.2) : 0);

    // CLICK: as the plate arrives the table recedes under a paper veil, so the hand owns the frame
    var veil = t < state.clickAt ? easeOut(seg(t, 2.6, 3.3)) * 0.62 : 0.62 * (1 - seg(s, 0.25, 1.0));
    if (veil > 0) { ctx.globalAlpha = veil; ctx.fillStyle = BG; ctx.fillRect(0, 0, L.W, L.H); ctx.globalAlpha = 1; }

    // ORDER: cells reveal 1.1 s after the click, 70 ms apart, under the feeding strips; caption follows each cell
    var resetP = easeInOut(seg(t, C.orderHoldUntil, C.duration));
    var gridOn = t >= state.clickAt + 1.05;
    if (gridOn) {
      var rev = function (j) { return seg(s, 1.1 + j * 0.07, 1.75 + j * 0.07); };
      var cap = function (j) { return seg(s, 1.45 + j * 0.07, 1.85 + j * 0.07); };
      drawOrder(t, rev, 1 - resetP, 1 - 0.015 * resetP, false);
      placeCaptions(cap, 1 - resetP, 1 - 0.015 * resetP);
    } else placeCaptions(function () { return 0; }, 0, 1);

    // the plate draws last: during the feed its strips lie on top of the arriving grid
    if (t >= 2.6 && t < state.clickAt + 2.4) drawPlate(t, s);

    setPhase(t < 2.6 ? 'chaos' : t < state.clickAt ? 'click' : t < state.shredEnds ? 'shred' : 'order');

    // test hook: where things are this frame
    window.__editorial = { t: t, shredBegun: s >= 0, plate: L.plate, strips: L.strips,
      clickTime: clickVideo ? clickVideo.currentTime : null };
  }

  /* ---------- reduced motion: the finished ORDER composition, stills only ---------- */
  var staticMode = false;
  function renderStatic() {
    if (!L) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, L.W, L.H);
    drawOrder(0, function () { return 1; }, 1, 1, true);
    placeCaptions(function () { return 1; }, 1, 1);
    setPhase('order');
  }
  function requestStatic() { if (staticMode) renderStatic(); }

  var lastState = null;
  new ResizeObserver(function () { layout(); if (lastState && !staticMode) render(lastState); }).observe(film);
  layout();

  TL.start({
    onFrame: function (state) { lastState = state; syncVideos(state); render(state); },
    onStatic: function () {
      staticMode = true;
      broll.forEach(function (b) { if (b.video) { b.video.preload = 'none'; b.video.removeAttribute('src'); b.video.load(); } });
      renderStatic();
    }
  });
})();
