// Loadout product page: the three pieces Loadout adds on top of ss-page.js.
// Every block looks for its own data-lo-* hooks and quietly does nothing if they are missing.

// ---- CLOCK: only ever shown with real, measured numbers ----
// The section ships hidden. Even if someone removes `hidden`, it stays hidden until both
// data-lo-app-seconds and data-lo-hand-minutes hold numbers (from the real-phone test).
(function () {
  var sec = document.querySelector('[data-lo-clock]'); if (!sec) return;
  var app = parseFloat(sec.getAttribute('data-lo-app-seconds'));
  var hand = parseFloat(sec.getAttribute('data-lo-hand-minutes'));
  var appEl = sec.querySelector('[data-lo-clock-app]'), handEl = sec.querySelector('[data-lo-clock-hand]');
  if (!(app > 0) || !(hand > 0) || !appEl || !handEl) { sec.hidden = true; return; }
  if (sec.hidden) return;   // numbers are in, but nobody has switched it on yet
  appEl.textContent = '0'; handEl.textContent = '0';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var run = function () {
    if (reduce) { appEl.textContent = String(app); handEl.textContent = String(hand); return; }
    var t0 = performance.now(), D = 1400;
    var step = function (now) {
      var p = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - p, 3);
      appEl.textContent = String(Math.round(app * e)); handEl.textContent = String(Math.round(hand * e));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (!('IntersectionObserver' in window)) { run(); return; }
  var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); run(); } }, { threshold: 0.4 });
  io.observe(sec);
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
  var show = function (i) {
    if (i === cur) return; cur = i;
    feats.forEach(function (f, k) { f.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
    panels.forEach(function (p, k) { p.hidden = k !== i; });
    explain.classList.toggle('has-feat', i >= 0);
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

// ---- REVIEWS: same rule as Stock Shredder, hidden until 10+ approved reviews ----
(function () {
  // TODO: the Loadout reviews endpoint. Empty = never fetch, section stays hidden.
  // Never use Stock Shredder's /reviews here: those reviews are about Stock Shredder.
  var LO_REVIEWS_URL = '';
  // Daniel 2026-11-06 (Stock Shredder rule, reused): no reviews on the page until there are at least
  // 10 approved ones to show.
  var MIN_REVIEWS_TO_SHOW = 10;
  var section = document.querySelector('[data-lo-reviews-section]');
  if (!section || !LO_REVIEWS_URL) return;

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  fetch(LO_REVIEWS_URL)
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function (reviews) {
      var listEl = section.querySelector('[data-lo-reviews-list]');
      var countEl = section.querySelector('[data-lo-reviews-count]');
      if (!listEl || !Array.isArray(reviews) || reviews.length < MIN_REVIEWS_TO_SHOW) return;
      if (countEl) {
        var avg = reviews.reduce(function (sum, r) { return sum + r.rating; }, 0) / reviews.length;
        countEl.textContent = avg.toFixed(1) + '★ average · ' + reviews.length + ' reviews';
        countEl.hidden = false;
      }
      listEl.innerHTML = reviews.map(function (r) {
        var n = Math.max(0, Math.min(5, Math.round(r.rating)));
        return '<div class="review-card">' +
          '<div class="review-card-stars" aria-label="' + n + ' out of 5 stars">' + '★'.repeat(n) + '☆'.repeat(5 - n) + '</div>' +
          '<p class="review-card-body">' + escapeHtml(r.body) + '</p>' +
          '<p class="review-card-name">' + escapeHtml(r.name) + '</p>' +
          '</div>';
      }).join('');
      listEl.hidden = false;
      section.hidden = false;
    })
    .catch(function () {});
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

// ---- mobile sticky call to action: shows once the top call to action has scrolled out of view ----
(function () {
  var bar = document.querySelector('[data-lo-sticky]'), top = document.getElementById('top-cta');
  if (!bar || !top || !('IntersectionObserver' in window)) return;
  bar.hidden = false;
  new IntersectionObserver(function (entries) { bar.classList.toggle('is-on', !entries[0].isIntersecting && entries[0].boundingClientRect.top < 0); }).observe(top);
})();

// ---- ADDING GEAR rings: the capture ring fills once when the photos come into view, then shows its check ----
// Without JS, or with reduced motion, the finished ring and check simply show (that is the CSS default).
(function () {
  var strip = document.querySelector('[data-lo-capture-rings]'); if (!strip) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;
  strip.classList.add('is-armed');
  var io = new IntersectionObserver(function (es) {
    if (!es[0].isIntersecting) return;
    io.disconnect();
    requestAnimationFrame(function () { strip.classList.add('is-on'); });
  }, { threshold: 0.45 });
  io.observe(strip);
})();
