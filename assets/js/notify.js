// DEADWORK — inline "Notify me" email capture for the 5 in-development product pages (and their
// home-page panel equivalents). Replaces the old mailto: links — posts straight to the notify-worker
// and shows inline success/error feedback, no page navigation, no alert() popups. Same shape as
// checkout.js's Worker-calling pattern (loading/error/success states swapped inline) for consistency.
(function () {
  var WORKER_URL = 'https://deadwork-notify.stockshredder.workers.dev';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  Array.prototype.forEach.call(document.querySelectorAll('[data-notify-form]'), function (form) {
    var product = form.getAttribute('data-notify-product');
    var input = form.querySelector('[data-notify-email]');
    var button = form.querySelector('[data-notify-submit]');
    var status = form.querySelector('[data-notify-status]');
    var honeypot = form.querySelector('[data-notify-hp]');
    if (!product || !input || !button || !status) return; // malformed markup — don't half-wire it

    var defaultLabel = button.textContent;

    function showStatus(message, tone) {
      status.textContent = message || '';
      status.hidden = !message;
      status.classList.remove('notify-status-bad', 'notify-status-good');
      if (tone) status.classList.add('notify-status-' + tone);
    }

    function setBusy(isBusy) {
      button.disabled = isBusy;
      input.disabled = isBusy;
      button.textContent = isBusy ? 'Sending…' : defaultLabel;
    }

    form.addEventListener('submit', function (evt) {
      evt.preventDefault();

      // Honeypot: a field hidden from real visitors via CSS. Bots that fill out every field in the
      // DOM trip it; real users never see or touch it. Pretend success without ever calling the API.
      if (honeypot && honeypot.value) {
        form.reset();
        showStatus("You're on the list.", 'good');
        return;
      }

      var email = (input.value || '').trim();
      if (!EMAIL_RE.test(email)) {
        showStatus("That doesn't look like a valid email address.", 'bad');
        input.focus();
        return;
      }

      setBusy(true);
      showStatus('', null);

      fetch(WORKER_URL + '/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, product: product, company: honeypot ? honeypot.value : '' })
      })
        .then(function (res) {
          if (!res.ok) throw new Error('Notify request failed: ' + res.status);
          return res.json();
        })
        .then(function (data) {
          if (!data || !data.ok) throw new Error('Unexpected response');
          form.reset();
          showStatus("You're on the list.", 'good');
        })
        .catch(function () {
          showStatus("Something went wrong — please try again.", 'bad');
        })
        .then(function () {
          setBusy(false);
        });
    });
  });
})();
