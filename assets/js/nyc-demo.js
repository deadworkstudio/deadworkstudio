// "Watch it shred" on real NYC footage: the raw/graded compare slider, and the cut bars growing in
// the first time they are seen. Videos use the page's own [data-film] play-while-on-screen code.
(function () {
  document.querySelectorAll('[data-nyc-compare]').forEach(function (box) {
    var range = box.querySelector('input[type=range]');
    if (!range) return;
    var set = function (v) { box.style.setProperty('--pos', v + '%'); };
    range.addEventListener('input', function () { set(range.value); });
    set(range.value);
  });
  var takes = document.querySelector('[data-nyc-takes]');
  if (takes) {
    if (!('IntersectionObserver' in window)) { takes.classList.add('is-seen'); return; }
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { takes.classList.add('is-seen'); io.disconnect(); }
    }, { threshold: 0.35 });
    io.observe(takes);
  }
})();
