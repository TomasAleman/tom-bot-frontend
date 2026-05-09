#!/usr/bin/env bash
# Deploy del panel en la VM: git pull (rama release) + rebuild del servicio en docker compose.
#
# Variables obligatorias:
#   PANEL_SERVICE   nombre del servicio en el compose (ej: panel, frontend, tom-bot-panel)
#
# Opcional:
#   COMPOSE_FILE    ruta al docker-compose.core.yml (default: $HOME/docker-compose.core.yml)
#   FRONT_ROOT      ruta al repo tom-bot-frontend (default: $HOME/tom-bot-frontend)
#   GIT_BRANCH      default: release

set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-$HOME/docker-compose.core.yml}"
FRONT_ROOT="${FRONT_ROOT:-$HOME/tom-bot-frontend}"
GIT_BRANCH="${GIT_BRANCH:-release}"
PANEL_SERVICE="${PANEL_SERVICE:?Definí PANEL_SERVICE (nombre del servicio del panel en el compose)}"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "No existe COMPOSE_FILE=$COMPOSE_FILE"
  exit 1
fi
if [[ ! -d "$FRONT_ROOT/.git" ]]; then
  echo "No es un repo git: FRONT_ROOT=$FRONT_ROOT"
  exit 1
fi

cd "$FRONT_ROOT"
git fetch origin
git checkout "$GIT_BRANCH"
git pull origin "$GIT_BRANCH"

docker compose -f "$COMPOSE_FILE" up -d --build "$PANEL_SERVICE"

echo "Listo: panel ($PANEL_SERVICE) reconstruido con compose $COMPOSE_FILE"
