#!/bin/bash
set -euo pipefail

DEPLOYPATH="/home/linhercom/public_html/move"

mkdir -p "$DEPLOYPATH"

NPM_BIN=""
NPM_CANDIDATES=(
  "/home/linhercom/nodevenv/repositories/linher_move_pwa/backend/20/bin/npm"
  "/home/linhercom/nodevenv/repositories/linher_move_pwa/backend/18/bin/npm"
  "/home/linhercom/nodevenv/repositories/linher_move_pwa/backend/16/bin/npm"
  "/home/linhercom/nodevenv/repositories/linher_move_pwa/backend/14/bin/npm"
  "/home/linhercom/nodevenv/repositories/linher_move_pwa/backend/12/bin/npm"
  "/home/linhercom/nodevenv/repositories/linher_move_pwa/backend/10/bin/npm"
  "/opt/cpanel/ea-nodejs20/bin/npm"
  "/opt/cpanel/ea-nodejs18/bin/npm"
  "/usr/local/bin/npm"
  "/usr/bin/npm"
)

for CANDIDATE in "${NPM_CANDIDATES[@]}"; do
  if [ -x "$CANDIDATE" ]; then
    NPM_BIN="$CANDIDATE"
    break
  fi
done

if [ -z "$NPM_BIN" ] && command -v npm >/dev/null 2>&1; then
  NPM_BIN="$(command -v npm)"
fi

if [ -z "$NPM_BIN" ]; then
  echo "ERROR: npm binary not found on server"
  exit 127
fi

echo "Using npm at: $NPM_BIN"
"$NPM_BIN" ci --prefix frontend
"$NPM_BIN" run build --prefix frontend

test -f frontend/dist/index.html
cp -R frontend/dist/. "$DEPLOYPATH"

echo "Deploy completed at $(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$DEPLOYPATH/.deploy-info.txt"
