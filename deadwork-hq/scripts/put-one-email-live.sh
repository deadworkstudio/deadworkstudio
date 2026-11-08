#!/bin/bash
# Puts the one morning email live (Daniel approved 2026-11-08 "Put the email there").
# 1) Stock Shredder payments Worker: feat/one-daily-email (dfdbbb9, on live 2159353e / version 583f5a68)
# 2) deadwork-hq Worker: feat/one-daily-email (ffe90d2)
# Both get the same new random token. Stops on the first error.
set -euo pipefail
BASE="$HOME/one-email-deploy"
SS="$BASE/stock-shredder/worker"
HQ="$BASE/deadworkstudio/deadwork-hq"
EXPECTED_LIVE="583f5a68"

echo "== Checking the live payments system is still $EXPECTED_LIVE"
cd "$SS"
LIVE=$(npx wrangler deployments status 2>/dev/null | grep '%' | grep -Eo '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
echo "Live payments version: $LIVE"
case "$LIVE" in
  $EXPECTED_LIVE*) echo "OK" ;;
  *) echo "STOP: the payments system changed since this was built. Nothing was changed. Tell Claude."; exit 1 ;;
esac

echo "== Remembering the current deadwork-hq version for rollback"
cd "$HQ"
HQ_PREV=$(npx wrangler deployments status 2>/dev/null | grep '%' | grep -Eo '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
[ -n "$HQ_PREV" ] && [ -n "$LIVE" ] || { echo "STOP: could not read current versions. Nothing was changed. Tell Claude."; exit 1; }
echo "deadwork-hq rollback version: $HQ_PREV" | tee "$BASE/rollback.txt"
echo "payments rollback version: $LIVE" | tee -a "$BASE/rollback.txt"

TOKEN=$(openssl rand -hex 32)

echo "== Payments system: new code, then token"
cd "$SS"
npx wrangler deploy
printf '%s' "$TOKEN" | npx wrangler secret put DIGEST_TOKEN

echo "== DEADWORK HQ: new code, then token"
cd "$HQ"
npx wrangler deploy
printf '%s' "$TOKEN" | npx wrangler secret put SS_DIGEST_TOKEN

echo "== Quick check (should say 401, meaning it's there and locked)"
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://stock-shredder-payments.stockshredder.workers.dev/internal/daily-digest
unset TOKEN
echo "DONE. Tell Claude it finished."
