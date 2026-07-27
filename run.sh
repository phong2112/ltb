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

has_any_env() {
  local key

  for key in "$@"; do
    if [[ -n "${!key:-}" ]]; then
      return 0
    fi
  done

  return 1
}

require_any_env() {
  local label="$1"
  shift

  if has_any_env "$@"; then
    return 0
  fi

  echo "Missing ${label}. Set one of: $*" >&2
  return 1
}

prepare() {
  load_env_file "$ROOT_DIR/.env.dev"
  load_env_file "$ROOT_DIR/.env.local"
  load_env_file "$ROOT_DIR/.env"

  export CV_STORAGE_DRIVER="${CV_STORAGE_DRIVER:-r2}"
  export CV_ARCHIVE_STORAGE_DRIVER="${CV_ARCHIVE_STORAGE_DRIVER:-vercel-blob}"

  if [[ ("$CV_STORAGE_DRIVER" == "vercel-blob" || "$CV_ARCHIVE_STORAGE_DRIVER" == "vercel-blob") && -z "${BLOB_READ_WRITE_TOKEN:-}" ]]; then
    cat >&2 <<'ERROR'
BLOB_READ_WRITE_TOKEN is required because Vercel Blob stores archived CV files.
run.sh runs the API in local Docker, so Vercel OIDC/BLOB_STORE_ID alone is not enough.

Add it to .env.local or export it before running:
  BLOB_READ_WRITE_TOKEN=vercel_blob_rw_... ./run.sh
ERROR
    exit 1
  fi

  if [[ "$CV_STORAGE_DRIVER" == "r2" ]]; then
    local missing_r2_config=0

    require_any_env "Cloudflare R2 endpoint or account id" \
      R2_ENDPOINT STORAGE_ENDPOINT S3_API CLOUD_FLARE_STORAGE_ACCOUNT_ID CLOUDFLARE_R2_ACCOUNT_ID \
      || missing_r2_config=1
    require_any_env "Cloudflare R2 bucket" \
      R2_BUCKET R2_BUCKET_NAME STORAGE_BUCKET S3_BUCKET S3_BUCKET_NAME s3_BUCKET s3_BUCKET_NAME \
      || missing_r2_config=1
    require_any_env "Cloudflare R2 access key id" \
      R2_ACCESS_KEY_ID STORAGE_ACCESS_KEY_ID S3_ACCESS_KEY_ID s3_ACCESS_KEY \
      || missing_r2_config=1
    require_any_env "Cloudflare R2 secret access key" \
      R2_SECRET_ACCESS_KEY STORAGE_SECRET_ACCESS_KEY S3_SECRET_ACCESS_KEY s3_SECRET_ACCESS_KEY S3_SECRET_KEY s3_SECRET_KEY \
      || missing_r2_config=1

    if [[ "$missing_r2_config" -ne 0 ]]; then
      cat >&2 <<'ERROR'

Cloudflare R2 storage is enabled, but its configuration is incomplete.
Recommended names:
  R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
  R2_BUCKET=<bucket-name>
  R2_ACCESS_KEY_ID=<access-key-id>
  R2_SECRET_ACCESS_KEY=<secret-access-key>

Keep BLOB_READ_WRITE_TOKEN only if you still need to read legacy Vercel Blob CV paths.
ERROR
      exit 1
    fi
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
  echo "Starting TA Copilot dev stack..."
  echo "Open http://localhost:8080"
  echo "API docs http://localhost:8080/api-docs"
  echo "Admin demo credential: hr / hr123456"
  echo "Local AI: Ollama ${OLLAMA_MODEL:-qwen3:4b} (the first start downloads the model)"
  echo
  "${COMPOSE[@]}" up --remove-orphans nginx web api db redis ollama ollama-model
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
