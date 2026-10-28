// DEADWORK — inline "Notify me" email capture for the 5 in-development product pages (and their
// home-page panel equivalents). Replaces the old mailto: links — posts straight to DEADWORK HQ
// (deadwork-site/deadwork-hq, the shared signups Worker for all 6 products) and shows inline
// success/error feedback, no page navigation, no alert() popups. Same shape as checkout.js's
// Worker-calling pattern (loading/error/success states swapped inline) for consistency.
(function () {
  var WORKER_URL = 'https://deadwork-hq.stockshredder.workers.dev';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  Array.prototype.forEach.call(document.querySelectorAll('[data-notify-form]'), function (form) {
    var product = form.getAttribute('data-notify-product');
    var input = form.querySelector('[data-notify-email]');
    var button = form.querySelector('[data-notify-submit]');
    var status = form.querySelector('[data-notify-status]');
    var honeypot = form.querySelector('[data-notify-hp]');
    if (!product || !input || !button || !status) return; // malformed markup — don't half-wire it

    var defaultLabel = button.textContent;

    // H-12/D-7/D-8: the status text alone was never tied to the field (no aria-invalid/
    // aria-describedby) and the <p> itself had no role/aria-live in the markup, so a screen
    // reader announced nothing on error — and both an empty field and a malformed address
    // showed the identical "doesn't look like a valid email" message, which isn't true for an
    // empty field. showStatus now also wires/clears the input's error attributes; callers pass
    // the right message for each case.
    // QA-15: 'bad' means the field itself is invalid (empty/malformed) — that's the only case
    // that should mark the input aria-invalid. A network/server failure ('error') is not the
    // visitor's fault; it reused 'bad' before, which told screen readers a correctly-typed
    // address was invalid. 'error' still renders with the same "something's wrong" styling.
    function showStatus(message, tone) {
      status.textContent = '';
      status.hidden = !message;
      status.classList.remove('notify-status-bad', 'notify-status-good');
      if (tone) status.classList.add('notify-status-' + (tone === 'error' ? 'bad' : tone));
      if (tone === 'bad') {
        input.setAttribute('aria-invalid', 'true');
        if (status.id) input.setAttribute('aria-describedby', status.id);
      } else {
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
      }
      // Clearing textContent above and setting it a frame later (rather than in the same tick)
      // means submitting the same error twice still reads as a change to the live region, so
      // screen readers announce it the second time too — and gives the hidden -> visible flip a
      // moment to settle first, which VoiceOver otherwise sometimes misses.
      if (message) requestAnimationFrame(function () { status.textContent = message; });
    }

    // Once the error is showing, starting to retype should clear it immediately rather than
    // leaving a stale error attached to a field the user is actively correcting.
    input.addEventListener('input', function () {
      if (input.getAttribute('aria-invalid') === 'true') showStatus('', null);
    });

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
      if (!email) {
        showStatus('Enter your email address.', 'bad');
        input.focus();
        return;
      }
      if (!EMAIL_RE.test(email)) {
        showStatus("That doesn't look like a valid email address.", 'bad');
        input.focus();
        return;
      }

      setBusy(true);
      showStatus('', null);

      // Lead-source tracking: where someone came from, captured automatically — no new field for
      // the visitor to fill in. Deliberately simple: the raw referrer (or 'direct' when there
      // isn't one) and the page path the form lived on, not real UTM-parameter parsing.
      fetch(WORKER_URL + '/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          product: product,
          company: honeypot ? honeypot.value : '',
          source: document.referrer || 'direct',
          page: location.pathname
        })
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
          showStatus("Something went wrong. Try again.", 'error');
        })
        .then(function () {
          setBusy(false);
        });
    });
  });
})();
