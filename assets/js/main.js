// DEADWORK site — shared, dependency-free behavior for every page:
// 1) toggles the sticky header from transparent to solid ink after a small scroll
// 2) opens/closes the full-screen mobile nav overlay (with focus handling for keyboard users)
// 3) in the fixed "poster" layout, the content panel is the only scrollable element — forwards
//    the mouse wheel to it even when the cursor is over the nav or background, not just the panel
(function () {
  var header = document.querySelector('[data-header]');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  var toggle = document.querySelector('[data-nav-toggle]');
  var overlay = document.querySelector('[data-nav-overlay]');
  if (toggle && overlay) {
    var links = overlay.querySelectorAll('a');
    var isOpen = function () {
      return toggle.getAttribute('aria-expanded') === 'true';
    };
    var closeNav = function (returnFocus) {
      if (!isOpen()) return;
      toggle.setAttribute('aria-expanded', 'false');
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
      if (returnFocus) toggle.focus();
    };
    var openNav = function () {
      toggle.setAttribute('aria-expanded', 'true');
      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      if (links.length) links[0].focus();
    };

    toggle.addEventListener('click', function () {
      if (isOpen()) closeNav(false);
      else openNav();
    });
    Array.prototype.forEach.call(links, function (a) {
      a.addEventListener('click', function () { closeNav(false); });
    });

    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') {
        closeNav(true);
        return;
      }
      // Keep Tab inside the open menu (toggle + its links) — everything behind it is covered.
      if (e.key === 'Tab') {
        var items = [toggle].concat(Array.prototype.slice.call(links));
        var first = items[0];
        var last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    // The overlay is hidden by CSS at >=640px. If the viewport grows past that while the menu is
    // open (rotate a tablet, resize a window), reset state so page scroll isn't left locked.
    var desktop = window.matchMedia('(min-width: 640px)');
    var onBreakpoint = function (mq) {
      if (mq.matches) closeNav(false);
    };
    if (desktop.addEventListener) desktop.addEventListener('change', onBreakpoint);
    else if (desktop.addListener) desktop.addListener(onBreakpoint);
  }

  var panel = document.querySelector('.poster-panel');
  if (panel) {
    var fixedLayout = window.matchMedia('(min-width: 720px) and (min-height: 640px)');
    document.addEventListener('wheel', function (e) {
      if (!fixedLayout.matches) return;
      if (panel.contains(e.target)) return; // cursor's already over the box — let it scroll natively
      if (panel.scrollHeight <= panel.clientHeight) return; // nothing to scroll
      panel.scrollTop += e.deltaY;
      e.preventDefault();
    }, { passive: false });
  }

  var faqItems = document.querySelectorAll('.faq-item');
  if (faqItems.length) {
    faqItems.forEach(function (item) {
      var button = item.querySelector('.faq-question');
      var icon = item.querySelector('.faq-icon');
      button.addEventListener('click', function () {
        var nowOpen = !item.classList.contains('open');
        faqItems.forEach(function (other) {
          other.classList.remove('open');
          other.querySelector('.faq-icon').textContent = '+';
        });
        if (nowOpen) {
          item.classList.add('open');
          icon.textContent = '−';
        }
      });
    });
  }

  // Surface any copy still awaiting the owner's sign-off in the local dev console only —
  // never in front of a real site visitor.
  if (/^(localhost|127\.0\.0\.1|)$/.test(location.hostname)) {
    var pending = document.querySelectorAll('[data-owner-review]');
    if (pending.length) {
      console.info('[DEADWORK] ' + pending.length + ' item(s) awaiting owner review:',
        Array.prototype.map.call(pending, function (el) { return el.getAttribute('data-owner-review'); }));
    }
  }

  // ---- support chat: loads after the first scroll, tap or key press, never on page load ----
  // Same approach as the Stock Shredder product page (ss-page.js) — every page that loads this
  // file and has a [data-chat-widget] marker opts in, instead of each page pasting its own
  // Tawk.to snippet (which ran immediately on load, before anyone had asked for it). Launcher
  // position/visibility is unchanged — same customStyle values the old inline snippets used.
  if (document.querySelector('[data-chat-widget]') && location.protocol !== 'file:') {
    var chatLoaded = false;
    var loadChat = function () {
      if (chatLoaded) return; chatLoaded = true;
      ['scroll', 'pointerdown', 'keydown'].forEach(function (ev) { window.removeEventListener(ev, loadChat); });
      window.Tawk_API = window.Tawk_API || {}; window.Tawk_LoadStart = new Date();
      window.Tawk_API.customStyle = { visibility: { desktop: { position: 'br', xOffset: 20, yOffset: 50 }, mobile: { position: 'br', xOffset: 10, yOffset: 50 } } };
      var s = document.createElement('script');
      s.async = true; s.src = 'https://embed.tawk.to/6abff587e0dd3b34c4626702/1k3ute618'; s.charset = 'UTF-8'; s.setAttribute('crossorigin', '*');
      document.body.appendChild(s);
    };
    ['scroll', 'pointerdown', 'keydown'].forEach(function (ev) { window.addEventListener(ev, loadChat, { passive: true, once: true }); });
  }
})();
