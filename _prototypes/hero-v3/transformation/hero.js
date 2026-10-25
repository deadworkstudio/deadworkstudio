// ---- hero: The Transformation ----
// Plays once on load, then rests:
//   0.0–2.0 s  the real filmed click (the press lands at 4.004 s in the file, so it starts at 2.004)
//   2.0 s      hard cut, on the press, to the camera-original RED file: Log3G10, flat and grey
//   3.6–5.0 s  one slow, even dissolve to Stock Shredder's own look, RED IPP2 Natural
//   6.0 s      the export line;  7.0 s  the app's real keywords for this shot
//   rest       the graded take keeps looping under the final labels; it never returns to the click
// Timing is read from the videos' own clocks (never a wall clock), so the cut always lands on the
// press frame and the log and graded pair stay frame-locked even if the network stalls.
// Review: ?t=SECONDS&freeze parks every video on the exact frame for that moment.
(function () {
  'use strict';
  var fig = document.querySelector('[data-tf]'); if (!fig) return;
  var vClick = fig.querySelector('[data-tf-click]');
  var vLog = fig.querySelector('[data-tf-log]');
  var vGrad = fig.querySelector('[data-tf-graded]');
  var row = fig.querySelector('.tf-row');
  var elL = fig.querySelector('[data-tf-l]');
  var elR = fig.querySelector('[data-tf-r]');

  var PRESS = 4.004;          // finger lands, seconds into click-wide.mp4
  var CUT = 2.0;              // sequence time of the cut
  var CUT_HOLD = 0.03;        // let the press frame itself register (~1 frame) before cutting
  var DIS_A = 3.6, DIS_B = 5.0;
  var REST = 7.2;             // everything after this is the resting state
  var JET_DUR = 6.965;        // fallback until metadata reports the real duration

  var FILE = 'A001_C022_0219S6.R3D';
  var CAMERA = 'LOG3G10 / REDWIDEGAMUTRGB · 6K';
  var LOOK = 'RED IPP2 — NATURAL';
  var EXPORT = 'PRORES 422 HQ · 4K · GRADED';
  var KW = ['waterjet', 'cutting', 'metal', 'precision', 'industrial', 'closeup', 'macro', 'water', 'pressure', 'manufacturing'];
  var KW_FULL = KW.join(', ');
  var KW_SHORT = KW.slice(0, 5).join(', ') + ', …';

  // label states, by sequence time. 'KW' resolves to whatever fits the row (see finalPair).
  var STEPS = [
    { t: -Infinity, l: '', r: '' },
    { t: CUT, l: FILE, r: CAMERA, hard: true },   // arrives with the cut, no fade
    { t: 4.3, l: FILE, r: LOOK },                  // midpoint of the dissolve
    { t: 6.0, l: FILE, r: EXPORT },
    { t: 7.0, l: 'KW', r: EXPORT }
  ];

  var params = new URLSearchParams(location.search);
  var T_PARAM = params.has('t') ? Math.max(0, parseFloat(params.get('t')) || 0) : 0;
  var FREEZE = params.has('freeze');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- labels ----
  row.style.position = 'relative';
  var meas = document.createElement('span');
  meas.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden;white-space:nowrap;pointer-events:none';
  row.appendChild(meas);
  function textW(s) { meas.textContent = s; return meas.getBoundingClientRect().width; }
  // Full keyword line beside the export line when it fits (desktop); otherwise the first five
  // plus an ellipsis; on the narrowest rows the keywords take the row on their own.
  function finalPair() {
    var avail = row.clientWidth, gap = parseFloat(getComputedStyle(row).columnGap) || 0, ew = textW(EXPORT);
    if (textW(KW_FULL) + gap + ew <= avail) return [KW_FULL, EXPORT];
    if (textW(KW_SHORT) + gap + ew <= avail) return [KW_SHORT, EXPORT];
    if (textW(KW_FULL) <= avail) return [KW_FULL, ''];
    return [KW_SHORT, ''];
  }
  function stepAt(T) { for (var i = STEPS.length - 1; i > 0; i--) if (T >= STEPS[i].t) return i; return 0; }
  function pairFor(i) { var s = STEPS[i]; return s.l === 'KW' ? finalPair() : [s.l, s.r]; }

  function swap(el, text, animate) {
    if (el.textContent === text && !el._pending) return;
    if (el._anim) { el._anim.onfinish = null; el._anim.cancel(); el._anim = null; }
    el._pending = false;
    if (!animate || !el.animate) { el.textContent = text; return; }
    function fadeIn() {
      el._pending = false;
      el.textContent = text;
      if (!text) return;
      el._anim = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 640, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'backwards' });
    }
    if (el.textContent) {
      el._pending = true;
      el._anim = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: 'ease', fill: 'forwards' });
      el._anim.onfinish = fadeIn;
    } else fadeIn();
  }
  var shown = -1;
  function setLabels(i, animate) {
    if (i === shown) return;
    shown = i;
    var p = pairFor(i), a = animate && !STEPS[i].hard;
    swap(elL, p[0], a); swap(elR, p[1], a);
  }

  // ---- picture ----
  function gradedAt(T) { return T <= DIS_A ? 0 : T >= DIS_B ? 1 : (T - DIS_A) / (DIS_B - DIS_A); }
  var lastT = 0;
  function render(T, animate) {
    lastT = T;
    fig.classList.toggle('is-cut', T >= CUT);
    vGrad.style.opacity = String(gradedAt(T));
    setLabels(stepAt(T), animate);
  }

  function play(v) {
    var p = v.play();
    if (p && p.catch) p.catch(function (e) { if (e && e.name === 'NotAllowedError') still(); });
  }
  function jetDur() { return isFinite(vGrad.duration) && vGrad.duration > 0 ? vGrad.duration : JET_DUR; }

  // Resting still: reduced motion, or autoplay refused (e.g. Low Power Mode).
  var isStill = false;
  function still() {
    isStill = true; running = false; phase = 'rest';
    if (raf) cancelAnimationFrame(raf), raf = null;
    [vClick, vLog, vGrad].forEach(function (v) { v.pause(); });
    fig.classList.add('is-still', 'is-cut');
    vGrad.style.opacity = '1';
    shown = -1; setLabels(STEPS.length - 1, false);
  }

  // Bring the log/graded pair in during the click so the cut is instant.
  function warm(v) { if (v.preload !== 'auto') { v.preload = 'auto'; v.load(); } }

  if (reduce) { still(); return; }
  warm(vLog); warm(vGrad);

  // ---- review mode: ?t=SECONDS&freeze ----
  function seekTo(v, t) {
    return new Promise(function (res) {
      function go() {
        var target = Math.min(t, Math.max(0, v.duration - 0.02));
        function settled() {
          // rVFC confirms the frame is presented; it never fires for a covered layer, so cap the wait
          if (v.readyState >= 2) { if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(function () { res(); }); setTimeout(res, 400); }
          else v.addEventListener('loadeddata', function () { res(); }, { once: true });
        }
        if (Math.abs(v.currentTime - target) < 0.001 && v.readyState >= 2) { res(); return; }
        v.addEventListener('seeked', settled, { once: true });
        v.currentTime = target;
      }
      if (v.readyState >= 1) go(); else v.addEventListener('loadedmetadata', go, { once: true });
    });
  }
  if (FREEZE) {
    var T = T_PARAM;
    Promise.all([vClick, vLog, vGrad].map(function (v) { return new Promise(function (r) { if (v.readyState >= 1) r(); else v.addEventListener('loadedmetadata', r, { once: true }); }); }))
      .then(function () {
        var jt = T < CUT ? 0 : (T - CUT) % jetDur();
        return Promise.all([seekTo(vClick, T < CUT ? PRESS - CUT + T : PRESS), seekTo(vLog, jt), seekTo(vGrad, jt)]);
      })
      .then(function () {
        render(T, false);
        fig.setAttribute('data-ready', '1');
      });
    window.__tf = function () { return { T: lastT, click: vClick.currentTime, log: vLog.currentTime, graded: vGrad.currentTime }; };
    return;
  }

  // ---- live playback ----
  var phase = null, running = false, raf = null, inView = true;

  function slaveLog() {
    // graded is the master clock; nudge the log toward it, seek only on a real slip
    if (vLog.paused || vGrad.paused || vLog.seeking) return;
    var d = vLog.currentTime - vGrad.currentTime;
    if (Math.abs(d) > 0.08) { vLog.currentTime = vGrad.currentTime; vLog.playbackRate = 1; }
    else if (Math.abs(d) > 0.01) vLog.playbackRate = d > 0 ? 0.96 : 1.04;
    else if (vLog.playbackRate !== 1) vLog.playbackRate = 1;
  }

  function cut() {
    phase = 'jet';
    vClick.pause();
    play(vGrad); play(vLog);
  }

  function tick() {
    raf = null;
    if (!running) return;
    var T = lastT;
    if (phase === 'click') {
      T = vClick.currentTime - (PRESS - CUT);
      if (vClick.currentTime >= PRESS + CUT_HOLD || vClick.ended) { cut(); T = CUT; }
    } else if (phase === 'jet') {
      T = Math.max(lastT, CUT + vGrad.currentTime);
      if (T < DIS_B + 0.15) slaveLog(); else if (!vLog.paused) vLog.pause(); // log is fully covered now
      if (T >= REST) phase = 'rest';
    }
    render(T, true);
    if (phase !== 'rest') raf = requestAnimationFrame(tick);
  }

  function resume() {
    if (running || isStill || !inView || document.hidden || !phase) return;
    running = true;
    if (phase === 'click') play(vClick);
    else if (phase === 'jet') { play(vGrad); if (lastT < DIS_B) play(vLog); }
    else play(vGrad);
    if (phase !== 'rest' && !raf) raf = requestAnimationFrame(tick);
  }
  function pause() {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    [vClick, vLog, vGrad].forEach(function (v) { if (!v.paused) v.pause(); });
  }

  function begin() {
    var T0 = T_PARAM, d = jetDur();
    if (T0 < CUT) {
      phase = 'click';
      vClick.currentTime = PRESS - CUT + T0;
      vLog.currentTime = 0; vGrad.currentTime = 0;
    } else {
      fig.classList.add('is-cut');
      var jt = (T0 - CUT) % d;
      vLog.currentTime = jt; vGrad.currentTime = jt;
      phase = T0 < REST ? 'jet' : 'rest';
      if (phase === 'rest') vLog.pause();
    }
    render(T0, false);
    resume();
  }

  // Start once the click can play and the pair has its first frames, so the cut never shows black.
  // A slow connection gets a few seconds' grace, then starts anyway (the posters cover any gap).
  var begun = false;
  function ready() { return vClick.readyState >= 3 && vLog.readyState >= 2 && vGrad.readyState >= 2; }
  function tryBegin() { if (!begun && (ready() || waited)) { begun = true; begin(); } }
  var waited = false;
  [vClick, vLog, vGrad].forEach(function (v) { ['canplay', 'loadeddata'].forEach(function (e) { v.addEventListener(e, tryBegin); }); });
  setTimeout(function () { waited = true; tryBegin(); }, 5000);
  tryBegin();

  window.addEventListener('resize', function () { if (shown === STEPS.length - 1) { shown = -1; setLabels(STEPS.length - 1, false); } });
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); else resume(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (en) { inView = en.isIntersecting; if (inView) resume(); else pause(); });
    }, { threshold: 0 }).observe(fig);
  }
  window.__tf = function () { return { phase: phase, T: lastT, click: vClick.currentTime, log: vLog.currentTime, graded: vGrad.currentTime, opacity: vGrad.style.opacity }; };
})();
