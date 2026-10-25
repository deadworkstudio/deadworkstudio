// Hero: THE EDIT
// One real take (A002_C044_0217SC, 5:18) is a single hairline. A playhead walks it at one steady
// scrub speed and slows to "play" through each of six 7 s moments; at each one the picture
// hard-cuts to that moment and a mark stays on the line. Then the row reads as a result
// (6 CLIPS · 0:42) and the frame rests, cutting through the six selects every 3 s, forever.
//
// Everything visible is a pure function of one clock (state(t)), so ?t=SECONDS&freeze can park
// any moment exactly, videos included. Only transform/opacity are animated.
(function () {
  var fig = document.querySelector('[data-cut]'); if (!fig) return;

  var TAKE = 317.9, LEN = 7;                       // take length, clip length (s, take time)
  var IN = [60, 92, 145, 224, 249, 300];           // in-points of weld-1..6 within the take
  var DWELL = [1.05, 1.05, 1.05, 1.15, 1.55, 1.05]; // wall-clock time the playhead spends inside each 7 s
  var LEAD = 0.7, SCRUB = 135, RESULT = 1.7, SLOT = 3; // s; take-seconds per second; s; s

  var vids = [].slice.call(fig.querySelectorAll('.cut-v'));
  var marks = [].slice.call(fig.querySelectorAll('.cut-mark'));
  var rail = fig.querySelector('[data-rail]');
  var leftEl = fig.querySelector('[data-left]'), rightEl = fig.querySelector('[data-right]');

  var q = new URLSearchParams(location.search);
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var freeze = q.has('freeze');
  var tParam = q.has('t') ? Math.max(0, parseFloat(q.get('t')) || 0) : null;

  // ---- the schedule: segments of playhead position over wall-clock time ----
  var seg = [], arrive = [], t = 0, p = 0;
  function push(dt, p1) { seg.push({ t0: t, t1: t + dt, p0: p, p1: p1 }); t += dt; p = p1; }
  push(LEAD, 0);
  for (var k = 0; k < IN.length; k++) {
    push((IN[k] - p) / SCRUB, IN[k]);
    arrive[k] = t;
    push(DWELL[k], IN[k] + LEN);
  }
  push((TAKE - p) / SCRUB, TAKE);
  var SCAN_END = t, REST = t + RESULT;

  // ---- labels ----
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tc(s) { var f = Math.min(23, Math.floor((s % 1) * 24)); s = Math.floor(s); return pad(Math.floor(s / 60)) + ':' + pad(s % 60) + ':' + pad(f); }
  function ms(s) { return Math.floor(s / 60) + ':' + pad(Math.round(s) % 60); }
  var FILE = 'A002_C044_0217SC', RESULT_LABEL = '6 CLIPS · 0:42';
  function clipLabel(i) { return 'CLIP 0' + (i + 1) + '   ' + ms(IN[i]) + '–' + ms(IN[i] + LEN); }

  // Marks are static geometry: proportional position and width on the take.
  marks.forEach(function (m, i) { m.style.left = (IN[i] / TAKE * 100) + '%'; m.style.width = (LEN / TAKE * 100) + '%'; });

  function playheadAt(t) {
    for (var i = 0; i < seg.length; i++) { var s = seg[i]; if (t < s.t1) return s.p0 + (s.p1 - s.p0) * ((t - s.t0) / (s.t1 - s.t0)); }
    return TAKE;
  }

  // Pure state at time t: which clip is up, how far into it, marks, labels.
  function state(t) {
    var st = { marks: [], dim: -1 };
    if (t < SCAN_END) {
      var ph = playheadAt(t), c = 0;
      for (var i = 0; i < IN.length; i++) if (t >= arrive[i]) c = i;
      st.clip = c; st.local = c === 0 ? t : t - arrive[c];
      st.head = ph / TAKE;
      for (var j = 0; j < IN.length; j++) st.marks[j] = Math.max(0, Math.min(1, (ph - IN[j]) / LEN));
      st.left = FILE; st.right = tc(ph);
    } else if (t < REST) {
      st.clip = 5; st.local = t - arrive[5]; st.head = -1;
      for (var a = 0; a < 6; a++) st.marks[a] = 1;
      st.left = FILE; st.right = RESULT_LABEL;
    } else {
      var n = Math.floor((t - REST) / SLOT);
      st.clip = n % 6; st.local = (t - REST) - n * SLOT; st.head = -1; st.dim = st.clip;
      for (var b = 0; b < 6; b++) st.marks[b] = 1;
      st.left = clipLabel(st.clip); st.right = RESULT_LABEL;
    }
    st.local = Math.min(LEN - 0.05, Math.max(0, st.local));
    return st;
  }

  // ---- writing state to the DOM (only what changed) ----
  var cur = -1, last = { left: null, right: null, head: null, marks: [], dim: null };
  function render(st, live) {
    if (st.clip !== cur) cutTo(st.clip, live);
    if (st.left !== last.left) { leftEl.textContent = st.left; last.left = st.left; }
    if (st.right !== last.right) { rightEl.textContent = st.right; last.right = st.right; }
    if (st.head !== last.head) {
      if (st.head < 0) rail.classList.add('is-gone');
      else { rail.classList.remove('is-gone'); rail.style.transform = 'translateX(' + (st.head * 100).toFixed(3) + '%)'; }
      last.head = st.head;
    }
    for (var i = 0; i < marks.length; i++) {
      if (st.marks[i] !== last.marks[i]) { marks[i].style.transform = 'scaleX(' + st.marks[i].toFixed(4) + ')'; last.marks[i] = st.marks[i]; }
    }
    if (st.dim !== last.dim) {
      for (var j = 0; j < marks.length; j++) marks[j].classList.toggle('is-dim', st.dim >= 0 && j !== st.dim);
      last.dim = st.dim;
    }
  }

  // A hard cut: the incoming clip is already decoded and parked on its first frame (or showing its
  // poster, which is that frame), so it goes visible in the same frame the outgoing one goes away.
  window.__cutLog = [];
  function cutTo(i, live) {
    var prev = vids[cur], next = vids[i];
    next.classList.add('is-on');
    if (prev && prev !== next) prev.classList.remove('is-on');
    window.__cutLog.push({ clip: i, readyState: next.readyState, at: performance.now() });
    if (live) {
      var pr = next.play(); if (pr && pr.catch) pr.catch(function () {});
      if (prev && prev !== next) { prev.pause(); try { prev.currentTime = 0; } catch (e) {} } // re-park for its next turn
    }
    cur = i;
  }

  function loadAll() { vids.forEach(function (v) { if (v.preload !== 'auto') { v.preload = 'auto'; v.load(); } }); }

  // ---- reduced motion: one still (the spark waterfall) with the finished line ----
  if (reduce) {
    vids.forEach(function (v, i) { if (i !== 4) v.preload = 'none'; });
    var still = state(SCAN_END); still.clip = 4; render(still, false);
    return;
  }

  // ---- freeze: park any moment for review ----
  if (freeze) {
    loadAll();
    var fst = state(tParam || 0);
    render(fst, false);
    var v = vids[fst.clip];
    vids.forEach(function (x) { x.pause(); });
    var done = function () { document.documentElement.setAttribute('data-hero-ready', '1'); };
    var park = function () {
      v.addEventListener('seeked', function on() { v.removeEventListener('seeked', on); requestAnimationFrame(function () { requestAnimationFrame(done); }); });
      v.currentTime = fst.local;
    };
    if (v.readyState >= 1) park(); else v.addEventListener('loadedmetadata', park, { once: true });
    return;
  }

  // ---- live: one clock that only runs while the hero is on screen and the tab is visible ----
  var clock = tParam || 0, lastTs = null, running = false, rafId = null, onScreen = false, started = false;
  function tick(ts) {
    if (!running) return;
    if (lastTs !== null) clock += Math.min(0.1, (ts - lastTs) / 1000); // a dropped frame never skips a beat
    lastTs = ts;
    render(state(clock), true);
    rafId = requestAnimationFrame(tick);
  }
  function go() {
    if (running || !started || !onScreen || document.hidden) return;
    running = true; lastTs = null;
    if (cur >= 0) { var pr = vids[cur].play(); if (pr && pr.catch) pr.catch(function () {}); }
    rafId = requestAnimationFrame(tick);
  }
  function halt() {
    running = false;
    if (rafId !== null) cancelAnimationFrame(rafId); rafId = null;
    if (cur >= 0) vids[cur].pause();
  }

  render(state(clock), false);
  // Begin once the first clip can actually play (or after a short grace, on its poster), and start
  // pulling weld-2..6 at the same time so every later cut lands on a decoded frame.
  var first = vids[0];
  function begin() { if (started) return; started = true; loadAll(); vids[cur].currentTime = state(clock).local; go(); }
  if (first.readyState >= 3) begin(); else { first.addEventListener('canplay', begin, { once: true }); setTimeout(begin, 1800); }

  document.addEventListener('visibilitychange', function () { if (document.hidden) halt(); else go(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { es.forEach(function (en) { onScreen = en.isIntersecting; if (onScreen) go(); else halt(); }); }, { threshold: 0.1 }).observe(fig);
  } else { onScreen = true; go(); }

  window.__heroSchedule = { arrive: arrive, SCAN_END: SCAN_END, REST: REST };
})();
