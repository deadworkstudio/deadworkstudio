// Concept 03 — Cinematic Manifesto
// 1. Scenes reveal once as they enter (adds .is-in; CSS owns the motion).
// 2. The title film plays only while on screen; under reduced motion it never plays (poster only).
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ---- scene reveals ----
  var scenes = document.querySelectorAll('[data-cm-scene]');
  if (!('IntersectionObserver' in window) || reduce.matches) {
    scenes.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealIO.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    scenes.forEach(function (el) { revealIO.observe(el); });
  }

  // ---- title film: play only while visible ----
  var film = document.querySelector('[data-cm-film]');
  if (!film || reduce.matches || !('IntersectionObserver' in window)) return;
  film.preload = 'auto';
  var filmIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      filmOnScreen = entry.isIntersecting;
      if (entry.isIntersecting && !document.hidden) {
        var p = film.play();
        if (p && p.catch) p.catch(function () { /* autoplay refused: the poster stays */ });
      } else {
        film.pause();
      }
    });
  }, { threshold: 0.1 });
  filmIO.observe(film);
  var filmOnScreen = false;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) film.pause();
    else if (filmOnScreen) { var p = film.play(); if (p && p.catch) p.catch(function () {}); }
  });
  reduce.addEventListener && reduce.addEventListener('change', function (e) { if (e.matches) { film.pause(); filmIO.disconnect(); } });
})();
