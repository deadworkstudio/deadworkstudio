// Stock Shredder hero — shared timeline engine. One master clock drives every prototype so the
// shred always starts on the physical click. Prototypes call HeroTimeline.start({ onFrame }) and
// draw from the state they're given; they never time anything themselves.
(function () {
  var C = window.HERO_CONFIG;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function phaseOf(t) {
    if (t < C.clickAt) return { name: 'chaos', p: t / C.clickAt };
    if (t < C.shredEnds) return { name: 'shred', p: (t - C.clickAt) / (C.shredEnds - C.clickAt) };
    return { name: 'order', p: clamp((t - C.shredEnds) / (C.orderHoldUntil - C.shredEnds), 0, 1) };
  }

  // Keeps a <video> on the master clock: video time = timeline time - offset. Nudges playbackRate
  // for small drift (no visible seek), seeks only on a real jump (loop seam, tab wake).
  function follow(video, offset, t) {
    var want = t - offset;
    if (want < 0 || (video.duration && want > video.duration)) { if (!video.paused) video.pause(); return false; }
    if (window.__heroFreeze) { if (Math.abs(video.currentTime - want) > 0.01) { try { video.currentTime = want; } catch (e) {} } if (!video.paused) video.pause(); return true; }
    var d = want - video.currentTime;
    if (Math.abs(d) > 0.25 || video.paused) { try { video.currentTime = want; } catch (e) {} video.playbackRate = 1; var p = video.play(); if (p && p.catch) p.catch(function () {}); }
    else video.playbackRate = Math.abs(d) < 0.02 ? 1 : 1 + clamp(d * 2, -0.15, 0.15);
    return true;
  }

  // The click video is placed so its finger press (clickFrameTime) lands exactly on clickAt.
  var clickOffset = C.clickAt - C.click.clickFrameTime;

  // Preview/test hooks: ?t=4.2 starts the loop at 4.2 s; adding &freeze holds that moment still.
  var q = new URLSearchParams(location.search);
  var startAt = q.has('t') ? parseFloat(q.get('t')) || 0 : 0, freeze = q.has('freeze');
  window.__heroFreeze = freeze;

  var raf = 0, t0 = null, running = false, frameCb = null, visible = true, pausedAt = startAt;
  function tick(now) {
    if (!running) return;
    if (t0 === null) t0 = now - pausedAt * 1000;
    var t = freeze ? startAt : ((now - t0) / 1000) % C.duration;
    var state = { t: t, duration: C.duration, phase: phaseOf(t), clickAt: C.clickAt, shredEnds: C.shredEnds,
      sinceClick: t - C.clickAt, clickOffset: clickOffset, follow: follow };
    if (frameCb) frameCb(state);
    raf = requestAnimationFrame(tick);
  }

  window.HeroTimeline = {
    config: C,
    reduce: reduce,
    phaseOf: phaseOf,
    follow: follow,
    clickOffset: clickOffset,
    // opts.onFrame(state) every animation frame; opts.onStatic(state) once under reduced motion
    start: function (opts) {
      frameCb = opts.onFrame;
      if (reduce) { if (opts.onStatic) opts.onStatic({ t: C.orderHoldUntil, phase: { name: 'order', p: 1 } }); return; }
      running = true; raf = requestAnimationFrame(tick);
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) { running = false; cancelAnimationFrame(raf); pausedAt = t0 === null ? 0 : ((performance.now() - t0) / 1000) % C.duration; t0 = null; }
        else if (!running) { running = true; raf = requestAnimationFrame(tick); }
      });
    },
    // scrub to a fixed time (used by the comparison page's "jump to click" buttons)
    seek: function (t) { pausedAt = t; t0 = null; }
  };
})();
