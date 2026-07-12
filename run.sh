#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE=(docker compose -f "$ROOT_DIR/docker-compose.dev.yml" --project-name hr-copilot-dev)

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
  mkdir -p "$ROOT_DIR/uploads"
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
  "${COMPOSE[@]}" up --remove-orphans nginx web api db redis
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
