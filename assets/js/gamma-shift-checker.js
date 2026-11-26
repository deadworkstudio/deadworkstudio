/* Free video gamma shift checker (guides/video-gamma-shift-checker/).
   Reads the color tags a MOV or MP4 carries (colr box, or the H.264 stream's own color info) in the
   browser, without uploading or playing the file, and explains how players will treat them.
   Nothing leaves the visitor's computer. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var input = $('gs-file'), drop = $('gs-drop');
  if (!input) return;

  // ---- Reading the file header ----
  function bytes(file, off, len) { return file.slice(off, off + len).arrayBuffer().then(function (b) { return new DataView(b); }); }
  function fourcc(v, o) { return String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3)); }
  function u64(v, o) { return v.getUint32(o) * 4294967296 + v.getUint32(o + 4); }
  function topBoxes(file) {
    var found = {}, off = 0, guard = 0;
    function step() {
      if (off + 8 > file.size || guard++ > 400) return Promise.resolve(found);
      return bytes(file, off, 16).then(function (v) {
        var size = v.getUint32(0), type = fourcc(v, 4), head = 8;
        if (size === 1 && v.byteLength >= 16) { size = u64(v, 8); head = 16; } else if (size === 0) size = file.size - off;
        if (size < 8 || !/^[\x20-\x7e]{4}$/.test(type)) return found;
        if (!found[type]) found[type] = { off: off, size: size, head: head };
        off += size; return step();
      });
    }
    return step();
  }
  function kids(v, start, end, cb) {
    var o = start;
    while (o + 8 <= end) {
      var size = v.getUint32(o), type = fourcc(v, o + 4), head = 8;
      if (size === 1) { size = u64(v, o + 8); head = 16; } else if (size === 0) size = end - o;
      if (size < 8 || o + size > end) break;
      cb(type, o + head, o + size); o += size;
    }
  }
  function find(v, start, end, path) {
    var hit = null;
    kids(v, start, end, function (t, s, e) { if (!hit && t === path[0]) hit = path.length === 1 ? [s, e] : find(v, s, e, path.slice(1)); });
    return hit;
  }

  // H.264 keeps its color info in the stream's sequence header (SPS VUI), not always in a colr box.
  function spsColor(v, s, len) {
    var b = [];
    for (var i = 0; i < len; i++) { // drop emulation prevention bytes
      var x = v.getUint8(s + i);
      if (x === 3 && i >= 2 && b[b.length - 1] === 0 && b[b.length - 2] === 0) continue;
      b.push(x);
    }
    var pos = 8; // skip the NAL header byte
    var bit = function () { var r = (b[pos >> 3] >> (7 - (pos & 7))) & 1; pos++; return r; };
    var bits = function (n) { var r = 0; while (n--) r = r * 2 + bit(); return r; };
    var ue = function () { var z = 0; while (!bit() && z < 32) z++; return (Math.pow(2, z) - 1) + bits(z); };
    var se = function () { var k = ue(); return k & 1 ? (k + 1) / 2 : -k / 2; };
    var profile = bits(8); bits(16); ue();
    if ([100, 110, 122, 244, 44, 83, 86, 118, 128, 138, 139, 134, 135].indexOf(profile) !== -1) {
      var chroma = ue(); if (chroma === 3) bit();
      ue(); ue(); bit();
      if (bit()) for (var l = 0; l < (chroma === 3 ? 12 : 8); l++) if (bit()) {
        var last = 8, next = 8;
        for (var j = 0; j < (l < 6 ? 16 : 64); j++) { if (next) { next = (last + se() + 256) % 256; } last = next || last; }
      }
    }
    ue(); var poc = ue();
    if (poc === 0) ue(); else if (poc === 1) { bit(); se(); se(); var n = ue(); for (var k = 0; k < n; k++) se(); }
    ue(); bit(); ue(); ue();
    if (!bit()) bit();
    bit(); if (bit()) { ue(); ue(); ue(); ue(); }
    if (!bit()) return null; // no VUI
    if (bit()) { if (bits(8) === 255) bits(32); }
    if (bit()) bit();
    if (!bit()) return null; // no video signal info
    bits(3); var full = bit();
    if (!bit()) return { full: full };
    return { prim: bits(8), trc: bits(8), mat: bits(8), full: full, src: 'stream' };
  }

  var CODECS = { avc1: 'H.264', avc3: 'H.264', hvc1: 'H.265 (HEVC)', hev1: 'H.265 (HEVC)', apco: 'ProRes 422 Proxy', apcs: 'ProRes 422 LT', apcn: 'ProRes 422', apch: 'ProRes 422 HQ', ap4h: 'ProRes 4444', ap4x: 'ProRes 4444 XQ', AVdn: 'DNxHD', AVdh: 'DNxHR' };

  function read(file) {
    var info = { name: file.name };
    return topBoxes(file).then(function (top) {
      if (!top.moov || top.moov.size > 200e6) { info.unread = true; return info; }
      return bytes(file, top.moov.off, top.moov.size).then(function (v) {
        var s = top.moov.head, e = v.byteLength, done = false;
        kids(v, s, e, function (t, ts, te) {
          if (done || t !== 'trak') return;
          var hd = find(v, ts, te, ['mdia', 'hdlr']);
          if (!hd || fourcc(v, hd[0] + 8) !== 'vide') return;
          var sd = find(v, ts, te, ['mdia', 'minf', 'stbl', 'stsd']);
          if (!sd) return;
          done = true;
          var en = sd[0] + 8, enEnd = Math.min(en + v.getUint32(en), sd[1]);
          info.fcc = fourcc(v, en + 4); info.codec = CODECS[info.fcc] || info.fcc.trim();
          kids(v, en + 86, enEnd, function (type, bs, be) {
            if (type === 'colr') {
              var ct = fourcc(v, bs);
              if (ct === 'nclx' || ct === 'nclc') {
                info.box = { prim: v.getUint16(bs + 4), trc: v.getUint16(bs + 6), mat: v.getUint16(bs + 8), src: ct };
                if (ct === 'nclx' && bs + 10 < be) info.box.full = v.getUint8(bs + 10) >> 7;
              } else if (ct === 'prof' || ct === 'rICC') info.icc = true;
            }
            if (type === 'gama') info.gama = v.getUint32(bs) / 65536;
            if (type === 'avcC' && be - bs > 8) {
              var nSps = v.getUint8(bs + 5) & 31;
              if (nSps) { var len = v.getUint16(bs + 6); try { info.sps = spsColor(v, bs + 8, Math.min(len, be - bs - 8)); } catch (x) { info.sps = null; } }
            }
          });
        });
        if (!done) info.unread = true;
        return info;
      });
    }).catch(function () { info.unread = true; return info; });
  }

  // ---- What the tags mean ----
  var PRIM = { 1: 'Rec. 709', 2: 'Not set', 4: 'Rec. 470 M', 5: 'Rec. 601 (PAL)', 6: 'Rec. 601 (NTSC)', 7: 'SMPTE 240M', 9: 'Rec. 2020', 11: 'DCI-P3', 12: 'Display P3' };
  var TRC = { 1: 'Rec. 709', 2: 'Not set', 4: 'Gamma 2.2', 5: 'Gamma 2.8', 6: 'Rec. 601', 7: 'SMPTE 240M', 8: 'Linear', 13: 'sRGB', 14: 'Rec. 2020', 15: 'Rec. 2020', 16: 'PQ (HDR)', 18: 'HLG (HDR)' };
  var MAT = { 0: 'RGB', 1: 'Rec. 709', 2: 'Not set', 5: 'Rec. 601', 6: 'Rec. 601', 7: 'SMPTE 240M', 9: 'Rec. 2020' };
  var name = function (t, n) { return n === undefined || n === null ? 'Not set' : (t[n] || 'Code ' + n); };

  function judge(c) {
    var tag = c.box || (c.sps && c.sps.prim !== undefined ? c.sps : null);
    var full = c.box && c.box.full !== undefined ? c.box.full : c.sps ? c.sps.full : undefined;
    var out = { tag: tag, full: full, verdict: '', level: 'ok', lines: [] };
    var add = function (lvl, t) { out.lines.push([lvl, t]); };
    if (!tag || tag.trc === 2 || tag.trc === undefined) {
      out.level = 'warn';
      out.verdict = 'No color tag. Every player will guess.';
      add('warn', 'Without a tag, QuickTime, browsers and TVs each pick their own idea of how bright the midtones should be, so the same file can look different on every screen.');
      add('info', 'Fix: export again with the color space set to Rec. 709, so the file says what it is. The steps for each editor are below.');
    } else if (tag.trc === 16 || tag.trc === 18) {
      out.level = 'warn';
      out.verdict = 'This is an HDR file (' + (tag.trc === 16 ? 'PQ' : 'HLG') + ').';
      add('warn', 'On an HDR screen it shows as HDR. On a normal screen the player converts it down, and the result depends on the player, so it can look flat, dark or different from your edit.');
      add('info', 'If you meant to deliver normal video, set the project or export to Rec. 709 SDR. Apple suggests exporting iPhone HDR projects from Final Cut Pro as a master file with an HLG color space when QuickTime shows a shift.');
    } else if ([1, 6, 14, 15].indexOf(tag.trc) !== -1) {
      out.verdict = tag.prim === 1 && tag.trc === 1 && tag.mat === 1 ? 'Tagged Rec. 709 (1-1-1). This is the file most people see as washed out on a Mac.' : 'Tagged for normal (SDR) video.';
      add('info', 'Adobe explains it this way: editors like Premiere Pro follow the TV standard, a 2.4 gamma, while macOS shows Rec. 709 video with a 1.96 gamma. So in QuickTime Player and Safari on a Mac, the same file looks lighter and less contrasty than in your editor.');
      add('info', 'Nothing is wrong with the file. Decide where most people will watch it, and set your editor to match that screen. The bars below show the difference.');
    } else if (tag.trc === 13 || tag.trc === 4) {
      out.verdict = 'Tagged ' + name(TRC, tag.trc) + '.';
      add('info', 'This tag is common for screen recordings and graphics. Players that read it show the midtones close to a computer screen, so it looks darker than a Rec. 709 file on a Mac.');
    } else {
      out.level = 'warn';
      out.verdict = 'Unusual transfer tag: ' + name(TRC, tag.trc) + '.';
      add('warn', 'Many players don\'t handle this tag the same way. Re-export as Rec. 709 unless a delivery spec asks for this one.');
    }
    if (tag && tag.prim === 9 && tag.trc !== 16 && tag.trc !== 18) add('warn', 'Rec. 2020 color with a normal (SDR) curve. Players that ignore wide color will show it duller than you graded it.');
    if (tag && (tag.prim === 11 || tag.prim === 12)) add('info', 'P3 color. Most phones and Macs show it, but most web players and TVs expect Rec. 709, so colors can shift there.');
    if (tag && tag.prim === 1 && (tag.mat === 5 || tag.mat === 6)) add('warn', 'Rec. 709 color with a Rec. 601 matrix. Some players shift reds and greens slightly. Re-export with all three tags set to Rec. 709.');
    if (full === 1 && c.fcc && /^(avc|hvc|hev)/.test(c.fcc)) add('warn', 'Marked full range. Most players expect video range, so blacks can look crushed or grey. Export as video (limited) range unless a spec asks otherwise.');
    if (c.gama) add('info', 'The file also carries an old QuickTime gamma value (' + c.gama.toFixed(2) + '). Older players apply it on top, which can shift the picture.');
    if (c.icc) add('info', 'The file carries a full color profile (ICC). Apple players use it; most others ignore it.');
    return out;
  }

  // Bars: the same ten grey steps shown at 2.4 (editor, TV standard) and 1.96 (Mac, per Adobe).
  function bars() {
    var row = function (g) {
      var cells = '';
      for (var i = 0; i <= 10; i++) { var v = Math.round(255 * Math.pow(Math.pow(i / 10, g), 1 / 2.2)); cells += '<i style="background:rgb(' + v + ',' + v + ',' + v + ')"></i>'; }
      return cells;
    };
    return '<div class="gs-bars"><p>In your editor, 2.4</p><div>' + row(2.4) + '</div><p>QuickTime and Safari on a Mac, 1.96</p><div>' + row(1.96) + '</div>' +
      '<span>An illustration of the same grey steps, not your footage.</span></div>';
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (x) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[x]; }); }
  var li = function (x) { return '<li class="tc-' + x[0] + '">' + x[1] + '</li>'; };
  var sent = false;

  function show(c) {
    $('gs-out').hidden = false;
    if (c.unread) {
      $('gs-summary').innerHTML = '<strong>Couldn\'t read this file</strong><span>The checker reads MOV and MP4 files. If it is one, it may still be copying.</span>';
      $('gs-body').innerHTML = ''; return;
    }
    var j = judge(c), t = j.tag;
    $('gs-summary').innerHTML = '<strong>' + esc(j.verdict) + '</strong><span>' + esc(c.name) + ' &middot; ' + esc(c.codec) + '</span>';
    var code = t ? t.prim + '-' + t.trc + '-' + t.mat : 'None';
    var spec = [['Tag', code], ['Color (primaries)', name(PRIM, t && t.prim)], ['Curve (transfer)', name(TRC, t && t.trc)], ['Matrix', name(MAT, t && t.mat)],
      ['Range', j.full === undefined ? 'Not set' : j.full ? 'Full' : 'Video (limited)'], ['Tag found in', t ? (t.src === 'stream' ? 'Video stream' : 'File header') : 'Nowhere']]
      .map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + esc(x[1]) + '</dd></div>'; }).join('');
    var sdr = t && [1, 6, 14, 15].indexOf(t.trc) !== -1;
    $('gs-body').innerHTML = '<dl class="cs-spec gs-spec">' + spec + '</dl><section class="tc-block"><h3>What players will do</h3><ul>' + j.lines.map(li).join('') + '</ul>' + (sdr || !t || t.trc === 2 ? bars() : '') + '</section>';
    if (!sent) { sent = true; window.dwEvent ? window.dwEvent('tool-gamma-done') : (window.dwQueue = window.dwQueue || []).push('tool-gamma-done'); }
  }

  function take(files) {
    var f = files && files[0]; if (!f) return;
    $('gs-status').textContent = 'Reading ' + f.name + '...';
    read(f).then(function (c) { $('gs-status').textContent = ''; show(c); $('gs-out').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  }
  input.addEventListener('change', function () { take(input.files); input.value = ''; });
  ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('cs-over'); }); });
  ['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function () { drop.classList.remove('cs-over'); }); });
  drop.addEventListener('drop', function (e) { e.preventDefault(); take(e.dataTransfer.files); });
  window.addEventListener('dragover', function (e) { e.preventDefault(); });
  window.addEventListener('drop', function (e) { e.preventDefault(); });
  Array.prototype.forEach.call(document.querySelectorAll('#gamma-checker a[data-cta]'), function (a) {
    a.addEventListener('click', function () { if (window.dwEvent) window.dwEvent('tool-gamma-cta'); });
  });
})();
