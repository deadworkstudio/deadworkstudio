/* Free camera gear checklist maker. Runs in the browser only; nothing is sent anywhere.
   Pick a shoot type, set counts, untick what you don't bring, add your own items,
   then print it or download it as a CSV. */
(function () {
  var root = document.getElementById('gear-list-maker');
  if (!root) return;

  // [name, count, shoot types it belongs to]. n = narrative/commercial, d = documentary,
  // i = interview, w = wedding/event, r = run and gun. Count 0 = "per camera" items, filled from cameras x perCam.
  var KITS = [
    ['Camera', [
      ['Camera body', 'cam', 'ndiwr'], ['Body cap', 'cam', 'ndiwr'], ['Top handle', 'cam', 'ndiw'],
      ['Cage or rig plate', 'cam', 'ndi'], ['Quick release plate', 'cam', 'ndiwr'], ['Follow focus', 1, 'n'],
      ['Matte box or lens hood', 'cam', 'nd'], ['Shoulder rig or baseplate', 1, 'nd'], ['Spare body', 1, 'w']
    ]],
    ['Lenses and filters', [
      ['Wide lens', 1, 'ndiwr'], ['Standard lens', 1, 'ndiwr'], ['Tele lens', 1, 'ndiw'], ['Spare lens caps', 2, 'ndiwr'],
      ['ND filter or variable ND', 1, 'ndiwr'], ['Polarizer', 1, 'nd'], ['Diffusion filter', 1, 'niw'],
      ['Lens cloth and blower', 1, 'ndiwr']
    ]],
    ['Power', [
      ['Camera batteries', 'bat', 'ndiwr'], ['Battery charger', 'cam', 'ndiwr'], ['Monitor batteries', 2, 'ndi'],
      ['AA batteries', 8, 'ndiwr'], ['D-tap or USB power cables', 2, 'nd'], ['Power strip', 1, 'ndiw'],
      ['Extension cord', 1, 'ndiw'], ['Power bank', 1, 'dwr']
    ]],
    ['Media and data', [
      ['Media cards', 'card', 'ndiwr'], ['Card reader', 1, 'ndiwr'], ['Backup drives', 2, 'ndiw'],
      ['Laptop and charger', 1, 'ndw'], ['Card wallet', 1, 'ndiwr']
    ]],
    ['Monitoring', [
      ['On-camera monitor', 'cam', 'ndi'], ['Monitor sunhood', 'cam', 'nd'], ["Director's monitor and stand", 1, 'n'],
      ['Wireless video transmitter and receiver', 1, 'n'], ['SDI or HDMI cables', 4, 'ndi'], ['Articulating arms', 2, 'ndi']
    ]],
    ['Support', [
      ['Tripod and head', 'cam', 'ndiw'], ['Gimbal', 1, 'nwr'], ['Slider', 1, 'ni'], ['Monopod', 1, 'dwr'],
      ['Apple boxes', 4, 'n'], ['Sandbags', 4, 'ni']
    ]],
    ['Sound', [
      ['Recorder', 1, 'ndiw'], ['Shotgun mic and shock mount', 1, 'ndiwr'], ['Windscreen and furry', 1, 'ndiwr'],
      ['Boom pole', 1, 'ndi'], ['Wireless lav kits', 2, 'ndiw'], ['Lav mounts and tape', 1, 'ndiw'],
      ['XLR cables', 3, 'ndiw'], ['Headphones', 1, 'ndiwr'], ['Slate or timecode box', 1, 'n']
    ]],
    ['Grip and lighting', [
      ['Key light and power supply', 1, 'ndiw'], ['Fill or second light', 1, 'niw'], ['Small LED panel', 1, 'dwr'],
      ['Light stands', 3, 'ndiw'], ['C-stands', 2, 'n'], ['Softbox or diffusion', 2, 'ni'],
      ['Reflector or bounce', 1, 'ndiw'], ['Clamps', 4, 'ni'], ['Flash and triggers', 2, 'w']
    ]],
    ['Tools and small things', [
      ['Hex keys and small screwdrivers', 1, 'ndiwr'], ['Multitool', 1, 'ndiwr'], ['Head torch or flashlight', 1, 'ndiwr'],
      ['Gaffer tape', 1, 'ndiwr'], ['Camera tape and markers', 1, 'ndiw'], ['Rain cover', 'cam', 'ndwr'],
      ['Gloves', 1, 'ndi'], ['Release forms', 1, 'di'], ['Shot list or call sheet', 1, 'ndiw']
    ]]
  ];
  var TYPES = { n: 'Narrative or commercial', d: 'Documentary', i: 'Interview', w: 'Wedding or event', r: 'Run and gun' };

  var $ = function (id) { return document.getElementById(id); };
  var listEl = $('gl-list'), state = null;
  var STORE = 'dw-gear-list-v1';

  function counts() {
    var cams = Math.max(1, Math.min(6, parseInt($('gl-cams').value, 10) || 1));
    var days = Math.max(1, Math.min(30, parseInt($('gl-days').value, 10) || 1));
    return { cam: cams, bat: cams * (days > 1 ? 4 : 3), card: cams * (days > 1 ? 4 : 2) };
  }

  function fresh(type) {
    var c = counts();
    return KITS.map(function (k) {
      return {
        kit: k[0],
        items: k[1].filter(function (it) { return it[2].indexOf(type) > -1; }).map(function (it) {
          return { name: it[0], n: typeof it[1] === 'number' ? it[1] : c[it[1]], on: true };
        })
      };
    });
  }

  function save() {
    try { localStorage.setItem(STORE, JSON.stringify({ type: $('gl-type').value, cams: $('gl-cams').value, days: $('gl-days').value, list: state })); } catch (e) {}
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function render() {
    var total = 0, pieces = 0;
    listEl.innerHTML = state.map(function (k, ki) {
      var rows = k.items.map(function (it, ii) {
        if (it.on) { total++; pieces += it.n; }
        return '<li class="gl-item' + (it.on ? '' : ' gl-off') + '">' +
          '<label><input type="checkbox" data-k="' + ki + '" data-i="' + ii + '"' + (it.on ? ' checked' : '') + ' /> <span>' + esc(it.name) + '</span></label>' +
          '<input class="gl-n" type="number" min="1" max="99" inputmode="numeric" value="' + it.n + '" data-k="' + ki + '" data-i="' + ii + '" aria-label="How many: ' + esc(it.name) + '" />' +
          '</li>';
      }).join('');
      var any = k.items.some(function (it) { return it.on; });
      return '<section class="gl-kit' + (any ? '' : ' gl-empty') + '"><h3>' + esc(k.kit) + '</h3><ul>' + rows + '</ul>' +
        '<form class="gl-add" data-k="' + ki + '"><input type="text" maxlength="60" placeholder="Add an item" aria-label="Add an item to ' + esc(k.kit) + '" /><button type="submit" class="tc-btn tc-btn--ghost">Add</button></form></section>';
    }).join('');
    $('gl-total').textContent = total + ' items · ' + pieces + ' pieces';
    save();
  }

  var built = '';
  function key() { return [$('gl-type').value, counts().cam, $('gl-days').value].join('|'); }
  // Only rebuild when the settings really changed, so a late "change" after typing never wipes added items.
  function build(force) {
    if (force !== true && key() === built) return;
    built = key(); state = fresh($('gl-type').value); render();
  }

  listEl.addEventListener('change', function (e) {
    var t = e.target, it = state[t.dataset.k] && state[t.dataset.k].items[t.dataset.i];
    if (!it) return;
    if (t.type === 'checkbox') it.on = t.checked;
    else it.n = Math.max(1, Math.min(99, parseInt(t.value, 10) || 1));
    render();
  });
  listEl.addEventListener('submit', function (e) {
    e.preventDefault();
    var inp = e.target.querySelector('input'), name = inp.value.trim();
    if (!name) return;
    state[e.target.dataset.k].items.push({ name: name, n: 1, on: true });
    render();
    var again = listEl.querySelector('.gl-add[data-k="' + e.target.dataset.k + '"] input');
    if (again) again.focus();
  });
  ['gl-type', 'gl-cams', 'gl-days'].forEach(function (id) { $(id).addEventListener('change', build); });
  ['gl-cams', 'gl-days'].forEach(function (id) { $(id).addEventListener('input', function () { if ($(id).value) build(); }); });

  function rowsOut() {
    var out = [];
    state.forEach(function (k) { k.items.forEach(function (it) { if (it.on) out.push([k.kit, it.name, it.n]); }); });
    return out;
  }
  $('gl-csv').addEventListener('click', function () {
    var q = function (s) { return '"' + String(s).replace(/"/g, '""') + '"'; };
    var csv = 'Kit,Item,Count,Packed,Back at wrap\n' + rowsOut().map(function (r) { return [q(r[0]), q(r[1]), r[2], '', ''].join(','); }).join('\n') + '\n';
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'camera-gear-checklist.csv';
    document.body.appendChild(a); a.click(); a.remove();
  });
  $('gl-print').addEventListener('click', function () {
    $('gl-print-title').textContent = 'Camera gear checklist · ' + TYPES[$('gl-type').value] + ' · Boxes: packed, back at wrap';
    window.print();
  });
  $('gl-reset').addEventListener('click', function () { build(true); });

  try {
    var saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (saved && saved.list && TYPES[saved.type]) {
      $('gl-type').value = saved.type; $('gl-cams').value = saved.cams; $('gl-days').value = saved.days;
      state = saved.list; built = key(); render(); return;
    }
  } catch (e) {}
  build(true);
})();
