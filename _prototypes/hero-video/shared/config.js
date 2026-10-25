// Stock Shredder hero — shared timing for all three prototypes. Edit here, every prototype follows.
// CHAOS → CLICK → SHRED → ORDER on one loop. Times are seconds on the hero's own timeline.
window.HERO_CONFIG = {
  duration: 12,              // one full loop
  clickAt: 4.0,              // the moment the shred begins (the physical click lands here)
  shredEnds: 6.4,            // the transformation has settled into order
  orderHoldUntil: 11.4,      // order holds, then the loop resets (last 0.6 s fades back to chaos)

  // The real mouse-click footage: LEXUS / Lexus LY650 / Footage / 3-6-19 Staged Engineers /
  // Computer Desk / A002_C012_0306SX (RED 6K). This copy is source frames 561–800; the finger
  // press is source frame 657, i.e. 4.004 s into this copy. To retime the click, change
  // clickFrameTime (where the press is inside click.mp4) — the engine keeps it on clickAt.
  click: {
    src: '../media/click.mp4',
    srcHd: '../media/click-hd.mp4',
    poster: '../media/click-poster.jpg',
    clickFrameTime: 4.004,
    sourceClip: 'A002_C012_0306SX',
    sourceFrame: 657
  },

  // B-roll from Daniel's own library (optimized 960x540 copies, 5 s each).
  broll: [
    { id: 'la-coast', label: 'Santa Monica, aerial' },
    { id: 'palms', label: 'Palm avenue, aerial' },
    { id: 'nyc', label: 'Lower Manhattan, aerial' },
    { id: 'sunrise', label: 'Sunrise, hills' },
    { id: 'waves', label: 'Surf, top-down' },
    { id: 'reel', label: 'Reel-to-reel deck' },
    { id: 'modular', label: 'Modular synth' },
    { id: 'mixing', label: 'Analog studio' },
    { id: 'typewriter', label: 'Typewriter' },
    { id: 'product', label: 'Product, macro' },
    { id: 'jars', label: 'Studio jars' },
    { id: 'engineer', label: 'Engineer, monitor' },
    { id: 'set-bts', label: 'On set' }
  ].map(function (c) { return Object.assign(c, { src: '../media/broll/' + c.id + '.mp4', poster: '../media/broll/' + c.id + '.jpg' }); })
};
