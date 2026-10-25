// Shared frame behaviour (from ss-page.js): header visible at load, hides on a deliberate
// scroll down, returns on scroll up; dropdown keeps it shown.
(function () {
  var sh = document.querySelector('[data-sh]');
  if (!sh) return;
  var lastY = window.scrollY, acc = 0, ticking = false, HIDE_AFTER = 120, THRESHOLD = 10;
  function apply() {
    var y = window.scrollY, dy = y - lastY; lastY = y; ticking = false;
    sh.classList.toggle('is-scrolled', y > 8);
    if (document.querySelector('.mega-menu.is-open')) return;
    if (y <= HIDE_AFTER) { sh.classList.remove('is-hidden'); acc = 0; return; }
    if (dy > 0) { acc = Math.max(acc, 0) + dy; if (acc > THRESHOLD) sh.classList.add('is-hidden'); }
    else if (dy < 0) { acc = Math.min(acc, 0) + dy; if (-acc > THRESHOLD) sh.classList.remove('is-hidden'); }
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(apply); } }, { passive: true });
  sh.addEventListener('focusin', function () { sh.classList.remove('is-hidden'); });
  apply();
})();
