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
  // Local testing only: a dev server on this machine talks to a local Worker in Stripe test mode.
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    WORKER_URL = 'http://localhost:8799';
    STRIPE_PUBLISHABLE_KEY = 'pk_test_51UIwxREHfnNaW3GQ913S4kWMAxlgqjxZXMHiKrQYgJ7xK2GtFWkMknQum3EI2BID71pORSQGtQPOFM7QPY0CtLjS00JsMgXnmj';
  }

  var PLANS = {
    starter: { name: 'Starter', price: 25 },
    creator: { name: 'Creator', price: 50 },
    pro: { name: 'Pro', price: 100 },
    studio: { name: 'Studio', price: 200 }
  };

  var grid = document.querySelector('[data-pricing-grid]');
  var panel = document.querySelector('[data-checkout-panel]');
  var success = document.querySelector('[data-checkout-success]');
  if (!grid || !panel || !success) return; // this page doesn't have the pricing section

  // Billing selector (2026-10-28, second pass): Monthly, 6 months, 12 months, all billed monthly at
  // clean round prices. Annual (one up-front payment) is no longer sold. Every price below is
  // the owner's table, in cents, kept in sync by hand with the payment Worker's
  // worker/src/billing.ts PRICE_CENTS — the Worker charges its own copy, never these, so a drift
  // here could only ever mislabel a price, never change what Stripe charges (and Stripe's own
  // form shows the real amount before anyone pays).
  // Owner's launch table (2026-11-03): one base monthly price per plan; 6 months is 10% off and
  // 12 months is 15% off, both still billed monthly. Every shown price is derived from these, never
  // typed in by hand. Must match the payment Worker's worker/src/billing.ts (it charges its own copy).
  var BASE_CENTS = { starter: 2900, creator: 6900, pro: 12900, studio: 19900 };
  var DISCOUNT = { month: 0, m6: 0.10, m12: 0.15 };
  var CENTS = {};
  Object.keys(BASE_CENTS).forEach(function (plan) {
    CENTS[plan] = {};
    Object.keys(DISCOUNT).forEach(function (opt) {
      CENTS[plan][opt] = Math.round(BASE_CENTS[plan] * (1 - DISCOUNT[opt]));
    });
  });
  // Cost per clip in cents, two places: 11.60¢, 7.16¢.
  function perClipText(cents, clips) {
    return (cents / clips).toFixed(2) + '\u00a2 / clip';
  }
  var TERM_MONTHS = { month: 0, m6: 6, m12: 12, year: 12 };
  // The line under the selector: what's paid when, for how long, and how it ends. Same policy as
  // the terms paragraph under the grid and the text Stripe shows above its Subscribe button.
  var TERM_NOTE = {
    month: '<strong>Billed monthly.</strong> Cancel anytime. No fee.',
    m6: '<strong>Billed monthly for 6 months.</strong> 10% off every payment. Can\'t be canceled early. Renews for another 6 months unless you turn off auto-renew.',
    m12: '<strong>Billed monthly for 12 months.</strong> 15% off every payment. Can\'t be canceled early. Renews for another 12 months unless you turn off auto-renew.'
  };
  function usd(cents) {
    var whole = Math.floor(cents / 100);
    var rem = cents % 100;
    return '$' + whole.toLocaleString('en-US') + (rem ? '.' + (rem < 10 ? '0' : '') + rem : '');
  }

  var termGroup = document.querySelector('[data-term]');
  var termNote = document.querySelector('[data-term-note]');
  var currentInterval = 'month'; // one of month | m6 | m12

  function renderPrices(option) {
    if (termNote) termNote.innerHTML = TERM_NOTE[option];
    // 6/12-month terms are a real commitment: make the note stand out so nobody misses it.
    if (termNote) termNote.classList.toggle('is-commitment', option !== 'month');
    // Swapping the number mid-transition (rather than before or after it) is what makes the
    // blur+fade read as one number smoothly becoming another instead of the old one vanishing
    // and a different one popping in once it's gone — see the emil-design-eng skill's note on
    // using blur to mask an otherwise-abrupt crossfade.
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    Array.prototype.forEach.call(grid.querySelectorAll('.pricing-card'), function (card) {
      var btn = card.querySelector('[data-plan-button]');
      var plan = btn && btn.getAttribute('data-plan-button');
      var row = CENTS[plan];
      var priceEl = card.querySelector('.pricing-price');
      var saveEl = card.querySelector('[data-pricing-save]');
      var billEl = card.querySelector('[data-pricing-bill]');
      var clipsEl = card.querySelector('.pricing-clips');
      var perClipEl = card.querySelector('.pricing-per-clip');
      if (!row || !priceEl) return;
      var cents = row[option];
      var perMonth = option === 'year' ? Math.round(cents / 12) : cents;

      var apply = function () {
        priceEl.innerHTML = '<span class="num">' + usd(cents) + '</span>' + (option === 'year' ? '/yr' : '/mo');

        // The "save" line is always rendered (never [hidden]) so its height is reserved whether
        // or not it currently has text — toggling a class instead of hidden means switching
        // options never changes the card's height. Savings are only ever vs. paying Monthly for
        // the same stretch: per term for 6/12 months, per year for annual.
        if (saveEl) {
          if (option === 'month') {
            // opacity: 0 (via is-visible coming off) only hides this visually — the leftover text
            // is still in the accessibility tree and gets read out on Monthly unless it's hidden
            // explicitly too.
            saveEl.classList.remove('is-visible');
            saveEl.setAttribute('aria-hidden', 'true');
          } else {
            saveEl.textContent = option === 'year'
              ? 'Save ' + usd(row.month * 12 - cents) + '/yr'
              : 'Save ' + usd((row.month - cents) * TERM_MONTHS[option]) + ' over ' + TERM_MONTHS[option] + ' mo';
            saveEl.classList.add('is-visible');
            saveEl.removeAttribute('aria-hidden');
          }
        }
        // How it's billed, on every card, so monthly payments and one upfront payment can't be
        // confused: annual says "One payment today" and what it works out to per month.
        if (billEl) {
          billEl.innerHTML = option === 'year'
            ? 'One payment today<br><span class="pricing-equiv">Works out to ' + usd(perMonth) + '/mo</span>'
            : option === 'month' ? 'Billed monthly' : 'Billed monthly &middot; ' + TERM_MONTHS[option] + '-month term';
        }
        priceEl.classList.remove('is-swapping');
      };

      if (reduceMotion) {
        apply();
      } else {
        priceEl.classList.add('is-swapping');
        setTimeout(apply, 90);
      }

      // Clips are always shown as the monthly figure, whatever the option — a yearly total
      // (e.g. "2,400 clips / yr") read like the whole year's worth lands upfront, which
      // contradicts the "clips reset on the 1st" note. Cost-per-clip DOES follow the option.
      if (clipsEl && perClipEl) {
        var monthlyClips = Number(clipsEl.getAttribute('data-clips-monthly'));
        perClipEl.textContent = perClipText(perMonth, monthlyClips);
      }
    });
  }

  if (termGroup) {
    var termOpts = termGroup.querySelectorAll('[data-term-opt]');
    var selectTerm = function (btn, focus) {
      // Switching options mid-checkout used to silently update prices behind the open checkout
      // panel, with no visible effect — back out to the pricing grid instead, same as clicking
      // Cancel, so the selector actually does something the person can see.
      if (!panel.hidden) showGrid('');
      currentInterval = btn.getAttribute('data-term-opt');
      Array.prototype.forEach.call(termOpts, function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
      });
      if (focus) btn.focus();
      renderPrices(currentInterval);
    };
    Array.prototype.forEach.call(termOpts, function (btn, i) {
      btn.addEventListener('click', function () { selectTerm(btn, false); });
      // Radio-group keyboard behavior: arrows move the selection, as with native radios.
      btn.addEventListener('keydown', function (e) {
        var step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        selectTerm(termOpts[(i + step + termOpts.length) % termOpts.length], true);
      });
    });
    renderPrices(currentInterval);
  }

  var frame = document.getElementById('checkout-frame');
  var statusEl = panel.querySelector('[data-checkout-status]');
  var retryBtn = panel.querySelector('[data-checkout-retry]');
  var cancelBtn = panel.querySelector('[data-checkout-cancel]');
  var pricingError = document.querySelector('[data-pricing-error]');
  var keyEl = success.querySelector('[data-activation-key]');
  var copyBtn = success.querySelector('[data-copy-key]');
  var successTitle = success.querySelector('[data-checkout-success-title]');
  var successHeading = successTitle;
  var successSteps = success.querySelector('[data-checkout-success-steps]');
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
  var DEFAULT_OFFER_CODE = 'SHRED'; // launch offer, shown to everyone
  // Launch offer runs through Dec 31, 2026 (Daniel, 2026-11-04): the box stops showing after
  // 11:59 pm Pacific that night. The Worker stops accepting the code at the same moment.
  var DEFAULT_OFFER_ENDS = Date.parse('2027-01-01T08:00:00Z');
  var currentOfferCode = null; // set once /offer confirms a real, active code
  var trialSubmitInFlight = false; // one in-flight /checkout(offer) request at a time
  var trialResendInFlight = false; // one in-flight /trial/resend-link request at a time

  // Windows visitors get the .exe as the primary button and the .dmg as the small secondary
  // link, and vice versa for everyone else — navigator.userAgentData is the modern replacement
  // for sniffing the UA string; platform/userAgent cover browsers that don't support it yet.
  function isPhoneVisitor() {
    var ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod|Android|Mobile/i.test(ua)) return true;
    // iPadOS reports itself as a Mac; a touch screen gives it away.
    return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  }

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

  // Branded plan checkout (2026-11-05): our own summary, email field and Pay button around Stripe's
  // payment fields (Checkout Sessions with ui_mode 'elements'). The SHRED trial keeps Stripe's
  // embedded form below.
  var bco = panel.querySelector('[data-bco]');
  var bcoForm = bco ? bco.querySelector('[data-bco-form]') : null;
  var bcoPlan = bco ? bco.querySelector('[data-bco-plan]') : null;
  var bcoPrice = bco ? bco.querySelector('[data-bco-price]') : null;
  var bcoBill = bco ? bco.querySelector('[data-bco-bill]') : null;
  var bcoClips = bco ? bco.querySelector('[data-bco-clips]') : null;
  var bcoTotal = bco ? bco.querySelector('[data-bco-total]') : null;
  var bcoExpress = bco ? bco.querySelector('[data-bco-express]') : null;
  var bcoOr = bco ? bco.querySelector('[data-bco-or]') : null;
  var bcoEmail = bco ? bco.querySelector('[data-bco-email]') : null;
  var bcoPayment = bco ? bco.querySelector('[data-bco-payment]') : null;
  var bcoTerms = bco ? bco.querySelector('[data-bco-terms]') : null;
  var bcoError = bco ? bco.querySelector('[data-bco-error]') : null;
  var bcoPay = bco ? bco.querySelector('[data-bco-pay]') : null;
  var brandedSdk = null; // the Checkout Elements SDK instance for the open plan checkout
  var brandedActions = null; // its loadActions() result (updateEmail / confirm)
  var brandedElements = []; // mounted Payment / Express Checkout elements, destroyed on teardown
  var brandedCanConfirm = false;
  var brandedTotalText = '';
  var brandedPaying = false;
  var brandedFormReady = false; // Stripe's payment fields have finished loading
  var brandedRun = 0; // bumps on every start/teardown so a late async step can't touch a newer checkout

  // Stripe's embedded form (the SHRED trial, and the fallback plan checkout). The dahlia Stripe.js
  // this page loads for the branded checkout renamed initEmbeddedCheckout() to
  // createEmbeddedCheckoutPage() and throws on the old name, so use whichever exists.
  function initEmbedded(options) {
    var s = getStripe();
    if (typeof s.createEmbeddedCheckoutPage === 'function') return Promise.resolve(s.createEmbeddedCheckoutPage(options));
    return s.initEmbeddedCheckout(options);
  }

  var embeddedCheckout = null; // the mounted Stripe EmbeddedCheckout instance, so we can destroy it cleanly
  var sessionId = null; // the current Checkout Session id — reused by "Try again" so we never start a second session for one charge
  var currentPlanId = null;
  var currentPlanInterval = 'month'; // snapshotted from currentInterval (month | m6 | m12 | year) when "Buy now" is clicked, so changing the selector mid-checkout can't change an in-flight session
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

  function teardownBranded() {
    brandedRun++;
    brandedElements.forEach(function (el) {
      try {
        el.destroy();
      } catch (err) {
        // already gone
      }
    });
    brandedElements = [];
    brandedSdk = null;
    brandedActions = null;
    brandedCanConfirm = false;
    brandedPaying = false;
    brandedFormReady = false;
    if (!bco) return;
    bco.hidden = true;
    if (bcoExpress) bcoExpress.innerHTML = '';
    if (bcoPayment) bcoPayment.innerHTML = '';
    if (bcoOr) bcoOr.hidden = true;
    showBrandedError('');
    if (bcoPay) {
      bcoPay.disabled = true;
      bcoPay.removeAttribute('aria-busy');
    }
  }

  function showBrandedError(message) {
    if (!bcoError) return;
    bcoError.textContent = message || '';
    bcoError.hidden = !message;
    if (message) bcoError.focus();
  }

  function updatePayButton() {
    if (!bcoPay) return;
    // Solid as soon as Stripe's form is ready; Stripe checks the fields when Pay is pressed and
    // marks anything missing right in the form (its own canConfirm stays false until the email,
    // which we only hand over on Pay, is set).
    bcoPay.disabled = !brandedActions || !brandedFormReady || brandedPaying;
    bcoPay.textContent = brandedPaying ? 'Processing\u2026' : (brandedFormReady ? 'Pay ' + (brandedTotalText || '') : 'Loading\u2026');
  }

  function teardownCheckout() {
    teardownBranded();
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
      frame.hidden = false;
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

  function showSuccess(activationKey, trial, firstName) {
    teardownCheckout();
    panel.hidden = true;
    grid.hidden = true;
    success.hidden = false;
    // L2: the trial offer box (email field + its own form) has nothing left to do once the
    // trial — or any purchase — has actually completed; leaving it visible behind the success
    // panel let someone immediately try to start a second trial from the same page.
    if (trialOffer) trialOffer.hidden = true;
    if (keyEl) keyEl.textContent = activationKey;

    // A short welcome: "You're in, Macy." when the Worker knows a first name, else "You're in."
    // endsOnText rides pre-formatted from the Worker (§3 — this file never computes its own end
    // date). Phones can't run the app, so they get pointed at the email instead of downloads.
    var name = (firstName || '').trim().split(/\s+/)[0];
    var onPhone = isPhoneVisitor();
    var isTrial = !!(trial && trial.endsOnText);
    if (successTitle) successTitle.textContent = name ? "You're in, " + name + '.' : "You're in.";
    if (successNote) {
      successNote.textContent = isTrial
        ? 'Your free trial runs until ' + trial.endsOnText + ' or 100 clips. Nothing is charged unless you pick a plan.'
        : "Thanks for the support. Here's your activation key.";
    }
    if (successSteps) {
      successSteps.innerHTML = onPhone
        ? '<li>Open the email we just sent you on your computer.</li><li>Download Stock Shredder from it.</li><li>Open it and paste your key under <strong>Account &rsaquo; Activate with a key</strong>.</li>'
        : '<li>Install Stock Shredder.</li><li>Open it and paste your key under <strong>Account &rsaquo; Activate with a key</strong>.</li><li>Drop in a folder of raw footage and start shredding.</li>';
    }

    // Show the visitor's own platform as the big button, the other platform as a small secondary
    // link — macDownload/winDownload keep whatever the release-fetch script resolved as the
    // latest .dmg/.exe, so this only ever reorders/relabels them, never re-derives the URLs.
    // Phones and tablets can't run the app: no download buttons there, just a pointer to the
    // purchase email, which carries the key plus Mac and Windows download links.
    if (macDownload) macDownload.hidden = onPhone;
    if (winDownload) winDownload.hidden = onPhone;
    if (macDownload && winDownload && !onPhone) {
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
      // `interval` too, for a Worker that predates `billing` — but the Worker must be deployed
      // first anyway, or 6/12-month buyers would be charged the monthly price.
      body: JSON.stringify({ planId: currentPlanId, billing: currentPlanInterval, interval: currentPlanInterval === 'year' ? 'year' : 'month' })
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
          showSuccess(data.activationKey, data.trial, data.firstName);
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
        showGrid("That charge didn't go through, so nothing was billed. Pick a plan to try again.");
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
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (bco && typeof getStripe().initCheckoutElementsSdk === 'function') {
      startBrandedCheckout(planId);
      panel.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
      return;
    }

    showStatus('Loading secure checkout…', false);
    frame.classList.add('is-loading');
    panel.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });

    initEmbedded({
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

  var BRANDED_AUTH = 'By paying, you allow DEADWORK STUDIO to charge your card on these terms.';

  // Stripe's fields drawn in the site's own type and colors: Archivo, square corners, ink on bone.
  var BRANDED_APPEARANCE = {
    theme: 'flat',
    variables: {
      fontFamily: 'Archivo, "Helvetica Neue", Helvetica, Arial, sans-serif',
      fontSizeBase: '16px',
      colorPrimary: '#141412',
      colorBackground: '#FBF9F4',
      colorText: '#141412',
      colorTextSecondary: '#4A4741',
      colorTextPlaceholder: '#8A867E',
      colorDanger: '#A3241D',
      borderRadius: '0px',
      spacingUnit: '4px',
      gridRowSpacing: '14px',
      focusBoxShadow: 'none',
      focusOutline: 'none'
    },
    rules: {
      '.Input': { border: '1px solid rgba(20, 20, 18, .28)', boxShadow: 'none', padding: '13px 14px' },
      '.Input:focus': { border: '1px solid #141412', boxShadow: 'inset 0 0 0 1px #141412' },
      '.Input--invalid': { border: '1px solid #A3241D', boxShadow: 'none' },
      '.Label': { fontSize: '13px', fontWeight: '400', color: '#4A4741', marginBottom: '6px' },
      '.Tab': { border: '1px solid rgba(20, 20, 18, .28)', boxShadow: 'none', backgroundColor: '#FBF9F4' },
      '.Tab:hover': { border: '1px solid #141412' },
      '.Tab--selected': { border: '1px solid #141412', boxShadow: 'inset 0 0 0 1px #141412', backgroundColor: '#FBF9F4' },
      '.Tab--selected:focus': { boxShadow: 'inset 0 0 0 1px #141412' },
      '.AccordionItem': { border: '1px solid rgba(20, 20, 18, .28)', boxShadow: 'none' },
      '.Block': { border: '1px solid rgba(20, 20, 18, .28)', boxShadow: 'none' },
      '.CheckboxInput': { border: '1px solid rgba(20, 20, 18, .5)' }
    }
  };

  function brandedFonts() {
    // Absolute https URLs: Stripe's fields load the font from inside their own frame (the site's
    // font files allow any origin).
    var base = 'https://deadworkstudio.com/';
    return [
      { family: 'Archivo', src: 'url(' + base + 'assets/fonts/archivo-variable.woff2)', weight: '100 900' },
      { family: 'JetBrains Mono', src: 'url(' + base + 'assets/fonts/jetbrains-mono-500.woff2?v=20261027a)', weight: '500' }
    ];
  }

  function fillBrandedSummary(planId) {
    var plan = PLANS[planId];
    var cents = CENTS[planId][currentPlanInterval];
    var card = grid.querySelector('[data-plan-button="' + planId + '"]');
    card = card && card.closest('.pricing-card');
    var clipsEl = card && card.querySelector('.pricing-clips');
    var clips = clipsEl ? Number(clipsEl.getAttribute('data-clips-monthly')) : 0;
    if (bcoPlan) bcoPlan.textContent = plan.name;
    if (bcoPrice) bcoPrice.textContent = usd(cents);
    if (bcoBill) {
      bcoBill.textContent = currentPlanInterval === 'month'
        ? 'Monthly \u00b7 Cancel anytime'
        : TERM_MONTHS[currentPlanInterval] + '-month term';
    }
    if (bcoClips) bcoClips.textContent = clips ? clips.toLocaleString('en-US') + ' clips / mo' : '';
    brandedTotalText = (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    if (bcoTotal) bcoTotal.textContent = brandedTotalText;
    // Until the Worker answers, the site's own wording for this option (the Worker's own copy of the
    // same terms replaces it a moment later).
    if (bcoTerms) bcoTerms.innerHTML = TERM_NOTE[currentPlanInterval] + ' ' + BRANDED_AUTH;
    updatePayButton();
  }

  function startBrandedCheckout(planId) {
    var run = brandedRun;
    fillBrandedSummary(planId);
    bco.hidden = false;
    showStatus('', false);
    if (bcoPayment) bcoPayment.classList.add('is-loading');

    fetch(WORKER_URL + '/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId: planId,
        billing: currentPlanInterval,
        interval: currentPlanInterval === 'year' ? 'year' : 'month',
        ui: 'custom',
        returnUrl: location.origin + location.pathname
      })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Checkout request failed: ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (run !== brandedRun) return;
        if (!data || !data.clientSecret || !data.sessionId) throw new Error('missing clientSecret');
        sessionId = data.sessionId;
        if (bcoTerms && data.terms) bcoTerms.textContent = data.terms + ' ' + BRANDED_AUTH;
        var sdk = getStripe().initCheckoutElementsSdk({
          clientSecret: data.clientSecret,
          elementsOptions: { appearance: BRANDED_APPEARANCE, fonts: brandedFonts() }
        });
        brandedSdk = sdk;
        sdk.on('change', function (session) {
          if (run !== brandedRun) return;
          brandedCanConfirm = !!session.canConfirm;
          var t = session.total && session.total.total;
          if (t && t.amount) {
            brandedTotalText = t.amount;
            if (bcoTotal) bcoTotal.textContent = t.amount;
          }
          updatePayButton();
        });

        // Link, Apple Pay, Google Pay and the like, as one tap, above the card form.
        var express = sdk.createExpressCheckoutElement({
          buttonHeight: 50,
          buttonTheme: { applePay: 'black', googlePay: 'black' },
          layout: { maxColumns: 1 },
          // Only the one-tap options up top, so there's no "See more" row; everything else is in
          // the list below.
          paymentMethods: { amazonPay: 'never', paypal: 'never' }
        });
        express.on('ready', function (evt) {
          var any = evt && evt.availablePaymentMethods && Object.keys(evt.availablePaymentMethods).some(function (k) { return evt.availablePaymentMethods[k]; });
          if (bcoOr) bcoOr.hidden = !any;
          if (bcoExpress && !any) bcoExpress.innerHTML = '';
        });
        express.on('confirm', function (evt) {
          if (!brandedActions) return;
          showBrandedError('');
          brandedPaying = true;
          updatePayButton();
          brandedActions.confirm({ expressCheckoutConfirmEvent: evt, redirect: 'if_required' }).then(handleBrandedConfirm);
        });
        express.mount(bcoExpress);
        brandedElements.push(express);

        // Stripe's own card line ("...charge you according to the terms until you cancel") reads
        // wrong next to a 6/12-month term that can't be canceled early, so the card line is ours
        // instead (BRANDED_AUTH below the terms). Other methods keep Stripe's own wording.
        var payment = sdk.createPaymentElement({ layout: { type: 'accordion', radios: 'always', spacedAccordionItems: false }, terms: { card: 'never' } });
        payment.on('ready', function () {
          if (bcoPayment) bcoPayment.classList.remove('is-loading');
          brandedFormReady = true;
          updatePayButton();
        });
        payment.mount(bcoPayment);
        brandedElements.push(payment);

        return sdk.loadActions().then(function (result) {
          if (run !== brandedRun) return;
          if (result.type !== 'success') throw new Error(result.error && result.error.message);
          brandedActions = result.actions;
          updatePayButton();
          // The email goes to Stripe only when Pay is pressed: handing it over earlier makes
          // Stripe tick its own "save my info with Link" box, which then demands a phone number
          // and keeps Pay disabled with no visible reason.
        });
      })
      .catch(function (err) {
        if (run !== brandedRun) return;
        if (window.console) console.error('Branded checkout failed to start', err);
        showGrid("Couldn't start checkout. Pick a plan to try again.");
      });
  }

  function handleBrandedConfirm(result) {
    if (!result) return;
    if (result.type === 'error') {
      brandedPaying = false;
      updatePayButton();
      if (bcoPay) bcoPay.removeAttribute('aria-busy');
      showBrandedError((result.error && result.error.message) || "That payment didn't go through. Nothing was charged.");
      return;
    }
    // Paid without leaving the page (cards, Link, wallets): finish here. Methods that hand off to
    // another site come back to this page with ?session_id= instead (see resumeFromReturn).
    teardownBranded();
    verifySession();
  }

  if (bcoForm) {
    bcoForm.addEventListener('submit', function (evt) {
      evt.preventDefault();
      if (!brandedActions || brandedPaying) return;
      var email = bcoEmail ? bcoEmail.value.trim() : '';
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showBrandedError('Enter your email so we can send your activation key.');
        if (bcoEmail) bcoEmail.focus();
        return;
      }
      showBrandedError('');
      brandedPaying = true;
      updatePayButton();
      if (bcoPay) bcoPay.setAttribute('aria-busy', 'true');
      brandedActions.updateEmail(email).then(function (res) {
        if (res && res.type === 'error') {
          brandedPaying = false;
          updatePayButton();
          if (bcoPay) bcoPay.removeAttribute('aria-busy');
          showBrandedError((res.error && res.error.message) || 'Check your email address.');
          return;
        }
        return brandedActions.confirm({ redirect: 'if_required' }).then(handleBrandedConfirm);
      });
    });
  }

  // Back from a payment method that finishes on its own site (Klarna, Cash App Pay, Amazon Pay) or
  // a bank check: Stripe returns here with ?session_id=. Confirm it the same way as an in-page payment.
  (function resumeFromReturn() {
    var returned = null;
    try {
      returned = new URLSearchParams(location.search).get('session_id');
    } catch (err) {
      returned = null;
    }
    if (!returned || !/^cs_(test|live)_/.test(returned)) return;
    try {
      var clean = new URL(location.href);
      clean.searchParams.delete('session_id');
      history.replaceState(null, '', clean.pathname + clean.search + '#pricing');
    } catch (err) {
      // fine, the id just stays in the address bar
    }
    sessionId = returned;
    grid.hidden = true;
    success.hidden = true;
    panel.hidden = false;
    if (frame) frame.hidden = true;
    var pricingSection = document.getElementById('pricing');
    if (pricingSection) pricingSection.scrollIntoView({ block: 'start' });
    verifySession();
  })();

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
  // `quiet` = the default SHRED offer shown to every visitor (no ?code= in the URL): if it's
  // switched off in the Worker, the box just stays hidden, with no error and no scroll.
  function checkOffer(code, quiet) {
    if (!trialOffer || !code) return;
    fetch(WORKER_URL + '/offer?code=' + encodeURIComponent(code))
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.valid) {
          if (quiet) return;
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
          if (data.endsOnText) el.textContent = data.endsOnText;
        });
        trialOffer.hidden = false;
        if (quiet) return;
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
    else if (Date.now() < DEFAULT_OFFER_ENDS) checkOffer(DEFAULT_OFFER_CODE, true);
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
          } else if (result.status === 400 && data.error) {
            // A plain refusal of what was typed (e.g. not a real email address) reads fine as is.
            showTrialError(data.error);
          } else {
            // Server trouble (5xx, or a broken reply): never show the server's own wording, which
            // is written for logs, not customers (audit 2026-11-06).
            showTrialError("Couldn't start your trial. Nothing was charged. Please try again in a minute.");
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

        initEmbedded({
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
      // Catch an obvious typo here instead of a round trip (the server still checks properly).
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showTrialError('Check your email address. It should look like name@example.com.');
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
