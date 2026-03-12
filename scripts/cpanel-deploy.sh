#!/bin/bash
set -euo pipefail

# Optional overrides:
# - CPANEL_DEPLOY_PATH: where frontend dist files are copied.
# - CPANEL_REPO_NAME: repository folder under ~/repositories.
# - CPANEL_NODEVENV_BASE: full base path for nodevenv binaries.
# - CPANEL_DEPLOY_ENV_FILE: env file path (default: .cpanel-deploy.local.env)
DEPLOY_ENV_FILE="${CPANEL_DEPLOY_ENV_FILE:-.cpanel-deploy.local.env}"
if [ -f "$DEPLOY_ENV_FILE" ]; then
  # shellcheck disable=SC1090
  . "$DEPLOY_ENV_FILE"
fi

USER_HOME="${HOME:-}"
if [ -z "$USER_HOME" ]; then
  USER_HOME="$(cd ~ && pwd)"
fi

REPO_NAME="${CPANEL_REPO_NAME:-$(basename "$(pwd)")}"
DEPLOYPATH="${CPANEL_DEPLOY_PATH:-$USER_HOME/public_html/move}"
NODEVENV_BASE="${CPANEL_NODEVENV_BASE:-$USER_HOME/nodevenv/repositories/$REPO_NAME/backend}"

mkdir -p "$DEPLOYPATH"

NPM_BIN=""
NPM_CANDIDATES=(
  "$NODEVENV_BASE/20/bin/npm"
  "$NODEVENV_BASE/18/bin/npm"
  "$NODEVENV_BASE/16/bin/npm"
  "$NODEVENV_BASE/14/bin/npm"
  "$NODEVENV_BASE/12/bin/npm"
  "$NODEVENV_BASE/10/bin/npm"
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

echo "Deploy path: $DEPLOYPATH"
echo "Nodevenv base: $NODEVENV_BASE"
echo "Using npm at: $NPM_BIN"
"$NPM_BIN" ci --prefix frontend
"$NPM_BIN" run build --prefix frontend

test -f frontend/dist/index.html
cp -R frontend/dist/. "$DEPLOYPATH"

echo "Deploy completed at $(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$DEPLOYPATH/.deploy-info.txt"
