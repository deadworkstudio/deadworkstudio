// Handoff page analytics hooks. Same shape and rules as lo-analytics.js (Loadout): cookie-free, no ids,
// nothing about the visitor. Each event is one tiny anonymous beacon that only adds 1 to a daily counter:
// the event name, phone- or computer-sized screen, the ?ref= / ?utm_source= / ?utm_campaign= tag, the
// referring SITE name (never the full address) and, for a few events, which form / step / section.
// Never an email, name, IP or anything stored in the browser. Skipped for Global Privacy Control /
// Do Not Track, ?internal=1 devices (see ss-funnel.js) and local test servers.
//
// OFF until the server side exists: DEADWORK HQ only accepts Loadout's event names today (/lo,
// loadoutAnalytics.ts). To switch on, deploy a /hf route that accepts the names below (a copy of
// loadoutAnalytics.ts with these names), then set ENABLED = true. Until then the hooks run, but send
// nothing. Local preview: localStorage['dw-hf-endpoint'] = 'http://127.0.0.1:8787/hf' sends to a test Worker.
//
// Events (each fires at most once per page load unless noted):
//   handoff_page_view         the page opened                        (<main data-event>)
//   handoff_section_view      first time a main section comes into view, with sec=<name>
//   handoff_tour_step         a tour step was opened by a person (click / key), with step + how (once per step)
//   handoff_tour_state        a result (green/amber/red/grey) picked in the tour's Confirm step (once per state)
//   handoff_cta_click         a "Notify me at launch" link was clicked, with where=<band|...>
//   handoff_pricing_view      pricing scrolled into view
//   handoff_hero_video_play   the hero recording started
//   handoff_waitlist_submit   a waitlist form SAVED (notify.js announces it after the server said ok), with f=<form> (every time)
(function () {
  try {
    var ENABLED = false;
    var ENDPOINT = 'https://deadwork-hq.stockshredder.workers.dev/hf';
    var isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    try { var override = isLocal && localStorage.getItem('dw-hf-endpoint'); if (override) { ENDPOINT = override; ENABLED = true; } else if (isLocal) ENABLED = false; } catch (e) { if (isLocal) ENABLED = false; }
    if (navigator.globalPrivacyControl === true || navigator.doNotTrack === '1') ENABLED = false;
    try { if (localStorage.getItem('dw-internal') === '1') ENABLED = false; } catch (e) {}

    var q = new URLSearchParams(location.search);
    var tag = (q.get('ref') || q.get('utm_source') || q.get('src') || '').slice(0, 40);
    var campaign = (q.get('utm_campaign') || q.get('campaign') || '').slice(0, 60);
    var refHost = '';
    try { if (document.referrer) refHost = new URL(document.referrer).hostname.slice(0, 100); } catch (e) {}
    var device = window.innerWidth < 768 ? 'mobile' : 'desktop';

    var fired = {};
    // window.hfEvents: what would have been sent (handy for checking the hooks before the server exists)
    var log = window.hfEvents = [];
    function send(name, extra, onceKey) {
      var key = onceKey || name;
      if (fired[key]) return;
      fired[key] = 1;
      var body = { e: name, d: device, s: tag, c: campaign, r: refHost };
      if (extra) for (var k in extra) body[k] = extra[k];
      log.push(body);
      if (!ENABLED) return;
      var text = JSON.stringify(body);
      try {
        if (navigator.sendBeacon) navigator.sendBeacon(ENDPOINT, new Blob([text], { type: 'text/plain' }));
        else fetch(ENDPOINT, { method: 'POST', body: text, keepalive: true, mode: 'no-cors' });
      } catch (e) {}
    }

    var main = document.querySelector('main[data-event]');
    send(main ? main.getAttribute('data-event') : 'handoff_page_view');

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          io.unobserve(en.target);
          var sec = en.target.getAttribute('data-hf-sec');
          if (sec === 'pricing') send('handoff_pricing_view');
          send('handoff_section_view', { sec: sec }, 'sec:' + sec);
        });
      }, { rootMargin: '0px 0px -25% 0px', threshold: 0 });
      [].forEach.call(document.querySelectorAll('[data-hf-sec]'), function (n) { io.observe(n); });
    }

    document.addEventListener('hf:tour-step', function (ev) {
      var d = ev.detail || {}; if (d.how === 'auto') return;
      send('handoff_tour_step', { step: d.step, how: d.how }, 'step:' + d.step);
    });
    document.addEventListener('hf:tour-state', function (ev) { var d = ev.detail || {}; send('handoff_tour_state', { state: d.state }, 'state:' + d.state); });
    document.addEventListener('hf:cta', function (ev) { var d = ev.detail || {}; send('handoff_cta_click', { where: d.where }, 'cta:' + d.where); });

    var hero = document.querySelector('[data-hf-sync="mac"]');
    if (hero) hero.addEventListener('playing', function () { send('handoff_hero_video_play'); });

    document.addEventListener('dw:notify-success', function (ev) {
      var d = ev.detail || {};
      if (d.product !== 'handoff') return;
      send('handoff_waitlist_submit', { f: d.form || '' }, 'wl:' + Date.now());
    });
  } catch (e) {}
})();
