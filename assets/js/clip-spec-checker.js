/* Free stock clip spec checker (guides/stock-clip-spec-checker/).
   Reads the header of a MOV or MP4 file in the browser (no upload, no playback) and checks
   length, size, frame rate, codec, file size, audio and color against each site's own
   contributor pages (checked November 2026). Nothing leaves the visitor's computer. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var input = $('cs-file'), drop = $('cs-drop');
  if (!input) return;

  var SITES = { adobe: 'Adobe Stock', pond5: 'Pond5', shutterstock: 'Shutterstock', storyblocks: 'Storyblocks' };
  var GB = 1e9; // decimal GB, the smaller reading of each site's limit

  // ---- Reading the file ----
  function bytes(file, off, len) {
    return file.slice(off, off + len).arrayBuffer().then(function (b) { return new DataView(b); });
  }
  function fourcc(v, o) { return String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3)); }
  function u64(v, o) { return v.getUint32(o) * 4294967296 + v.getUint32(o + 4); }

  // Walk the top-level boxes without reading the whole file. Camera files often keep moov at the end.
  function topBoxes(file) {
    var found = {}, off = 0, guard = 0;
    function step() {
      if (off + 8 > file.size || guard++ > 400) return Promise.resolve(found);
      return bytes(file, off, 16).then(function (v) {
        var size = v.getUint32(0), type = fourcc(v, 4), head = 8;
        if (size === 1 && v.byteLength >= 16) { size = u64(v, 8); head = 16; }
        else if (size === 0) size = file.size - off;
        if (size < 8 || !/^[\x20-\x7e]{4}$/.test(type)) return found;
        if (!found[type]) found[type] = { off: off, size: size, head: head };
        off += size;
        return step();
      });
    }
    return step();
  }

  function kids(v, start, end, cb) {
    var o = start;
    while (o + 8 <= end) {
      var size = v.getUint32(o), type = fourcc(v, o + 4), head = 8;
      if (size === 1) { size = u64(v, o + 8); head = 16; }
      else if (size === 0) size = end - o;
      if (size < 8 || o + size > end) break;
      cb(type, o + head, o + size, o);
      o += size;
    }
  }
  function find(v, start, end, path) {
    var hit = null;
    kids(v, start, end, function (t, s, e) {
      if (hit || t !== path[0]) return;
      hit = path.length === 1 ? [s, e] : find(v, s, e, path.slice(1));
    });
    return hit;
  }

  var CODECS = {
    avc1: ['h264', 'H.264'], avc3: ['h264', 'H.264'], hvc1: ['hevc', 'H.265 (HEVC)'], hev1: ['hevc', 'H.265 (HEVC)'],
    apco: ['prores', 'ProRes 422 Proxy'], apcs: ['prores', 'ProRes 422 LT'], apcn: ['prores', 'ProRes 422'], apch: ['prores', 'ProRes 422 HQ'],
    ap4h: ['prores4444', 'ProRes 4444'], ap4x: ['prores4444', 'ProRes 4444 XQ'], aprn: ['proresraw', 'ProRes RAW'], aprh: ['proresraw', 'ProRes RAW HQ'],
    AVdn: ['dnxhd', 'DNxHD'], AVdh: ['dnxhr', 'DNxHR'], jpeg: ['pjpeg', 'Photo JPEG'], mjpa: ['mjpeg', 'Motion JPEG A'], mjpb: ['mjpeg', 'Motion JPEG B'],
    AVDJ: ['mjpeg', 'Motion JPEG'], png: ['png', 'PNG'], 'png ': ['png', 'PNG'], 'rle ': ['rle', 'Animation'], mp4v: ['mpeg4', 'MPEG-4 Visual'],
    m2v1: ['mpeg2', 'MPEG-2'], mx5p: ['mpeg2', 'MPEG-2 (XDCAM)'], av01: ['av1', 'AV1'], vp09: ['vp9', 'VP9']
  };

  function parseTrak(v, s, e) {
    var t = { kind: '', w: 0, h: 0, rot: false };
    var tk = find(v, s, e, ['tkhd']);
    if (tk) {
      var ver = v.getUint8(tk[0]), m = tk[0] + 4 + (ver === 1 ? 32 : 20) + 16;
      if (m + 44 <= tk[1]) {
        var a = v.getInt32(m), b = v.getInt32(m + 4);
        t.rot = a === 0 && Math.abs(b) === 65536;
        t.w = v.getUint32(m + 36) / 65536; t.h = v.getUint32(m + 40) / 65536;
      }
    }
    var md = find(v, s, e, ['mdia', 'mdhd']);
    if (md) {
      var mv = v.getUint8(md[0]);
      t.scale = v.getUint32(md[0] + (mv === 1 ? 20 : 12));
      t.dur = mv === 1 ? u64(v, md[0] + 24) : v.getUint32(md[0] + 16);
    }
    var hd = find(v, s, e, ['mdia', 'hdlr']);
    if (hd) t.kind = fourcc(v, hd[0] + 8);
    var stbl = find(v, s, e, ['mdia', 'minf', 'stbl']);
    if (!stbl) return t;
    var sd = find(v, stbl[0], stbl[1], ['stsd']);
    if (sd && t.kind === 'vide') {
      var en = sd[0] + 8, enSize = v.getUint32(en);
      t.fcc = fourcc(v, en + 4);
      t.cw = v.getUint16(en + 32); t.ch = v.getUint16(en + 34);
      t.depth = v.getUint16(en + 82);
      kids(v, en + 86, Math.min(en + enSize, sd[1]), function (type, bs) {
        if (type === 'colr') {
          var ct = fourcc(v, bs);
          if (ct === 'nclx' || ct === 'nclc') { t.prim = v.getUint16(bs + 4); t.trc = v.getUint16(bs + 6); }
        }
        if (type === 'fiel') t.fields = v.getUint8(bs);
      });
    }
    var st = find(v, stbl[0], stbl[1], ['stts']);
    if (st) {
      var n = v.getUint32(st[0] + 4), samples = 0, ticks = 0, deltas = {};
      for (var i = 0; i < n && st[0] + 16 + i * 8 <= st[1]; i++) {
        var c = v.getUint32(st[0] + 8 + i * 8), d = v.getUint32(st[0] + 12 + i * 8);
        samples += c; ticks += c * d; if (c > 1) deltas[d] = (deltas[d] || 0) + c;
      }
      t.samples = samples;
      t.fps = ticks && t.scale ? samples * t.scale / ticks : 0;
      var ds = Object.keys(deltas);
      t.vfr = ds.length > 1 && ds.some(function (k) { return deltas[k] > samples * 0.02; });
    }
    var sz = find(v, stbl[0], stbl[1], ['stsz']);
    if (sz) {
      var one = v.getUint32(sz[0] + 4), cnt = v.getUint32(sz[0] + 8), total = 0;
      if (one) total = one * cnt;
      else for (var j = 0; j < cnt && sz[0] + 16 + j * 4 <= sz[1]; j++) total += v.getUint32(sz[0] + 12 + j * 4);
      t.bytes = total;
    }
    return t;
  }

  function read(file) {
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    var info = { name: file.name, ext: ext, size: file.size };
    return topBoxes(file).then(function (top) {
      if (top.ftyp) info.brand = 'pending';
      if (!top.moov) { info.unread = true; return info; }
      if (top.moov.size > 200e6) { info.unread = true; return info; }
      var p = top.ftyp ? bytes(file, top.ftyp.off, Math.min(top.ftyp.size, 64)) : Promise.resolve(null);
      return p.then(function (fv) {
        info.brand = fv ? fourcc(fv, 8) : 'qt  ';
        info.mov = info.brand === 'qt  ' || ext === 'mov';
        return bytes(file, top.moov.off, top.moov.size);
      }).then(function (v) {
        var s = top.moov.head, e = v.byteLength;
        var mvhd = find(v, s, e, ['mvhd']);
        if (mvhd) {
          var ver = v.getUint8(mvhd[0]);
          var scale = v.getUint32(mvhd[0] + (ver === 1 ? 20 : 12));
          var dur = ver === 1 ? u64(v, mvhd[0] + 24) : v.getUint32(mvhd[0] + 16);
          if (scale) info.dur = dur / scale;
        }
        var tracks = [];
        kids(v, s, e, function (t, bs, be) { if (t === 'trak') tracks.push(parseTrak(v, bs, be)); });
        var vid = tracks.filter(function (t) { return t.kind === 'vide' && t.fcc; })[0];
        info.audio = tracks.some(function (t) { return t.kind === 'soun'; });
        if (!vid) { info.unread = true; return info; }
        var w = Math.round(vid.w) || vid.cw, h = Math.round(vid.h) || vid.ch;
        if (vid.rot) { var x = w; w = h; h = x; }
        info.w = w; info.h = h; info.fps = vid.fps; info.vfr = vid.vfr;
        if (!info.dur && vid.dur && vid.scale) info.dur = vid.dur / vid.scale;
        var c = CODECS[vid.fcc] || CODECS[vid.fcc.trim()];
        info.codec = c ? c[0] : 'other'; info.codecName = c ? c[1] : 'Codec code "' + vid.fcc.trim() + '"';
        info.hdr = vid.trc === 16 || vid.trc === 18; info.hlg = vid.trc === 18; info.wide = vid.prim === 9;
        info.interlaced = vid.fields === 2;
        if (vid.bytes && info.dur) info.mbps = vid.bytes * 8 / info.dur / 1e6;
        else if (info.dur) info.mbps = file.size * 8 / info.dur / 1e6;
        return info;
      });
    }).catch(function () { info.unread = true; return info; });
  }

  // ---- The rules ----
  var RATES = [[23.976, '23.98'], [24, '24'], [25, '25'], [29.97, '29.97'], [30, '30'], [47.952, '47.95'], [48, '48'], [50, '50'], [59.94, '59.94'], [60, '60']];
  function rateName(fps) {
    for (var i = 0; i < RATES.length; i++) if (Math.abs(fps - RATES[i][0]) < 0.02) return RATES[i][1];
    return fps ? (Math.round(fps * 100) / 100).toString() : '';
  }
  var FPS = {
    adobe: ['23.98', '24', '25', '29.97', '30', '50', '59.94', '60'],
    pond5: ['23.98', '24', '25', '29.97', '30', '47.95', '48', '50', '59.94', '60'],
    shutterstock: ['23.98', '24', '25', '29.97', '30', '48', '50', '59.94', '60'],
    storyblocks: ['23.98', '24', '25', '29.97', '30', '48', '50', '59.94', '60']
  };
  var SIZES = {
    adobe: '1920x1080 2048x1080 3840x2160 4096x2160 4096x2304 2304x4096 2160x4096 2160x3840 1080x1920 1080x1080 2160x2160',
    pond5: '8192x4320 7680x4320 6144x3160 6144x3072 5120x2880 5120x2700 4800x2700 4096x2160 4096x2304 3840x2160 2048x1080 2048x1152 1920x1080 1280x720 1440x1080 640x480 720x480 720x486 720x576',
    shutterstock: '4096x2160 4096x2304 4000x2160 3840x2160 3996x2160 4800x2700 2048x1080 2400x1350 2432x1366 2702x1520 2704x1520 1920x1080 1280x720 1440x1080 1888x1062 1920x1088 640x480 703x576 720x480 720x486 720x576 1080x1920 2160x3840 2160x4096 2304x4096',
    storyblocks: '1280x720 1920x1080 720x1280 1080x1920 3840x2160 4096x2160 4096x2304 2160x3840 2160x4096 2304x4096 7680x4320'
  };
  var gb = function (n) { return n < GB ? Math.max(1, Math.round(n / 1e6)) + ' MB' : (n / GB).toFixed(2).replace(/\.?0+$/, '') + ' GB'; };

  function judge(c) {
    var r = { adobe: [], pond5: [], shutterstock: [], storyblocks: [] }, all = [];
    var add = function (site, level, text) { r[site].push([level, text]); };
    var each = function (fn) { Object.keys(r).forEach(fn); };
    var long = Math.max(c.w, c.h), vertical = c.h > c.w, wh = c.w + 'x' + c.h;
    var fps = rateName(c.fps), dur = c.dur || 0, secs = Math.round(dur * 10) / 10;

    // Length
    ['adobe', 'pond5', 'shutterstock'].forEach(function (s) {
      if (dur < 5) add(s, 'fail', 'Too short at ' + secs + ' s. ' + SITES[s] + ' wants 5 to 60 seconds.');
      else if (dur > 60.5) add(s, 'fail', 'Too long at ' + secs + ' s. ' + SITES[s] + ' wants 5 to 60 seconds.');
      else add(s, 'ok', 'Length ' + secs + ' s, inside 5 to 60 seconds.');
    });
    if (dur > 180.5) add('storyblocks', 'fail', 'Too long at ' + secs + ' s. Storyblocks takes footage up to 3 minutes.');
    else add('storyblocks', 'ok', 'Length ' + secs + ' s, under the 3 minute limit.');
    if (vertical && (dur < 10 || dur > 30)) add('adobe', 'info', 'Adobe Stock suggests 10 to 30 seconds for vertical clips.');

    // File size
    if (c.size > 3.9 * GB) add('adobe', 'fail', gb(c.size) + ' is over Adobe Stock\'s 3.9 GB limit.');
    else add('adobe', 'ok', gb(c.size) + ', under 3.9 GB.');
    var p5 = vertical || long < 3840 ? 3 : long <= 6144 ? 5 : 6;
    if (c.size > p5 * GB) add('pond5', 'fail', gb(c.size) + ' is over Pond5\'s ' + p5 + ' GB limit for ' + (vertical ? 'vertical clips' : long < 3840 ? 'HD' : long <= 6144 ? '4K to 6K' : '8K') + '.');
    else add('pond5', 'ok', gb(c.size) + ', under Pond5\'s ' + p5 + ' GB limit for this size.');
    if (c.size > 10 * GB) add('shutterstock', 'fail', gb(c.size) + ' is over Shutterstock\'s 10 GB limit.');
    else add('shutterstock', 'ok', gb(c.size) + ', under 10 GB.');
    var sbHD = long <= 2048, sb8K = long >= 7680, sbCap = sbHD ? 4 : sb8K ? 0 : 6;
    if (sbCap && c.size > sbCap * GB) add('storyblocks', 'fail', gb(c.size) + ' is over Storyblocks\' ' + sbCap + ' GB limit for ' + (sbHD ? 'HD' : '4K') + '.');
    else if (sbCap) add('storyblocks', 'ok', gb(c.size) + ', under ' + sbCap + ' GB.');

    // Container
    var box = c.mov ? 'MOV' : 'MP4';
    each(function (s) { if (s !== 'storyblocks') add(s, 'ok', box + ' file.'); });
    if (sbHD && !c.mov) add('storyblocks', 'fail', 'Storyblocks wants HD footage as a MOV file, and this is an MP4.');
    else if (sb8K && c.mov) add('storyblocks', 'fail', 'Storyblocks takes 8K only as an MP4, and this is a MOV.');
    else add('storyblocks', 'ok', box + ' file, which Storyblocks takes at this size.');

    // Codec
    var k = c.codec, n = c.codecName;
    if (k === 'prores' || k === 'prores4444' || k === 'h264') add('adobe', 'ok', n + '. Adobe Stock recommends ProRes or H.264.');
    else if (k === 'mpeg2' || k === 'mpeg4' || k === 'mjpeg' || k === 'png') add('adobe', 'ok', n + ' is on Adobe Stock\'s list. ProRes or H.264 is recommended.');
    else add('adobe', 'warn', n + ' isn\'t on Adobe Stock\'s list. Use ProRes or H.264.');
    if (k === 'mjpeg') add('pond5', 'fail', 'Pond5 lists Motion JPEG as not accepted.');
    else if (/^(prores|prores4444|proresraw|dnxhd|dnxhr|h264|hevc|pjpeg|png|rle)$/.test(k)) add('pond5', 'ok', n + ' is on Pond5\'s list.');
    else add('pond5', 'warn', n + ' isn\'t on Pond5\'s list. ProRes or H.264 is safe.');
    if (k === 'hevc') add('shutterstock', 'warn', 'Shutterstock accepts H.265 but doesn\'t recommend it because of a known HDR issue. ProRes or H.264 is safer.');
    else if ((k === 'prores' && !/Proxy/.test(n)) || (k === 'prores4444' && !/XQ/.test(n)) || /^(h264|pjpeg|png|mpeg4|rle)$/.test(k)) add('shutterstock', 'ok', n + ' is on Shutterstock\'s list.');
    else add('shutterstock', 'warn', n + ' isn\'t on Shutterstock\'s list. Use ProRes 422, 422 HQ or H.264.');
    if (sb8K) {
      if (k === 'h264' || k === 'hevc') add('storyblocks', 'ok', n + ', which Storyblocks wants for 8K.');
      else add('storyblocks', 'fail', 'Storyblocks takes 8K only as H.264 or HEVC in an MP4.');
    } else if (k === 'h264') {
      if (c.mbps && c.mbps < 50) add('storyblocks', 'fail', 'H.264 at about ' + Math.round(c.mbps) + ' Mbps. Storyblocks wants at least 50 Mbps (50,000 kbps).');
      else add('storyblocks', 'ok', 'H.264 at about ' + Math.round(c.mbps || 0) + ' Mbps, over Storyblocks\' 50 Mbps minimum.');
    } else if (/^(prores|prores4444|dnxhd|pjpeg|mjpeg)$/.test(k) && !/Proxy|XQ/.test(n)) add('storyblocks', 'ok', n + ' is on Storyblocks\' list.');
    else add('storyblocks', 'warn', n + ' isn\'t on Storyblocks\' list. ProRes 422 is safe.');

    // Frame rate
    if (!c.fps) all.push(['warn', 'The frame rate couldn\'t be read from this file.']);
    else each(function (s) {
      if (FPS[s].indexOf(fps) !== -1) add(s, 'ok', fps + ' fps is on ' + SITES[s] + '\'s list.');
      else add(s, 'fail', fps + ' fps isn\'t on ' + SITES[s] + '\'s list of frame rates.');
    });
    if (c.vfr) all.push(['warn', 'The frame rate changes inside the file, which phone footage often does. Export at a steady frame rate before uploading.']);

    // Size in pixels
    each(function (s) {
      var listed = (' ' + SIZES[s] + ' ').indexOf(' ' + wh + ' ') !== -1;
      if (s === 'pond5') {
        if (Math.min(c.w, c.h) < 1080) add(s, 'warn', wh + '. Pond5 accepts most sizes, but asks for at least 1080p from phones and drones.');
        else add(s, 'ok', wh + '. Pond5 accepts most sizes.');
      } else if (listed) add(s, 'ok', wh + ' is on ' + SITES[s] + '\'s list of sizes.');
      else if (s === 'adobe' && !vertical && [1920, 2048, 3840, 4096].indexOf(c.w) !== -1 && c.w / c.h > 1.8) add(s, 'ok', wh + ', a wide-screen frame. Adobe Stock accepts wide ratios like 2.39:1.');
      else if (s === 'adobe' && c.w > 4096) add(s, 'warn', wh + '. Adobe Stock\'s sizes go up to 4096 wide. Export a 4K version for Adobe.');
      else add(s, 'warn', wh + ' isn\'t on ' + SITES[s] + '\'s list of sizes.');
    });
    if (Math.min(c.w, c.h) < 1080) all.push(['info', 'Under 1080p. Most buyers search for HD and 4K, and none of the sites take footage that was blown up from a smaller size.']);

    // Audio, color, interlacing
    if (c.audio) {
      add('pond5', 'warn', 'Has audio. Pond5 prefers audio removed, unless it\'s editorial or the sound matters. Sound from a camera mic will most likely be refused.');
      add('shutterstock', 'warn', 'Has audio. Shutterstock wants none unless it adds to the clip or it\'s editorial.');
      add('storyblocks', 'warn', 'Has audio. Storyblocks says clips with audio are usually not accepted, unless it\'s clean natural sound with no music.');
    }
    if (c.hdr) {
      add('shutterstock', 'warn', 'This file is ' + (c.hlg ? 'HLG' : 'PQ') + ' HDR. Shutterstock prefers Rec 709.');
      all.push(['warn', 'HDR file (' + (c.hlg ? 'HLG' : 'PQ') + '). None of the four sites ask for HDR on their spec pages. Deliver an SDR Rec 709 version unless a site asks for HDR.']);
    }
    if (c.interlaced) add('storyblocks', 'fail', 'Interlaced. Storyblocks doesn\'t accept visibly interlaced footage.');
    all.push(['info', 'This checker reads the file\'s settings. It can\'t see the picture: shake, focus, logos, people who need a release, or log footage that hasn\'t been graded.']);
    return { sites: r, all: all };
  }

  // ---- Output ----
  function esc(s) { return String(s).replace(/[&<>"]/g, function (x) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[x]; }); }
  var li = function (x) { return '<li class="tc-' + x[0] + '">' + x[1] + '</li>'; };
  function state(list) {
    return list.some(function (x) { return x[0] === 'fail'; }) ? 'fail' : list.some(function (x) { return x[0] === 'warn'; }) ? 'warn' : 'ok';
  }
  var CHIP = { ok: 'Ready', warn: 'Check', fail: 'Fix first' };
  function dur(s) { var m = Math.floor(s / 60), r = Math.round(s % 60 * 10) / 10; return m ? m + ' min ' + Math.round(r) + ' s' : r + ' s'; }

  function card(c, sel, open) {
    var head = '<summary><span class="cs-name">' + esc(c.name) + '</span>';
    if (c.unread) {
      var native = /^(mxf|r3d|braw|mts|m2ts|avi|crm|nev|ari)$/.test(c.ext);
      return '<details class="cs-file"' + (open ? ' open' : '') + '>' + head + '<span class="cs-chips"><i class="tc-warn">Not read</i></span></summary>' +
        '<div class="cs-body"><ul>' + li(['warn', native
          ? 'This is a .' + esc(c.ext.toUpperCase()) + ' camera file. The checker reads MOV and MP4. Adobe Stock and Shutterstock want MOV or MP4; Pond5 lists some camera-native formats and Storyblocks takes R3D for 4K. Exporting to ProRes in a MOV works everywhere.'
          : 'This file couldn\'t be read. The checker reads MOV and MP4 files. If it is one, it may still be copying, or it may be damaged.']) + '</ul></div></details>';
    }
    var j = judge(c), sites = Object.keys(SITES).filter(function (s) { return sel[s]; });
    var chips = sites.map(function (s) { var st = state(j.sites[s]); return '<i class="tc-' + st + '" title="' + SITES[s] + ': ' + CHIP[st] + '">' + SITES[s].split(' ')[0] + '</i>'; }).join('');
    var spec = [
      ['Length', dur(c.dur || 0)], ['Size', c.w + ' &times; ' + c.h + (c.h > c.w ? ' vertical' : '')], ['Frame rate', c.fps ? rateName(c.fps) + ' fps' + (c.vfr ? ' (varies)' : '') : 'Not read'],
      ['Codec', esc(c.codecName)], ['File', (c.mov ? 'MOV' : 'MP4') + ', ' + gb(c.size)], ['Bitrate', c.mbps ? 'About ' + Math.round(c.mbps) + ' Mbps' : 'Not read'],
      ['Audio', c.audio ? 'Yes' : 'None'], ['Color', c.hdr ? (c.hlg ? 'HLG HDR' : 'PQ HDR') : c.wide ? 'Rec 2020 SDR' : 'SDR']
    ].map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + x[1] + '</dd></div>'; }).join('');
    var list = sites.map(function (s) {
      var st = state(j.sites[s]), rows = j.sites[s].slice().sort(function (a, b) { return 'failwarninfook'.indexOf(a[0]) - 'failwarninfook'.indexOf(b[0]); });
      return '<section class="tc-site tc-' + st + '"><header><h3>' + SITES[s] + '</h3><span class="tc-chip">' + CHIP[st] + '</span></header><ul>' + rows.map(li).join('') + '</ul></section>';
    }).join('');
    return '<details class="cs-file"' + (open ? ' open' : '') + '>' + head + '<span class="cs-chips">' + chips + '</span></summary>' +
      '<div class="cs-body"><dl class="cs-spec">' + spec + '</dl><div class="tc-sitelist">' + list + '</div>' +
      '<ul class="cs-all">' + j.all.map(li).join('') + '</ul></div></details>';
  }

  var results = [], sent = false;
  function render() {
    var sel = {};
    Array.prototype.forEach.call(document.querySelectorAll('.tc-sites input'), function (x) { sel[x.value] = x.checked; });
    var picked = Object.keys(sel).filter(function (s) { return sel[s]; });
    $('cs-out').hidden = !results.length;
    if (!results.length) return;
    var read = results.filter(function (c) { return !c.unread; });
    var ready = read.filter(function (c) { var j = judge(c); return picked.every(function (s) { return state(j.sites[s]) !== 'fail'; }); }).length;
    var n = results.length, sites = picked.length === 4 ? 'all 4 sites' : picked.length === 1 ? SITES[picked[0]] : picked.length + ' sites';
    $('cs-summary').innerHTML = picked.length
      ? '<strong>' + (n === 1 ? (ready ? 'Ready for ' + sites : 'Not ready yet for ' + sites) : ready + ' of ' + n + ' clips ready for ' + sites) + '</strong>' +
        '<span>' + (ready === n ? 'No problems that would stop an upload. Items marked Check are worth a look.' : (n === 1 ? 'What to fix is below.' : 'Open a clip to see what to fix.') + ' Each line comes from that site\'s own contributor pages.') + '</span>'
      : '<strong>Pick at least one site</strong>';
    $('cs-list').innerHTML = results.map(function (c, i) { return card(c, sel, n === 1 || i === 0); }).join('');
  }

  function take(files) {
    files = Array.prototype.slice.call(files || []).slice(0, 50);
    if (!files.length) return;
    $('cs-status').textContent = 'Reading ' + files.length + (files.length === 1 ? ' file' : ' files') + '...';
    files.reduce(function (p, f) { return p.then(function (acc) { return read(f).then(function (c) { acc.push(c); return acc; }); }); }, Promise.resolve([]))
      .then(function (list) {
        results = list; $('cs-status').textContent = ''; render();
        if (!sent && list.some(function (c) { return !c.unread; })) { sent = true; window.dwEvent ? window.dwEvent('tool-spec-done') : (window.dwQueue = window.dwQueue || []).push('tool-spec-done'); }
        $('cs-out').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
  }
  window.dwSpecCheck = take; // lets the page preview feed a sample file

  input.addEventListener('change', function () { take(input.files); input.value = ''; });
  ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('cs-over'); }); });
  ['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function () { drop.classList.remove('cs-over'); }); });
  drop.addEventListener('drop', function (e) { e.preventDefault(); take(e.dataTransfer.files); });
  window.addEventListener('dragover', function (e) { e.preventDefault(); });
  window.addEventListener('drop', function (e) { e.preventDefault(); });
  Array.prototype.forEach.call(document.querySelectorAll('.tc-sites input'), function (x) { x.addEventListener('change', render); });
  $('cs-clear').addEventListener('click', function () { results = []; render(); });
  Array.prototype.forEach.call(document.querySelectorAll('#spec-checker a[data-cta]'), function (a) {
    a.addEventListener('click', function () { if (window.dwEvent) window.dwEvent('tool-spec-cta'); });
  });
})();
