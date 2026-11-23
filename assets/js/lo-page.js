// Loadout product page: the pieces Loadout adds on top of ss-page.js.
// Every block looks for its own data-lo-* hooks and quietly does nothing if they are missing.

// ---- App Store link: one source of truth ----
// <main data-appstore-url> holds the App Store address; every [data-appstore] link on the page takes it from there.
(function () {
  var main = document.querySelector('main[data-appstore-url]'); if (!main) return;
  var url = main.getAttribute('data-appstore-url'); if (!/^https:\/\/apps\.apple\.com\//.test(url)) return;
  [].forEach.call(document.querySelectorAll('a[data-appstore]'), function (a) { a.href = url; });
})();

// ---- APP TOUR: point at a name to light up that part of the real app screen ----
// Same behaviour as Stock Shredder's interface tour: mouse hover shows, tap toggles, keyboard focus
// shows. Until someone touches it, it steps through the names on its own while in view; the first
// real interaction (or the Auto tour switch) stops it.
(function () {
  var tour = document.querySelector('[data-lo-tour]'); if (!tour) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';

  // the recording: once its <source> has a real src, play it in place of the screenshot
  var vid = tour.querySelector('[data-lo-tour-video]'), src = vid && vid.querySelector('source');
  if (vid && src && src.getAttribute('src')) {
    vid.hidden = false;
    var img = tour.querySelector('.lo-tour-img'); if (img) img.hidden = true;
    if (!reduce) { vid.preload = 'auto'; vid.play().catch(function () {}); }
  }

  var nav = tour.querySelector('[data-lo-nav]'), explain = tour.querySelector('[data-lo-explain]');
  var spot = tour.querySelector('[data-lo-spot]'), holesG = spot.querySelector('[data-lo-holes]'), ringsG = spot.querySelector('[data-lo-rings]');
  var feats = [].slice.call(tour.querySelectorAll('[data-lo-feat]')), panels = [].slice.call(tour.querySelectorAll('[data-lo-panel]'));
  var cur = -1, lastPointer = 'mouse', inView = false;

  var rect = function (cls, fill) {
    var r = document.createElementNS(NS, 'rect'); r.setAttribute('rx', '1.2');
    if (cls) r.setAttribute('class', cls); if (fill) r.setAttribute('fill', fill); return r;
  };
  var aim = function (btn) {
    holesG.textContent = ''; ringsG.textContent = '';
    btn.getAttribute('data-rects').split(';').forEach(function (t) {
      var v = t.split(',').map(Number);
      [holesG, ringsG].forEach(function (g) {
        var r = rect(g === holesG ? '' : 'ix-ring', g === holesG ? '#000' : '');
        r.setAttribute('x', v[0]); r.setAttribute('y', v[1]); r.setAttribute('width', v[2]); r.setAttribute('height', v[3]);
        g.appendChild(r);
      });
    });
  };
  // steps with data-lo-img show their own real screen; the others show the scan frame in the markup
  var shot = tour.querySelector('.lo-tour-img');
  var base = shot && { src: shot.getAttribute('src'), srcset: shot.getAttribute('srcset'), alt: shot.getAttribute('alt') };
  var screen = function (btn) {
    if (!shot) return;
    var alt = btn && btn.getAttribute('data-lo-img');
    var want = alt ? { src: alt, srcset: btn.getAttribute('data-lo-srcset') || alt, alt: btn.getAttribute('data-lo-alt') || '' } : base;
    if (shot.getAttribute('src') === want.src) return;
    shot.setAttribute('srcset', want.srcset); shot.setAttribute('src', want.src); shot.setAttribute('alt', want.alt);
  };
  // fetch the other screens once the tour is near, so a step never shows a half-loaded image
  var warm = function () {
    feats.forEach(function (f) { var u = f.getAttribute('data-lo-img'); if (u) { var im = new Image(); im.sizes = shot ? shot.sizes : ''; im.srcset = f.getAttribute('data-lo-srcset') || ''; im.src = u; } });
    warm = function () {};
  };
  if ('IntersectionObserver' in window) {
    var wio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { wio.disconnect(); warm(); } }, { rootMargin: '400px 0px' });
    wio.observe(tour);
  } else warm();
  var show = function (i) {
    if (i === cur) return; cur = i;
    feats.forEach(function (f, k) { f.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
    panels.forEach(function (p, k) { p.hidden = k !== i; });
    explain.classList.toggle('has-feat', i >= 0);
    screen(i < 0 ? null : feats[i]);
    if (i < 0) { spot.classList.remove('is-on'); return; }
    aim(feats[i]); spot.classList.add('is-on');
  };

  // self-playing tour
  var AUTO_MS = 4200, autoT = 0, autoI = -1, autoOn = false, autoDone = !!reduce;
  var autoBtn = tour.querySelector('[data-lo-auto]'), autoLbl = tour.querySelector('[data-ix-auto-label]');
  var autoUi = function () { if (autoBtn) autoBtn.setAttribute('aria-checked', autoDone ? 'false' : 'true'); if (autoLbl) autoLbl.textContent = autoDone ? 'Off' : 'On'; };
  var autoStep = function () {
    autoT = 0; if (autoDone || !inView) { autoOn = false; return; }
    autoI = (autoI + 1) % feats.length; show(autoI);
    autoT = setTimeout(autoStep, AUTO_MS);
  };
  var autoStart = function () {
    if (autoDone || autoOn) return;
    autoOn = true; nav.classList.add('is-auto'); nav.style.setProperty('--ix-auto', AUTO_MS + 'ms');
    autoT = setTimeout(autoStep, cur < 0 ? 700 : 250);
  };
  var autoPause = function () { clearTimeout(autoT); autoT = 0; autoOn = false; };
  var autoStop = function () {
    if (autoDone) return; autoDone = true; autoPause(); nav.classList.remove('is-auto'); autoUi();
  };
  if (autoBtn) autoBtn.addEventListener('click', function () {
    if (autoDone) { autoDone = false; autoUi(); autoI = cur; if (inView) autoStart(); }
    else { autoStop(); show(-1); }
  });
  autoUi();

  ['pointerdown', 'keydown'].forEach(function (ev) { nav.addEventListener(ev, autoStop, true); });
  nav.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') autoStop(); }, true);
  nav.addEventListener('pointerdown', function (e) { lastPointer = e.pointerType || 'mouse'; });
  nav.addEventListener('keydown', function (e) {
    lastPointer = 'keyboard';
    var k = feats.indexOf(document.activeElement); if (k < 0) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault(); feats[(k + (e.key === 'ArrowRight' ? 1 : feats.length - 1)) % feats.length].focus();
    } else if (e.key === 'Escape') show(-1);
  });
  feats.forEach(function (f, k) {
    f.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') show(k); });
    f.addEventListener('focus', function () { if (lastPointer === 'mouse' || lastPointer === 'keyboard') show(k); });
    f.addEventListener('click', function () {
      if (lastPointer === 'touch' || lastPointer === 'pen') show(cur === k ? -1 : k);
      else if (lastPointer === 'keyboard' && cur !== k) show(k);
      lastPointer = 'mouse';
    });
  });
  nav.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && autoDone) show(-1); });
  nav.addEventListener('focusout', function (e) { if (!nav.contains(e.relatedTarget) && autoDone) show(-1); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      inView = es[0].isIntersecting;
      if (inView) autoStart(); else autoPause();
    }, { threshold: 0.35 }).observe(tour);
  }
})();

