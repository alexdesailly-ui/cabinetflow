#!/usr/bin/env bash
# Régénère public/og.png (1200×630) à partir de scripts/og/og.html avec Chromium headless.
set -euo pipefail
cd "$(dirname "$0")/../.."
CHROME="${CHROME:-$(ls -d /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell 2>/dev/null | head -1)}"
"$CHROME" --headless --no-sandbox --disable-gpu --hide-scrollbars --window-size=1200,630 \
  --screenshot="$PWD/public/og.png" "file://$PWD/scripts/og/og.html"
