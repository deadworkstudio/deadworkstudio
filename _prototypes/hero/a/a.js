// Prototype A: pick the landscape or portrait encode once, then fade the video in only after it is
// really playing (the poster stays underneath until then). Reduced-motion users get the still only.
(function () {
  var v = document.querySelector('.hero-video');
  if (!v || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var portrait = matchMedia('(max-width: 719px) and (orientation: portrait)').matches;
  v.src = portrait ? v.dataset.srcPortrait : v.dataset.srcLandscape;
  v.addEventListener('playing', function () { v.classList.add('is-playing'); }, { once: true });
  var p = v.play();
  if (p && p.catch) p.catch(function () { /* autoplay blocked: poster remains, which is fine */ });
})();
