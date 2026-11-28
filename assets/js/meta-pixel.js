// Meta (Facebook / Instagram) ads pixel for deadworkstudio.com (Daniel 2026-11-22), so Instagram and
// Facebook ads can be measured and set to find people who start a Stock Shredder trial.
// Dataset "DEADWORK Website" 2618665635309555 in the DEADWORK business portfolio.
//
// Events:
//   PageView      every page (here).
//   ViewContent   the Stock Shredder product page, in every language (here).
//   StartTrial + Lead   a Stock Shredder free trial is confirmed on the page ("You're in"), from
//                 checkout.js showSuccess(). Both fire so ads can optimize for either one.
//   InitiateCheckout / Purchase   a paid plan checkout opens / is confirmed, from checkout.js.
// checkout.js calls window.dwPixel(name, data); when the pixel is off it does nothing.
//
// Never loads (and no Meta cookie is set) for: Global Privacy Control or Do Not Track browsers,
// team browsers (?internal=1, see ss-funnel.js), and local test servers. Privacy policy:
// /legal/privacy/ ("Ads on Instagram and Facebook").
(function () {
  var PIXEL_ID = '2618665635309555';
  window.dwPixel = function () {};
  try {
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
    if (navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
    var q = new URLSearchParams(location.search);
    if (q.get('internal') === '1') return;
    if (q.get('internal') !== '0') {
      try { if (localStorage.getItem('dw-internal') === '1') return; } catch (e) {}
    }
  } catch (e) {
    return;
  }

  /* Meta's standard pixel base code */
  !function (f, b, e, v, n, t, s) {
    if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v;
    s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  window.fbq('init', PIXEL_ID);
  window.fbq('track', 'PageView');

  // Product pages in any language: /products/<name>/ or /es/products/<name>/ ...
  if (/^\/(?:[a-z]{2}\/)?products\/stock-shredder\/?$/.test(location.pathname)) {
    window.fbq('track', 'ViewContent', { content_name: 'Stock Shredder', content_category: 'Software', content_ids: ['stock-shredder'], content_type: 'product' });
  }
  if (/^\/(?:[a-z]{2}\/)?products\/loadout\/?$/.test(location.pathname)) {
    window.fbq('track', 'ViewContent', { content_name: 'Loadout', content_category: 'iPhone app', content_ids: ['loadout'], content_type: 'product' });
  }
  if (/^\/(?:[a-z]{2}\/)?products\/handoff\/?$/.test(location.pathname)) {
    window.fbq('track', 'ViewContent', { content_name: 'Handoff', content_category: 'Software', content_ids: ['handoff'], content_type: 'product' });
  }

  // One event name at most once per page load (a retried confirmation must not count twice).
  var sent = {};
  window.dwPixel = function (name, data, eventId) {
    try {
      if (sent[name]) return;
      sent[name] = true;
      if (eventId) window.fbq('track', name, data || {}, { eventID: String(eventId) });
      else window.fbq('track', name, data || {});
    } catch (e) {}
  };

  // Loadout: someone taps an App Store button (any [data-appstore] link, in any language). Counted as a Lead
  // with content_name Loadout, so a Loadout ad can be set to find people who go on to the App Store.
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[data-appstore]');
    if (a) window.dwPixel('Lead', { content_name: 'Loadout', content_category: 'App Store tap', content_ids: ['loadout'] });
  }, true);
  // A notify list sign-up succeeds (Handoff and the other in-development products; notify.js sends this
  // only after the server has accepted the email). Counted as a Lead with the product's name.
  document.addEventListener('dw:notify-success', function (e) {
    var p = (e.detail && e.detail.product) || 'notify';
    window.dwPixel('Lead', { content_name: p.charAt(0).toUpperCase() + p.slice(1), content_category: 'Notify list' });
  });
})();
