/* Language picker and first-visit language choice.
 *
 * Translated copies of a page live under /es/, /fr/, /de/, /it/, /zh/ and /ja/ and are made by
 * tools/i18n/build.py. Every page that has them lists them as <link rel="alternate" hreflang>.
 *
 * - The picker (the small "EN" in the top bar) is plain links, so it works without this script.
 *   This script only opens and closes it, and remembers the choice.
 * - On an English page, a visitor who has never chosen goes to their browser's language if we
 *   have it. A choice made in the picker always wins, and an English choice is never overridden.
 * - Words only: prices are written in US dollars in the copy itself and never converted.
 * - Text that other scripts write later (form messages, checkout status) is swapped for its
 *   translation when it matches a line in window.DW_I18N, which the build puts on each page.
 */
(function () {
  var KEY = 'dw-lang';
  var doc = document.documentElement;
  var pageLang = (doc.getAttribute('lang') || 'en').toLowerCase().slice(0, 2);

  // Sentences that scripts build with numbers in them (pricing, plan fit) ask for their words
  // here: T('Save {amount}/yr', { amount: '$70' }). English pages, or a line with no translation,
  // get the English sentence with the values filled in, exactly as before.
  window.DW_T = function (key, vars) {
    var dict = window.DW_I18N || {};
    var s = Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : key;
    return String(s).replace(/\{(\w+)\}/g, function (m, n) { return vars && n in vars ? vars[n] : m; });
  };

  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function store(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  function alternates() {
    var out = {};
    var links = document.querySelectorAll('link[rel="alternate"][hreflang]');
    for (var i = 0; i < links.length; i++) {
      var h = links[i].getAttribute('hreflang').toLowerCase();
      if (h === 'x-default') continue;
      out[h.slice(0, 2)] = links[i].getAttribute('href');
    }
    return out;
  }

  function browserGuess(available) {
    var prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    for (var i = 0; i < prefs.length; i++) {
      var code = String(prefs[i] || '').toLowerCase().slice(0, 2);
      if (!code) continue;
      if (code === 'en') return 'en';
      if (available[code]) return code;
    }
    return null;
  }

  // First visit (or a remembered choice) on an English page: go to the right language.
  if (pageLang === 'en') {
    var alts = alternates();
    var want = stored() || browserGuess(alts);
    if (want && want !== 'en' && alts[want]) {
      var url = new URL(alts[want], location.href);
      url.search = location.search;
      url.hash = location.hash;
      location.replace(url.toString());
      return;
    }
  }

  function setupPicker() {
    var tabs = document.querySelectorAll('[data-lang-picker]');
    for (var i = 0; i < tabs.length; i++) (function (tab) {
      var btn = tab.querySelector('button');
      var menu = tab.querySelector('.lang-menu');
      if (!btn || !menu) return;
      function open() {
        var bg = getComputedStyle(document.body).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') menu.style.backgroundColor = bg;
        menu.hidden = false; btn.setAttribute('aria-expanded', 'true');
      }
      function close() { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
      btn.addEventListener('click', function (e) { e.stopPropagation(); menu.hidden ? open() : close(); });
      document.addEventListener('click', function (e) { if (!tab.contains(e.target)) close(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { close(); btn.focus(); } });
      var links = menu.querySelectorAll('a[data-lang]');
      for (var j = 0; j < links.length; j++) links[j].addEventListener('click', function () { store(this.getAttribute('data-lang')); });
    })(tabs[i]);
  }

  // Swap English text that scripts add later for the page's language.
  function watchScriptText() {
    var dict = window.DW_I18N;
    if (!dict || pageLang === 'en' || !window.MutationObserver) return;
    function fix(node) {
      if (node.nodeType === 3) {
        var t = node.nodeValue, k = t.trim();
        if (k && Object.prototype.hasOwnProperty.call(dict, k)) node.nodeValue = t.replace(k, dict[k]);
      } else if (node.nodeType === 1) {
        if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return;
        ['placeholder', 'aria-label', 'title'].forEach(function (a) {
          var v = node.getAttribute && node.getAttribute(a);
          if (v && Object.prototype.hasOwnProperty.call(dict, v)) node.setAttribute(a, dict[v]);
        });
        for (var c = node.firstChild; c; c = c.nextSibling) fix(c);
      }
    }
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var r = records[i];
        if (r.type === 'characterData') fix(r.target);
        else for (var j = 0; j < r.addedNodes.length; j++) fix(r.addedNodes[j]);
      }
    }).observe(document.documentElement, { childList: true, characterData: true, subtree: true });
  }

  watchScriptText();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupPicker);
  else setupPicker();
})();
