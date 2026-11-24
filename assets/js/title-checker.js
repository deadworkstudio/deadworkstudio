/* Free stock clip title and keyword checker (guides/stock-footage-title-keyword-checker/).
   Everything runs in the page. Nothing typed here is sent anywhere.
   Rules checked against each site's contributor help pages, November 2026. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var title = $('tc-title'), desc = $('tc-desc'), kw = $('tc-kw');
  if (!title || !kw) return;
  var out = $('tc-out'), cleanBox = $('tc-clean');

  var SITES = {
    adobe: 'Adobe Stock',
    shutterstock: 'Shutterstock',
    pond5: 'Pond5',
    storyblocks: 'Storyblocks'
  };

  // Brand and product names, with a plain word buyers search instead.
  // Words that are also everyday words (apple, amazon, shell, jaguar) are left out on purpose.
  var BRANDS = {
    'iphone': 'smartphone', 'ipad': 'tablet', 'macbook': 'laptop', 'imac': 'computer', 'airpods': 'earbuds',
    'apple watch': 'smartwatch', 'gopro': 'action camera', 'dji': 'drone', 'mavic': 'drone',
    'tesla': 'electric car', 'bmw': 'car', 'mercedes': 'car', 'mercedes-benz': 'car', 'audi': 'car',
    'porsche': 'sports car', 'ferrari': 'sports car', 'lamborghini': 'sports car', 'toyota': 'car',
    'chevrolet': 'car', 'chevy': 'car', 'cadillac': 'car', 'volkswagen': 'car', 'mustang': 'muscle car',
    'harley': 'motorcycle', 'harley-davidson': 'motorcycle', 'harley davidson': 'motorcycle',
    'ducati': 'motorcycle', 'kawasaki': 'motorcycle', 'yamaha': 'motorcycle', 'jeep': 'off-road vehicle',
    'land rover': 'off-road vehicle', 'nike': 'sneakers', 'adidas': 'sneakers', 'coca-cola': 'soda',
    'coca cola': 'soda', 'pepsi': 'soda', 'red bull': 'energy drink', 'starbucks': 'coffee shop',
    "mcdonald's": 'fast food', 'mcdonalds': 'fast food', 'lego': 'toy bricks', 'disney': 'theme park',
    'instagram': 'social media', 'facebook': 'social media', 'tiktok': 'social media', 'youtube': 'online video',
    'google': 'internet search', 'samsung': 'smartphone', 'netflix': 'streaming', 'uber': 'ride share',
    'airbnb': 'vacation rental', 'ikea': 'furniture', 'rolex': 'wristwatch', 'gucci': 'luxury fashion',
    'louis vuitton': 'luxury bag', 'chanel': 'luxury fashion', 'playstation': 'video game', 'xbox': 'video game',
    'nintendo': 'video game', 'zoom call': 'video call', 'jacuzzi': 'hot tub', 'frisbee': 'flying disc',
    'jet ski': 'personal watercraft', 'jetski': 'personal watercraft', 'velcro': 'hook and loop',
    'kleenex': 'tissue', 'styrofoam': 'foam', 'post-it': 'sticky note', 'band-aid': 'bandage',
    'popsicle': 'ice pop', 'ziploc': 'plastic bag', 'segway': 'personal transporter', 'taser': 'stun gun',
    'polaroid': 'instant photo', 'sharpie': 'marker', 'jeep wrangler': 'off-road vehicle'
  };

  // Camera and file details. Buyers search for what is in the shot, not how it was shot.
  var GEAR = /^(4k|5k|6k|8k|uhd|fhd|1080p?|2160p?|4320p|720p|\d{2,3} ?fps|fps|prores|h\.?26[45]|hevc|braw|r3d|s-?log ?\d?|c-?log ?\d?|rec ?\.?709|10 ?bit|8 ?bit|\d{1,3} ?mm|f\/\d+(\.\d)?|iso ?\d+|gimbal|shot on .*|sony.*|canon.*|nikon.*|fujifilm.*|panasonic.*|blackmagic.*|arri.*|red komodo|komodo|fx3|fx6|fx30|a7s ?(iii|3)?|bmpcc.*|ursa.*)$/i;

  // Words almost every clip could carry, so they help nobody find yours.
  var FILLER = ['stock', 'footage', 'stock footage', 'stock video', 'video', 'clip', 'clips', 'royalty free',
    'royalty-free', 'free', 'hd', 'high quality', 'hq', 'best', 'amazing', 'awesome', 'cool', 'nice', 'cinematic footage',
    'b-roll', 'broll', 'b roll'];

  var STOP = ('a an and the to of for in on at by with from into over under near as or is are was be it its ' +
    'this that these those his her their our your my one two three very').split(' ');

  function norm(s) { return s.toLowerCase().replace(/\s+/g, ' ').trim(); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function singular(w) {
    if (w.length > 4 && /ies$/.test(w)) return w.slice(0, -3) + 'y';
    if (w.length > 4 && /(ches|shes|sses|xes)$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && /s$/.test(w) && !/(ss|us|is)$/.test(w)) return w.slice(0, -1);
    return w;
  }

  function parseKeywords(raw) {
    var note = '';
    var parts;
    if (/[,;\n]/.test(raw)) parts = raw.split(/[,;\n]+/);
    else {
      parts = raw.trim() ? raw.trim().split(/\s+/) : [];
      if (parts.length > 1) note = 'No commas found, so each word was read as its own keyword. Separate keywords with commas to keep phrases like "golden hour" together.';
    }
    return { list: parts.map(norm).filter(Boolean), note: note };
  }

  function brandIn(text) {
    var t = ' ' + norm(text).replace(/[^\p{L}\p{N}' -]+/gu, ' ') + ' ';
    var found = [];
    Object.keys(BRANDS).forEach(function (b) {
      if (t.indexOf(' ' + b + ' ') !== -1 || t.indexOf(' ' + b + "'s ") !== -1 || t.indexOf(' ' + b + 's ') !== -1) found.push(b);
    });
    // Prefer the longer match ("harley davidson" over "harley").
    return found.filter(function (b) { return !found.some(function (o) { return o !== b && o.indexOf(b) !== -1; }); });
  }

  function gearInTitle(text) {
    var words = norm(text).split(/[\s,]+/);
    var hits = [];
    for (var i = 0; i < words.length; i++) {
      var w = words[i].replace(/[.;:!?()]+$/, '');
      var w2 = i + 1 < words.length ? w + ' ' + words[i + 1] : '';
      if (w2 && GEAR.test(w2) && /\d/.test(w2) && !GEAR.test(w)) { hits.push(w2); i++; continue; }
      if (w && GEAR.test(w)) hits.push(w);
    }
    return hits;
  }

  function nonLatin(text) { return /[^\p{Script=Latin}\p{Script=Common}\p{M}\s]/u.test(text); }
  function hasEmoji(text) { return /\p{Extended_Pictographic}/u.test(text); }
  function hasLink(text) { return /(https?:\/\/|www\.|\.com\b|\.net\b|\.org\b)/i.test(text); }
  function pond5Chars(text) {
    var m = text.match(/[&()\/?@%"À-ɏ]/g);
    return m ? Array.from(new Set(m)) : [];
  }

  function titleWords(t) {
    return norm(t).replace(/[^\p{L}\p{N}' -]+/gu, ' ').split(/\s+/).filter(function (w) {
      return w.length > 2 && STOP.indexOf(w) === -1;
    });
  }

  function check() {
    var t = title.value.trim();
    var d = desc ? desc.value.trim() : '';
    var parsed = parseKeywords(kw.value);
    var keys = parsed.list;
    var sel = {};
    Array.prototype.forEach.call(document.querySelectorAll('.tc-sites input'), function (c) { sel[c.value] = c.checked; });

    $('tc-title-n').textContent = t.length;
    if (desc) $('tc-desc-n').textContent = d.length;
    $('tc-kw-n').textContent = keys.length;

    if (!t && !keys.length) {
      out.hidden = true; cleanBox.hidden = true;
      return;
    }
    out.hidden = false;

    // ---- Checks that apply everywhere ----
    var general = [];
    var seen = {}, dupes = [], singles = {}, plural = [];
    keys.forEach(function (k) {
      if (seen[k]) { if (dupes.indexOf(k) === -1) dupes.push(k); return; }
      seen[k] = 1;
      var s = k.split(' ').map(singular).join(' ');
      if (singles[s] && singles[s] !== k) plural.push(singles[s] + ' / ' + k);
      else singles[s] = k;
    });
    var brands = brandIn(t + ' ' + d + ' ' + keys.join(' , '));
    var gearKeys = keys.filter(function (k) { return GEAR.test(k); });
    var gearTitle = gearInTitle(t);
    var filler = keys.filter(function (k) { return FILLER.indexOf(k) !== -1; });
    var longKeys = keys.filter(function (k) { return k.split(' ').length > 3; });
    var tw = titleWords(t);
    var repeatTitle = tw.filter(function (w, i) { return tw.indexOf(w) !== i; });
    var keySet = {};
    keys.forEach(function (k) { k.split(' ').forEach(function (w) { keySet[singular(w)] = 1; }); });
    var missing = keys.length ? tw.filter(function (w, i) { return tw.indexOf(w) === i && !keySet[singular(w)] && !GEAR.test(w); }) : [];
    var all = t + ' ' + d + ' ' + keys.join(' ');

    if (dupes.length) general.push(['fail', 'Repeated keywords: <b>' + dupes.map(esc).join(', ') + '</b>. Every site counts this as spam. Use each keyword once.']);
    if (plural.length) general.push(['warn', 'Same word twice, singular and plural: <b>' + plural.map(esc).join(', ') + '</b>. Search already matches both, so one is a wasted slot.']);
    if (brands.length) general.push(['fail', 'Brand or product names: ' + brands.map(function (b) { return '<b>' + esc(b) + '</b> (try <i>' + esc(BRANDS[b]) + '</i>)'; }).join(', ') + '. Clips for commercial use can\'t carry trademarks. Keep them only if the clip is editorial.']);
    if (gearKeys.length || gearTitle.length) general.push(['warn', 'Camera or file details: <b>' + gearKeys.concat(gearTitle).filter(function (v, i, a) { return a.indexOf(v) === i; }).map(esc).join(', ') + '</b>. Buyers search for what\'s in the shot. Shutterstock asks for no camera information at all, and the site already shows resolution and frame rate.']);
    if (filler.length) general.push(['warn', 'Filler keywords: <b>' + filler.map(esc).join(', ') + '</b>. Every clip on a stock site is stock footage, so these don\'t help anyone find yours.']);
    if (longKeys.length) general.push(['warn', 'Long keywords: <b>' + longKeys.slice(0, 4).map(esc).join(', ') + '</b>. Keywords work best as one to three words. Put full phrases in the title.']);
    if (t && t === t.toUpperCase() && /[A-Z]/.test(t)) general.push(['warn', 'The title is all capitals. Write it like a normal sentence.']);
    if (t && (t.match(/,/g) || []).length >= 3) general.push(['warn', 'The title reads like a keyword list. Write one plain sentence: who or what, doing what, where, and when.']);
    if (repeatTitle.length) general.push(['warn', 'The title repeats <b>' + Array.from(new Set(repeatTitle)).map(esc).join(', ') + '</b>. Say it once.']);
    if (missing.length && keys.length >= 3) general.push(['warn', 'In the title but not in the keywords: <b>' + missing.slice(0, 8).map(esc).join(', ') + '</b>. If they describe the shot, add them near the top of your keywords.']);
    if (hasEmoji(all)) general.push(['fail', 'Emoji found. Titles and keywords should be plain text.']);
    if (hasLink(all)) general.push(['fail', 'A link or web address was found. Sites reject links in titles and keywords.']);
    if (nonLatin(all)) general.push(['warn', 'Some text isn\'t in the Latin alphabet. Shutterstock wants English, and Adobe wants one language that matches your account.']);
    if (t && t.length < 16) general.push(['warn', 'The title is very short. Say what\'s in the shot, plus the place or time of day if it matters.']);
    if (!general.length) general.push(['ok', 'No repeats, brand names, camera details or filler found.']);

    // ---- Per site ----
    var rows = {};
    var n = keys.length, uniq = Object.keys(seen).length;
    var ssText = d || t;

    rows.adobe = [
      !t ? ['warn', 'Add a title.'] : t.length > 200 ? ['fail', 'Title is ' + t.length + ' characters. Adobe titles should be short, ideally under 70.'] : t.length > 70 ? ['warn', 'Title is ' + t.length + ' characters. Adobe suggests under 70.'] : ['ok', 'Title is ' + t.length + ' characters. Adobe suggests under 70.'],
      n > 49 ? ['fail', n + ' keywords. Adobe takes up to 49.'] : n ? ['ok', n + ' keywords. Adobe takes up to 49.'] : ['warn', 'Add keywords.'],
      n ? ['info', 'Adobe gives the first 10 keywords the most weight. Check your top 10 below.'] : null
    ];
    rows.shutterstock = [
      !ssText ? ['warn', 'Add a title or description.'] : ssText.length > 2048 ? ['fail', 'Description is ' + ssText.length + ' characters. Shutterstock allows up to 2,048.'] : ['ok', (d ? 'Description' : 'Title') + ' fits Shutterstock\'s 2,048 character limit. Shutterstock uses one description field, so it should read as a sentence.'],
      n < 7 ? ['fail', n + ' keywords. Shutterstock needs at least 7.'] : n > 50 ? ['fail', n + ' keywords. Shutterstock takes up to 50.'] : ['ok', n + ' keywords. Shutterstock takes 7 to 50.'],
      (gearKeys.length || gearTitle.length) ? ['fail', 'Shutterstock asks for no camera information in the description or keywords.'] : null,
      nonLatin(all) ? ['fail', 'Shutterstock wants titles and keywords in English.'] : null
    ];
    var pc = pond5Chars(t + ' ' + keys.join(' '));
    rows.pond5 = [
      !t ? ['warn', 'Add a title.'] : t.length > 80 ? ['warn', 'Title is ' + t.length + ' characters. Keep Pond5 titles under 80 so they aren\'t cut short.'] : ['ok', 'Title is ' + t.length + ' characters, under 80.'],
      n > 50 ? ['fail', n + ' keywords. Pond5 takes up to 50.'] : n < 5 ? ['warn', n + ' keywords. Pond5 says 10 to 20 good ones work best.'] : n > 20 ? ['info', n + ' keywords. Pond5 takes up to 50 and says 10 to 20 good ones work best.'] : ['ok', n + ' keywords. Pond5 says 10 to 20 good ones work best.'],
      pc.length ? ['warn', 'Characters that can break a Pond5 upload sheet: <b>' + pc.map(esc).join(' ') + '</b>. Fine in the upload form, risky in a CSV.'] : null
    ];
    rows.storyblocks = [
      !t ? ['warn', 'Add a title.'] : t.length < 16 ? ['fail', 'Title is ' + t.length + ' characters. Storyblocks needs at least 16.'] : t.length > 140 ? ['fail', 'Title is ' + t.length + ' characters. Storyblocks allows up to 140.'] : ['ok', 'Title is ' + t.length + ' characters. Storyblocks takes 16 to 140 and suggests about 65.'],
      n < 6 ? ['fail', n + ' keywords. Storyblocks needs at least 6.'] : n > 100 ? ['fail', n + ' keywords. Storyblocks takes up to 100.'] : (n < 15 || n > 30) ? ['warn', n + ' keywords. Storyblocks suggests 15 to 30.'] : ['ok', n + ' keywords. Storyblocks suggests 15 to 30.'],
      ['info', 'Storyblocks rejects a title that matches another clip of yours word for word. Change at least one word per clip.']
    ];

    var shared = general.filter(function (g) { return g[0] === 'fail'; }).length;
    var html = '';
    var ready = 0, picked = 0;
    Object.keys(SITES).forEach(function (s) {
      if (!sel[s]) return;
      picked++;
      var r = rows[s].filter(Boolean);
      var fails = r.filter(function (x) { return x[0] === 'fail'; }).length + shared;
      var warns = r.filter(function (x) { return x[0] === 'warn'; }).length;
      if (!fails) ready++;
      var state = fails ? 'fail' : warns ? 'warn' : 'ok';
      var label = fails ? (fails === 1 ? '1 problem' : fails + ' problems') : warns ? 'Check' : 'Ready';
      html += '<section class="tc-site tc-' + state + '"><header><h3>' + SITES[s] + '</h3><span class="tc-chip">' + label + '</span></header><ul>' +
        r.map(function (x) { return '<li class="tc-' + x[0] + '">' + x[1] + '</li>'; }).join('') +
        (shared ? '<li class="tc-fail">Plus the ' + (shared === 1 ? 'problem' : shared + ' problems') + ' listed under All sites.</li>' : '') +
        '</ul></section>';
    });

    $('tc-summary').innerHTML = picked
      ? '<strong>' + (picked === 1 ? (ready ? 'Ready for ' : 'Not ready yet for ') + SITES[Object.keys(SITES).filter(function (k) { return sel[k]; })[0]] : ready === picked ? 'Ready for all ' + picked + ' sites' : 'Ready for ' + ready + ' of ' + picked + ' sites') + '</strong>' +
        (parsed.note ? '<span>' + esc(parsed.note) + '</span>' : '')
      : '<strong>Pick at least one site.</strong>';
    $('tc-general').innerHTML = general.map(function (g) { return '<li class="tc-' + g[0] + '">' + g[1] + '</li>'; }).join('');
    $('tc-sitelist').innerHTML = html;

    // ---- Cleaned keyword list ----
    if (!n) { cleanBox.hidden = true; return; }
    var keep = [], used = {};
    keys.forEach(function (k) {
      var s = k.split(' ').map(singular).join(' ');
      if (used[s] || FILLER.indexOf(k) !== -1 || GEAR.test(k) || BRANDS[k]) return;
      used[s] = 1; keep.push(k);
    });
    // Words from the title go to the top, in title order. Adobe weighs the first 10 most.
    var top = [], rest = [];
    keep.forEach(function (k) {
      var inTitle = k.split(' ').every(function (w) { return tw.some(function (x) { return singular(x) === singular(w); }); });
      (inTitle ? top : rest).push(k);
    });
    var tOrder = function (k) { var i = tw.map(singular).indexOf(singular(k.split(' ')[0])); return i === -1 ? 99 : i; };
    top.sort(function (a, b) { return tOrder(a) - tOrder(b); });
    var final = top.concat(rest).slice(0, 49);
    var removed = n - final.length;
    cleanBox.hidden = false;
    $('tc-clean-list').innerHTML = final.map(function (k, i) { return '<li' + (i < 10 ? ' class="tc-top"' : '') + '>' + esc(k) + '</li>'; }).join('');
    $('tc-clean-note').textContent = final.length + ' keywords' + (removed > 0 ? ', ' + removed + ' removed (repeats, filler, camera details and brand names)' : '') +
      '. Words from your title moved to the top. The first 10 are marked.';
    cleanBox.dataset.copy = final.join(', ');
  }

  var timer;
  function soon() { clearTimeout(timer); timer = setTimeout(check, 120); }
  [title, desc, kw].forEach(function (el) { if (el) el.addEventListener('input', soon); });
  Array.prototype.forEach.call(document.querySelectorAll('.tc-sites input'), function (c) { c.addEventListener('change', check); });

  $('tc-sample').addEventListener('click', function () {
    title.value = 'Harley motorcycle 4K, rider, mountain road, sunset, cinematic';
    if (desc) desc.value = '';
    kw.value = 'motorcycle, motorcycles, rider, biker, mountain road, sunset, golden hour, stock footage, 4K, slog3, Harley, travel, freedom, adventure, road trip, curve, highway, motorcycle, helmet, leather jacket, landscape, mountains, dusk, video';
    check();
    title.focus();
  });
  $('tc-clear').addEventListener('click', function () {
    title.value = ''; if (desc) desc.value = ''; kw.value = '';
    check(); title.focus();
  });
  $('tc-copy').addEventListener('click', function () {
    var b = this, text = cleanBox.dataset.copy || '';
    var done = function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy keywords'; }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () {});
    else { var a = document.createElement('textarea'); a.value = text; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); done(); } catch (e) {} a.remove(); }
  });
  $('tc-use').addEventListener('click', function () {
    kw.value = cleanBox.dataset.copy || ''; check();
  });

  check();
})();
