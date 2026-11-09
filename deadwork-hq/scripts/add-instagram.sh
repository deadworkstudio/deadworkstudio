#!/bin/bash
# Adds Instagram numbers to the morning email (Daniel 2026-11-09). The code is already live;
# this only saves the Instagram token. Typed here in Terminal, never in chat.
set -euo pipefail
HQ="$HOME/one-email-deploy/deadworkstudio/deadwork-hq"
[ -d "$HQ" ] || { echo "STOP: $HQ not found. Nothing was changed. Tell Claude."; exit 1; }
cd "$HQ"
echo ">>> Paste your Instagram token below and press Return (it will not show on screen):"
npx wrangler secret put INSTAGRAM_TOKEN
echo "DONE. Tell Claude it finished."
