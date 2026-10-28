// DEADWORK — Option 02: Experimental Editorial
// Category drawers, index stage, Los Angeles clock, hero video. Presentation only.
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---- Category drawers (Pre-Production / Production / Post-Production) ---- */
  var triggers = Array.prototype.slice.call(document.querySelectorAll('[data-menu-trigger]'));
  var openKey = null;

  function menuFor(key) { return document.querySelector('[data-menu="' + key + '"]'); }

  function closeMenu(returnFocus) {
    if (!openKey) return;
    var key = openKey;
    openKey = null;
    menuFor(key).hidden = true;
    triggers.forEach(function (t) { t.setAttribute('aria-expanded', 'false'); });
    if (returnFocus) {
      var t = document.querySelector('[data-menu-trigger="' + key + '"]');
      if (t) t.focus();
    }
  }

  function openMenu(key) {
    if (openKey && openKey !== key) closeMenu(false);
    openKey = key;
    menuFor(key).hidden = false;
    triggers.forEach(function (t) {
      t.setAttribute('aria-expanded', t.getAttribute('data-menu-trigger') === key ? 'true' : 'false');
    });
  }

  triggers.forEach(function (t) {
    t.addEventListener('click', function () {
      var key = t.getAttribute('data-menu-trigger');
      openKey === key ? closeMenu(false) : openMenu(key);
    });
  });

  document.addEventListener('click', function (e) {
    if (!openKey) return;
    if (e.target.closest('[data-menu-trigger]') || e.target.closest('[data-menu]') && !e.target.closest('[data-menu-close]')) return;
    closeMenu(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openKey) closeMenu(true);
  });

  // Focus leaving the masthead entirely closes the drawer (keyboard users tabbing on).
  var mast = document.querySelector('[data-mast]');
  if (mast) mast.addEventListener('focusout', function (e) {
    if (openKey && e.relatedTarget && !mast.contains(e.relatedTarget)) closeMenu(false);
  });

  /* ---- Wordmark: back to the opening frame ---- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-reset]'), function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      closeMenu(false);
      window.scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
      if (location.hash) history.pushState(null, '', location.pathname + location.search);
    });
  });

  /* ---- Index stage: hovering / focusing a name puts that product in the center plate ---- */
  var stage = document.querySelector('[data-stage-root]');
  if (stage) {
    var layers = {};
    Array.prototype.forEach.call(stage.querySelectorAll('[data-stage-key]'), function (l) { layers[l.getAttribute('data-stage-key')] = l; });
    var setStage = function (key) {
      Object.keys(layers).forEach(function (k) { layers[k].classList.toggle('is-on', k === key); });
    };
    Array.prototype.forEach.call(document.querySelectorAll('[data-stage]'), function (w) {
      var key = w.getAttribute('data-stage');
      w.addEventListener('mouseenter', function () { setStage(key); });
      w.addEventListener('focus', function () { setStage(key); });
      w.addEventListener('mouseleave', function () { setStage('default'); });
      w.addEventListener('blur', function () { setStage('default'); });
    });
  }

  /* ---- Los Angeles clock: time only, 12-hour, PDT/PST ---- */
  var clock = document.querySelector('[data-clock]');
  if (clock) {
    var hmsEl = clock.querySelector('[data-clock-hms]');
    var ampmEl = clock.querySelector('[data-clock-ampm]');
    var tzEl = clock.querySelector('[data-clock-tz]');
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true, timeZoneName: 'short'
    });
    // Build fixed-width digit cells once, so the numerals never shift as they change.
    hmsEl.textContent = '';
    var cells = [];
    for (var i = 0; i < 8; i++) {
      var s = document.createElement('span');
      s.className = (i === 2 || i === 5) ? 'c' : 'd';
      s.textContent = (i === 2 || i === 5) ? ':' : '0';
      hmsEl.appendChild(s);
      cells.push(s);
    }
    var tick = function () {
      var parts = {};
      fmt.formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
      var str = parts.hour + ':' + parts.minute + ':' + parts.second;
      for (var j = 0; j < 8; j++) {
        if (cells[j].textContent !== str[j]) {
          cells[j].textContent = str[j];
          if (!reduce.matches && cells[j].className.indexOf('d') === 0) {
            cells[j].classList.remove('tick');
            void cells[j].offsetWidth; // restart the animation
            cells[j].classList.add('tick');
          }
        }
      }
      ampmEl.textContent = (parts.dayPeriod || '').toUpperCase();
      tzEl.textContent = parts.timeZoneName || 'PT';
    };
    tick();
    // Align ticks to the real second boundary so it never visibly lags.
    setTimeout(function () { tick(); setInterval(tick, 1000); }, 1000 - (Date.now() % 1000));
  }

  /* ---- Hero video: identical policy to the live home.js ----
     No <source>/autoplay in the markup. Under reduced motion the poster is the whole
     experience and no video bytes are fetched. Otherwise pick the mobile rendition under
     ~800px wide and attach a real <source>. */
  var hero = document.querySelector('[data-hero-video]');
  if (hero && !reduce.matches) {
    var src = innerWidth <= 800 ? hero.dataset.srcMobile : hero.dataset.src;
    var source = document.createElement('source');
    source.src = src;
    source.type = 'video/mp4';
    hero.appendChild(source);
    hero.preload = 'auto';
    hero.load();
    var p = hero.play();
    if (p && p.catch) p.catch(function () {});
  }
})();
