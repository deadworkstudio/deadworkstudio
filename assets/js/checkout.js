// Stock Shredder — embedded Stripe Checkout. Loaded only on the Stock Shredder product page.
//
// Reuses the already-deployed payment Worker (stock-shredder-payments.stockshredder.workers.dev)
// that the Electron app's CheckoutPanel.tsx already talks to — same /checkout and /verify
// endpoints, same live Stripe key as footage-curator/src/shared/stripe.ts (the Worker's secret
// key is live-mode, so this publishable key must match or Stripe.js rejects the session outright).
// No backend changes needed; the Worker's CORS is wide open for this.
(function () {
  var WORKER_URL = 'https://stock-shredder-payments.stockshredder.workers.dev';
  var STRIPE_PUBLISHABLE_KEY = 'pk_live_51UIwxREHfnNaW3GQg8edd5eoY1Y3hQJDOKAZvbJiH2xLLjvoyIUdBTXiO55w31LCjPLcwozvcZIn10AlQkBCEh3h00gjfoagZc';

  var PLANS = {
    starter: { name: 'Starter', price: 25 },
    creator: { name: 'Creator', price: 59 },
    pro: { name: 'Pro', price: 109 },
    studio: { name: 'Studio', price: 199 }
  };

  var grid = document.querySelector('[data-pricing-grid]');
  var panel = document.querySelector('[data-checkout-panel]');
  var success = document.querySelector('[data-checkout-success]');
  if (!grid || !panel || !success) return; // this page doesn't have the pricing section

  var billingToggle = document.querySelector('[data-billing-toggle]');
  var currentInterval = 'month';
  if (billingToggle) {
    Array.prototype.forEach.call(billingToggle.querySelectorAll('[data-billing]'), function (btn) {
      btn.addEventListener('click', function () {
        // Switching Monthly/Annual mid-checkout used to silently update prices behind the open
        // checkout panel, with no visible effect — back out to the pricing grid instead, same as
        // clicking Cancel, so the toggle actually does something the person can see.
        if (!panel.hidden) showGrid('');
        currentInterval = btn.getAttribute('data-billing');
        Array.prototype.forEach.call(billingToggle.querySelectorAll('[data-billing]'), function (b) {
          b.classList.toggle('is-active', b === btn);
        });
        // Swapping the number mid-transition (rather than before or after it) is what makes the
        // blur+fade read as one number smoothly becoming another instead of the old one vanishing
        // and a different one popping in once it's gone — see the emil-design-eng skill's note on
        // using blur to mask an otherwise-abrupt crossfade.
        var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        Array.prototype.forEach.call(grid.querySelectorAll('.pricing-price'), function (priceEl) {
          var amount = currentInterval === 'year' ? priceEl.getAttribute('data-annual') : priceEl.getAttribute('data-monthly');
          var suffix = currentInterval === 'year' ? '/yr' : '/mo';

          var apply = function () {
            priceEl.innerHTML = '<span class="num">$' + Number(amount).toLocaleString('en-US') + '</span>' + suffix;

            // The "save" line is always rendered (never [hidden]) so its height is reserved
            // whether or not it currently has text — toggling a class instead of hidden means the
            // monthly <-> annual swap never changes the card's height.
            var saveEl = priceEl.nextElementSibling;
            if (saveEl && saveEl.hasAttribute('data-pricing-save')) {
              if (currentInterval === 'year') {
                var monthly = Number(priceEl.getAttribute('data-monthly'));
                var annual = Number(priceEl.getAttribute('data-annual'));
                saveEl.textContent = 'Save $' + (monthly * 12 - annual).toLocaleString('en-US') + '/yr';
                saveEl.classList.add('is-visible');
                saveEl.removeAttribute('aria-hidden');
              } else {
                // opacity: 0 (via is-visible coming off) only hides this visually — the leftover
                // "Save $X/yr" text from the last time Annual was selected is still in the
                // accessibility tree and gets read out on Monthly unless it's hidden explicitly too.
                saveEl.classList.remove('is-visible');
                saveEl.setAttribute('aria-hidden', 'true');
              }
            }
            priceEl.classList.remove('is-swapping');
          };

          if (reduceMotion) {
            apply();
          } else {
            priceEl.classList.add('is-swapping');
            setTimeout(apply, 90);
          }
        });
        // Clips are always granted monthly regardless of billing cycle — switching this to a
        // yearly total (e.g. "1,200 clips / yr") read like the whole year's worth lands upfront,
        // which contradicts the "clips reset on the 1st" note right above the grid. Left as a
        // flat monthly figure no matter which billing interval is selected.
        //
        // Cost-per-clip DOES change with billing interval (annual is cheaper per clip since the
        // same clip allowance costs less over the year) — recompute it from each card's own
        // price and clip data instead of leaving it fixed at the monthly rate.
        Array.prototype.forEach.call(grid.querySelectorAll('.pricing-card'), function (card) {
          var priceEl = card.querySelector('.pricing-price');
          var clipsEl = card.querySelector('.pricing-clips');
          var perClipEl = card.querySelector('.pricing-per-clip');
          if (!priceEl || !clipsEl || !perClipEl) return;
          var monthlyClips = Number(clipsEl.getAttribute('data-clips-monthly'));
          var costPerClip = currentInterval === 'year'
            ? Number(priceEl.getAttribute('data-annual')) / (monthlyClips * 12)
            : Number(priceEl.getAttribute('data-monthly')) / monthlyClips;
          perClipEl.textContent = '$' + costPerClip.toFixed(2) + ' / clip';
        });
      });
    });
  }

  var frame = document.getElementById('checkout-frame');
  var statusEl = panel.querySelector('[data-checkout-status]');
  var retryBtn = panel.querySelector('[data-checkout-retry]');
  var cancelBtn = panel.querySelector('[data-checkout-cancel]');
  var pricingError = document.querySelector('[data-pricing-error]');
  var keyEl = success.querySelector('[data-activation-key]');
  var copyBtn = success.querySelector('[data-copy-key]');
  var successHeading = success.querySelector('h3');
  var successEyebrow = success.querySelector('[data-checkout-success-eyebrow]');
  var successNote = success.querySelector('[data-checkout-success-note]');
  var macDownload = document.getElementById('download-success');
  var winDownload = document.getElementById('download-success-alt');

  // SHRED launch trial v2 (docs/superpowers/specs/2026-10-26-shred-trial-design.md) — the trial
  // offer panel above the pricing grid. Absent on any page that doesn't have one, same tolerance
  // as the rest of this file.
  var trialOffer = document.querySelector('[data-trial-offer]');
  var trialForm = trialOffer ? trialOffer.querySelector('[data-trial-offer-form]') : null;
  var trialEmailInput = trialOffer ? trialOffer.querySelector('[data-trial-email]') : null;
  var trialErrorEl = trialOffer ? trialOffer.querySelector('[data-trial-offer-error]') : null;
  var trialStatusEl = trialOffer ? trialOffer.querySelector('[data-trial-offer-status]') : null;
  var trialDateEls = trialOffer ? trialOffer.querySelectorAll('[data-trial-offer-date]') : [];
  var trialSubmitBtn = trialOffer ? trialOffer.querySelector('[data-trial-submit]') : null;
  var trialResendToggle = trialOffer ? trialOffer.querySelector('[data-trial-resend-toggle]') : null;
  var trialResendForm = trialOffer ? trialOffer.querySelector('[data-trial-resend-form]') : null;
  var trialResendEmailInput = trialOffer ? trialOffer.querySelector('[data-trial-resend-email]') : null;
  var trialResendSubmitBtn = trialOffer ? trialOffer.querySelector('[data-trial-resend-submit]') : null;
  var trialResendStatusEl = trialOffer ? trialOffer.querySelector('[data-trial-resend-status]') : null;
  var currentOfferCode = null; // set once /offer confirms a real, active code
  var trialSubmitInFlight = false; // one in-flight /checkout(offer) request at a time
  var trialResendInFlight = false; // one in-flight /trial/resend-link request at a time

  // Windows visitors get the .exe as the primary button and the .dmg as the small secondary
  // link, and vice versa for everyone else — navigator.userAgentData is the modern replacement
  // for sniffing the UA string; platform/userAgent cover browsers that don't support it yet.
  function isWindowsVisitor() {
    if (navigator.userAgentData && navigator.userAgentData.platform) {
      return /win/i.test(navigator.userAgentData.platform);
    }
    var platform = navigator.platform || navigator.userAgent || '';
    return /win/i.test(platform);
  }

  var stripe = null;
  function getStripe() {
    if (!stripe) stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
    return stripe;
  }

  var embeddedCheckout = null; // the mounted Stripe EmbeddedCheckout instance, so we can destroy it cleanly
  var sessionId = null; // the current Checkout Session id — reused by "Try again" so we never start a second session for one charge
  var currentPlanId = null;
  var currentPlanInterval = 'month'; // snapshotted from currentInterval when "Buy now" is clicked, so toggling the (now-hidden) grid mid-checkout can't change an in-flight session
  // L2 (2026-10-26 QA): which flavor of Checkout is currently in flight — a setup-mode trial
  // start never charges anything, so verifySession()'s generic "that charge didn't go through"
  // copy is simply untrue for it; this flag lets that one fallthrough branch answer correctly.
  var currentCheckoutIsTrial = false;

  function showPricingError(message) {
    if (!pricingError) return;
    pricingError.textContent = message || '';
    pricingError.hidden = !message;
  }

  function showStatus(message, isBad) {
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.hidden = !message;
    statusEl.classList.toggle('checkout-status-bad', !!isBad);
  }

  function teardownCheckout() {
    if (embeddedCheckout) {
      try {
        embeddedCheckout.destroy();
      } catch (err) {
        // already destroyed / never mounted — nothing to clean up
      }
      embeddedCheckout = null;
    }
    if (frame) {
      frame.innerHTML = '';
      frame.classList.remove('is-loading');
    }
  }

  function showGrid(errorMessage) {
    teardownCheckout();
    panel.hidden = true;
    success.hidden = true;
    grid.hidden = false;
    // L2: a trial checkout (or its own panel) may have hidden the trial offer box on the way
    // in — bring it back whenever there's still a live offer code to show it for, so cancelling
    // out of a trial's embedded Checkout doesn't lose the box entirely.
    if (trialOffer && currentOfferCode) trialOffer.hidden = false;
    showPricingError(errorMessage || '');
    // Cancelling (or an error sending the person back) leaves focus on an element that just got
    // hidden unless we move it ourselves — to the error itself when there is one to read, otherwise
    // the first plan button so keyboard/screen-reader users land back inside the visible grid.
    if (errorMessage && pricingError) {
      pricingError.focus();
    } else {
      var firstPlanBtn = grid.querySelector('[data-plan-button]');
      if (firstPlanBtn) firstPlanBtn.focus();
    }
  }

  function showSuccess(activationKey, trial) {
    teardownCheckout();
    panel.hidden = true;
    grid.hidden = true;
    success.hidden = false;
    // L2: the trial offer box (email field + its own form) has nothing left to do once the
    // trial — or any purchase — has actually completed; leaving it visible behind the success
    // panel let someone immediately try to start a second trial from the same page.
    if (trialOffer) trialOffer.hidden = true;
    if (keyEl) keyEl.textContent = activationKey;

    // SHRED launch trial v2 (§8.7): a trial completion gets its own eyebrow/note copy instead of
    // the paid-purchase wording — the activation key box and download buttons below are
    // identical either way. endsOnText rides pre-formatted from the Worker (§3 — this file never
    // computes its own end date), so there's no client-side date math here at all.
    if (trial && trial.endsOnText) {
      if (successEyebrow) successEyebrow.textContent = 'Trial started';
      if (successNote) successNote.textContent = 'Your trial runs until ' + trial.endsOnText + ' or 100 clips. Nothing is charged unless you choose a plan.';
    } else {
      if (successEyebrow) successEyebrow.textContent = "You're in";
      if (successNote) successNote.textContent = 'Paste this activation key when it asks. Full instructions are in the app.';
    }

    // Show the visitor's own platform as the big button, the other platform as a small secondary
    // link — macDownload/winDownload keep whatever the release-fetch script resolved as the
    // latest .dmg/.exe, so this only ever reorders/relabels them, never re-derives the URLs.
    if (macDownload && winDownload) {
      var onWindows = isWindowsVisitor();
      var primary = onWindows ? winDownload : macDownload;
      var secondary = onWindows ? macDownload : winDownload;
      primary.className = 'pill pill-solid';
      secondary.className = 'mono checkout-success-alt';
      primary.textContent = 'Download Stock Shredder';
      secondary.textContent = onWindows ? 'Also for Mac' : 'Also for Windows';
      primary.parentNode.insertBefore(primary, secondary);
    }

    // Move focus into the panel that just appeared — otherwise it's silently left on the
    // Stripe iframe's own "Pay" button, which is now hidden/destroyed.
    if (successHeading) successHeading.focus();
  }

  // Asks our Worker to create a real Stripe Checkout Session for the chosen plan and hands back
  // the clientSecret Stripe.js needs to render its embedded form. Stashes the sessionId so
  // /verify (and a possible "Try again") can confirm the same session later.
  function fetchClientSecret() {
    return fetch(WORKER_URL + '/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: currentPlanId, interval: currentPlanInterval })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Checkout request failed: ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.clientSecret || !data.sessionId) {
          throw new Error('Checkout response was missing clientSecret/sessionId');
        }
        sessionId = data.sessionId;
        return data.clientSecret;
      })
      .catch(function (err) {
        // Stripe.js does NOT reliably reject the initEmbeddedCheckout() promise when this
        // throws — in practice it retries this call a few times, then gives up silently inside
        // its own iframe (the checkout.mount() UI just hangs). So the error has to be surfaced
        // here, synchronously, rather than relying on a .catch() around initEmbeddedCheckout().
        showStatus("Couldn't start checkout. Click Cancel and pick a plan to try again.", true);
        throw err;
      });
  }

  // Confirms the completed Stripe session with our Worker. Kept separate from onComplete so the
  // "Try again" button can re-run the same confirmation against the same sessionId — by the time
  // we're here the charge has already happened (or Stripe says it hasn't), so a retry must never
  // start a brand-new checkout session.
  function verifySession() {
    if (!sessionId) return;
    if (retryBtn) retryBtn.hidden = true;
    showStatus('Confirming your payment…', false);
    return fetch(WORKER_URL + '/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionId })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Verify request failed: ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (data && data.ok && data.customerId && data.planId && data.activationKey) {
          showSuccess(data.activationKey, data.trial);
          return;
        }
        // SHRED launch trial v2: a repeat-trial detection (email/card already used, or this email
        // already has an account) caught at completion time — the Worker already detached the
        // saved card and emailed an explanation. Nothing was ever charged either way, so this
        // goes back to the trial box itself (not the generic checkout panel) with its specific
        // reason verbatim, rather than the generic "that charge didn't go through" message.
        if (data && data.trialRejected) {
          teardownCheckout();
          panel.hidden = true;
          success.hidden = true;
          if (trialOffer) {
            grid.hidden = true;
            trialOffer.hidden = false;
            showTrialError(data.message || "This trial couldn't be started.");
          } else {
            grid.hidden = false;
            showPricingError(data.message || "This trial couldn't be started.");
          }
          return;
        }
        // L2: a setup-mode trial session never charges anything — if it somehow lands here
        // (the card itself failed to save, say) the paid-flow's "that charge didn't go through"
        // copy is simply untrue for it, and sending the visitor back to the generic pricing grid
        // loses the trial entirely. Route back to the trial box with trial-appropriate wording.
        if (currentCheckoutIsTrial) {
          teardownCheckout();
          panel.hidden = true;
          success.hidden = true;
          if (trialOffer) {
            grid.hidden = true;
            trialOffer.hidden = false;
            showTrialError("We couldn't save your card. Nothing was charged. Try again.");
          } else {
            grid.hidden = false;
            showPricingError("We couldn't save your card. Nothing was charged. Try again.");
          }
          return;
        }
        // The Worker successfully asked Stripe, and Stripe confirmed the charge did not go
        // through (e.g. a decline) — nothing to retry-confirm, so send them back to pick again.
        if (retryBtn) retryBtn.hidden = true;
        showStatus("That charge didn't go through, so nothing was billed. Pick a plan below to try again.", true);
      })
      .catch(function () {
        // We don't know whether Stripe's charge succeeded — only that our Worker couldn't be
        // reached (or returned something unexpected) to confirm it. Offer to retry the SAME
        // session instead of implying it's safe to just re-enter a card.
        if (retryBtn) retryBtn.hidden = false;
        showStatus("We couldn't confirm the payment. You may have been charged. Click Try again to check once more.", true);
      });
  }

  function startCheckout(planId) {
    var plan = PLANS[planId];
    if (!plan || !frame) return;
    // Teardown first, always — a stray double-click on a plan button, or starting a paid
    // checkout right after a trial one, must never leave two embedded Checkout instances
    // mounted at once (one leaked, one visible).
    teardownCheckout();

    currentPlanId = planId;
    currentPlanInterval = currentInterval;
    currentCheckoutIsTrial = false;
    sessionId = null;
    showPricingError('');
    if (retryBtn) retryBtn.hidden = true;

    grid.hidden = true;
    success.hidden = true;
    if (trialOffer) trialOffer.hidden = true;
    panel.hidden = false;
    // The grid button that opened this is now hidden — move focus into the panel itself (it's
    // given tabindex="-1" in the markup for exactly this) so keyboard/screen-reader users land
    // somewhere that still exists, and the aria-live status below gets announced from here on.
    panel.focus();

    // Stripe's embedded form takes a second or two to fetch and render — without this the panel
    // briefly shows nothing but the Cancel button. Show a loading state and the shimmer, and
    // bring the (possibly off-screen, especially on phones) panel into view before the form shows up.
    showStatus('Loading secure checkout…', false);
    frame.classList.add('is-loading');
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    panel.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });

    getStripe()
      .initEmbeddedCheckout({
        fetchClientSecret: fetchClientSecret,
        onComplete: function () {
          verifySession();
        }
      })
      .then(function (checkout) {
        // A cancel/close could have happened while this was in flight — don't mount a stale panel.
        if (panel.hidden) {
          checkout.destroy();
          return;
        }
        embeddedCheckout = checkout;
        frame.classList.remove('is-loading');
        showStatus('', false);
        checkout.mount(frame);
      })
      .catch(function () {
        showGrid("Couldn't start checkout. Pick a plan to try again.");
      });
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-plan-button]'), function (btn) {
    btn.addEventListener('click', function () {
      startCheckout(btn.getAttribute('data-plan-button'));
    });
  });

  if (retryBtn) {
    retryBtn.addEventListener('click', function () {
      verifySession();
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', function () {
      showGrid('');
    });
  }

  if (copyBtn && keyEl) {
    copyBtn.addEventListener('click', function () {
      var text = keyEl.textContent || '';
      if (!text || !navigator.clipboard || !navigator.clipboard.writeText) return;
      navigator.clipboard.writeText(text).then(function () {
        var original = copyBtn.textContent;
        copyBtn.textContent = 'Copied';
        setTimeout(function () {
          copyBtn.textContent = original;
        }, 1600);
      });
    });
  }

  // ---- SHRED launch trial v2 (docs/superpowers/specs/2026-10-26-shred-trial-design.md) --------

  function showTrialError(message) {
    if (!trialErrorEl) return;
    trialErrorEl.textContent = message || '';
    trialErrorEl.hidden = !message;
    if (message) trialErrorEl.focus();
  }

  // L4: same as showTrialError, but appends a REAL anchor to #pricing instead of plain text —
  // built with DOM nodes (never innerHTML) so the server-provided message can't inject markup.
  function showTrialErrorWithPricingLink(message) {
    if (!trialErrorEl) return;
    trialErrorEl.textContent = '';
    trialErrorEl.appendChild(document.createTextNode((message || "This trial couldn't be started.") + ' '));
    var link = document.createElement('a');
    link.href = '#pricing';
    link.textContent = 'See plans';
    trialErrorEl.appendChild(link);
    trialErrorEl.hidden = false;
    trialErrorEl.focus();
  }

  function showTrialStatus(message) {
    if (!trialStatusEl) return;
    trialStatusEl.textContent = message || '';
  }

  // Asks the Worker whether a code is a real, currently-active offer before ever showing the
  // panel for it — a dead or typo'd ?code= just falls through to the ordinary pricing grid
  // (showPricingError, not the trial panel itself) rather than showing an empty/broken trial box.
  // §3: the real end date comes straight from the Worker's own endsOnText — this file never
  // computes it, just displays it.
  function checkOffer(code) {
    if (!trialOffer || !code) return;
    fetch(WORKER_URL + '/offer?code=' + encodeURIComponent(code))
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.valid) {
          showPricingError((data && data.message) || "That code isn't active.");
          return;
        }
        currentOfferCode = data.code;
        try {
          sessionStorage.setItem('ss-offer', data.code);
        } catch (err) {
          // Private browsing / storage disabled — the code still works for this one page view,
          // it just won't survive a reload without the query string.
        }
        Array.prototype.forEach.call(trialDateEls, function (el) {
          el.textContent = data.endsOnText || '';
        });
        trialOffer.hidden = false;
        var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        trialOffer.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
      })
      .catch(function () {
        // A network hiccup checking the code — leave the ordinary pricing grid usable and say
        // nothing alarming; the person can still just pick a plan.
      });
  }

  (function initOfferFromUrl() {
    if (!trialOffer) return;
    var code = null;
    try {
      code = new URLSearchParams(window.location.search).get('code');
    } catch (err) {
      code = null;
    }
    if (!code) {
      try {
        code = sessionStorage.getItem('ss-offer');
      } catch (err) {
        code = null;
      }
    }
    if (code) checkOffer(code);
  })();

  // Starts a trial (setup-mode) Checkout Session for the entered email. Unlike startCheckout
  // above, this fetches the client secret ITSELF first (not via Stripe.js's own
  // fetchClientSecret callback) so a 409/429/network failure from the Worker can be shown right
  // in the trial box, with the panel never opening at all — fail fast, instead of Stripe's
  // embedded form opening and only then failing to mount.
  function startTrialCheckout(email) {
    if (!currentOfferCode || !frame || trialSubmitInFlight) return;
    trialSubmitInFlight = true;
    showTrialError('');
    showTrialStatus('Starting…');
    if (trialSubmitBtn) {
      trialSubmitBtn.disabled = true;
      trialSubmitBtn.setAttribute('aria-busy', 'true');
    }

    fetch(WORKER_URL + '/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offer: currentOfferCode, email: email })
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { status: res.status, ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        trialSubmitInFlight = false;
        if (trialSubmitBtn) {
          trialSubmitBtn.disabled = false;
          trialSubmitBtn.removeAttribute('aria-busy');
        }
        showTrialStatus('');
        if (!result.ok || !result.data || !result.data.clientSecret || !result.data.sessionId) {
          var data = result.data || {};
          if (result.status === 409 && data.code === 'not_eligible') {
            // L4: the Worker's own not_eligible message already ends with "Pick a plan below
            // instead." (see trials.ts's TRIAL_NOT_ELIGIBLE_MESSAGE) — appending another, nearly
            // identical "See plans below instead." on top just repeated the same instruction
            // twice in one sentence. Link "See plans" to #pricing for real instead, matching the
            // spec's own error-mapping note (§5.4 step 5 / §7 item 3).
            showTrialErrorWithPricingLink(data.error || "This email can't start a SHRED trial.");
          } else if (result.status === 409) {
            showTrialError(data.error || "This trial couldn't be started.");
          } else if (result.status === 429) {
            showTrialError(data.error || 'Too many attempts. Try again in an hour.');
          } else {
            showTrialError(data.error || "Couldn't start your trial. Please try again.");
          }
          return;
        }
        // Teardown first — a stray double-click (or a resend-link submit racing a fresh trial
        // start) must never leave two embedded Checkout instances mounted at once.
        teardownCheckout();
        sessionId = result.data.sessionId;
        currentCheckoutIsTrial = true;
        var clientSecret = result.data.clientSecret;

        grid.hidden = true;
        success.hidden = true;
        // L2: the trial box's own email form has nothing left to do once its Checkout form is
        // open — leaving it visible duplicated the "$0 today" messaging right above Stripe's own
        // card-saving form and let someone submit a second trial start mid-flight.
        if (trialOffer) trialOffer.hidden = true;
        panel.hidden = false;
        panel.focus();
        // L2: this is a card SAVE, not a charge — "Loading secure checkout…" (shared with the
        // paid flow) reads like a purchase is about to happen.
        showStatus('Saving your card…', false);
        frame.classList.add('is-loading');
        var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        panel.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });

        getStripe()
          .initEmbeddedCheckout({
            // Already have the real clientSecret from the pre-flight call above — nothing left
            // to fetch, so this just hands it straight back.
            fetchClientSecret: function () {
              return Promise.resolve(clientSecret);
            },
            onComplete: function () {
              verifySession();
            }
          })
          .then(function (checkout) {
            if (panel.hidden) {
              checkout.destroy();
              return;
            }
            embeddedCheckout = checkout;
            frame.classList.remove('is-loading');
            showStatus('', false);
            checkout.mount(frame);
          })
          .catch(function () {
            showGrid("Couldn't start checkout. Try again.");
          });
      })
      .catch(function () {
        trialSubmitInFlight = false;
        if (trialSubmitBtn) {
          trialSubmitBtn.disabled = false;
          trialSubmitBtn.removeAttribute('aria-busy');
        }
        showTrialStatus('');
        showTrialError("Couldn't reach us. Nothing was charged. Try again.");
      });
  }

  if (trialForm && trialEmailInput) {
    trialForm.addEventListener('submit', function (evt) {
      evt.preventDefault();
      if (trialSubmitInFlight) return;
      var email = (trialEmailInput.value || '').trim();
      if (!email) {
        showTrialError('Enter your email to start the trial.');
        trialEmailInput.focus();
        return;
      }
      startTrialCheckout(email);
    });
  }

  // "Already started a trial? Email me my plan link" — a small second form, posting to
  // /trial/resend-link. Always the same on-screen acknowledgement regardless of whether the
  // email matched anything (the Worker itself never leaks that either — see its own comment).
  if (trialResendToggle && trialResendForm) {
    trialResendToggle.addEventListener('click', function () {
      var hidden = trialResendForm.hidden;
      trialResendForm.hidden = !hidden;
      trialResendToggle.setAttribute('aria-expanded', hidden ? 'true' : 'false');
      if (hidden && trialResendEmailInput) trialResendEmailInput.focus();
    });
  }

  if (trialResendForm && trialResendEmailInput) {
    trialResendForm.addEventListener('submit', function (evt) {
      evt.preventDefault();
      if (trialResendInFlight) return;
      var email = (trialResendEmailInput.value || '').trim();
      if (!email) {
        if (trialResendStatusEl) trialResendStatusEl.textContent = 'Enter your email first.';
        trialResendEmailInput.focus();
        return;
      }
      trialResendInFlight = true;
      if (trialResendSubmitBtn) {
        trialResendSubmitBtn.disabled = true;
        trialResendSubmitBtn.setAttribute('aria-busy', 'true');
      }
      if (trialResendStatusEl) trialResendStatusEl.textContent = 'Sending…';
      fetch(WORKER_URL + '/trial/resend-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      })
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          if (trialResendStatusEl) {
            trialResendStatusEl.textContent = (data && data.message) || "If that email has a SHRED trial, we've sent its link.";
          }
        })
        .catch(function () {
          if (trialResendStatusEl) trialResendStatusEl.textContent = "Couldn't reach us. Try again.";
        })
        .then(function () {
          trialResendInFlight = false;
          if (trialResendSubmitBtn) {
            trialResendSubmitBtn.disabled = false;
            trialResendSubmitBtn.removeAttribute('aria-busy');
          }
        });
    });
  }
})();
