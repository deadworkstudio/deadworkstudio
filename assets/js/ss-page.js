// Stock Shredder page: smart header, phone tools sheet, FAQ accordion, the "2 months free" switch
// (kept in sync with the Monthly/Annual toggle that checkout.js already drives), and the chat
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
    s.async = true; s.src = 'https://embed.tawk.to/6abff587e0dd3b34c4626702/1k3ute618'; s.charset = 'UTF-8'; s.setAttribute('crossorigin', '*');
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
      setTimeout(function () { if (!chatReady) window.location.href = faqChatLink.href; }, 2500);
    });
  }

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
  var els = document.querySelectorAll('main > section:not(.hero), main > .pair');
  if (reduce || !('IntersectionObserver' in window)) return;
  els.forEach(function (el) { el.classList.add('will-reveal'); });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -10% 0px' });
  els.forEach(function (el) { io.observe(el); });
})();
