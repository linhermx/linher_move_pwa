#!/bin/bash
set -euo pipefail

# Optional overrides:
# - CPANEL_DEPLOY_PATH: where frontend dist files are copied.
# - CPANEL_REPO_NAME: repository folder under ~/repositories.
# - CPANEL_NODEVENV_BASE: full base path for nodevenv binaries.
# - CPANEL_NPM_BIN: absolute npm binary path.
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
  "/opt/alt/alt-nodejs20/root/usr/bin/npm"
  "/opt/alt/alt-nodejs18/root/usr/bin/npm"
  "/opt/alt/alt-nodejs16/root/usr/bin/npm"
  "/opt/alt/alt-nodejs14/root/usr/bin/npm"
  "/opt/alt/alt-nodejs12/root/usr/bin/npm"
  "/opt/cpanel/ea-nodejs20/bin/npm"
  "/opt/cpanel/ea-nodejs18/bin/npm"
  "/opt/cpanel/ea-nodejs16/bin/npm"
  "/usr/local/bin/npm"
  "/usr/bin/npm"
)

if [ -n "${CPANEL_NPM_BIN:-}" ] && [ -x "$CPANEL_NPM_BIN" ]; then
  NPM_BIN="$CPANEL_NPM_BIN"
fi

if [ -z "$NPM_BIN" ]; then
  for CANDIDATE in "${NPM_CANDIDATES[@]}"; do
    if [ -x "$CANDIDATE" ]; then
      NPM_BIN="$CANDIDATE"
      break
    fi
  done
fi

if [ -z "$NPM_BIN" ] && [ -d "$USER_HOME/nodevenv" ]; then
  FOUND_NODEVENV_NPM="$(find "$USER_HOME/nodevenv" -maxdepth 6 -type f -path "*/bin/npm" 2>/dev/null | head -n 1 || true)"
  if [ -n "$FOUND_NODEVENV_NPM" ] && [ -x "$FOUND_NODEVENV_NPM" ]; then
    NPM_BIN="$FOUND_NODEVENV_NPM"
  fi
fi

if [ -z "$NPM_BIN" ] && command -v npm >/dev/null 2>&1; then
  NPM_BIN="$(command -v npm)"
fi

if [ -z "$NPM_BIN" ]; then
  echo "ERROR: npm binary not found on server"
  echo "Hint: set CPANEL_NPM_BIN in .cpanel-deploy.local.env"
  echo "Hint: expected nodevenv base: $NODEVENV_BASE"
  exit 127
fi

echo "Deploy path: $DEPLOYPATH"
echo "Nodevenv base: $NODEVENV_BASE"
echo "Using npm at: $NPM_BIN"
# Frontend build requires devDependencies (vite/plugin-react).
NPM_CONFIG_PRODUCTION=false "$NPM_BIN" ci --prefix frontend --include=dev
"$NPM_BIN" run build --prefix frontend

test -f frontend/dist/index.html
cp -R frontend/dist/. "$DEPLOYPATH"

echo "Deploy completed at $(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$DEPLOYPATH/.deploy-info.txt"
