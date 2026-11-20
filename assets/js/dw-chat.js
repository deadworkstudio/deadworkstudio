// DEADWORK site chat: our own chat box (replaced the Tawk.to bubble).
// Name + email first, then chat. Inside team hours the team answers live from the HQ inbox;
// outside them the box says we'll email back and the message goes to the team's email.
// Backend: deadwork-hq Worker, src/siteChat.ts (/chat/status, /chat/start, /chat/send, /chat/poll).
//
// Loaded on demand by main.js / ss-page.js (after the first scroll, tap or key press). Self-contained:
// injects its own styles, needs no markup. window.DWChatConfig (optional, set before loading):
//   api              Worker base URL
//   hideLauncherBelow  hide the floating button at or under this width (the page has its own link)
//   bottom           launcher distance from the bottom, px
// Public: window.DWChat.open(), window.DWChat.close()
(function () {
  'use strict';
  if (window.DWChat) return;

  var cfg = window.DWChatConfig || {};
  var API = cfg.api || 'https://deadwork-hq.stockshredder.workers.dev';
  var STORE_KEY = 'dwchat';

  // ---- words, 7 languages ----
  var T = {
    en: { launcher: 'Chat', title: 'Talk to us', here: 'Team is here', hereSub: 'Replies in a few minutes', away: 'Team is out', awaySub: "We'll email you back", hours: 'Mon to Fri, 9 AM to 6 PM CT', name: 'Name', email: 'Email', start: 'Start chat', privacy: 'We only use your email to answer you.', placeholder: 'Write a message', send: 'Send', sentHere: 'Sent. The team will answer here. If you leave, the answer goes to your email.', sentAway: "Got it. We'll email you at {email}.", errName: 'Add your name.', errEmail: 'Check your email.', errSend: "Didn't send. Try again.", errLimit: 'Too many messages. Wait a few minutes.', you: 'You', close: 'Close chat', open: 'Open chat', startOver: 'Start over', awayNote: 'We\'re out right now. Leave a message and we\'ll email you back.', message: 'Message', sendMail: 'Send', errMsg: 'Write your message.', ended: 'Chat ended. Write any time to pick it back up.' },
    es: { launcher: 'Chat', title: 'Habla con nosotros', here: 'El equipo está aquí', hereSub: 'Respondemos en minutos', away: 'El equipo no está', awaySub: 'Te respondemos por email', hours: 'Lun a vie, 9 AM a 6 PM CT', name: 'Nombre', email: 'Email', start: 'Empezar chat', privacy: 'Solo usamos tu email para responderte.', placeholder: 'Escribe un mensaje', send: 'Enviar', sentHere: 'Enviado. El equipo responderá aquí. Si te vas, la respuesta llega a tu email.', sentAway: 'Recibido. Te escribimos a {email}.', errName: 'Escribe tu nombre.', errEmail: 'Revisa tu email.', errSend: 'No se envió. Inténtalo de nuevo.', errLimit: 'Demasiados mensajes. Espera unos minutos.', you: 'Tú', close: 'Cerrar chat', open: 'Abrir chat', startOver: 'Empezar de nuevo', awayNote: 'Ahora no estamos. Déjanos un mensaje y te respondemos por email.', message: 'Mensaje', sendMail: 'Enviar', errMsg: 'Escribe tu mensaje.', ended: 'Chat finalizado. Escribe cuando quieras para seguir.' },
    fr: { launcher: 'Chat', title: 'Parlez-nous', here: "L'équipe est là", hereSub: 'Réponse en quelques minutes', away: "L'équipe est absente", awaySub: 'On vous répond par email', hours: 'Lun au ven, 9 h à 18 h CT', name: 'Nom', email: 'Email', start: 'Démarrer le chat', privacy: 'Votre email sert uniquement à vous répondre.', placeholder: 'Écrivez un message', send: 'Envoyer', sentHere: "Envoyé. L'équipe répond ici. Si vous partez, la réponse arrive par email.", sentAway: 'Bien reçu. On vous écrit à {email}.', errName: 'Ajoutez votre nom.', errEmail: 'Vérifiez votre email.', errSend: 'Pas envoyé. Réessayez.', errLimit: 'Trop de messages. Attendez quelques minutes.', you: 'Vous', close: 'Fermer le chat', open: 'Ouvrir le chat', startOver: 'Recommencer', awayNote: 'Nous sommes absents. Laissez un message, on vous répond par email.', message: 'Message', sendMail: 'Envoyer', errMsg: 'Écrivez votre message.', ended: 'Chat terminé. Écrivez quand vous voulez pour reprendre.' },
    de: { launcher: 'Chat', title: 'Schreib uns', here: 'Das Team ist da', hereSub: 'Antwort in wenigen Minuten', away: 'Das Team ist nicht da', awaySub: 'Wir antworten per E-Mail', hours: 'Mo bis Fr, 9 bis 18 Uhr CT', name: 'Name', email: 'E-Mail', start: 'Chat starten', privacy: 'Wir nutzen deine E-Mail nur für die Antwort.', placeholder: 'Nachricht schreiben', send: 'Senden', sentHere: 'Gesendet. Das Team antwortet hier. Wenn du gehst, kommt die Antwort per E-Mail.', sentAway: 'Angekommen. Wir schreiben dir an {email}.', errName: 'Gib deinen Namen ein.', errEmail: 'Prüf deine E-Mail.', errSend: 'Nicht gesendet. Versuch es noch mal.', errLimit: 'Zu viele Nachrichten. Warte ein paar Minuten.', you: 'Du', close: 'Chat schließen', open: 'Chat öffnen', startOver: 'Neu anfangen', awayNote: 'Wir sind gerade nicht da. Schreib uns, wir antworten per E-Mail.', message: 'Nachricht', sendMail: 'Senden', errMsg: 'Schreib deine Nachricht.', ended: 'Chat beendet. Schreib jederzeit, um weiterzumachen.' },
    it: { launcher: 'Chat', title: 'Scrivici', here: 'Il team è qui', hereSub: 'Risposta in pochi minuti', away: "Il team non c'è", awaySub: 'Ti rispondiamo via email', hours: 'Da lun a ven, 9-18 CT', name: 'Nome', email: 'Email', start: 'Inizia la chat', privacy: 'Usiamo la tua email solo per risponderti.', placeholder: 'Scrivi un messaggio', send: 'Invia', sentHere: 'Inviato. Il team risponde qui. Se esci, la risposta arriva via email.', sentAway: 'Ricevuto. Ti scriviamo a {email}.', errName: 'Inserisci il tuo nome.', errEmail: 'Controlla la tua email.', errSend: 'Non inviato. Riprova.', errLimit: 'Troppi messaggi. Aspetta qualche minuto.', you: 'Tu', close: 'Chiudi la chat', open: 'Apri la chat', startOver: 'Ricomincia', awayNote: 'Ora non ci siamo. Lasciaci un messaggio e ti rispondiamo via email.', message: 'Messaggio', sendMail: 'Invia', errMsg: 'Scrivi il tuo messaggio.', ended: 'Chat chiusa. Scrivi quando vuoi per riprendere.' },
    ja: { launcher: 'チャット', title: 'チャットで相談', here: 'チームが対応中', hereSub: '数分で返信します', away: '現在対応時間外', awaySub: 'メールで返信します', hours: '月〜金 9:00〜18:00（米国中部時間）', name: 'お名前', email: 'メールアドレス', start: 'チャットを始める', privacy: 'メールアドレスは返信にのみ使います。', placeholder: 'メッセージを入力', send: '送信', sentHere: '送信しました。チームがここで返信します。ページを離れた場合はメールでお届けします。', sentAway: '受け付けました。{email} 宛にメールで返信します。', errName: 'お名前を入力してください。', errEmail: 'メールアドレスを確認してください。', errSend: '送信できませんでした。もう一度お試しください。', errLimit: 'メッセージが多すぎます。数分お待ちください。', you: 'あなた', close: '閉じる', open: 'チャットを開く', startOver: '最初から', awayNote: '現在は対応時間外です。メッセージを残していただければ、メールでお返事します。', message: 'メッセージ', sendMail: '送信', errMsg: 'メッセージを入力してください。', ended: 'チャットは終了しました。いつでもメッセージを送れば再開します。' },
    'zh-Hans': { launcher: '聊天', title: '和我们聊聊', here: '团队在线', hereSub: '几分钟内回复', away: '团队暂时离线', awaySub: '我们会通过邮件回复', hours: '周一至周五 9:00–18:00（美国中部时间）', name: '姓名', email: '邮箱', start: '开始聊天', privacy: '邮箱仅用于回复你。', placeholder: '输入消息', send: '发送', sentHere: '已发送。团队会在这里回复。如果你离开页面，回复会发到你的邮箱。', sentAway: '收到。我们会发邮件到 {email}。', errName: '请填写姓名。', errEmail: '请检查邮箱。', errSend: '发送失败，请重试。', errLimit: '消息太多，请稍等几分钟。', you: '你', close: '关闭聊天', open: '打开聊天', startOver: '重新开始', awayNote: '我们现在不在。请留言，我们会通过邮件回复你。', message: '留言', sendMail: '发送', errMsg: '请写下你的留言。', ended: '聊天已结束。随时发消息即可继续。' }
  };
  var htmlLang = (document.documentElement.getAttribute('lang') || 'en');
  var lang = T[htmlLang] ? htmlLang : (/^zh/i.test(htmlLang) ? 'zh-Hans' : (T[htmlLang.slice(0, 2).toLowerCase()] ? htmlLang.slice(0, 2).toLowerCase() : 'en'));
  var t = T[lang];

  // ---- styles (DEADWORK tokens, with fallbacks for any page that doesn't load tokens.css) ----
  var bottom = typeof cfg.bottom === 'number' ? cfg.bottom : 24;
  var css = [
    '.dwc{--dwc-ink:var(--ink,#0a0a09);--dwc-raised:var(--ink-raised,#11110f);--dwc-bone:var(--bone,#e6e0d3);--dwc-bone2:var(--bone-2,#94918a);--dwc-bone3:var(--bone-3,#807d77);--dwc-line:var(--line,rgba(230,224,211,.13));--dwc-line2:var(--line-strong,rgba(230,224,211,.3));--dwc-blood:var(--blood,#c8201a);--dwc-signal:var(--signal,#e5463d);--dwc-green:var(--beta-green,#8fd687);--dwc-mono:var(--font-mono,"JetBrains Mono",ui-monospace,Menlo,monospace);--dwc-body:var(--font-body,"Archivo","Helvetica Neue",Helvetica,Arial,sans-serif);--dwc-display:var(--font-display,"Anton",Impact,sans-serif);font-family:var(--dwc-body);color:var(--dwc-bone);-webkit-font-smoothing:antialiased}',
    '.dwc *{box-sizing:border-box}',
    '.dwc-launch{position:fixed;right:20px;bottom:' + bottom + 'px;z-index:2147483000;display:flex;align-items:center;gap:10px;height:46px;padding:0 18px 0 16px;background:var(--dwc-ink);color:var(--dwc-bone);border:1px solid var(--dwc-line2);font:600 11px/1 var(--dwc-mono);letter-spacing:.18em;text-transform:uppercase;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.45);transition:border-color .16s,transform .16s}',
    '.dwc-launch:hover{border-color:var(--dwc-bone)}',
    '.dwc-launch:focus-visible,.dwc button:focus-visible,.dwc input:focus-visible,.dwc textarea:focus-visible{outline:2px solid var(--dwc-bone);outline-offset:2px}',
    '.dwc-dot{width:8px;height:8px;border-radius:0;background:#e3b23d;flex:none}',
    '.dwc-dot.is-here{background:var(--dwc-green)}',
    '.dwc-badge{min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--dwc-blood);color:#fff;font:600 10px/18px var(--dwc-mono);letter-spacing:0;text-align:center}',
    '.dwc-launch[hidden],.dwc-badge[hidden]{display:none}',
    '.dwc-panel{position:fixed;right:20px;bottom:' + (bottom + 58) + 'px;z-index:2147483001;width:380px;max-width:calc(100vw - 32px);height:560px;max-height:calc(100vh - ' + (bottom + 90) + 'px);display:flex;flex-direction:column;background:var(--dwc-ink);border:1px solid var(--dwc-line2);box-shadow:0 24px 70px rgba(0,0,0,.6);opacity:0;transform:translateY(12px);pointer-events:none;transition:opacity .22s cubic-bezier(.22,.8,.2,1),transform .22s cubic-bezier(.22,.8,.2,1)}',
    '.dwc-panel.is-open{opacity:1;transform:none;pointer-events:auto}',
    '.dwc-panel::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.05;background-image:var(--grain,none)}',
    '.dwc-head{position:relative;padding:20px 52px 16px 20px;border-bottom:1px solid var(--dwc-line)}',
    '.dwc-head::after{content:"";position:absolute;left:20px;bottom:-1px;width:44px;height:2px;background:var(--dwc-blood)}',
    '.dwc-title{margin:0;font:400 30px/1 var(--dwc-display);letter-spacing:.01em;text-transform:uppercase;color:var(--dwc-bone)}',
    '.dwc-status{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;margin-top:12px;font:500 10.5px/1.3 var(--dwc-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--dwc-bone)}',
    '.dwc-hours{margin-top:8px;font:400 10.5px/1.3 var(--dwc-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--dwc-bone3)}',
    '.dwc-hours2{margin-top:3px}',
    '.dwc-x{position:absolute;top:14px;right:12px;width:36px;height:36px;display:grid;place-items:center;background:none;border:0;color:var(--dwc-bone2);cursor:pointer}',
    '.dwc-x:hover{color:var(--dwc-bone)}',
    '.dwc-body{position:relative;flex:1;min-height:0;display:flex;flex-direction:column}',
    '.dwc-form{padding:22px 20px;display:flex;flex-direction:column;gap:16px;overflow:auto}',
    '.dwc-form>*{flex-shrink:0}',
    '.dwc-label{display:block;font:500 10.5px/1 var(--dwc-mono);letter-spacing:.16em;text-transform:uppercase;color:var(--dwc-bone2);margin-bottom:8px}',
    '.dwc-input{width:100%;height:44px;padding:0 12px;background:var(--dwc-raised);border:1px solid var(--dwc-line);color:var(--dwc-bone);font:400 16px/1 var(--dwc-body);border-radius:0}',
    '.dwc-input:focus{border-color:var(--dwc-bone2);outline:none}',
    '.dwc-hp{position:absolute!important;left:-9999px!important;width:1px;height:1px;opacity:0}',
    '.dwc-btn{height:46px;min-height:46px;flex-shrink:0;border:0;display:flex;align-items:center;justify-content:center;text-align:center;background:var(--dwc-bone);color:var(--dwc-ink);font:600 11.5px/1 var(--dwc-mono);letter-spacing:.18em;text-transform:uppercase;cursor:pointer;transition:background .16s}',
    '.dwc-btn:hover{background:#fff}',
    '.dwc-btn[disabled]{opacity:.5;cursor:default}',
    '.dwc-away,.dwc-awayonly{display:none}',
    '.dwc.dwc-is-away .dwc-away,.dwc.dwc-is-away .dwc-awayonly{display:block}',
    '.dwc-away{margin:0;font:400 14px/1.45 var(--dwc-body);color:var(--dwc-bone)}',
    '.dwc-msgin{height:auto;min-height:96px;padding:12px;line-height:1.35;resize:none}',
    '.dwc-msg a{color:inherit;text-decoration:underline;text-underline-offset:2px;word-break:break-all}',
    '.dwc-note{margin:0;font:400 12.5px/1.45 var(--dwc-body);color:var(--dwc-bone3)}',
    '.dwc-err:empty{display:none}',
    '.dwc-err{margin:0;font:500 12px/1.4 var(--dwc-body);color:var(--dwc-signal)}',
    '.dwc-log{flex:1;min-height:0;overflow:auto;padding:18px 16px 8px;display:flex;flex-direction:column;gap:10px}',
    '.dwc-msg{max-width:82%;padding:10px 12px;font:400 14.5px/1.45 var(--dwc-body);white-space:pre-wrap;word-wrap:break-word;overflow-wrap:anywhere}',
    '.dwc-msg.from-visitor{align-self:flex-end;background:var(--dwc-bone);color:var(--dwc-ink)}',
    '.dwc-msg.from-team{align-self:flex-start;background:var(--dwc-raised);border:1px solid var(--dwc-line)}',
    '.dwc-who{display:block;margin-bottom:4px;font:600 9.5px/1 var(--dwc-mono);letter-spacing:.18em;text-transform:uppercase;color:var(--dwc-bone3)}',
    '.dwc-msg.from-visitor .dwc-who{color:#5c5a55}',
    '.dwc-sys{align-self:center;max-width:92%;text-align:center;font:400 12px/1.45 var(--dwc-body);color:var(--dwc-bone3);padding:2px 6px}',
    '.dwc-compose{display:flex;align-items:flex-end;gap:8px;padding:12px 12px 12px 16px;border-top:1px solid var(--dwc-line)}',
    '.dwc-ta{flex:1;min-height:44px;max-height:120px;padding:12px;resize:none;background:var(--dwc-raised);border:1px solid var(--dwc-line);color:var(--dwc-bone);font:400 16px/1.3 var(--dwc-body);border-radius:0}',
    '.dwc-ta:focus{border-color:var(--dwc-bone2);outline:none}',
    '.dwc-send{width:46px;height:44px;flex:none;display:grid;place-items:center;padding:0}',
    '.dwc-foot{display:flex;justify-content:flex-end;align-items:center;padding:0 16px 10px;font:400 10px/1 var(--dwc-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--dwc-bone3)}',
    '.dwc-foot button{background:none;border:0;padding:4px 0;color:var(--dwc-bone3);font:inherit;letter-spacing:inherit;text-transform:inherit;cursor:pointer;text-decoration:underline;text-underline-offset:3px}',
    '.dwc-foot button:hover{color:var(--dwc-bone)}',
    '@media (max-width:520px){.dwc-launch{height:40px;padding:0 14px 0 12px;gap:8px;font-size:10px;right:max(12px,env(safe-area-inset-right,0px));bottom:calc(14px + env(safe-area-inset-bottom,0px))}.dwc-panel{right:0;bottom:0;width:100%;max-width:none;height:100%;max-height:none;height:100dvh;border:0;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}.dwc-launch{right:12px}.dwc-panel.is-open~.dwc-launch{display:none}}',
    '@media (prefers-reduced-motion:reduce){.dwc-panel,.dwc-launch{transition:none}}',
    cfg.hideLauncherBelow ? '@media (max-width:' + cfg.hideLauncherBelow + 'px){.dwc-launch{display:none}}' : ''
  ].join('\n');

  // ---- storage (per browser; works without it) ----
  function load() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { return null; } }
  function save(v) { try { if (v) localStorage.setItem(STORE_KEY, JSON.stringify(v)); else localStorage.removeItem(STORE_KEY); } catch (e) {} }

  var state = load() || null; // { id, name, email }
  var here = false, lastId = 0, seenId = 0, open = false, pollTimer = null, formShownAt = 0, lastActivity = Date.now();
  var shownIds = {}, primed = false;

  // ---- DOM ----
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) { if (k === 'text') e.textContent = attrs[k]; else if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); }
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  var SEND_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var X_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  var style = h('style'); style.textContent = css; document.head.appendChild(style);
  var root = h('div', { class: 'dwc' });

  var dotL = h('i', { class: 'dwc-dot' });
  var badge = h('span', { class: 'dwc-badge', hidden: '' });
  var launch = h('button', { class: 'dwc-launch', type: 'button', 'aria-label': t.open, 'aria-expanded': 'false' }, [dotL, h('span', { class: 'dwc-launch-label', text: t.launcher }), badge]);

  var dotH = h('i', { class: 'dwc-dot' });
  var statusText = h('b', { style: 'font-weight:500' });
  var statusSub = h('div', { class: 'dwc-hours' });
  var x = h('button', { class: 'dwc-x', type: 'button', 'aria-label': t.close }); x.innerHTML = X_ICON;
  var head = h('div', { class: 'dwc-head' }, [
    h('h2', { class: 'dwc-title', id: 'dwc-title', text: t.title }),
    h('div', { class: 'dwc-status' }, [dotH, statusText]),
    statusSub,
    h('div', { class: 'dwc-hours dwc-hours2', text: t.hours }),
    x
  ]);
  var body = h('div', { class: 'dwc-body' });
  var panel = h('div', { class: 'dwc-panel', role: 'dialog', 'aria-labelledby': 'dwc-title', 'aria-hidden': 'true' }, [head, body]);
  root.appendChild(panel);
  root.appendChild(launch);
  document.body.appendChild(root);

  function setHere(v) {
    here = !!v;
    [dotL, dotH].forEach(function (d) { d.classList.toggle('is-here', here); });
    statusText.textContent = here ? t.here : t.away;
    statusSub.textContent = here ? t.hereSub : '';
    statusSub.style.display = here ? '' : 'none';
    if (formBtn && !state) formBtn.textContent = here ? t.start : t.sendMail;
    if (root) root.classList.toggle('dwc-is-away', !here);
  }
  // Until the server answers, guess from the posted hours (Mon to Fri, 9 AM to 6 PM Central),
  // so the box never says the team is out during the day just because the check is slow.
  function inHours() {
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', hour12: false }).formatToParts(new Date());
      var wd = '', hr = 0;
      parts.forEach(function (p) { if (p.type === 'weekday') wd = p.value; if (p.type === 'hour') hr = Number(p.value) % 24; });
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].indexOf(wd) !== -1 && hr >= 9 && hr < 18;
    } catch (e) { return false; }
  }
  setHere(inHours());

  // ---- network ----
  function api(path, body) {
    var opts = body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {};
    return fetch(API + path, opts).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._status = r.status; return d; }); });
  }

  // ---- form view ----
  var nameIn, emailIn, msgIn, formBtn, formErr;
  function showForm() {
    body.textContent = '';
    nameIn = h('input', { class: 'dwc-input', id: 'dwc-name', type: 'text', autocomplete: 'given-name', maxlength: '80' });
    emailIn = h('input', { class: 'dwc-input', id: 'dwc-email', type: 'email', autocomplete: 'email', maxlength: '320', inputmode: 'email' });
    var hp = h('input', { class: 'dwc-hp', type: 'text', name: 'dwc_x9', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' });
    formErr = h('p', { class: 'dwc-err', role: 'alert' });
    var btn = formBtn = h('button', { class: 'dwc-btn', type: 'submit', text: here ? t.start : t.sendMail });
    msgIn = h('textarea', { class: 'dwc-input dwc-msgin', id: 'dwc-msg', rows: '4', maxlength: '2000' });
    var form = h('form', { class: 'dwc-form', novalidate: '' }, [
      h('p', { class: 'dwc-away' , text: t.awayNote }),
      h('div', null, [h('label', { class: 'dwc-label', for: 'dwc-name', text: t.name }), nameIn]),
      h('div', null, [h('label', { class: 'dwc-label', for: 'dwc-email', text: t.email }), emailIn]),
      h('div', { class: 'dwc-awayonly' }, [h('label', { class: 'dwc-label', for: 'dwc-msg', text: t.message }), msgIn]),
      hp, btn, formErr,
      h('p', { class: 'dwc-note', text: t.privacy })
    ]);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = nameIn.value.trim(), email = emailIn.value.trim();
      if (!name) { formErr.textContent = t.errName; nameIn.focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { formErr.textContent = t.errEmail; emailIn.focus(); return; }
      var first = here ? '' : msgIn.value.trim();
      if (!here && !first) { formErr.textContent = t.errMsg; msgIn.focus(); return; }
      formErr.textContent = ''; btn.disabled = true;
      api('/chat/start', { name: name, email: email, hp: hp.value, ms: Date.now() - formShownAt, page: location.pathname, lang: lang })
        .then(function (d) {
          btn.disabled = false;
          if (!d.ok) { formErr.textContent = d.error === 'email' ? t.errEmail : d.error === 'name' ? t.errName : d.error === 'limit' ? t.errLimit : t.errSend; return; }
          state = { id: d.id, name: name, email: email }; save(state);
          setHere(d.here); lastId = 0; seenId = 0; shownIds = {};
          showChat(true);
          if (first) { ta.value = first; send(); }
        })
        .catch(function () { btn.disabled = false; formErr.textContent = t.errSend; });
    });
    body.appendChild(form);
    formShownAt = Date.now();
  }

  // web links in messages become tappable links (text stays text)
  function linkify(node, text) {
    var re = /(https?:\/\/[^\s<]+|www\.[^\s<]+\.[^\s<]+)/gi, last = 0, m;
    while ((m = re.exec(text))) {
      var url = m[0].replace(/[.,!?;:)\]'"]+$/, '');
      if (m.index > last) node.appendChild(document.createTextNode(text.slice(last, m.index)));
      var a = document.createElement('a'); a.href = /^https?:/i.test(url) ? url : 'https://' + url;
      a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = url;
      node.appendChild(a); last = m.index + url.length; re.lastIndex = last;
    }
    if (last < text.length) node.appendChild(document.createTextNode(text.slice(last)));
  }

  // ---- chat view ----
  var log, ta, sendBtn, sentNoteShown = false, endedShown = false;
  function addMsg(m) {
    if (shownIds[m.id]) return;
    shownIds[m.id] = 1;
    var mine = m.from === 'visitor';
    var el = h('div', { class: 'dwc-msg ' + (mine ? 'from-visitor' : 'from-team') }, [h('span', { class: 'dwc-who', text: mine ? t.you : 'DEADWORK' })]);
    linkify(el, m.text);
    log.appendChild(el);
    if (m.id > lastId) lastId = m.id;
  }
  function addSys(text) { log.appendChild(h('div', { class: 'dwc-sys', text: text })); }
  function scrollDown() { log.scrollTop = log.scrollHeight; }

  function showChat(fresh) {
    body.textContent = '';
    log = h('div', { class: 'dwc-log', 'aria-live': 'polite' });
    ta = h('textarea', { class: 'dwc-ta', rows: '1', placeholder: t.placeholder, 'aria-label': t.placeholder, maxlength: '2000' });
    sendBtn = h('button', { class: 'dwc-btn dwc-send', type: 'button', 'aria-label': t.send }); sendBtn.innerHTML = SEND_ICON;
    var again = h('button', { type: 'button', text: t.startOver });
    again.addEventListener('click', function () { state = null; save(null); stopPoll(); badge.hidden = true; showForm(); nameIn.focus(); });
    body.appendChild(log);
    body.appendChild(h('div', { class: 'dwc-compose' }, [ta, sendBtn]));
    body.appendChild(h('div', { class: 'dwc-foot' }, [again]));
    sentNoteShown = false; endedShown = false;
    ta.addEventListener('input', function () { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; });
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
    sendBtn.addEventListener('click', send);
    if (!fresh) { lastId = 0; shownIds = {}; poll(); }
    startPoll();
    setTimeout(function () { ta.focus(); }, 50);
  }

  function send() {
    var text = ta.value.trim();
    if (!text || sendBtn.disabled) return;
    sendBtn.disabled = true;
    lastActivity = Date.now();
    api('/chat/send', { id: state.id, text: text })
      .then(function (d) {
        sendBtn.disabled = false;
        if (d._status === 404) { state = null; save(null); showForm(); return; }
        if (!d.ok) { addSys(d.error === 'limit' ? t.errLimit : t.errSend); scrollDown(); return; }
        ta.value = ''; ta.style.height = '';
        setHere(d.here);
        addMsg({ id: d.id, from: 'visitor', text: text });
        seenId = Math.max(seenId, d.id);
        if (!sentNoteShown) { sentNoteShown = true; addSys(here ? t.sentHere : t.sentAway.replace('{email}', state.email)); }
        scrollDown();
        startPoll();
      })
      .catch(function () { sendBtn.disabled = false; addSys(t.errSend); scrollDown(); });
  }

  function poll() {
    if (!state) return;
    api('/chat/poll?id=' + encodeURIComponent(state.id) + '&after=' + lastId)
      .then(function (d) {
        if (d._status === 404) { state = null; save(null); stopPoll(); if (open) showForm(); return; }
        if (!d.ok) return;
        setHere(d.here);
        if (d.closed && !endedShown && log) { endedShown = true; addSys(t.ended); scrollDown(); }
        if (!d.closed) endedShown = false;
        var fromTeam = 0;
        // first look after a page load: everything already there counts as seen
        if (!primed) { primed = true; (d.messages || []).forEach(function (m) { if (m.id > seenId) seenId = m.id; }); }
        (d.messages || []).forEach(function (m) {
          if (log && document.body.contains(log)) addMsg(m); else if (m.id > lastId) lastId = m.id;
          if (m.from === 'team' && m.id > seenId) { fromTeam++; lastActivity = Date.now(); }
        });
        if (open) { seenId = lastId; badge.hidden = true; if (fromTeam) scrollDown(); }
        else if (fromTeam) { badge.textContent = String((Number(badge.textContent) || 0) + fromTeam); badge.hidden = false; }
      })
      .catch(function () {});
  }
  // Open box: every 4 s (20 s in a background tab). Closed: every 30 s for 15 minutes after
  // the last message, so a reply still lights the badge; then it stops.
  function startPoll() {
    stopPoll();
    if (!state) return;
    // open box: every 2 s so team replies show up almost at once
    var wait = open ? (document.hidden ? 15000 : 2000) : 20000;
    if (!open && Date.now() - lastActivity > 15 * 60 * 1000) return;
    pollTimer = setTimeout(function () { poll(); startPoll(); }, wait);
  }
  function stopPoll() { clearTimeout(pollTimer); pollTimer = null; }
  document.addEventListener('visibilitychange', function () { if (state) startPoll(); });

  // ---- open / close ----
  var built = false;
  function openPanel(quiet) {
    if (open) return;
    open = true;
    if (!built) { built = true; if (state) showChat(false); else showForm(); }
    else if (state) { poll(); startPoll(); }
    else if (!body.querySelector('.dwc-form')) showForm(); // chat was ended or removed while the box was closed
    checkStatus();
    panel.classList.add('is-open'); panel.setAttribute('aria-hidden', 'false');
    try { sessionStorage.setItem('dwchat-open', '1'); } catch (e) {}
    launch.setAttribute('aria-expanded', 'true'); launch.setAttribute('aria-label', t.close);
    badge.hidden = true; badge.textContent = '';
    seenId = lastId;
    setTimeout(function () { if (quiet !== true) (state ? ta : nameIn).focus(); if (log) scrollDown(); }, 60);
  }
  function closePanel() {
    if (!open) return;
    open = false;
    panel.classList.remove('is-open'); panel.setAttribute('aria-hidden', 'true');
    try { sessionStorage.removeItem('dwchat-open'); } catch (e) {}
    launch.setAttribute('aria-expanded', 'false'); launch.setAttribute('aria-label', t.open);
    lastActivity = Math.max(lastActivity, Date.now() - 14 * 60 * 1000);
    startPoll();
    launch.focus();
  }
  launch.addEventListener('click', function () { open ? closePanel() : openPanel(); });
  x.addEventListener('click', closePanel);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) closePanel(); });

  // first status for the dot; a returning visitor with a chat also gets their replies
  // Asks the server whether the team is in: on load, every time the box opens, and every
  // 30 seconds while it is open, so flipping Here/Away in the inbox shows up on the site.
  function checkStatus() { api('/chat/status').then(function (d) { if (d.ok) setHere(d.here); }).catch(function () {}); }
  checkStatus();
  setInterval(function () { if (open && !document.hidden) checkStatus(); }, 30000);
  if (state) { lastActivity = Date.now(); poll(); startPoll(); }

  window.DWChat = { open: openPanel, close: closePanel };
  // Box was open on the last page: keep it open on this one (same tab only).
  try { if (sessionStorage.getItem('dwchat-open') === '1') openPanel(true); } catch (e) {}
  document.dispatchEvent(new CustomEvent('dwchat:ready'));
})();
