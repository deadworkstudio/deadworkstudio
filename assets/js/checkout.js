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
  var macDownload = document.getElementById('download-success');
  var winDownload = document.getElementById('download-success-alt');

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

  function showSuccess(activationKey) {
    teardownCheckout();
    panel.hidden = true;
    grid.hidden = true;
    success.hidden = false;
    if (keyEl) keyEl.textContent = activationKey;

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
        showStatus("Couldn't start checkout — click Cancel and pick a plan to try again.", true);
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
          showSuccess(data.activationKey);
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
        showStatus("We couldn't confirm the payment — you may have been charged. Click Try again to check once more.", true);
      });
  }

  function startCheckout(planId) {
    var plan = PLANS[planId];
    if (!plan || !frame) return;

    currentPlanId = planId;
    currentPlanInterval = currentInterval;
    sessionId = null;
    showPricingError('');
    if (retryBtn) retryBtn.hidden = true;

    grid.hidden = true;
    success.hidden = true;
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
        showGrid("Couldn't start checkout — please pick a plan to try again.");
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
})();
