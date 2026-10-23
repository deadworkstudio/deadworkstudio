// Stock Shredder preview page only. One job: reveal the showcase frame with the "film-gate" mask
// once, the first time it scrolls into view, then stop watching. This has to be JS (not a pure
// CSS scroll-driven animation) because a scroll-timeline animation is tied continuously to scroll
// position — it would replay/reverse every time the section crosses the viewport edge, not play
// once and stay revealed the way a one-time reveal should.
//
// Safety: the "start clipped" CSS rule in preview.css is gated behind html.preview-js-ready,
// which this script sets right before it starts observing. If this file fails to load, or
// IntersectionObserver isn't available, the frame is simply visible the whole time — never
// stuck invisible.
(function () {
  var frame = document.querySelector('[data-preview-reveal]');
  if (!frame) return;

  document.documentElement.classList.add('preview-js-ready');

  if (!('IntersectionObserver' in window)) {
    frame.classList.add('is-revealed');
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      frame.classList.add('is-revealed');
      observer.disconnect();
    });
  }, { threshold: 0.3 });

  observer.observe(frame);
})();
