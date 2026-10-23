// Prototype C: a 4% drift on the plate photo as the page scrolls. Nothing else moves.
(function () {
  var img = document.querySelector('[data-parallax]');
  if (!img || matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(max-width: 719px)').matches) return;
  var ticking = false;
  function update() {
    var y = window.scrollY || 0;
    var h = window.innerHeight || 1;
    var p = Math.max(0, Math.min(1, y / h));
    img.style.transform = 'translateY(' + (p * -4).toFixed(2) + '%)';
    ticking = false;
  }
  img.addEventListener('animationend', function () {
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  }, { once: true });
})();
