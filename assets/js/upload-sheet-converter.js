/* Free stock upload sheet converter (guides/stock-upload-sheet-converter/).
   Paste or drop one metadata sheet (any of the common layouts) and save it in the exact CSV layout
   Adobe Stock, Shutterstock and Pond5 each ask for, with each site's limits applied. Column names and
   limits from each site's own CSV help pages (checked November 2026). Runs in the page only. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var area = $('sc-in'), drop = $('sc-drop');
  if (!area) return;

  var SS_CATS = {
    'Animals/Wildlife': ['animal', 'wildlife', 'bird', 'dog', 'cat', 'horse', 'cow', 'cattle', 'fish', 'deer', 'insect', 'pet', 'whale', 'dolphin', 'flock', 'herd'],
    Arts: ['art', 'painting', 'sculpture', 'mural', 'graffiti', 'museum', 'theater', 'theatre', 'concert', 'music', 'dance'],
    'Backgrounds/Textures': ['background', 'texture', 'pattern', 'bokeh', 'particles', 'light leak'],
    'Buildings/Landmarks': ['building', 'skyline', 'skyscraper', 'city', 'cityscape', 'downtown', 'landmark', 'architecture', 'bridge', 'tower', 'stadium', 'house', 'housing', 'monument', 'statue', 'church', 'castle', 'neighborhood', 'urban', 'street', 'rooftop', 'mansion', 'real estate'],
    'Business/Finance': ['business', 'office', 'finance', 'money', 'meeting', 'corporate', 'bank', 'stock market'],
    Education: ['school', 'university', 'campus', 'student', 'classroom', 'education', 'library'],
    'Food and Drink': ['food', 'drink', 'restaurant', 'coffee', 'cooking', 'kitchen', 'wine', 'beer', 'meal', 'farm market'],
    'Healthcare/Medical': ['hospital', 'medical', 'doctor', 'nurse', 'health', 'clinic'],
    Holidays: ['christmas', 'holiday', 'halloween', 'thanksgiving', 'new year', 'fireworks', 'easter'],
    Industrial: ['industrial', 'factory', 'construction', 'crane', 'port', 'shipping container', 'warehouse', 'power plant', 'refinery', 'mining', 'quarry', 'solar farm', 'wind turbine', 'site'],
    Nature: ['nature', 'landscape', 'forest', 'tree', 'mountain', 'river', 'lake', 'ocean', 'sea', 'beach', 'coast', 'shore', 'sunset', 'sunrise', 'sky', 'cloud', 'field', 'valley', 'waterfall', 'snow', 'desert', 'island', 'park', 'garden', 'flower', 'water', 'wetland', 'canyon', 'countryside', 'meadow'],
    Objects: ['object', 'tool', 'equipment', 'device', 'product', 'gear'],
    People: ['people', 'person', 'man', 'woman', 'crowd', 'child', 'family', 'couple', 'portrait', 'actor', 'pedestrian', 'tourist', 'worker', 'biker', 'rider'],
    Religion: ['religion', 'church', 'temple', 'mosque', 'cathedral', 'prayer', 'chapel'],
    Science: ['science', 'laboratory', 'research', 'space', 'planet', 'microscope'],
    'Signs/Symbols': ['sign', 'symbol', 'flag', 'logo', 'billboard'],
    'Sports/Recreation': ['sport', 'football', 'soccer', 'baseball', 'basketball', 'golf', 'tennis', 'stadium', 'surf', 'ski', 'hiking', 'cycling', 'running', 'swimming', 'boating', 'kayak', 'recreation', 'playground', 'race'],
    Technology: ['technology', 'computer', 'drone', 'robot', 'screen', 'data', 'digital', 'phone', 'laptop', 'server'],
    Transportation: ['car', 'truck', 'traffic', 'highway', 'road', 'freeway', 'train', 'subway', 'railway', 'airport', 'airplane', 'plane', 'boat', 'ship', 'ferry', 'vehicle', 'motorcycle', 'bus', 'transportation', 'interchange', 'bridge', 'harbor', 'parking']
  }

  var ADOBE_CATS = {
    1: SS_CATS['Animals/Wildlife'],
    2: SS_CATS['Buildings/Landmarks'],
    3: SS_CATS['Business/Finance'],
    4: ['drink', 'coffee', 'wine', 'beer', 'cocktail', 'juice', 'tea'],
    5: ['environment', 'pollution', 'recycling', 'climate', 'solar', 'wind turbine', 'conservation'],
    7: ['food', 'meal', 'restaurant', 'cooking', 'kitchen', 'fruit', 'vegetable'],
    8: SS_CATS['Backgrounds/Textures'],
    9: ['hobby', 'leisure', 'hiking', 'fishing', 'camping', 'boating', 'kayak', 'surf', 'playground', 'golf'],
    10: SS_CATS.Industrial,
    11: ['landscape', 'forest', 'mountain', 'river', 'lake', 'ocean', 'sea', 'beach', 'coast', 'shore', 'sunset', 'sunrise', 'sky', 'cloud', 'field', 'valley', 'waterfall', 'snow', 'desert', 'island', 'canyon', 'countryside', 'meadow', 'aerial'],
    12: ['lifestyle', 'family', 'couple', 'home', 'friends', 'shopping'],
    13: SS_CATS.People,
    14: ['plant', 'flower', 'garden', 'tree', 'leaf', 'blossom'],
    15: SS_CATS.Religion.concat(['culture', 'festival', 'tradition']),
    16: SS_CATS.Science,
    17: ['protest', 'poverty', 'homeless', 'social issue'],
    18: ['sport', 'football', 'soccer', 'baseball', 'basketball', 'tennis', 'stadium', 'ski', 'cycling', 'running', 'swimming', 'race'],
    19: SS_CATS.Technology,
    20: SS_CATS.Transportation,
    21: ['travel', 'tourism', 'tourist', 'vacation', 'landmark', 'statue', 'monument', 'resort', 'cruise']
  }

  // ---- Reading a sheet ----
  function parseCsv(text) {
    text = text.replace(/^﻿/, '');
    var first = text.split(/\r?\n/)[0] || '';
    var count = function (c) { return first.split(c).length; };
    var sep = count('\t') > count(',') && count('\t') > count(';') ? '\t' : count(';') > count(',') ? ';' : ',';
    var rows = [], row = [], cell = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"' && cell === '') q = true;
      else if (ch === sep) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); cell = ''; if (row.some(function (c) { return c.trim(); })) rows.push(row); row = [];
      } else cell += ch;
    }
    row.push(cell); if (row.some(function (c) { return c.trim(); })) rows.push(row);
    return rows;
  }

  var NAMES = {
    file: ['filename', 'originalfilename', 'file name', 'file', 'original filename', 'name'],
    title: ['title', 'headline'],
    desc: ['description', 'caption'],
    keys: ['keywords', 'keyword', 'tags', 'tag'],
    editorial: ['editorial']
  };
  function columns(head) {
    var h = head.map(function (x) { return x.trim().toLowerCase().replace(/[_-]+/g, ' '); });
    var at = {};
    Object.keys(NAMES).forEach(function (k) {
      for (var i = 0; i < NAMES[k].length; i++) { var j = h.indexOf(NAMES[k][i]); if (j !== -1) { at[k] = j; break; } }
    });
    return at;
  }
  function splitKeys(s) {
    var seen = {}, out = [];
    String(s || '').split(/[,;\n]+/).forEach(function (w) {
      w = w.replace(/\s+/g, ' ').trim(); var k = w.toLowerCase();
      if (w && !seen[k]) { seen[k] = 1; out.push(w); }
    });
    return out;
  }
  function clean(t) { return String(t || '').replace(/\s+/g, ' ').trim(); }
  function cut(t, max) {
    if (t.length <= max) return t;
    var c = t.slice(0, max + 1), sp = c.lastIndexOf(' ');
    return (sp > max * 0.6 ? c.slice(0, sp) : t.slice(0, max)).replace(/[\s,;:–—-]+$/, '');
  }

  // ---- Categories picked from the clip's own words (same matching Stock Shredder uses) ----
  function score(clip, table) {
    var keys = clip.keys.map(function (w) { return w.toLowerCase(); });
    var sentence = ' ' + (clip.title + ' ' + clip.desc).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ') + ' ';
    var res = [];
    Object.keys(table).forEach(function (cat) {
      var pts = 0;
      table[cat].forEach(function (term) {
        keys.forEach(function (w, i) {
          var parts = w.split(/\s+/);
          if (w === term || parts.indexOf(term) !== -1 || w === term + 's' || parts.indexOf(term + 's') !== -1) pts += 2 + (keys.length - i) / keys.length;
        });
        if (sentence.indexOf(' ' + term + ' ') !== -1 || sentence.indexOf(' ' + term + 's ') !== -1) pts += 1;
      });
      if (pts > 0) res.push([cat, pts]);
    });
    return res.sort(function (a, b) { return b[1] - a[1]; });
  }
  function ssCats(c) {
    var r = score(c, SS_CATS);
    if (!r.length) return 'Nature';
    var p = [r[0][0]]; if (r[1] && r[1][1] >= r[0][1] / 2) p.push(r[1][0]);
    return p.join(',');
  }
  function adobeCat(c) { var r = score(c, ADOBE_CATS); return String(r.length ? r[0][0] : 11); }

  // ---- Writing each site's sheet ----
  function cell(v) {
    v = String(v == null ? '' : v);
    if (/^[=+\-@]/.test(v)) v = "'" + v; // a spreadsheet never runs a cell as a formula
    return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  function csv(lines) { return '﻿' + lines.map(function (r) { return r.map(cell).join(','); }).join('\r\n') + '\r\n'; }
  var yn = function (b) { return b ? 'Yes' : 'No'; };
  var POND5 = ['originalfilename', 'title', 'description', 'keywords', 'city', 'region', 'country', 'specifysource', 'modelreleased', 'propertyreleased', 'release', 'copyright', 'price', 'editorial'];

  function build(clips, opts) {
    var notes = { adobe: [], shutterstock: [], pond5: [] };
    var note = function (site, level, text) { notes[site].push([level, text]); };
    var adobe = [['Filename', 'Title', 'Keywords', 'Category', 'Releases']];
    var ss = [['Filename', 'Description', 'Keywords', 'Categories', 'Illustration', 'Mature Content', 'Editorial']];
    var p5 = [POND5.slice()];
    var n = { aTitle: 0, aComma: 0, aName: 0, aKeys: 0, sKeys: 0, sFew: 0, sLong: 0, pTitle: 0, pDesc: 0, pKeys: 0, noKeys: 0, noName: 0 };
    clips.forEach(function (c) {
      if (!c.file) n.noName++;
      if (!c.keys.length) n.noKeys++;
      var aT = (c.title || c.desc).replace(/,/g, '');
      if ((c.title || c.desc).indexOf(',') !== -1) n.aComma++;
      if (aT.length > 70) n.aTitle++;
      if (c.file.length > 30) n.aName++;
      if (c.keys.length > 49) n.aKeys++;
      adobe.push([c.file, cut(aT, 70), c.keys.slice(0, 49).join(', '), adobeCat(c), '']);
      var sD = c.desc || c.title;
      if (sD.length > 200) n.sLong++;
      if (c.keys.length > 50) n.sKeys++;
      if (c.keys.length && c.keys.length < 7) n.sFew++;
      ss.push([c.file, cut(sD, 200), c.keys.slice(0, 50).join(', '), ssCats(c), 'No', 'No', yn(c.editorial || opts.editorial)]);
      var pT = c.title || c.desc;
      if (pT.length > 80) n.pTitle++;
      if (c.desc.length > 500) n.pDesc++;
      if (c.keys.length > 50) n.pKeys++;
      p5.push([c.file, cut(pT, 80), cut(c.desc, 500), c.keys.slice(0, 50).join(', '), '', '', '', '', '', '', '', '', opts.price || '', c.editorial || opts.editorial ? 'yes' : 'no']);
    });
    var s = function (k, one, many) { return n[k] === 1 ? one : n[k] + ' ' + many; };
    var all = [];
    if (n.noName) all.push(['fail', s('noName', '1 row has', 'rows have') + ' no file name. Every site matches a row to an upload by its file name, with the extension.']);
    if (n.noKeys) all.push(['fail', s('noKeys', '1 row has', 'rows have') + ' no keywords. All three sites require them.']);
    if (n.aComma) note('adobe', 'info', 'Commas taken out of ' + s('aComma', '1 title', 'titles') + '. Adobe asks for titles without commas.');
    if (n.aTitle) note('adobe', 'warn', s('aTitle', '1 title was', 'titles were') + ' shortened to 70 characters, Adobe\'s limit.');
    if (n.aKeys) note('adobe', 'warn', s('aKeys', '1 clip had', 'clips had') + ' more than 49 keywords. The first 49 were kept.');
    if (n.aName) note('adobe', 'fail', s('aName', '1 file name is', 'file names are') + ' over 30 characters. Adobe\'s CSV page sets 30 as the limit, so rename ' + (n.aName === 1 ? 'it' : 'them') + ' before uploading.');
    note('adobe', 'info', 'Category is a number picked from each clip\'s keywords. Releases is left empty.');
    if (clips.length > 5000) note('adobe', 'fail', 'Adobe takes up to 5,000 rows per sheet. Split this one.');
    if (n.sLong) note('shutterstock', 'warn', s('sLong', '1 description was', 'descriptions were') + ' shortened to 200 characters so it reads as one line.');
    if (n.sKeys) note('shutterstock', 'warn', s('sKeys', '1 clip had', 'clips had') + ' more than 50 keywords. The first 50 were kept.');
    if (n.sFew) note('shutterstock', 'fail', s('sFew', '1 clip has', 'clips have') + ' fewer than 7 keywords. Shutterstock needs at least 7.');
    note('shutterstock', 'info', 'Categories are picked from each clip\'s keywords (one or two). Illustration and Mature Content are set to No.');
    if (n.pTitle) note('pond5', 'warn', s('pTitle', '1 title was', 'titles were') + ' shortened to 80 characters, Pond5\'s limit.');
    if (n.pDesc) note('pond5', 'warn', s('pDesc', '1 description was', 'descriptions were') + ' shortened to 500 characters, Pond5\'s limit.');
    if (n.pKeys) note('pond5', 'warn', s('pKeys', '1 clip had', 'clips had') + ' more than 50 keywords. The first 50 were kept.');
    note('pond5', 'info', opts.price ? 'Price set to $' + opts.price + ' for every clip. Pond5 places video in its price tiers.' : 'Price, location and releases are left empty to fill in on Pond5.');
    return { files: { adobe: csv(adobe), shutterstock: csv(ss), pond5: csv(p5) }, notes: notes, all: all, rows: { adobe: adobe, shutterstock: ss, pond5: p5 } };
  }

  // ---- Page ----
  var SITES = { adobe: 'Adobe Stock', shutterstock: 'Shutterstock', pond5: 'Pond5' };
  var current = null, sent = false, fromExample = false;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (x) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[x]; }); }
  var li = function (x) { return '<li class="tc-' + x[0] + '">' + x[1] + '</li>'; };

  function run() {
    var rows = parseCsv(area.value);
    $('sc-out').hidden = true; $('sc-msg').textContent = '';
    if (!area.value.trim()) return;
    if (rows.length < 2) { $('sc-msg').textContent = 'Paste a header row and at least one clip row.'; return; }
    var at = columns(rows[0]);
    if (at.file === undefined || at.keys === undefined) {
      $('sc-msg').textContent = 'Couldn\'t find a file name column and a keywords column in the first row. Name them Filename and Keywords.';
      return;
    }
    var clips = rows.slice(1).map(function (r) {
      var ed = at.editorial !== undefined ? String(r[at.editorial] || '').trim().toLowerCase() : '';
      return {
        file: clean(r[at.file]), title: clean(at.title !== undefined ? r[at.title] : ''), desc: clean(at.desc !== undefined ? r[at.desc] : ''),
        keys: splitKeys(r[at.keys]), editorial: ed === 'yes' || ed === 'true' || ed === '1'
      };
    }).filter(function (c) { return c.file || c.title || c.keys.length; });
    var price = String($('sc-price').value || '').replace(/[^0-9.]/g, '');
    current = build(clips, { editorial: $('sc-ed').checked, price: price });
    var found = ['file name'].concat(at.title !== undefined ? ['title'] : [], at.desc !== undefined ? ['description'] : [], ['keywords'], at.editorial !== undefined ? ['editorial'] : []);
    var stop = current.all.some(function (x) { return x[0] === 'fail'; });
    var siteFix = Object.keys(SITES).filter(function (k) { return current.notes[k].some(function (x) { return x[0] === 'fail'; }); }).map(function (k) { return SITES[k]; });
    $('sc-summary').innerHTML = '<strong>' + clips.length + (clips.length === 1 ? ' clip' : ' clips') + ', 3 sheets ready</strong><span>Read columns: ' + found.join(', ') + '. ' +
      (stop ? 'Fix the rows marked below, then paste again.' : siteFix.length ? 'Check what\'s marked Fix first for ' + siteFix.join(' and ') + ' before uploading there. The rest are ready.' : 'Save the sheet for each site, upload your clips there first, then add the sheet.') + '</span>';
    $('sc-general').innerHTML = current.all.map(li).join('');
    $('sc-general').parentNode.hidden = !current.all.length;
    $('sc-sitelist').innerHTML = Object.keys(SITES).map(function (s) {
      var list = current.notes[s], st = list.some(function (x) { return x[0] === 'fail'; }) ? 'fail' : list.some(function (x) { return x[0] === 'warn'; }) ? 'warn' : 'ok';
      var head = current.rows[s][0], first = current.rows[s][1] || [];
      var peek = '<div class="sc-peek"><table><tr>' + head.slice(0, 4).map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr><tr>' +
        first.slice(0, 4).map(function (v) { return '<td>' + esc(String(v).length > 60 ? String(v).slice(0, 58) + '...' : v) + '</td>'; }).join('') + '</tr></table></div>';
      return '<section class="tc-site tc-' + st + '"><header><h3>' + SITES[s] + '</h3><span class="tc-chip">' + (st === 'fail' ? 'Fix first' : st === 'warn' ? 'Changed' : 'Ready') + '</span></header>' +
        '<ul>' + list.map(li).join('') + '</ul>' + peek +
        '<p class="tc-actions"><button type="button" class="tc-btn sc-save" data-site="' + s + '">Save ' + SITES[s] + ' sheet</button></p></section>';
    }).join('');
    $('sc-out').hidden = false;
  }

  function save(site) {
    if (!current) return;
    var blob = new Blob([current.files[site]], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = SITES[site] + ' upload sheet.csv';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    if (!sent && !fromExample) { sent = true; window.dwEvent ? window.dwEvent('tool-sheet-done') : (window.dwQueue = window.dwQueue || []).push('tool-sheet-done'); }
  }

  var timer;
  area.addEventListener('input', function () { fromExample = false; clearTimeout(timer); timer = setTimeout(run, 200); });
  $('sc-ed').addEventListener('change', run);
  $('sc-price').addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 200); });
  $('sc-sitelist').addEventListener('click', function (e) { var b = e.target.closest('.sc-save'); if (b) save(b.getAttribute('data-site')); });
  function readFile(f) {
    if (!f) return;
    if (f.size > 20e6) { $('sc-msg').textContent = 'That file is over 20 MB. A metadata sheet is usually under 1 MB.'; return; }
    var r = new FileReader();
    r.onload = function () { area.value = String(r.result); fromExample = false; run(); };
    r.readAsText(f);
  }
  $('sc-file').addEventListener('change', function () { readFile(this.files[0]); this.value = ''; });
  ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('cs-over'); }); });
  ['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function () { drop.classList.remove('cs-over'); }); });
  drop.addEventListener('drop', function (e) { e.preventDefault(); readFile(e.dataTransfer.files[0]); });
  $('sc-sample').addEventListener('click', function () {
    area.value = 'Filename,Title,Description,Keywords\n' +
      'A001_C004_sunset.mov,"Rider on a motorcycle on a mountain road at sunset","Slow tracking shot of a rider on a winding mountain road, warm evening light","motorcycle, rider, mountain road, sunset, golden hour, travel, adventure, freedom, road trip, curve"\n' +
      'A001_C011_city.mov,Aerial view of a city skyline at dusk with traffic below,"Drone shot pulling back over downtown towers as the lights come on","aerial, city, skyline, dusk, traffic, downtown, drone, urban, lights, buildings"';
    fromExample = true; run();
  });
  $('sc-clear').addEventListener('click', function () { area.value = ''; current = null; run(); area.focus(); });
  Array.prototype.forEach.call(document.querySelectorAll('#sheet-converter a[data-cta]'), function (a) {
    a.addEventListener('click', function () { if (window.dwEvent) window.dwEvent('tool-sheet-cta'); });
  });
})();
