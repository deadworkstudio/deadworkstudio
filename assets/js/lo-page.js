// Loadout product page: the pieces Loadout adds on top of ss-page.js.
// Every block looks for its own data-lo-* hooks and quietly does nothing if they are missing.

// ---- App Store link: one source of truth ----
// <main data-appstore-url> holds the App Store address; every [data-appstore] link on the page takes it from there.
// App Store campaign links: once <main data-appstore-pt> holds the provider token from App Store Connect
// (Analytics > Campaigns, the pt= number), each link also carries pt, ct and mt=8, so App Store Connect can
// count downloads, sessions, sales, subscriptions and proceeds per channel. Apple's rules: ct is at most 30
// characters, and a campaign only shows once it has 5 or more of a metric, so ct is the CHANNEL (kept coarse on
// purpose). Which button and which post stay in the site's own counts (lo-analytics.js).
//   radar    ?ref=radar          replies and posts found through DEADWORK Radar
//   reddit   ?ref=reddit         any other Reddit link (weekly value post, profile)
//   seo.<cluster>  ?ref=guide&utm_content=<cluster>   one campaign per guide topic cluster (Daniel 11-24)
//   seo      ?ref=guide with no campaign, ?ref=seo, or arriving from a search engine with no tag
//   ig tt yt fb x threads        organic social, from ?ref= or the referring site
//   paid     ?utm_medium=paid|cpc|ads, or a click id (fbclid, gclid, ttclid)
//   creator.<name>  ?ref=creator&utm_campaign=<name>   one campaign per creator
//   email    ?ref=email|outreach
//   web      another website, no tag
//   direct   no tag, no referrer
// Nothing about the visitor is added: only the tag already in the address or the referring site's name.
(function () {
  var main = document.querySelector('main[data-appstore-url]'); if (!main) return;
  var url = main.getAttribute('data-appstore-url'); if (!/^https:\/\/apps\.apple\.com\//.test(url)) return;
  var pt = (main.getAttribute('data-appstore-pt') || '').replace(/[^0-9A-Za-z]/g, '');
  var channel = 'direct';
  try {
    var q = new URLSearchParams(location.search);
    var ref = (q.get('ref') || q.get('utm_source') || '').toLowerCase();
    var med = (q.get('utm_medium') || '').toLowerCase();
    var camp = (q.get('utm_campaign') || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    var cont = (q.get('utm_content') || '').toLowerCase().replace(/[^a-z0-9-]+/g, '');
    var host = ''; try { host = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : ''; } catch (e) {}
    var SOCIAL = { instagram: 'ig', ig: 'ig', tiktok: 'tt', tt: 'tt', youtube: 'yt', yt: 'yt', facebook: 'fb', fb: 'fb', x: 'x', twitter: 'x', threads: 'threads' };
    var HOSTS = [[/instagram\./, 'ig'], [/tiktok\./, 'tt'], [/youtube\.|youtu\.be/, 'yt'], [/facebook\.|fb\.com/, 'fb'], [/(^|\.)x\.com$|t\.co$|twitter\./, 'x'], [/threads\./, 'threads'],
      [/reddit\./, 'reddit'], [/google\.|bing\.|duckduckgo\.|yahoo\.|ecosia\.|baidu\.|yandex\./, 'seo']];
    if (/^(paid|cpc|ads?|paid-social)$/.test(med) || q.get('fbclid') && med || q.get('gclid') || q.get('ttclid')) channel = 'paid';
    else if (ref === 'radar') channel = 'radar';
    else if (ref === 'reddit') channel = 'reddit';
    // Guides: one Apple campaign per topic cluster (utm_content), not per guide, so each campaign reaches
    // Apple's 5-download reporting minimum sooner. utm_campaign still carries the guide for the site's own counts.
    else if (ref === 'guide' && cont) channel = 'seo.' + cont.slice(0, 26);
    else if (ref === 'guide' || ref === 'seo') channel = 'seo';
    else if (ref === 'creator') channel = ('creator.' + camp).replace(/\.$/, '');
    else if (ref === 'email' || ref === 'outreach') channel = 'email';
    else if (SOCIAL[ref]) channel = SOCIAL[ref];
    else if (ref) channel = ref.replace(/[^a-z0-9-]+/g, '-');
    else if (host && !/(^|\.)deadworkstudio\.com$/.test(host)) {
      channel = 'web';
      for (var i = 0; i < HOSTS.length; i++) if (HOSTS[i][0].test(host)) { channel = HOSTS[i][1]; break; }
    }
  } catch (e) {}
  var ct = channel.slice(0, 30);
  main.setAttribute('data-channel', ct);
  [].forEach.call(document.querySelectorAll('a[data-appstore]'), function (a) {
    a.href = pt ? url + (url.indexOf('?') < 0 ? '?' : '&') + 'pt=' + pt + '&ct=' + encodeURIComponent(ct) + '&mt=8' : url;
  });
})();

// ---- VALUE CHECK in pricing: the visitor's own number against the two real prices. Arithmetic only. ----
(function () {
  var box = document.querySelector('[data-lo-value]'); if (!box) return;
  var input = box.querySelector('[data-lo-value-input]'), out = box.querySelector('[data-lo-value-out]');
  if (!input || !out) return;
  var T = window.DW_T || function (k, v) { return k.replace(/\{(\w+)\}/g, function (m, n) { return v && n in v ? v[n] : m; }); };
  var idle = out.innerHTML;
  var MONTH = 12.99, YEAR = 99.99;
  var lang = document.documentElement.lang || 'en';
  var fmt = function (n) {
    var v = n >= 10 ? Math.floor(n) : Math.floor(n * 10) / 10;
    try { return v.toLocaleString(lang, { maximumFractionDigits: 1 }); } catch (e) { return String(v); }
  };
  var run = function () {
    var v = parseFloat(String(input.value).replace(/[^0-9.]/g, ''));
    if (!(v > 0)) { out.innerHTML = idle; return; }
    if (v < MONTH) { out.textContent = T('Less than a month of Loadout. Worth a look anyway: it checks every item, every time.'); return; }
    out.innerHTML = T('That is <strong>{months} months</strong> of the monthly plan, or <strong>{years} years</strong> of the yearly plan.', { months: fmt(v / MONTH), years: fmt(v / YEAR) });
  };
  input.addEventListener('input', run);
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

// ---- floating App Store button (bottom left on computers, one slim bar on phones; .ss-sticky look) ----
// Shows once the hero App Store button has scrolled up out of view. Hidden again while any other App Store button,
// the Android notify form or the footer is on screen, so it never sits over the thing it points to.
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
  var spots = [].slice.call(document.querySelectorAll('a[data-appstore]')).filter(function (a) { return !bar.contains(a) && !top.contains(a); })
    .concat([document.getElementById('notify'), document.querySelector('.poster-foot')]).filter(Boolean);
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
  v.addEventListener('playing', function () { v.classList.add('is-playing'); });
  // Speed: the hero video waits until the page has loaded (and the poster image has painted), so its
  // 0.5 MB never competes with the first screen. The poster <img> underneath is what people see first.
  var ready = document.readyState === 'complete', want = false;
  var go = function () { want = true; if (!ready) return; var p = v.play(); if (p && p.catch) p.catch(function () {}); };
  if (!ready) window.addEventListener('load', function () { setTimeout(function () { ready = true; if (want) go(); }, 600); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) go(); else { want = false; v.pause(); } }); }, { threshold: 0.2 }).observe(v);
  } else { go(); }
})();

// ---- Below-the-fold video posters load only when they come near the screen (data-poster), to keep the first screen light. ----
(function () {
  var vids = [].slice.call(document.querySelectorAll('video[data-poster]')); if (!vids.length) return;
  var set = function (v) { if (v.getAttribute('data-poster')) { v.poster = v.getAttribute('data-poster'); v.removeAttribute('data-poster'); } };
  if (!('IntersectionObserver' in window)) { vids.forEach(set); return; }
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { set(e.target); io.unobserve(e.target); } }); }, { rootMargin: '800px 0px' });
  vids.forEach(function (v) { io.observe(v); });
})();
