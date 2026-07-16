#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE=(docker compose -f "$ROOT_DIR/docker-compose.dev.yml" --project-name hr-copilot-dev)

load_env_file() {
  local file="$1"

  [[ -f "$file" ]] || return 0

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"

    [[ -z "$line" || "$line" == \#* || "$line" != *=* ]] && continue

    local key="${line%%=*}"
    local value="${line#*=}"

    key="${key%"${key##*[![:space:]]}"}"
    key="${key#export }"

    if [[ ! "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
      continue
    fi

    if [[ -n "${!key+x}" && -n "${!key}" ]]; then
      continue
    fi

    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"

    export "$key=$value"
  done < "$file"
}

usage() {
  cat <<'USAGE'
Usage:
  ./run.sh          Prepare and start the full Docker dev stack with hot reload.
  ./run.sh seed     Seed demo data, then start the stack.
  ./run.sh down     Stop the dev stack.
  ./run.sh reset    Stop the dev stack and remove dev volumes.
  ./run.sh logs     Follow dev stack logs.
USAGE
}

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker is required but was not found in PATH." >&2
    exit 1
  fi

  if ! docker compose version >/dev/null 2>&1; then
    echo "Docker Compose is required but was not found." >&2
    exit 1
  fi

}

prepare() {
  load_env_file "$ROOT_DIR/.env.local"
  load_env_file "$ROOT_DIR/.env"

  export CV_STORAGE_DRIVER="${CV_STORAGE_DRIVER:-vercel-blob}"

  if [[ "$CV_STORAGE_DRIVER" == "vercel-blob" && -z "${BLOB_READ_WRITE_TOKEN:-}" ]]; then
    cat >&2 <<'ERROR'
BLOB_READ_WRITE_TOKEN is required because run.sh now stores CV uploads in Vercel Blob by default.
run.sh runs the API in local Docker, so Vercel OIDC/BLOB_STORE_ID alone is not enough.

Add it to .env.local or export it before running:
  BLOB_READ_WRITE_TOKEN=vercel_blob_rw_... ./run.sh

To use local files instead:
  CV_STORAGE_DRIVER=local ./run.sh
ERROR
    exit 1
  fi

  if [[ "$CV_STORAGE_DRIVER" == "local" ]]; then
    mkdir -p "$ROOT_DIR/uploads"
  fi

  "${COMPOSE[@]}" run --rm setup
}

start() {
  prepare
  up
}

up() {
  echo
  echo "Starting HR Copilot dev stack..."
  echo "Open http://localhost:8080"
  echo "API docs http://localhost:8080/api-docs"
  echo "Admin demo credential: hr / hr123456"
  echo
  "${COMPOSE[@]}" up --remove-orphans nginx web api db
}

seed() {
  prepare
  "${COMPOSE[@]}" run --rm setup sh -lc "
    corepack enable &&
    pnpm config set store-dir /pnpm/store &&
    pnpm db:seed
  "
  up
}

case "${1:-start}" in
  -h|--help|help)
    usage
    exit 0
    ;;
esac

require_docker

case "${1:-start}" in
  start)
    start
    ;;
  seed)
    seed
    ;;
  down)
    "${COMPOSE[@]}" down --remove-orphans
    ;;
  reset)
    "${COMPOSE[@]}" down --remove-orphans --volumes
    ;;
  logs)
    "${COMPOSE[@]}" logs -f
    ;;
  *)
    usage
    exit 1
    ;;
esac
