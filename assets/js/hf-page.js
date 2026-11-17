// Handoff product page: the hero's Mac + iPhone recordings in sync, and the six-step tour.
// No dependencies. Everything degrades to posters/stills: with reduced motion nothing plays by itself
// and the tour doesn't advance on its own; without JS the first step shows and the rest stay hidden.
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;
  function play(v) { if (!v || reduce) return; try { var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
  function pause(v) { if (v) try { v.pause(); } catch (e) {} }
  // tell hf-analytics.js (if present) about a moment, without it knowing about the markup
  function emit(name, detail) { try { document.dispatchEvent(new CustomEvent('hf:' + name, { detail: detail || {} })); } catch (e) {} }

  // ---- hero: two real recordings of the same sample card; the phone follows the Mac's clock ----
  (function () {
    var duo = document.querySelector('[data-hf-duo]'); if (!duo) return;
    var mac = duo.querySelector('[data-hf-sync="mac"]'), phone = duo.querySelector('[data-hf-sync="phone"]');
    if (!mac || !phone) return;
    // pick the recording for this screen: device pixels the hero will actually fill
    var dpr = window.devicePixelRatio || 1;
    [mac, phone].forEach(function (v) {
      var px = (v.getBoundingClientRect().width || 300) * dpr;
      var big = v === mac ? 1700 : 99999, mid = v === mac ? 1100 : 400;
      var src = (px > big && v.getAttribute('data-src-4k')) || (px > mid && v.getAttribute('data-src-2k')) || v.getAttribute('data-src-1k') || v.getAttribute('data-src-2k');
      if (!src) return;
      var s = document.createElement('source'); s.src = src; s.type = 'video/mp4'; v.appendChild(s);
      // reduced motion: nothing plays, so show the end result (green) instead of the 0 it starts on
      if (reduce && v.getAttribute('data-poster-still')) v.setAttribute('poster', v.getAttribute('data-poster-still'));
    });
    var inView = false;
    function sync() {
      if (!(phone.readyState >= 1)) return;
      var d = Math.abs(phone.currentTime - mac.currentTime);
      if (d > 0.2 && d < (phone.duration || 99) - 0.2) { try { phone.currentTime = mac.currentTime; } catch (e) {} }
    }
    mac.addEventListener('timeupdate', sync);
    mac.addEventListener('seeked', sync);
    mac.addEventListener('playing', function () { if (inView) play(phone); sync(); });
    mac.addEventListener('pause', function () { pause(phone); });
    if (reduce || !hasIO) return;
    new IntersectionObserver(function (es) {
      inView = es[0].isIntersecting;
      if (inView) { play(mac); play(phone); } else { pause(mac); pause(phone); }
    }, { threshold: 0.25 }).observe(duo);
  })();

  // ---- team section: real iPhone recordings. The file loads only when the phone comes into view, plays
  // while on screen and pauses off it; with reduced motion it never loads and the poster shows the result.
  [].forEach.call(document.querySelectorAll('video[data-hf-loop]'), function (v) {
    if (reduce) { if (v.getAttribute('data-poster-still')) v.setAttribute('poster', v.getAttribute('data-poster-still')); return; }
    if (!hasIO) return;
    var loaded = false;
    new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) { pause(v); return; }
        if (!loaded) { loaded = true; var s = document.createElement('source'); s.src = v.getAttribute('data-hf-loop'); s.type = 'video/mp4'; v.appendChild(s); v.load(); }
        play(v);
      });
    }, { threshold: 0.25 }).observe(v);
  });

  // ---- the tour: tabs (click, tap, arrow keys), plus an auto tour until the first interaction ----
  (function () {
    var tour = document.querySelector('[data-hf-tour]'); if (!tour) return;
    var nav = tour.querySelector('[data-hf-nav]');
    var tabs = [].slice.call(tour.querySelectorAll('[data-hf-step]'));
    var panes = [].slice.call(tour.querySelectorAll('[data-hf-pane]'));
    var autoBtn = tour.querySelector('[data-hf-auto]'), autoLbl = tour.querySelector('[data-hf-auto-label]');
    var STEP_MS = 6000, CONFIRM_STATE_MS = 2200;
    var cur = 0, inView = false, autoDone = !!reduce, autoT = 0, stateT = 0;

    // Confirm step: four results, one at a time
    var statesBox = tour.querySelector('[data-hf-states]');
    var stateBtns = [].slice.call(tour.querySelectorAll('[data-hf-state]'));
    var stateOrder = stateBtns.map(function (b) { return b.getAttribute('data-hf-state'); });
    var curState = 'ok';
    function showState(key) {
      curState = key;
      stateBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-hf-state') === key ? 'true' : 'false'); });
      [].forEach.call(tour.querySelectorAll('[data-hf-state-text]'), function (p) { p.hidden = p.getAttribute('data-hf-state-text') !== key; });
      if (!statesBox) return;
      [].forEach.call(statesBox.children, function (m) {
        var on = m.getAttribute('data-hf-state-media') === key;
        m.classList.toggle('is-on', on);
        m.setAttribute('aria-hidden', on ? 'false' : 'true');
        if (m.tagName === 'VIDEO') { if (on && inView && cur === 3) { try { m.currentTime = 0; } catch (e) {} play(m); } else pause(m); }
      });
    }

    function paneVideos(i) {
      var p = panes[i]; if (!p) return [];
      return [].slice.call(p.querySelectorAll('video')).filter(function (v) { return !v.hasAttribute('data-hf-state-media'); });
    }
    function wake(i) {
      paneVideos(i).forEach(function (v) { if (inView) play(v); });
      if (i === 3) showState(curState);
    }
    function sleepAll(except) {
      panes.forEach(function (p, k) { if (k !== except) [].forEach.call(p.querySelectorAll('video'), pause); });
    }

    function show(i, how) {
      if (i < 0 || i >= tabs.length) return;
      var changed = i !== cur;
      cur = i;
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
      });
      panes.forEach(function (p, k) {
        var on = k === i;
        p.hidden = !on;
        p.classList.toggle('is-on', on);
      });
      sleepAll(i);
      wake(i);
      if (changed && how) emit('tour-step', { step: tabs[i].getAttribute('data-name') || String(i + 1), how: how });
    }

    // ---- auto tour ----
    function autoUi() {
      if (autoBtn) autoBtn.setAttribute('aria-checked', autoDone ? 'false' : 'true');
      if (autoLbl) autoLbl.textContent = autoDone ? 'Off' : 'On';
      nav.classList.toggle('is-auto', !autoDone && inView);
      nav.style.setProperty('--hf-auto', (cur === 3 ? STEP_MS + CONFIRM_STATE_MS * 2 : STEP_MS) + 'ms');
    }
    function clearAuto() { clearTimeout(autoT); clearTimeout(stateT); autoT = stateT = 0; }
    function schedule() {
      clearAuto();
      if (autoDone || !inView) { autoUi(); return; }
      autoUi();
      if (cur === 3) {
        // walk the four results while on Confirm
        var k = 0;
        var walk = function () { k++; if (k < stateOrder.length) { showState(stateOrder[k]); stateT = setTimeout(walk, CONFIRM_STATE_MS); } };
        showState(stateOrder[0]);
        stateT = setTimeout(walk, CONFIRM_STATE_MS);
      }
      autoT = setTimeout(function () {
        show((cur + 1) % tabs.length, 'auto');
        // restart the bar animation
        nav.classList.remove('is-auto'); void nav.offsetWidth;
        schedule();
      }, cur === 3 ? CONFIRM_STATE_MS * stateOrder.length + 600 : STEP_MS);
    }
    function stopAuto() {
      if (autoDone) return;
      autoDone = true; clearAuto(); autoUi();
    }
    if (autoBtn) autoBtn.addEventListener('click', function () {
      if (autoDone) { autoDone = false; schedule(); } else stopAuto();
      emit('tour-auto', { on: !autoDone });
    });

    // ---- input: click/tap selects; arrows, Home and End move and select (WAI-ARIA tabs, automatic activation) ----
    tabs.forEach(function (t, k) {
      t.addEventListener('click', function () { stopAuto(); show(k, 'click'); });
    });
    nav.addEventListener('keydown', function (e) {
      var at = tabs.indexOf(document.activeElement); if (at < 0) return;
      var to = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? at + 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? at - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
      if (to === null) return;
      e.preventDefault(); stopAuto();
      to = (to + tabs.length) % tabs.length;
      tabs[to].focus(); show(to, 'key');
    });
    stateBtns.forEach(function (b) {
      b.addEventListener('click', function () { stopAuto(); showState(b.getAttribute('data-hf-state')); emit('tour-state', { state: b.getAttribute('data-hf-state') }); });
    });
    // a tap or click on the picture itself also counts as "I'm looking now"
    var stage = tour.querySelector('[data-hf-stage]');
    if (stage) stage.addEventListener('pointerdown', stopAuto);

    // ---- only plays while on screen ----
    if (hasIO) {
      new IntersectionObserver(function (es) {
        var was = inView;
        inView = es[0].isIntersecting;
        if (inView) { wake(cur); if (!was) schedule(); }
        else { sleepAll(-1); clearAuto(); autoUi(); }
      }, { threshold: 0.45 }).observe(tour);
    }
    show(0);
    autoUi();
  })();

  // ---- any "Notify me" link that jumps to a form puts the cursor in its email field ----
  [].forEach.call(document.querySelectorAll('a[href="#notify"], a[href="#top-cta"]'), function (a) {
    a.addEventListener('click', function () {
      emit('cta', { where: a.getAttribute('data-hf-cta') || 'link' });
      var target = document.querySelector(a.getAttribute('href'));
      var input = target && target.querySelector('input[type="email"]');
      if (input) setTimeout(function () { try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); } }, reduce ? 0 : 450);
    });
  });
})();
