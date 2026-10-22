// DEADWORK site — shared on every page. Drives the "Menu" trigger in .poster-head that opens
// the .poster-index tools/studio nav as a dropdown overlay (replaces the old permanent sidebar).
// Closes on: toggle click, outside click, Escape, or clicking any link inside the dropdown
// (including the home page's panel-swap words — this runs independently of assets/js/home.js,
// so it closes the dropdown regardless of whether the click also swaps a panel in place or
// triggers a real page navigation).
(function () {
  var trigger = document.querySelector('[data-nav-trigger]');
  var nav = document.querySelector('[data-index]');
  if (!trigger || !nav) return;
  var label = trigger.querySelector('[data-nav-trigger-label]');

  function isOpen() {
    return trigger.getAttribute('aria-expanded') === 'true';
  }

  function open() {
    trigger.setAttribute('aria-expanded', 'true');
    nav.classList.add('is-open');
    if (label) label.textContent = 'Close';
  }

  function close(returnFocus) {
    if (!isOpen()) return;
    trigger.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
    if (label) label.textContent = 'Menu';
    if (returnFocus) trigger.focus();
  }

  trigger.addEventListener('click', function () {
    if (isOpen()) close(false);
    else open();
  });

  // Outside click: anything that isn't the trigger itself and isn't inside the open nav.
  document.addEventListener('click', function (e) {
    if (!isOpen()) return;
    if (nav.contains(e.target) || trigger.contains(e.target)) return;
    close(false);
  });

  // Any link inside the dropdown closes it — before navigation happens for a real link, and
  // alongside whatever other click handler (e.g. home.js's panel swap) also fires on it.
  nav.addEventListener('click', function (e) {
    var link = e.target.closest('a');
    if (link) close(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) close(true);
  });

  // Resize past/under a breakpoint shouldn't strand the dropdown open with stale layout.
  window.addEventListener('resize', function () {
    if (isOpen()) close(false);
  });
})();
