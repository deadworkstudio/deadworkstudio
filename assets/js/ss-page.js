// Stock Shredder page: smart header, phone tools sheet, FAQ accordion, and the chat
// widget loaded after the visitor's first interaction instead of on page load.
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- shared pop-up helpers: page-scroll lock + a Tab focus trap, used by the "Submit your
  // link" and "Leave a review" pop-ups (inline scripts further down this page, loaded after this
  // file) so neither has to duplicate the same logic. ----
  window.DWModal = (function () {
    // A plain boolean, not a counter: each pop-up guards its own open handler against firing
    // twice in a row (see the "Submit your link" / "Leave a review" scripts further down this
    // page), so lock() and unlock() are never meant to nest. A counter that still somehow got
    // incremented twice for one open (e.g. a stray double click slipping past that guard) would
    // need two matching unlock() calls to ever let go of the page again — a boolean can't get
    // stuck that way.
    var locked = false;
    function lock() { if (locked) return; locked = true; document.body.style.overflow = 'hidden'; }
    function unlock() { if (!locked) return; locked = false; document.body.style.overflow = ''; }
    function focusables(root) {
      return Array.prototype.slice.call(root.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter(function (el) { return el.offsetParent !== null; });
    }
    // Keeps Tab/Shift+Tab cycling inside `dialog` while `overlay` is open, AND watches focus
    // itself: disabling the currently-focused control (e.g. "Submit" while a form sends) or
    // removing it from the DOM (a success message replacing the form) both blur focus straight to
    // <body> without ever firing a Tab keypress the handler below could catch, which is how focus
    // used to escape the trap entirely. Returns a function that removes both listeners — call it
    // on close.
    function trap(overlay, dialog) {
      var onKeydown = function (e) {
        if (e.key !== 'Tab') return;
        var items = focusables(dialog);
        if (!items.length) return;
        var first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      };
      var onFocusIn = function (e) {
        if (dialog.contains(e.target)) return;
        var items = focusables(dialog);
        (items[0] || dialog).focus();
      };
      overlay.addEventListener('keydown', onKeydown);
      document.addEventListener('focusin', onFocusIn);
      return function () {
        overlay.removeEventListener('keydown', onKeydown);
        document.removeEventListener('focusin', onFocusIn);
      };
    }
    return { lock: lock, unlock: unlock, trap: trap };
  })();

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
  // Animates open/closed with grid-template-rows (see .faq-a in ss-page.css), which needs the
  // panel to actually be in the document (not [hidden]) while it transitions — so [hidden] is
  // only ever applied once a close has fully finished, via transitionend (with a timeout backstop
  // in case that event doesn't fire, e.g. a 0ms transition under reduced motion).
  function faqOpen(el) {
    // A close triggered on this same panel moments ago (see faqClose below) may still have its
    // hide scheduled — reopening within that window must cancel it, or it fires anyway and hides
    // the now-open answer while its question still shows aria-expanded="true".
    if (el._faqCloseTimer) { clearTimeout(el._faqCloseTimer); el._faqCloseTimer = null; }
    if (el._faqCloseListener) { el.removeEventListener('transitionend', el._faqCloseListener); el._faqCloseListener = null; }
    el.hidden = false;
    // Two rAFs: the first lets the browser paint the just-unhidden 0fr state, so the second one's
    // class change is a real transition start rather than landing on the very first paint (which
    // some browsers skip animating).
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('is-open'); }); });
  }
  function faqClose(el) {
    if (el.hidden) return;
    el.classList.remove('is-open');
    var done = false;
    var finish = function () {
      if (done) return; done = true;
      el.hidden = true;
      el.removeEventListener('transitionend', finish);
      el._faqCloseListener = null; el._faqCloseTimer = null;
    };
    el._faqCloseListener = finish;
    el._faqCloseTimer = setTimeout(finish, 280);
    el.addEventListener('transitionend', finish);
  }
  var qs = Array.prototype.slice.call(document.querySelectorAll('.faq-q'));
  qs.forEach(function (q) {
    q.addEventListener('click', function () {
      var open = q.getAttribute('aria-expanded') === 'true';
      qs.forEach(function (o) { if (o === q) return; o.setAttribute('aria-expanded', 'false'); faqClose(document.getElementById(o.getAttribute('aria-controls'))); });
      var panel = document.getElementById(q.getAttribute('aria-controls'));
      if (!open) { q.setAttribute('aria-expanded', 'true'); faqOpen(panel); }
      else { q.setAttribute('aria-expanded', 'false'); faqClose(panel); }
    });
  });

  // ---- support chat: loads after the first scroll, tap or key press, never on page load ----
  // On phones (<=719px) the floating bubble is kept hidden — it sits on top of page content
  // (plan buttons, FAQ text) with nowhere good to put it — but the chat itself is still one tap
  // away via the "Chat with us" link at the end of the FAQ. Desktop keeps the bubble as before.
  var CHAT_PHONE_MAX = 719;
  function isChatPhone() { return window.matchMedia('(max-width: ' + CHAT_PHONE_MAX + 'px)').matches; }
  var chatLoaded = false, chatReady = false, chatOpenPending = false;
  // Set the moment the visitor opens chat via the FAQ link, and held until Tawk reports the
  // window's been minimized. While this (or Tawk's own isChatMaximized()) is true,
  // syncChatVisibility() below must never hide the widget — otherwise an unrelated resize
  // (Android keyboard opening, iOS address bar collapsing, rotating the phone) would yank an
  // open conversation out from under the visitor mid-chat.
  var chatOpenedViaLink = false;
  function isChatOpenNow() {
    return chatOpenedViaLink || !!(window.Tawk_API && window.Tawk_API.isChatMaximized && window.Tawk_API.isChatMaximized());
  }
  function syncChatVisibility() {
    if (!chatReady || !window.Tawk_API) return;
    if (isChatOpenNow()) return;
    if (isChatPhone()) { if (window.Tawk_API.hideWidget) window.Tawk_API.hideWidget(); }
    else if (window.Tawk_API.showWidget) window.Tawk_API.showWidget();
  }
  function openChat() {
    chatOpenedViaLink = true;
    if (!chatReady) { chatOpenPending = true; loadChat(); return; }
    if (window.Tawk_API.showWidget) window.Tawk_API.showWidget();
    if (window.Tawk_API.maximize) window.Tawk_API.maximize();
  }
  function loadChat() {
    if (chatLoaded) return; chatLoaded = true;
    ['scroll', 'pointerdown', 'keydown'].forEach(function (ev) { window.removeEventListener(ev, loadChat); });
    window.Tawk_API = window.Tawk_API || {}; window.Tawk_LoadStart = new Date();
    window.Tawk_API.customStyle = { visibility: { desktop: { position: 'br', xOffset: 20, yOffset: 24 }, mobile: { position: 'br', xOffset: 10, yOffset: 16 } } };
    // Hide the bubble as early as possible on phones — before Tawk even finishes rendering it —
    // so there's no flash of a bubble that syncChatVisibility()'s onLoad-time hide would
    // otherwise leave visible for a beat. Desktop is untouched.
    var priorOnBeforeLoad = window.Tawk_API.onBeforeLoad;
    window.Tawk_API.onBeforeLoad = function () {
      if (isChatPhone() && window.Tawk_API.hideWidget) window.Tawk_API.hideWidget();
      if (typeof priorOnBeforeLoad === 'function') priorOnBeforeLoad();
    };
    var priorOnLoad = window.Tawk_API.onLoad;
    window.Tawk_API.onLoad = function () {
      chatReady = true;
      syncChatVisibility();
      if (chatOpenPending) { chatOpenPending = false; openChat(); }
      if (typeof priorOnLoad === 'function') priorOnLoad();
    };
    var priorOnMinimized = window.Tawk_API.onChatMinimized;
    window.Tawk_API.onChatMinimized = function () {
      chatOpenedViaLink = false;
      syncChatVisibility();
      if (typeof priorOnMinimized === 'function') priorOnMinimized();
    };
    var s = document.createElement('script');
    // QA-22: crossorigin="*" isn't a real value (only "anonymous"/"use-credentials" are), and an
    // invalid value still puts the script in CORS mode, requiring embed.tawk.to to answer with
    // an Access-Control-Allow-Origin header, which it doesn't — confirmed on the live production
    // domain (deadworkstudio.com), not just a CORS quirk of testing from a non-whitelisted
    // origin: the widget never loaded there either. main.js's own loader had this exact bug
    // fixed already (D-6); this page's separate loader (triggered by the FAQ "Chat with us"
    // link as well as scroll/tap/key) still had it. Dropped, same fix.
    s.async = true; s.src = 'https://embed.tawk.to/6abff587e0dd3b34c4626702/1k3ute618'; s.charset = 'UTF-8';
    document.body.appendChild(s);
  }
  if (location.protocol !== 'file:') ['scroll', 'pointerdown', 'keydown'].forEach(function (ev) { window.addEventListener(ev, loadChat, { passive: true, once: true }); });
  // Re-sync on resize/orientation change (e.g. rotating a phone past the breakpoint, or a
  // desktop window resized narrow) — debounced so it only runs once the size settles, and only
  // when the WIDTH actually changed. A height-only resize (Android keyboard opening, iOS
  // address bar showing/hiding) fires this same event but isn't a real breakpoint crossing, and
  // isChatOpenNow() above is the real guard against closing an open chat either way.
  var chatResizeTimer = null, lastChatWidth = window.innerWidth;
  function scheduleChatSync() {
    clearTimeout(chatResizeTimer);
    chatResizeTimer = setTimeout(function () {
      var w = window.innerWidth;
      if (w === lastChatWidth) return;
      lastChatWidth = w;
      syncChatVisibility();
    }, 150);
  }
  window.addEventListener('resize', scheduleChatSync);
  window.addEventListener('orientationchange', function () { setTimeout(function () { lastChatWidth = window.innerWidth; syncChatVisibility(); }, 300); });

  // ---- "Chat with us" link at the end of the FAQ — the only way to reach chat on phones, where
  // the floating bubble stays hidden; works just as well on desktop. Real href (a mailto: to the
  // studio inbox) so the click is never a dead end if Tawk can't load (ad blocker, outage): we
  // only take over the click once chat is actually ready, otherwise we give it a real chance to
  // load and fall back to the mailto if it still isn't ready a couple seconds later.
  var faqChatLink = document.querySelector('[data-faq-chat-open]');
  if (faqChatLink) {
    faqChatLink.addEventListener('click', function (e) {
      if (chatReady && window.Tawk_API) { e.preventDefault(); openChat(); return; }
      e.preventDefault();
      openChat();
      setTimeout(function () {
        if (!chatReady) {
          // The fallback is firing for real — relabel so the link's text matches what it's
          // actually about to do instead of promising live chat and silently opening mail.
          faqChatLink.textContent = 'Email us';
          window.location.href = faqChatLink.href;
        }
      }, 2500);
    });
  }

  // ---- full-block film: plays only while on screen ----
  document.querySelectorAll('[data-film]').forEach(function (v) {
    // full-resolution film only on wide or high-density screens
    if (v.hasAttribute('data-hd') && window.innerWidth * (window.devicePixelRatio || 1) > 2000) { var hs = v.querySelector('source'); if (hs) { hs.src = v.getAttribute('data-hd'); v.load(); } }
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

  // ---- THE INTERFACE: point at a feature name to see that part of the real app ----
  // Mouse: hovering a name shows it, leaving the row clears it. Touch: tapping a name shows it,
  // tapping it again clears it. Keyboard: focusing a name shows it, arrows move along the row,
  // leaving the row clears it. Nothing is highlighted at rest, and nothing cycles on its own.
  (function () {
    var tour = document.querySelector('[data-ix-tour]'); if (!tour) return;
    // full-resolution recording on desktop and tablet screens. The features zoom the picture up to 2.4x,
    // so even a 670 px stage on a 2x screen needs ~3200 px of video (the old test, tour width x dpr > 1700,
    // left most laptops on the 1600 px file, which is what looked soft when zoomed)
    // (phones too now: the lifted feature is drawn from the recording at up to 3x, so it needs the pixels)
    if (tour.getBoundingClientRect().width * (window.devicePixelRatio || 1) > 1000) {
      // 4320 px HEVC where the browser plays it (Safari, most Chrome/Edge), so the zoomed-in features stay
      // sharp; 3600 px H.264 everywhere else (H.264 decoders top out around 4096 px wide)
      var hevc = !!document.createElement('video').canPlayType('video/mp4; codecs="hvc1.1.6.L180.B0"');
      tour.querySelectorAll('video[data-hd]').forEach(function (v) {
        var s = v.querySelector('source'); if (!s) return;
        if (hevc && v.hasAttribute('data-uhd')) { s.src = v.getAttribute('data-uhd'); s.type = 'video/mp4; codecs="hvc1.1.6.L180.B0"'; } else s.src = v.getAttribute('data-hd');
        v.load();
      });
    }
    var stage = tour.querySelector('[data-ix-hero]'), screen = tour.querySelector('[data-ix-screen]');
    var nav = tour.querySelector('[data-ix-nav]'), explain = tour.querySelector('[data-ix-explain]');
    var spot = tour.querySelector('[data-ix-spot]'), holesG = spot.querySelector('[data-ix-holes]'), ringsG = spot.querySelector('[data-ix-rings]');
    var feats = [].slice.call(tour.querySelectorAll('[data-ix-feat]')), panels = [].slice.call(tour.querySelectorAll('[data-ix-panel]'));
    var NS = 'http://www.w3.org/2000/svg', POOL = 5, cur = -1, lastPointer = 'mouse';
    var dark = tour.querySelector('[data-ix-dark]'), inView = false, nightTimer = 0;
    // Day / Night: start the dark recording at the day one's time, fade it in; fade back out when
    // leaving. Both recordings only ever decode while they're actually the one on screen — once
    // the dark one has fully crossfaded in (280ms, just past its own 260ms transition) the light
    // one underneath is paused, and the reverse on the way out, so the two never decode together.
    var setNight = function (on) {
      if (!dark) return;
      clearTimeout(nightTimer);
      if (on) {
        if (dark.preload === 'none') dark.preload = 'auto';
        try { dark.currentTime = screen.currentTime || 0; } catch (e) {}
        if (!reduce && inView) { var p = dark.play(); if (p && p.catch) p.catch(function () {}); }
        stage.classList.add('is-night');
        nightTimer = setTimeout(function () { if (stage.classList.contains('is-night')) screen.pause(); }, 280);
      } else if (stage.classList.contains('is-night')) {
        stage.classList.remove('is-night');
        // screen was paused back in the on-branch above and has been sitting at whatever time
        // that was — re-sync it to the dark recording (which kept playing) before resuming, or
        // the crossfade shows two different moments (QA-9).
        try { screen.currentTime = dark.currentTime || 0; } catch (e) {}
        if (!reduce && inView) { var r = screen.play(); if (r && r.catch) r.catch(function () {}); }
        nightTimer = setTimeout(function () { dark.pause(); }, 400);
      }
    };
    // warm the dark recording up once the section is near, so the first switch is instant
    if (dark && 'IntersectionObserver' in window) {
      var warm = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { dark.preload = 'auto'; warm.disconnect(); } }, { rootMargin: '400px 0px' });
      warm.observe(tour);
    }

    // the screen settles into place as it scrolls up (transform/opacity only)
    if (!reduce) {
      stage.classList.add('is-scrub');
      var ticking = false;
      var upd = function () {
        ticking = false;
        var r = stage.getBoundingClientRect(), vh = window.innerHeight;
        stage.style.setProperty('--p', Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.6))).toFixed(3));
      };
      window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
      window.addEventListener('resize', upd); upd();
    }

    // a fixed pool of holes in the dimming mask, each framed by a two-tone outline
    var holes = [], outs = [], rings = [];
    var mk = function (parent, cls, fill) { var r = document.createElementNS(NS, 'rect'); if (cls) r.setAttribute('class', cls); if (fill) r.setAttribute('fill', fill); r.setAttribute('rx', '0.35'); parent.appendChild(r); return r; };
    for (var i = 0; i < POOL; i++) { holes.push(mk(holesG, '', '#000')); outs.push(mk(ringsG, 'ix-ring-out')); }
    for (i = 0; i < POOL; i++) rings.push(mk(ringsG, 'ix-ring'));
    var now = null;
    var put = function (r) { for (var k = 0; k < POOL; k++) { var v = r[k]; [holes[k], outs[k], rings[k]].forEach(function (el) { el.setAttribute('x', v[0]); el.setAttribute('y', v[1]); el.setAttribute('width', Math.max(0, v[2])); el.setAttribute('height', Math.max(0, v[3])); el.style.opacity = v[2] > 0.05 ? 1 : 0; }); } };
    var rectsFor = function (btn) {
      var list = btn.getAttribute('data-rects').split(';').map(function (t) { return t.split(',').map(Number); });
      var to = []; for (var k = 0; k < POOL; k++) to.push(list[k] ? list[k] : [list[0][0] + list[0][2] / 2, list[0][1] + list[0][3] / 2, 0, 0]);
      return to;
    };
    var raf = 0;
    var aim = function (to) {
      cancelAnimationFrame(raf);
      // first highlight after rest appears in place; moving between features glides
      if (reduce || !now || !spot.classList.contains('is-on')) { now = to; put(now); return; }
      var from = now.map(function (v) { return v.slice(); }), t0 = null;
      (function step(ts) {
        if (t0 === null) t0 = ts; var t = Math.min(1, (ts - t0) / 200), e = 1 - Math.pow(1 - t, 3);
        now = from.map(function (f, k) { return f.map(function (x, j) { return x + (to[k][j] - x) * e; }); });
        put(now); if (t < 1) raf = requestAnimationFrame(step);
      })(performance.now());
    };

    // Lift: rather than magnifying the whole app, the chosen controls rise out of it — the app stays put
    // (dimmed), and a live copy of just that part scales up to the middle of the frame, then settles back.
    var liftC = stage.querySelector('[data-ix-lift]'), liftX = liftC && liftC.getContext('2d'), liftSrc = null, liftRaf = 0;
    var liftDraw = function () {
      liftRaf = 0; if (!liftSrc) return;
      var v = stage.classList.contains('is-night') && dark ? dark : screen;
      if (v.readyState >= 2 && v.videoWidth) {
        var r = liftSrc, vw = v.videoWidth, vh = v.videoHeight;
        liftX.drawImage(v, r[0] / 100 * vw, r[1] / 100 * vh, r[2] / 100 * vw, r[3] / 100 * vh, 0, 0, liftC.width, liftC.height);
      }
      liftRaf = requestAnimationFrame(liftDraw);
    };
    var lift = function (btn) {
      if (!liftC) return;
      if (!btn || btn.hasAttribute('data-ix-night')) {
        if (!liftC.classList.contains('is-on')) return;
        liftC.style.transform = liftC.dataset.from || ''; liftC.classList.remove('is-on'); stage.classList.remove('is-lifted');
        setTimeout(function () { if (!liftC.classList.contains('is-on')) { liftSrc = null; cancelAnimationFrame(liftRaf); liftRaf = 0; } }, 560);
        return;
      }
      var list = btn.getAttribute('data-rects').split(';').map(function (t) { return t.split(',').map(Number); });
      var x0 = Math.min.apply(null, list.map(function (r) { return r[0]; })), y0 = Math.min.apply(null, list.map(function (r) { return r[1]; }));
      var x1 = Math.max.apply(null, list.map(function (r) { return r[0] + r[2]; })), y1 = Math.max.apply(null, list.map(function (r) { return r[1] + r[3]; }));
      // breathing room around the controls (the same margin on every side, on screen)
      x0 = Math.max(0, x0 - 0.8); y0 = Math.max(0, y0 - 0.8); x1 = Math.min(100, x1 + 0.8); y1 = Math.min(100, y1 + 0.8);
      var W = stage.clientWidth, H = stage.clientHeight, sw = (x1 - x0) / 100 * W, sh = (y1 - y0) / 100 * H;
      var s = Math.max(1.15, Math.min(3.2, W * (W < 600 ? 0.94 : 0.84) / sw, H * 0.76 / sh)), w = sw * s, h = sh * s;
      var left = (W - w) / 2, top = (H - h) / 2, dpr = Math.min(3, window.devicePixelRatio || 1);
      var from = 'translate(' + (x0 / 100 * W - left).toFixed(1) + 'px, ' + (y0 / 100 * H - top).toFixed(1) + 'px) scale(' + (1 / s).toFixed(4) + ')';
      var wasOn = liftC.classList.contains('is-on'), prev = wasOn ? [parseFloat(liftC.style.left), parseFloat(liftC.style.top), parseFloat(liftC.style.width), parseFloat(liftC.style.height)] : null;
      liftC.style.left = left + 'px'; liftC.style.top = top + 'px'; liftC.style.width = w + 'px'; liftC.style.height = h + 'px';
      liftC.width = Math.round(w * dpr); liftC.height = Math.round(h * dpr);
      liftSrc = [x0, y0, x1 - x0, y1 - y0]; liftC.dataset.from = from;
      if (!liftRaf) liftDraw(); else { cancelAnimationFrame(liftRaf); liftDraw(); }
      // from rest it rises out of its own spot; between features the card morphs from its last shape
      var start = prev ? 'translate(' + (prev[0] - left).toFixed(1) + 'px, ' + (prev[1] - top).toFixed(1) + 'px) scale(' + (prev[2] / w).toFixed(4) + ', ' + (prev[3] / h).toFixed(4) + ')' : from;
      liftC.classList.add('is-snap'); liftC.style.transform = start; void liftC.offsetWidth;
      liftC.classList.remove('is-snap'); liftC.classList.add('is-on'); liftC.style.transform = 'none';
      stage.classList.add('is-lifted');
    };

    var show = function (i) {
      if (i === cur) return;
      cur = i;
      feats.forEach(function (f, k) { f.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
      panels.forEach(function (p, k) { p.hidden = k !== i; });
      explain.classList.toggle('has-feat', i >= 0);
      setNight(i >= 0 && feats[i].hasAttribute('data-ix-night'));
      lift(i >= 0 ? feats[i] : null);
      if (i < 0) { spot.classList.remove('is-on'); return; }
      // a lifted feature leaves the whole app dimmed behind it (no hole, no ring); Day / Night keeps its ring
      var night = feats[i].hasAttribute('data-ix-night');
      aim(night || !liftC ? rectsFor(feats[i]) : rectsFor(feats[i]).map(function () { return [50, 50, 0, 0]; }));
      spot.classList.add('is-on');
    };

    nav.addEventListener('pointerdown', function (e) { lastPointer = e.pointerType || 'mouse'; });
    feats.forEach(function (f, k) {
      f.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') show(k); });
      f.addEventListener('focus', function () { if (lastPointer === 'mouse' || lastPointer === 'keyboard') show(k); });
      // touch/pen: tap to show, tap the same name again to clear. Keyboard (Enter/Space, which the
      // nav keydown listener below marks as lastPointer = 'keyboard') only toggles OFF when this
      // stop is already the one showing — focus already showed it the moment Tab landed here, so
      // that keypress must be a no-op rather than clearing it straight back off. But if Escape (or
      // anything else) cleared the stop while focus stayed put, Enter/Space must still be able to
      // bring it back (QA-10) — so a keyboard activation on a stop that ISN'T the current one
      // always shows it.
      f.addEventListener('click', function () {
        if (lastPointer === 'touch' || lastPointer === 'pen') show(cur === k ? -1 : k);
        else if (lastPointer === 'keyboard' && cur !== k) show(k);
        lastPointer = 'mouse';
      });
    });
    nav.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') show(-1); });
    nav.addEventListener('keydown', function (e) {
      lastPointer = 'keyboard';
      var at = feats.indexOf(document.activeElement); if (at < 0) return;
      var to = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? at + 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? at - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? feats.length - 1 : null;
      if (to === null) { if (e.key === 'Escape') show(-1); return; }
      e.preventDefault(); feats[(to + feats.length) % feats.length].focus();
    });
    nav.addEventListener('focusout', function (e) { if (!nav.contains(e.relatedTarget) && lastPointer !== 'touch' && lastPointer !== 'pen') show(-1); });

    // the screen only plays while on screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        inView = es[0].isIntersecting;
        // Only the recording actually on screen plays — waking the other one back up here would
        // undo the single-decode optimization in setNight() above every time this refires.
        var night = stage.classList.contains('is-night');
        if (inView && !reduce) { var p = (night ? dark : screen).play(); if (p && p.catch) p.catch(function () {}); }
        else { screen.pause(); if (dark) dark.pause(); }
      }, { threshold: 0.15 }).observe(tour);
    }
  })();

  // ---- hero: the shredded strip ----
  // One real take (black and white) plays as a single flat frame, then slices into six clips that
  // separate evenly and settle, each labelled like an exported clip. One canvas, one video.
  (function () {
    var fig = document.querySelector('[data-strip]'); if (!fig) return;
    var cv = fig.querySelector('[data-strip-canvas]'), ctx = cv.getContext('2d'), vid = fig.querySelector('[data-strip-video]');
    var poster = new Image(); poster.src = vid.getAttribute('poster');
    var LABELS = ['CLIP 01   0:00', 'CLIP 02   0:07', 'CLIP 03   0:15', 'CLIP 04   0:24', 'CLIP 05   0:31', 'CLIP 06   0:38'];
    var N = 6, RATIO = 2.39, LABEL = 0.09, p = reduce ? 1 : 0, start = null, curDpr = 1;
    // Resizing the canvas's width/height attributes clears its pixels, whether or not the slicing
    // animation is still running to redraw them — so this always redraws immediately after,
    // instead of only when `running` (which left the canvas permanently blank whenever the strip
    // was never actually animating: autoplay blocked, e.g. iPhone Low Power Mode, or reduced
    // motion, where the one-time draw below can land before the poster/video are ready).
    function size() { var w = cv.clientWidth || fig.clientWidth, dpr = Math.min(2, window.devicePixelRatio || 1); curDpr = dpr; cv.width = Math.round(w * dpr); cv.height = Math.round(w / RATIO * (1 + LABEL) * dpr); draw(); }
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
          ctx.fillStyle = '#4A4741'; ctx.font = '500 ' + Math.round(Math.max(10 * curDpr, W * 0.0105)) + 'px ui-monospace, SF Mono, Menlo, monospace';
          ctx.fillText(LABELS[i], x, slabH + W * 0.026);
          ctx.globalAlpha = 1;
        }
      }
    }

    // Runs the slicing-in animation via rAF while it's still playing; once it settles (p reaches
    // 1, which is permanent) switches to requestVideoFrameCallback where available so the canvas
    // only repaints when the source video actually has a new frame, instead of every display
    // refresh. Either way, stops entirely — and pauses the source video — the moment the strip
    // scrolls off screen, and picks back up from wherever it left off when it scrolls back in.
    var rafId = null, rvfcId = null, running = false;
    function tick(ts) {
      if (!running) return;
      if (!reduce) { if (start === null) start = ts; var t = (ts - start) / 1000; p = t < 1.2 ? 0 : ease(Math.min(1, (t - 1.2) / 1.1)); }
      draw();
      if (reduce) return; // single draw only; no further frames scheduled
      if (p < 1 || !('requestVideoFrameCallback' in vid)) {
        rafId = requestAnimationFrame(tick);
      } else {
        rvfcId = vid.requestVideoFrameCallback(tick);
      }
    }
    function start_() {
      if (running) return;
      running = true;
      if (reduce) { draw(); return; } // reduced motion: draw the settled state once and stop
      var pr = vid.play(); if (pr && pr.catch) pr.catch(function () {});
      rafId = requestAnimationFrame(tick);
    }
    function stop_() {
      running = false;
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
      if (rvfcId !== null && vid.cancelVideoFrameCallback) { vid.cancelVideoFrameCallback(rvfcId); rvfcId = null; }
      vid.pause();
    }

    // Neither the initial size() call above nor start_() below can draw anything real until a
    // source is actually ready — whichever of the poster image or the video's first frame finishes
    // loading later fires its own redraw, so the strip never gets stuck showing a blank canvas.
    poster.onload = draw;
    vid.addEventListener('loadeddata', draw);

    size(); window.addEventListener('resize', size);
    if (reduce || !('IntersectionObserver' in window)) { start_(); return; }
    new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) start_(); else stop_(); });
    }, { threshold: 0.1 }).observe(fig);
  })();

  // ---- one quiet entrance per section ----
  var els = document.querySelectorAll('main > section:not(.hero):not(.ix), main > .pair');
  if (reduce || !('IntersectionObserver' in window)) return;
  els.forEach(function (el) { el.classList.add('will-reveal'); });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -10% 0px' });
  els.forEach(function (el) { io.observe(el); });
})();

// ---- footer live clock: replaces the mailto address in the bottom-left corner. Own IIFE
// (not appended inside the block above) because that one can `return` early under reduced
// motion / no IntersectionObserver, which would skip this too if it lived in the same scope. ----
// Always Los Angeles time (the studio's own, per "Est. Los Angeles" in the nav), not each
// visitor's local time. Intl's timeZoneName:'short' already resolves to PST/PDT correctly for
// the date, so DST isn't hand-rolled here. No aria-live: a per-second update would spam screen
// readers for no real information.
(function () {
  var clocks = document.querySelectorAll('[data-live-clock]');
  if (!clocks.length) return;
  var timeFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZoneName: 'short' });
  var tick = function () {
    var text = timeFmt.format(new Date());
    Array.prototype.forEach.call(clocks, function (el) { el.textContent = text; });
  };
  tick();
  setInterval(tick, 1000);
})();
