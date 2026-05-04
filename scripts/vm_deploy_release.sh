#!/usr/bin/env bash
#
# Deploy del panel en producción (VM): SOLO desde la rama release.
#
# Uso (en la VM, consola del cloud):
#   chmod +x ~/tom-bot-frontend/scripts/vm_deploy_release.sh   # una vez
#   ~/tom-bot-frontend/scripts/vm_deploy_release.sh
#
# Variables opcionales:
#   REPO_ROOT       default ~/tom-bot-frontend
#   DEPLOY_BRANCH   default release
#   PANEL_PUBLIC    default /opt/tombot/panel-public

set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/tom-bot-frontend}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-release}"
PANEL_PUBLIC="${PANEL_PUBLIC:-/opt/tombot/panel-public}"

cd "$REPO_ROOT"
echo "==> Rama actual: $(git rev-parse --abbrev-ref HEAD)"
git fetch origin
git checkout "$DEPLOY_BRANCH"
git pull "origin" "$DEPLOY_BRANCH"

echo "==> npm ci + build"
npm ci
npm run build

if [ ! -d dist ]; then
  echo "ERROR: no existe dist/ después del build" >&2
  exit 1
fi

echo "==> rsync -> $PANEL_PUBLIC"
sudo mkdir -p "$PANEL_PUBLIC"
sudo rsync -a --delete dist/ "$PANEL_PUBLIC/"

echo "Listo (frontend desde $DEPLOY_BRANCH -> $PANEL_PUBLIC)."
