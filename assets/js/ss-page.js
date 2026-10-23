// Stock Shredder page: smart header, phone tools sheet, FAQ accordion, the "2 months free" switch
// (kept in sync with the Monthly/Annual toggle that checkout.js already drives), and the chat
// widget loaded after the visitor's first interaction instead of on page load.
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- smart header: visible at load, hides on a deliberate scroll down, returns on scroll up ----
  var sh = document.querySelector('[data-sh]');
  if (sh) {
    var lastY = window.scrollY, acc = 0, ticking = false;
    var HIDE_AFTER = 120, THRESHOLD = 10;
    function apply() {
      var y = window.scrollY, dy = y - lastY;
      lastY = y; ticking = false;
      sh.classList.toggle('is-scrolled', y > 8);
      if (document.querySelector('.mega-menu.is-open')) return;
      if (y <= HIDE_AFTER) { sh.classList.remove('is-hidden'); acc = 0; return; }
      if (dy > 0) { acc = Math.max(acc, 0) + dy; if (acc > THRESHOLD) sh.classList.add('is-hidden'); }
      else if (dy < 0) { acc = Math.min(acc, 0) + dy; if (-acc > THRESHOLD) sh.classList.remove('is-hidden'); }
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(apply); } }, { passive: true });
    sh.addEventListener('focusin', function () { sh.classList.remove('is-hidden'); });
    apply();
  }

  // ---- phone tools sheet ----
  var toggle = document.querySelector('[data-sh-toggle]');
  var sheet = document.querySelector('[data-sh-sheet]');
  if (toggle && sheet) {
    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      sheet.hidden = !open;
      document.body.classList.toggle('sheet-open', open);
      if (open) { sh.classList.remove('is-hidden'); var first = sheet.querySelector('a'); if (first) first.focus(); }
    };
    toggle.addEventListener('click', function () { setOpen(sheet.hidden); });
    sheet.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) { setOpen(false); toggle.focus(); } });
    matchMedia('(min-width: 1024px)').addEventListener('change', function (m) { if (m.matches) setOpen(false); });
  }

  // ---- FAQ accordion (one open at a time) ----
  var qs = Array.prototype.slice.call(document.querySelectorAll('.faq-q'));
  qs.forEach(function (q) {
    q.addEventListener('click', function () {
      var open = q.getAttribute('aria-expanded') === 'true';
      qs.forEach(function (o) { o.setAttribute('aria-expanded', 'false'); document.getElementById(o.getAttribute('aria-controls')).hidden = true; });
      if (!open) { q.setAttribute('aria-expanded', 'true'); document.getElementById(q.getAttribute('aria-controls')).hidden = false; }
    });
  });

  // ---- "2 months free" switch mirrors the Monthly / Annual toggle ----
  var sw = document.querySelector('[data-billing-switch]');
  var month = document.querySelector('[data-billing="month"]');
  var year = document.querySelector('[data-billing="year"]');
  if (sw && month && year) {
    var sync = function () { sw.setAttribute('aria-checked', year.classList.contains('is-active') ? 'true' : 'false'); };
    sw.addEventListener('click', function () { (year.classList.contains('is-active') ? month : year).click(); sync(); });
    month.addEventListener('click', function () { setTimeout(sync, 0); });
    year.addEventListener('click', function () { setTimeout(sync, 0); });
  }

  // ---- support chat: loads after the first scroll, tap or key press, never on page load ----
  var chatLoaded = false;
  function loadChat() {
    if (chatLoaded) return; chatLoaded = true;
    ['scroll', 'pointerdown', 'keydown'].forEach(function (ev) { window.removeEventListener(ev, loadChat); });
    window.Tawk_API = window.Tawk_API || {}; window.Tawk_LoadStart = new Date();
    window.Tawk_API.customStyle = { visibility: { desktop: { position: 'br', xOffset: 20, yOffset: 24 }, mobile: { position: 'br', xOffset: 10, yOffset: 16 } } };
    var s = document.createElement('script');
    s.async = true; s.src = 'https://embed.tawk.to/6abff587e0dd3b34c4626702/1k3ute618'; s.charset = 'UTF-8'; s.setAttribute('crossorigin', '*');
    document.body.appendChild(s);
  }
  if (location.protocol !== 'file:') ['scroll', 'pointerdown', 'keydown'].forEach(function (ev) { window.addEventListener(ev, loadChat, { passive: true, once: true }); });

  // ---- full-block film: plays only while on screen ----
  document.querySelectorAll('[data-film]').forEach(function (v) {
    if (reduce || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause(); }); }, { threshold: 0.2 }).observe(v);
  });

  // ---- world map: the dotted world loads in, dot by dot, the first time it is seen ----
  (function () {
    var wrap = document.querySelector('.world-map'); if (!wrap) return;
    var img = wrap.querySelector('img'); if (!img) return;
    fetch(img.src).then(function (r) { return r.text(); }).then(function (txt) {
      var holder = document.createElement('div'); holder.innerHTML = txt;
      var svg = holder.querySelector('svg'); if (!svg) return;
      svg.setAttribute('fill', 'currentColor'); svg.setAttribute('aria-hidden', 'true');
      var dots = svg.querySelectorAll('circle');
      if (!reduce) dots.forEach(function (c) { c.style.transitionDelay = (Math.random() * 1400).toFixed(0) + 'ms'; });
      img.replaceWith(svg);
      var go = function () { wrap.classList.add('is-loaded'); };
      if (reduce || !('IntersectionObserver' in window)) return go();
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); requestAnimationFrame(go); } }, { threshold: 0.3 });
      io.observe(wrap);
    }).catch(function () {});
  })();

  // ---- dark / light comparison slider ----
  document.querySelectorAll('[data-compare]').forEach(function (box) {
    var range = box.querySelector('[data-compare-range]');
    var set = function (v) { box.style.setProperty('--pos', v + '%'); };
    range.addEventListener('input', function () { set(range.value); });
    // two recordings of the same playback (dark + light): play together while on screen, light kept in step with dark
    var va = box.querySelector('[data-compare-a]'), vb = box.querySelector('[data-compare-b]');
    if (va && vb && !reduce) {
      var sync = function () { if (Math.abs(vb.currentTime - va.currentTime) > 0.06) vb.currentTime = va.currentTime; };
      va.addEventListener('timeupdate', sync); va.addEventListener('seeked', sync);
      va.addEventListener('play', function () { vb.currentTime = va.currentTime; var p = vb.play(); if (p && p.catch) p.catch(function () {}); });
      va.addEventListener('pause', function () { vb.pause(); });
      var vis = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { var p = va.play(); if (p && p.catch) p.catch(function () {}); } else va.pause(); }); }, { threshold: 0.25 });
      vis.observe(box);
    }
    // a gentle one-time sweep the first time it scrolls into view, so it's obvious it moves
    if (!reduce && 'IntersectionObserver' in window) {
      var seen = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return; seen.disconnect();
        var t0 = null, dur = 1600;
        (function frame(ts) { if (t0 === null) t0 = ts; var p = Math.min(1, (ts - t0) / dur); var v = 50 + Math.sin(p * Math.PI * 2) * 22 * (1 - p); set(v); range.value = v; if (p < 1) requestAnimationFrame(frame); else { set(50); range.value = 50; } })(performance.now());
      }, { threshold: 0.6 });
      seen.observe(box);
    }
  });

  // ---- hero: the shredded strip ----
  // One real take (black and white) plays as a single flat frame, then slices into six clips that
  // separate evenly and settle, each labelled like an exported clip. One canvas, one video.
  (function () {
    var fig = document.querySelector('[data-strip]'); if (!fig) return;
    var cv = fig.querySelector('[data-strip-canvas]'), ctx = cv.getContext('2d'), vid = fig.querySelector('[data-strip-video]');
    var poster = new Image(); poster.src = vid.getAttribute('poster');
    var LABELS = ['CLIP 01   0:00', 'CLIP 02   0:07', 'CLIP 03   0:15', 'CLIP 04   0:24', 'CLIP 05   0:31', 'CLIP 06   0:38'];
    var N = 6, RATIO = 2.39, LABEL = 0.09, p = reduce ? 1 : 0, start = null;
    function size() { var w = cv.clientWidth || fig.clientWidth, dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(w * dpr); cv.height = Math.round(w / RATIO * (1 + LABEL) * dpr); }
    function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function draw() {
      var W = cv.width, H = cv.height, slabH = W / RATIO;
      var src = vid.readyState >= 2 ? vid : (poster.complete ? poster : null);
      ctx.clearRect(0, 0, W, H);
      if (!src) return;
      var sw0 = src.videoWidth || src.naturalWidth, sh0 = src.videoHeight || src.naturalHeight; if (!sw0) return;
      var gap = W * 0.018 * p, sliceW = (W - gap * (N - 1)) / N;
      for (var i = 0; i < N; i++) {
        var x = i * (sliceW + gap);
        ctx.drawImage(src, (i / N) * sw0, 0, sw0 / N, sh0, x, 0, sliceW, slabH);
        if (p > 0.55) {
          ctx.globalAlpha = Math.min(1, (p - 0.55) / 0.45);
          ctx.fillStyle = '#4A4741'; ctx.font = '500 ' + Math.max(9, Math.round(W * 0.0105)) + 'px ui-monospace, SF Mono, Menlo, monospace';
          ctx.fillText(LABELS[i], x, slabH + W * 0.026);
          ctx.globalAlpha = 1;
        }
      }
    }
    function frame(ts) {
      if (!reduce) { if (start === null) start = ts; var t = (ts - start) / 1000; p = t < 1.2 ? 0 : ease(Math.min(1, (t - 1.2) / 1.1)); }
      draw(); requestAnimationFrame(frame);
    }
    size(); window.addEventListener('resize', size);
    if (!reduce) { var pr = vid.play(); if (pr && pr.catch) pr.catch(function () {}); }
    requestAnimationFrame(frame);
  })();

  // ---- one quiet entrance per section ----
  var els = document.querySelectorAll('main > section:not(.hero), main > .pair');
  if (reduce || !('IntersectionObserver' in window)) return;
  els.forEach(function (el) { el.classList.add('will-reveal'); });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -10% 0px' });
  els.forEach(function (el) { io.observe(el); });
})();
