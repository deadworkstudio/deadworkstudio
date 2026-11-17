// Cookie-free visit count for the DEADWORK site: which pages people see, where they came from
// (Instagram, Google, a tagged link...), and whether that leads to a checkout. One tiny ping per
// page load to our own payments server. No cookies, no ids, nothing about the visitor: the server
// keeps only the page, the source, a 2-letter country, phone vs computer and a scrambled code that
// resets every day (see /legal/privacy/). Skipped for Global Privacy Control / Do Not Track, and
// on local test servers.
// Tag links so apps that hide the referrer still count: ?ref=instagram (optional &utm_campaign=reel-1).
// Team devices: open any page once with ?internal=1 and that browser stops counting (?internal=0
// undoes it). A short note confirms it, and the flag is taken out of the address bar so a copied
// link never carries it to a customer. The server also skips other browsers on the same internet
// connection for 7 days (Safari vs Chrome, the Instagram in-app browser) and removes this browser's
// visits from today and yesterday (worker/src/teamDevices.ts).
// Multi-day credit: the browser itself remembers its last visit from outside the site (the source
// tag or the referring SITE, never the full address, plus when) in localStorage under dw-touch, for
// 30 days. It never leaves the browser except inside a checkout request (checkout.js), so an
// Instagram visit on Monday still gets credit for a purchase on Wednesday. Not a cookie: it is
// never sent with page loads, and nothing is stored for GPC/DNT or ?internal=1 browsers.
(function () {
  try {
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
    var q = new URLSearchParams(location.search);
    var internal = false;
    var flag = q.get('internal');
    try {
      if (flag === '1') localStorage.setItem('dw-internal', '1');
      if (flag === '0') localStorage.removeItem('dw-internal');
      internal = localStorage.getItem('dw-internal') === '1';
    } catch (e) {}
    if (flag === '1' || flag === '0') {
      if (flag === '1') internal = true; // counts as team even where the browser refuses storage
      try {
        q.delete('internal');
        var rest = q.toString();
        history.replaceState(history.state, '', location.pathname + (rest ? '?' + rest : '') + location.hash);
      } catch (e) {}
      var note = function () {
        try {
          var d = document.createElement('div');
          d.setAttribute('role', 'status');
          d.textContent = flag === '1'
            ? 'This browser is set as DEADWORK team. Your visits no longer count in the site numbers.'
            : 'This browser counts as a normal visitor again.';
          d.style.cssText = 'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:2147483647;max-width:calc(100% - 32px);box-sizing:border-box;padding:12px 18px;border-radius:10px;background:#111;color:#fff;font:500 14px/1.4 -apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.35);text-align:center';
          document.body.appendChild(d);
          setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 7000);
        } catch (e) {}
      };
      if (document.body) note(); else document.addEventListener('DOMContentLoaded', note);
    }
    // GPC / Do Not Track browsers send nothing at all (the team note above still shows).
    if (navigator.globalPrivacyControl === true || navigator.doNotTrack === '1') return;
    var tag = q.get('ref') || q.get('utm_source') || q.get('src') || '';
    var campaign = q.get('utm_campaign') || q.get('campaign') || '';
    try {
      var refOrigin = '';
      try {
        var ru = document.referrer ? new URL(document.referrer) : null;
        if (ru && !/(^|\.)deadworkstudio\.com$|(^|\.)stockshredder\.workers\.dev$/.test(ru.hostname) && ru.hostname !== location.hostname) refOrigin = ru.protocol + '//' + ru.hostname;
      } catch (e) {}
      if (internal) localStorage.removeItem('dw-touch');
      else if (tag || refOrigin) localStorage.setItem('dw-touch', JSON.stringify({ s: tag.slice(0, 40), c: campaign.slice(0, 60), r: refOrigin, t: Date.now() }));
      else {
        var old = JSON.parse(localStorage.getItem('dw-touch') || 'null');
        if (old && !(Date.now() - old.t < 30 * 86400000)) localStorage.removeItem('dw-touch');
      }
    } catch (e) {}
    var url = 'https://stock-shredder-payments.stockshredder.workers.dev/t';
    var body = JSON.stringify({
      p: location.pathname,
      i: internal ? 1 : 0,
      n: flag === '1' ? 1 : 0,
      x: flag === '0' ? 1 : 0,
      r: (document.referrer || '').slice(0, 300),
      s: tag.slice(0, 40),
      c: campaign.slice(0, 60)
    });
    if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }));
    else fetch(url, { method: 'POST', body: body, keepalive: true, mode: 'no-cors' });
  } catch (e) {}
})();
