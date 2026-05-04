#!/usr/bin/env bash
#
# Build local del panel (Vite) y sube dist/ a la VM por rsync.
# Regla: ejecutar solo estando en la rama release (código = producción).
#
# Requiere: VM_USER, VM_HOST
# Opcional: VM_DEST, PANEL_HOST, SSH_PORT, SKIP_INSTALL, ALLOW_NON_RELEASE_DEPLOY=1
#
# Ejemplo:
#   git checkout release && git pull origin release
#   VM_USER=alemanmdq VM_HOST=IP_VM ./scripts/deploy_panel.sh

set -euo pipefail

if [ -z "${VM_USER:-}" ] || [ -z "${VM_HOST:-}" ]; then
  echo "ERROR: definí VM_USER y VM_HOST" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [ -d "$ROOT_DIR/.git" ] && [ "${ALLOW_NON_RELEASE_DEPLOY:-0}" != "1" ]; then
  cd "$ROOT_DIR"
  BR=$(git rev-parse --abbrev-ref HEAD)
  if [ "$BR" != "release" ]; then
    echo "ERROR: deploy_panel.sh solo se usa en rama release (rama actual: $BR)." >&2
    echo "  Hacé merge develop -> release, checkout release, y reintentá." >&2
    echo "  Emergencia: ALLOW_NON_RELEASE_DEPLOY=1 ..." >&2
    exit 1
  fi
fi

VM_DEST="${VM_DEST:-/opt/tombot/panel-public}"
PANEL_HOST="${PANEL_HOST:-$VM_HOST}"
SSH_PORT="${SSH_PORT:-22}"

cd "$ROOT_DIR"

if [ -z "${SKIP_INSTALL:-}" ]; then
  echo "==> npm ci"
  npm ci
fi

echo "==> npm run build"
npm run build

if [ ! -d dist ]; then
  echo "ERROR: no existe dist/ después del build" >&2
  exit 1
fi

echo "==> rsync -> $VM_USER@$VM_HOST:$VM_DEST"
ssh -p "$SSH_PORT" "$VM_USER@$VM_HOST" "mkdir -p '$VM_DEST'"
rsync -az --delete -e "ssh -p $SSH_PORT" dist/ "$VM_USER@$VM_HOST:$VM_DEST/"

echo "==> verificación remota"
ssh -p "$SSH_PORT" "$VM_USER@$VM_HOST" "ls -lh '$VM_DEST' | head -15"

echo
echo "Deploy OK -> https://$PANEL_HOST/admin/"
