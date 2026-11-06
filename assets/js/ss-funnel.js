// Cookie-free visit count for the Stock Shredder launch funnel (visitors -> checkout started -> paid).
// Sends one tiny ping per page load to our own payments server. No cookies, no ids, nothing about
// the visitor: the server keeps only a scrambled code that resets every day (see /legal/privacy/).
// Skipped for anyone with Global Privacy Control or Do Not Track on, and on local test servers.
// Daniel's own devices: open the page once with ?internal=1 and they stop counting (?internal=0 undoes it).
(function () {
  try {
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
    if (navigator.globalPrivacyControl === true || navigator.doNotTrack === '1') return;
    var internal = false;
    try {
      var q = new URLSearchParams(location.search);
      if (q.get('internal') === '1') localStorage.setItem('dw-internal', '1');
      if (q.get('internal') === '0') localStorage.removeItem('dw-internal');
      internal = localStorage.getItem('dw-internal') === '1';
    } catch (e) {}
    var url = 'https://stock-shredder-payments.stockshredder.workers.dev/t';
    var body = JSON.stringify({ p: location.pathname, i: internal ? 1 : 0 });
    if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }));
    else fetch(url, { method: 'POST', body: body, keepalive: true, mode: 'no-cors' });
  } catch (e) {}
})();
