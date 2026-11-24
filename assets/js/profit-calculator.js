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

  var sent = false; // one 'completed a calculation' count per page load
  function calc() {
    var yearly = $('pc-per-y').checked, dlIn = num(f.dl), dl = dlIn === null ? null : (yearly ? dlIn / 12 : dlIn);
    var clips = num(f.clips), roy = num(f.roy), cost = num(f.cost) || 0, arch = num(f.arch), perf = (num(f.perf) || 100) / 100;
    $('pc-perf-v').textContent = Math.round(perf * 100) + '%';
    var ready = clips && dl !== null && roy !== null;
    $('pc-out').hidden = !ready;
    $('pc-empty').hidden = !!ready;
    if (!ready) return;

    var month = dl * roy;
    var perClip = month / clips;
    var dlPerClip = dl / clips;
    var cell = function (v, label) { return '<div><b>' + v + '</b><span>' + label + '</span></div>'; };
    $('pc-now').innerHTML =
      '<p class="pc-now-h">Monthly</p>' +
      cell(money(month - cost), cost ? 'after ' + usd(cost) + ' in costs' : 'from ' + int(clips) + ' clips') +
      cell(usd(perClip, true), 'per clip') +
      cell(dlPerClip.toFixed(dlPerClip < 1 ? 2 : 1), 'downloads per clip') +
      '<p class="pc-now-h">Annual</p>' +
      cell(money((month - cost) * 12), cost ? 'after ' + usd(cost * 12) + ' in costs' : 'from ' + int(clips) + ' clips') +
      cell(usd(perClip * 12, true), 'per clip') +
      cell((dlPerClip * 12).toFixed(dlPerClip * 12 < 1 ? 2 : 1), 'downloads per clip');

    var adds = [100, 250, 500, 1000];
    if (arch && adds.indexOf(arch) === -1) adds.push(arch);
    adds.sort(function (a, b) { return a - b; });
    $('pc-rows').innerHTML = adds.map(function (n) {
      var extra = n * perClip * perf;
      var m = month + extra;
      var mine = arch && n === arch;
      return '<tr' + (mine ? ' class="pc-mine"' : '') + '><td>+' + int(n) + (mine ? ' <em>your archive</em>' : '') + '</td>' +
        '<td>' + int(clips + n) + '</td><td>' + money(m - cost) + '</td><td>' + money((m - cost) * 12) + '</td><td>+' + money(extra) + '</td><td>+' + money(extra * 12) + '</td></tr>';
    }).join('');
    // Every number above, worked out in words from what was typed.
    $('pc-math').innerHTML =
      (yearly ? '<li>' + int(dlIn) + ' downloads a year &divide; 12 = <b>' + int(dl) + '</b> a month</li>' : '') +
      '<li>' + int(dl) + ' downloads &times; ' + usd(roy, true) + ' = <b>' + money(month) + '</b> a month</li>' +
      '<li>' + money(month) + ' &times; 12 = <b>' + money(month * 12) + '</b> a year</li>' +
      '<li>' + money(month) + ' &divide; ' + int(clips) + ' clips = <b>' + usd(perClip, true) + '</b> per clip, per month</li>' +
      '<li>Added clips &times; ' + usd(perClip, true) + (perf === 1 ? '' : ' &times; ' + Math.round(perf * 100) + '%') + ' = what they add each month</li>' +
      (cost ? '<li>Each month total minus ' + usd(cost) + ' in costs</li>' : '');
    if (!sent) { sent = true; window.dwEvent ? window.dwEvent('tool-calc-done') : (window.dwQueue = window.dwQueue || []).push('tool-calc-done'); }
    $('pc-perf-note').textContent = perf === 1
      ? 'Assumes new clips sell like your current clips do, on average.'
      : 'Assumes new clips sell at ' + Math.round(perf * 100) + '% of your current average per clip.';

    // The practical next step: the archive, and the time it takes to get it online.
    var n = arch || 500;
    $('pc-next-n').textContent = int(n) + (arch ? ' clips in your archive' : ' clips, for example');
    $('pc-next-hand').textContent = hours(n * 2);
  }

  Object.keys(f).forEach(function (k) { if (f[k]) f[k].addEventListener('input', calc); });
  ['pc-per-m', 'pc-per-y'].forEach(function (id) { $(id).addEventListener('change', calc); });

  Array.prototype.forEach.call(document.querySelectorAll('#calculator a[data-cta]'), function (a) {
    a.addEventListener('click', function () { if (window.dwEvent) window.dwEvent('tool-calc-cta'); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('.pc-use'), function (b) {
    b.addEventListener('click', function () { f.roy.value = b.getAttribute('data-roy'); calc(); f.roy.focus(); });
  });
  $('pc-clear').addEventListener('click', function () {
    ['clips', 'dl', 'roy', 'cost', 'arch'].forEach(function (k) { f[k].value = ''; });
    f.perf.value = '100'; calc(); f.clips.focus();
  });
  calc();
})();
