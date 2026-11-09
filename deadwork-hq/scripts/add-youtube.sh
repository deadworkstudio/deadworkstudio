#!/bin/bash
# Adds YouTube numbers to the morning email (Daniel 2026-11-09).
# Updates deadwork-hq to feat/one-daily-email (social section) and asks for the YouTube key.
# The key is typed here in Terminal, never in chat. Stops on the first error.
set -euo pipefail
BASE="$HOME/one-email-deploy/deadworkstudio"
HQ="$BASE/deadwork-hq"
[ -d "$HQ" ] || { echo "STOP: $HQ not found. Nothing was changed. Tell Claude."; exit 1; }
cd "$BASE"
git fetch -q origin feat/one-daily-email
git checkout -q --detach FETCH_HEAD
echo "Code: $(git log --oneline -1)"
cd "$HQ"
npm ci --silent
npx tsc --noEmit
PREV=$(npx wrangler deployments status 2>/dev/null | grep '%' | grep -Eo '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
[ -n "$PREV" ] || { echo "STOP: could not read the current version. Nothing was changed. Tell Claude."; exit 1; }
echo "deadwork-hq rollback version before YouTube: $PREV" | tee -a "$HOME/one-email-deploy/rollback.txt"
npx wrangler deploy

echo "== Payments system: leave dh1367@hotmail.com (Daniel) out of the numbers"
SSBASE="$HOME/one-email-deploy/stock-shredder"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST https://stock-shredder-payments.stockshredder.workers.dev/internal/daily-digest)
[ "$CODE" = "401" ] || { echo "STOP: payments system isn't on the one-email version (got $CODE). YouTube part is done; payments unchanged. Tell Claude."; exit 1; }
cd "$SSBASE"
git fetch -q origin feat/one-daily-email
git checkout -q --detach FETCH_HEAD
echo "Code: $(git log --oneline -1)"
cd worker
npm ci --silent
npx tsc --noEmit
SSPREV=$(npx wrangler deployments status 2>/dev/null | grep '%' | grep -Eo '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
[ -n "$SSPREV" ] || { echo "STOP: could not read the payments version. YouTube part is done; payments unchanged. Tell Claude."; exit 1; }
echo "payments rollback version before dh1367 fix: $SSPREV" | tee -a "$HOME/one-email-deploy/rollback.txt"
npx wrangler deploy
cd "$HQ"
echo ""
echo ">>> Paste your YouTube API key below and press Return (it will not show on screen):"
npx wrangler secret put YOUTUBE_API_KEY
echo "DONE. Tell Claude it finished."
