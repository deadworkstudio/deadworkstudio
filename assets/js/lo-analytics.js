// Loadout page analytics. Cookie-free, no ids, nothing about the visitor: each thing that happens on
// the Loadout page sends one tiny anonymous event to DEADWORK HQ (deadwork-hq /lo), which only adds 1
// to a daily counter. Counts are page loads, not people. What is sent: the event name, phone-sized or
// computer-sized screen, the ?ref= / ?utm_source= / ?utm_campaign= tag on the link, the referring
// SITE name (never the full address), and for a few events which form / platform / section / video.
// Never an email, name, IP, or anything stored in the browser. Skipped for Global Privacy Control / Do
// Not Track, Daniel's own devices (open any page with ?internal=1, see ss-funnel.js) and local test
// servers. Uses sendBeacon so it never slows the page down; if anything fails the page doesn't notice.
//
// Events (each fires at most once per page load):
//   loadout_page_view        the page opened               (the <main data-event> attribute)
//   loadout_hero_cta_click   top button clicked            (data-event on the hero button / link)
//   loadout_app_download_click  App Store link clicked     (data-event, ready for when the link exists)
//   loadout_monthly_select / loadout_yearly_select  a price card clicked
//   loadout_pricing_view     pricing section scrolled into view
//   loadout_section_view     first time the top of page / scan / app / adding gear / FAQ comes into view
//   loadout_video_play       the scan video (or the on-set film) started playing
//   loadout_video_complete   it reached the end of its first loop
//   loadout_waitlist_submit  a waitlist form SAVED successfully (notify.js announces it), with form + platform
(function () {
  try {
    var ENDPOINT = 'https://deadwork-hq.stockshredder.workers.dev/lo';
    var isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    // Local preview only: a developer can point the events at a local test Worker.
    try { var override = isLocal && localStorage.getItem('dw-lo-endpoint'); if (override) ENDPOINT = override; else if (isLocal) return; } catch (e) { if (isLocal) return; }
    if (navigator.globalPrivacyControl === true || navigator.doNotTrack === '1') return;
    try { if (localStorage.getItem('dw-internal') === '1') return; } catch (e) {}

    var q = new URLSearchParams(location.search);
    var tag = (q.get('ref') || q.get('utm_source') || q.get('src') || '').slice(0, 40);
    var campaign = (q.get('utm_campaign') || q.get('campaign') || '').slice(0, 60);
    var refHost = '';
    try { if (document.referrer) refHost = new URL(document.referrer).hostname.slice(0, 100); } catch (e) {}
    var device = window.innerWidth < 768 ? 'mobile' : 'desktop';

    var fired = {};
    function send(name, extra, onceKey) {
      var key = onceKey || name;
      if (fired[key]) return;
      fired[key] = 1;
      var body = { e: name, d: device, s: tag, c: campaign, r: refHost };
      if (extra) for (var k in extra) body[k] = extra[k];
      var text = JSON.stringify(body);
      try {
        if (navigator.sendBeacon) navigator.sendBeacon(ENDPOINT, new Blob([text], { type: 'text/plain' }));
        else fetch(ENDPOINT, { method: 'POST', body: text, keepalive: true, mode: 'no-cors' });
      } catch (e) {}
    }

    // 1. page view, named by the markup
    var main = document.querySelector('main[data-event]');
    send(main ? main.getAttribute('data-event') : 'loadout_page_view');

    // 2. clicks, by the markup's own data-event names
    var CLICKS = { loadout_hero_cta_click: 1, loadout_app_download_click: 1, loadout_monthly_select: 1, loadout_yearly_select: 1 };
    document.addEventListener('click', function (ev) {
      var el = ev.target && ev.target.closest ? ev.target.closest('[data-event]') : null;
      var name = el && el.getAttribute('data-event');
      if (name && CLICKS[name]) send(name);
    }, true);

    // 3. scrolled into view: pricing (named by the markup) and the main sections
    if ('IntersectionObserver' in window) {
      var seen = function (nodes, onSeen) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) { if (en.isIntersecting) { io.unobserve(en.target); onSeen(en.target); } });
        }, { rootMargin: '0px 0px -25% 0px', threshold: 0 });
        nodes.forEach(function (n) { io.observe(n); });
      };
      var pricing = document.querySelector('[data-event="loadout_pricing_view"]');
      if (pricing) seen([pricing], function () { send('loadout_pricing_view'); });
      var SECTIONS = { hero: '.hero', scan: '.lo-scan', app: '.lo-tour', gear: '.lo-add', faq: '#faq' };
      Object.keys(SECTIONS).forEach(function (name) {
        var node = document.querySelector(SECTIONS[name]);
        if (node) seen([node], function () { send('loadout_section_view', { sec: name }, 'sec:' + name); });
      });
    }

    // 4. videos: started, and reached the end of the first loop (these loop, so 'ended' never fires)
    [['[data-lo-scan-video]', 'scan'], ['[data-film]', 'film']].forEach(function (pair) {
      var v = document.querySelector(pair[0]);
      if (!v) return;
      var last = 0;
      v.addEventListener('playing', function () { send('loadout_video_play', { v: pair[1] }, 'play:' + pair[1]); });
      v.addEventListener('timeupdate', function () {
        var t = v.currentTime, d = v.duration;
        if (!(d > 0)) return;
        // reached the last 0.3 s, or wrapped back to the start (the loop restarted)
        if (t >= d - 0.3 || (last > d / 2 && t < last - d / 2)) send('loadout_video_complete', { v: pair[1] }, 'done:' + pair[1]);
        last = t;
      });
      v.addEventListener('ended', function () { send('loadout_video_complete', { v: pair[1] }, 'done:' + pair[1]); });
    });

    // 5. waitlist saved (notify.js fires this only after the server said ok)
    document.addEventListener('dw:notify-success', function (ev) {
      var d = ev.detail || {};
      if (d.product !== 'loadout') return;
      send('loadout_waitlist_submit', { f: d.form || '', p: d.platform || 'none' }, 'wl:' + Date.now());
    });
  } catch (e) {}
})();
