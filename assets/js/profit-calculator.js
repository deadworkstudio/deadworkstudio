/* Free stock footage profit calculator (guides/stock-footage-profit-calculator/).
   Arithmetic on the visitor's own numbers only. No benchmarks, no forecasts.
   Everything runs in the page. Nothing typed here is sent anywhere. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var f = { clips: $('pc-clips'), dl: $('pc-dl'), roy: $('pc-roy'), cost: $('pc-cost'), arch: $('pc-arch'), perf: $('pc-perf') };
  if (!f.clips) return;

  var usd = function (n, cents) {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
  };
  var money = function (n) { return (n < 0 ? '-' : '') + usd(Math.abs(n), Math.abs(n) < 1000); };
  var num = function (el) {
    var v = parseFloat(String(el.value).replace(/[$,\s]/g, ''));
    return isFinite(v) && v >= 0 ? v : null;
  };
  var int = function (n) { return Math.round(n).toLocaleString('en-US'); };
  var hours = function (min) {
    var h = Math.floor(min / 60), m = Math.round(min % 60);
    return h ? h + ' hr' + (m ? ' ' + m + ' min' : '') : m + ' min';
  };

  function calc() {
    var clips = num(f.clips), dl = num(f.dl), roy = num(f.roy), cost = num(f.cost) || 0, arch = num(f.arch), perf = (num(f.perf) || 100) / 100;
    $('pc-perf-v').textContent = Math.round(perf * 100) + '%';
    var ready = clips && dl !== null && roy !== null;
    $('pc-out').hidden = !ready;
    $('pc-empty').hidden = !!ready;
    if (!ready) return;

    var month = dl * roy;
    var perClip = month / clips;
    var dlPerClip = dl / clips;
    $('pc-now').innerHTML =
      '<div><b>' + money(month) + '</b><span>a month from ' + int(clips) + ' clips</span></div>' +
      '<div><b>' + money(month * 12) + '</b><span>a year at this pace</span></div>' +
      '<div><b>' + usd(perClip, true) + '</b><span>per clip, per month</span></div>' +
      '<div><b>' + dlPerClip.toFixed(dlPerClip < 1 ? 2 : 1) + '</b><span>downloads per clip, per month</span></div>' +
      (cost ? '<div><b>' + money(month - cost) + '</b><span>a month after ' + usd(cost) + ' in costs</span></div>' : '');

    var adds = [100, 250, 500, 1000];
    if (arch && adds.indexOf(arch) === -1) adds.push(arch);
    adds.sort(function (a, b) { return a - b; });
    $('pc-rows').innerHTML = adds.map(function (n) {
      var extra = n * perClip * perf;
      var m = month + extra;
      var mine = arch && n === arch;
      return '<tr' + (mine ? ' class="pc-mine"' : '') + '><td>+' + int(n) + (mine ? ' <em>your archive</em>' : '') + '</td>' +
        '<td>' + int(clips + n) + '</td><td>' + money(m - cost) + '</td><td>' + money((m - cost) * 12) + '</td><td>+' + money(extra) + '</td></tr>';
    }).join('');
    $('pc-perf-note').textContent = perf === 1
      ? 'Assumes new clips sell like your current clips do, on average.'
      : 'Assumes new clips sell at ' + Math.round(perf * 100) + '% of your current average per clip.';

    // The practical next step: the archive, and the time it takes to get it online.
    var n = arch || 500;
    $('pc-next-n').textContent = int(n) + (arch ? ' clips in your archive' : ' clips, for example');
    $('pc-next-hand').textContent = hours(n * 2);
    $('pc-next-add').textContent = '+' + money(n * perClip * perf) + ' a month';
  }

  Object.keys(f).forEach(function (k) { if (f[k]) f[k].addEventListener('input', calc); });

  $('pc-sample').addEventListener('click', function () {
    f.clips.value = '300'; f.dl.value = '20'; f.roy.value = '2.50'; f.cost.value = '0'; f.arch.value = '800'; f.perf.value = '100';
    calc();
  });
  $('pc-clear').addEventListener('click', function () {
    ['clips', 'dl', 'roy', 'cost', 'arch'].forEach(function (k) { f[k].value = ''; });
    f.perf.value = '100'; calc(); f.clips.focus();
  });
  calc();
})();
