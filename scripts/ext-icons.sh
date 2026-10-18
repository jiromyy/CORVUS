#!/usr/bin/env bash
# Renders extension/icons/*.png from scripts/ext-icons.html with headless Chrome.
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
mkdir -p extension/icons
page="file:///$(cd scripts && pwd -W 2>/dev/null || pwd)/ext-icons.html"
"$CHROME" --headless=new --disable-gpu --dump-dom "$page" 2>/dev/null \
  | sed -n '/BEGIN/,/END/p' | grep -E '^[a-z]+-[0-9]+ data:' \
  | while read -r name url; do
      echo "${url#data:image/png;base64,}" | base64 -d > "extension/icons/$name.png"
      echo "extension/icons/$name.png"
    done
