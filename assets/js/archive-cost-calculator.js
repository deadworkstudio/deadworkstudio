/* Free footage archive cost calculator (guides/footage-archive-cost-calculator/).
   Hard drives vs LTO tape vs cloud over the years you choose, including replacing drives and
   moving to new tape. Drive and tape prices are the visitor's own; cloud prices are the vendors'
   published list prices (editable). Runs in the page only. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  if (!$('ac-tb')) return;
  var IDS = ['ac-tb', 'ac-grow', 'ac-years', 'ac-copies', 'ac-hd-price', 'ac-hd-size', 'ac-hd-life', 'ac-lto-gen', 'ac-lto-drive', 'ac-lto-tape', 'ac-lto-move', 'ac-b2', 'ac-wasabi', 'ac-own'];
  var num = function (id) { var v = parseFloat(String($(id).value).replace(/[$,\s]/g, '')); return isFinite(v) && v >= 0 ? v : null; };
  var usd = function (n) { return '$' + Math.round(n).toLocaleString('en-US'); };
  var tb = function (n) { return (Math.round(n * 10) / 10).toLocaleString('en-US') + ' TB'; };

  // Data stored during year y (1-based): starts at now + grow*(y-1), ends at now + grow*y.
  function plan(now, grow, years) {
    var out = [];
    for (var y = 1; y <= years; y++) out.push({ start: now + grow * (y - 1), end: now + grow * y });
    return out;
  }

  function drives(p, copies, price, size, life) {
    if (!price || !size) return null;
    var total = 0, owned = 0, buys = 0, lastSwap = 0;
    p.forEach(function (yr, i) {
      var need = Math.ceil(yr.end * copies / size);
      if (life && i > 0 && i - lastSwap >= life) { // replace every drive, copying everything across
        total += need * price; buys += need; owned = need; lastSwap = i;
      } else if (need > owned) { total += (need - owned) * price; buys += need - owned; owned = need; }
    });
    return { total: total, note: buys + ' drives bought over the years' + (life ? ', all replaced every ' + life + ' years' : '') };
  }

  function tape(p, copies, cap, drivePrice, tapePrice, move) {
    if (!drivePrice || !tapePrice) return null;
    var total = drivePrice, owned = 0, tapes = 0, moves = 0, last = 0;
    p.forEach(function (yr, i) {
      var need = Math.ceil(yr.end * copies / cap);
      if (move && i > 0 && i - last >= move) { // new drive generation: new drive, copy every tape
        total += drivePrice + need * tapePrice; tapes += need; owned = need; last = i; moves++;
      } else if (need > owned) { total += (need - owned) * tapePrice; tapes += need - owned; owned = need; }
    });
    return { total: total, note: '1 drive, ' + tapes + ' tapes' + (moves ? ', moved to new tape ' + moves + (moves === 1 ? ' time' : ' times') : '') };
  }

  function cloud(p, perTbMonth, minTb) {
    if (!perTbMonth) return null;
    var total = 0;
    p.forEach(function (yr) { total += Math.max((yr.start + yr.end) / 2, minTb || 0) * perTbMonth * 12; });
    return { total: total, note: 'One copy, billed monthly on what is stored' };
  }

  var sent = false;
  function calc() {
    var now = num('ac-tb'), grow = num('ac-grow') || 0, years = Math.min(Math.max(Math.round(num('ac-years') || 10), 1), 30);
    var copies = Math.max(1, Math.round(num('ac-copies') || 1));
    $('ac-years-v').textContent = years + (years === 1 ? ' YEAR' : ' YEARS');
    var ready = now > 0;
    $('ac-out').hidden = !ready; $('ac-empty').hidden = ready;
    if (!ready) return;
    var p = plan(now, grow, years), cap = parseFloat($('ac-lto-gen').value);
    var genName = $('ac-lto-gen').options[$('ac-lto-gen').selectedIndex].text;
    var rows = [
      ['Hard drives', copies + (copies === 1 ? ' copy' : ' copies'), drives(p, copies, num('ac-hd-price'), num('ac-hd-size'), Math.round(num('ac-hd-life') || 0)), 'Enter a drive price and size above.'],
      ['LTO tape, ' + genName, copies + (copies === 1 ? ' copy' : ' copies'), tape(p, copies, cap, num('ac-lto-drive'), num('ac-lto-tape'), Math.round(num('ac-lto-move') || 0)), 'Enter a tape drive and cartridge price above.'],
      ['Backblaze B2', 'cloud', cloud(p, num('ac-b2'), 0), ''],
      ['Wasabi', 'cloud', cloud(p, num('ac-wasabi'), 1), ''],
      ['Your cloud', 'cloud', cloud(p, num('ac-own'), 0), 'Optional: enter any other price per TB a month.']
    ];
    var max = Math.max.apply(null, rows.map(function (r) { return r[2] ? r[2].total : 0; })) || 1;
    var endTb = p[p.length - 1].end;
    var tbYears = p.reduce(function (sum, yr) { return sum + (yr.start + yr.end) / 2; }, 0); // average TB stored, summed over the years
    $('ac-head').innerHTML = '<div><b>' + tb(now) + '</b><span>now</span></div><div><b>' + tb(endTb) + '</b><span>after ' + years + (years === 1 ? ' year' : ' years') + '</span></div><div><b>' + years + '</b><span>' + (years === 1 ? 'year' : 'years') + ' compared</span></div>';
    $('ac-rows').innerHTML = rows.map(function (r) {
      if (!r[2]) return r[3] ? '<li class="ac-row ac-off"><div class="ac-name"><b>' + r[0] + '</b><span>' + r[3] + '</span></div></li>' : '';
      var t = r[2].total;
      return '<li class="ac-row"><div class="ac-name"><b>' + r[0] + '</b><span>' + r[2].note + '</span></div>' +
        '<div class="ac-bar"><i style="width:' + Math.max(2, t / max * 100).toFixed(1) + '%"></i></div>' +
        '<div class="ac-num"><b>' + usd(t) + '</b><span>' + usd(t / years) + ' a year &middot; ' + usd(t / Math.max(tbYears, 0.1)) + ' per TB stored a year</span></div></li>';
    }).join('');
    $('ac-math').innerHTML =
      '<li>Footage grows from ' + tb(now) + ' by ' + tb(grow) + ' a year, to ' + tb(endTb) + '.</li>' +
      '<li>Drives and tape: enough to hold every copy, bought as the footage grows. Replacing drives or moving to new tape means buying enough for everything again.</li>' +
      '<li>Cloud: price per TB a month &times; the average stored that year &times; 12. Wasabi bills at least 1 TB and keeps files at least 90 days.</li>' +
      '<li>Not counted: power, shelves, your time copying, or downloading everything back out.</li>';
    if (!sent) { sent = true; window.dwEvent ? window.dwEvent('tool-archive-done') : (window.dwQueue = window.dwQueue || []).push('tool-archive-done'); }
  }

  var timer;
  IDS.forEach(function (id) { var el = $(id); if (el) el.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(calc, 120); }); });
  $('ac-lto-gen').addEventListener('change', calc);
  $('ac-clear').addEventListener('click', function () {
    ['ac-tb', 'ac-grow', 'ac-hd-price', 'ac-hd-size', 'ac-lto-drive', 'ac-lto-tape', 'ac-own'].forEach(function (id) { $(id).value = ''; });
    calc(); $('ac-tb').focus();
  });
  Array.prototype.forEach.call(document.querySelectorAll('#archive-calc a[data-cta]'), function (a) {
    a.addEventListener('click', function () { if (window.dwEvent) window.dwEvent('tool-archive-cta'); });
  });
  calc();
})();