// ---- THE SCAN video: plays while on screen, never autoplays under reduced motion (the poster stays) ----
(function () {
  var vid = document.querySelector('[data-lo-scan-video]'); if (!vid) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { vid.controls = true; return; }
  if (!('IntersectionObserver' in window)) { vid.controls = true; return; }
  new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { vid.preload = 'auto'; vid.play().catch(function () { vid.controls = true; }); } else { vid.pause(); }
    });
  }, { threshold: 0.35 }).observe(vid);
})();

// ---- floating "14 days free" button (bottom left, Stock Shredder's .ss-sticky look) ----
// Shows once the hero App Store button has scrolled up out of view. Hidden again while the pricing App Store
// button or the Android notify form is on screen, so it never sits over the thing it points to.
(function () {
  var bar = document.querySelector('[data-lo-float]'), top = document.getElementById('top-cta');
  if (!bar || !top || !('IntersectionObserver' in window)) return;
  var topGone = false, onScreen = 0;
  var sync = function () {
    var show = topGone && onScreen === 0;
    bar.classList.toggle('is-on', show);
    bar.setAttribute('aria-hidden', show ? 'false' : 'true');
    [].forEach.call(bar.querySelectorAll('a'), function (a) { a.tabIndex = show ? 0 : -1; });
  };
  new IntersectionObserver(function (es) {
    topGone = !es[0].isIntersecting && es[0].boundingClientRect.top < 0; sync();
  }).observe(top);
  var spots = [document.querySelector('.lo-price-cta'), document.getElementById('notify')].filter(Boolean);
  var vis = new Map();
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { vis.set(e.target, e.isIntersecting); });
    onScreen = 0; vis.forEach(function (v) { if (v) onScreen++; }); sync();
  }, { rootMargin: '0px 0px -10% 0px' });
  spots.forEach(function (n) { io.observe(n); });
})();

// ---- ADDING GEAR rings: the capture ring fills each time the photos come into view, then shows its check ----
// Without JS, or with reduced motion, the finished ring and check simply show (that is the CSS default).
(function () {
  var strip = document.querySelector('[data-lo-capture-rings]'); if (!strip) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;
  strip.classList.add('is-armed');
  // Plays each time the photos come back into view: it resets only once they are fully off screen
  // (so it never flickers at the edge), and the reset is instant because only .is-on carries transitions.
  var io = new IntersectionObserver(function (es) {
    var e = es[0];
    if (e.intersectionRatio >= 0.45) {
      if (!strip.classList.contains('is-on')) requestAnimationFrame(function () { strip.classList.add('is-on'); });
    } else if (!e.isIntersecting) {
      strip.classList.remove('is-on');
    }
  }, { threshold: [0, 0.45] });
  io.observe(strip);
})();

/* Hero scan loop: plays muted once the page is ready; with reduced motion it stays on the poster frame. */
(function () {
  var v = document.querySelector('[data-lo-hero-video]'); if (!v) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  v.muted = true;
  var go = function () { var p = v.play(); if (p && p.catch) p.catch(function () {}); };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) go(); else v.pause(); }); }, { threshold: 0.2 }).observe(v);
  } else { go(); }
})();
