#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/compose.yaml"
ENV_FILE="${OCI_ENV_FILE:-$SCRIPT_DIR/.env}"
PROJECT_NAME="hr-copilot-oci"

export OCI_ENV_FILE="$ENV_FILE"
COMPOSE=(
  docker compose
  --project-name "$PROJECT_NAME"
  --env-file "$ENV_FILE"
  --file "$COMPOSE_FILE"
)

usage() {
  cat <<'USAGE'
Usage:
  ./deploy/oci/deploy.sh check    Validate the OCI environment and Compose file.
  ./deploy/oci/deploy.sh deploy   Build and deploy the API and Caddy (default).
  ./deploy/oci/deploy.sh status   Show service status.
  ./deploy/oci/deploy.sh logs     Follow API and Caddy logs.
  ./deploy/oci/deploy.sh smoke    Check the public HTTPS health endpoint.
  ./deploy/oci/deploy.sh stop     Stop containers without deleting volumes.

Set OCI_ENV_FILE to use an environment file other than deploy/oci/.env.
USAGE
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "$1 is required but was not found." >&2
    exit 1
  fi
}

require_env_key() {
  local key="$1"

  if ! awk -F= -v expected="$key" '
    $1 == expected {
      value = substr($0, index($0, "=") + 1)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
      if (length(value) > 0) found = 1
    }
    END { exit found ? 0 : 1 }
  ' "$ENV_FILE"; then
    echo "Missing non-empty $key in $ENV_FILE." >&2
    return 1
  fi
}

read_env_value() {
  local key="$1"

  awk -F= -v expected="$key" '
    $1 == expected {
      value = substr($0, index($0, "=") + 1)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
      gsub(/^\047|\047$/, "", value)
      gsub(/^"|"$/, "", value)
      print value
      exit
    }
  ' "$ENV_FILE"
}

preflight() {
  require_command docker

  if ! docker compose version >/dev/null 2>&1; then
    echo "Docker Compose v2 is required." >&2
    exit 1
  fi

  if [[ ! -f "$ENV_FILE" ]]; then
    cat >&2 <<ERROR
$ENV_FILE does not exist.

Create it without committing secrets:
  cp deploy/oci/.env.example deploy/oci/.env
  chmod 600 deploy/oci/.env
ERROR
    exit 1
  fi

  local missing=0
  local key
  for key in \
    API_DOMAIN WEB_ORIGIN DATABASE_URL MIGRATION_DATABASE_URL \
    ADMIN_EMAIL ADMIN_PASSWORD JWT_ACCESS_TOKEN_SECRET JWT_REFRESH_TOKEN_SECRET \
    AUTH_COOKIE_SECURE AUTH_COOKIE_SAMESITE \
    CV_STORAGE_DRIVER CV_ARCHIVE_STORAGE_DRIVER \
    R2_ENDPOINT R2_BUCKET R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY \
    BLOB_READ_WRITE_TOKEN AI_PROVIDER \
    EMAIL_PROVIDER EMAIL_FROM GMAIL_CLIENT_ID GMAIL_CLIENT_SECRET GMAIL_REFRESH_TOKEN; do
    require_env_key "$key" || missing=1
  done

  local ai_provider
  ai_provider="$(read_env_value AI_PROVIDER)"
  if [[ "$ai_provider" == "ollama" ]]; then
    for key in REDIS_URL OLLAMA_BASE_URL OLLAMA_MODEL; do
      require_env_key "$key" || missing=1
    done
  fi

  if [[ "$missing" -ne 0 ]]; then
    exit 1
  fi

  local api_domain
  api_domain="$(read_env_value API_DOMAIN)"
  if [[ "$api_domain" == *"://"* || "$api_domain" == */* ]]; then
    echo "API_DOMAIN must be a hostname without scheme or path: api.example.com" >&2
    exit 1
  fi

  if grep -Eq '<(user|password|pooled-host|database|direct-host|account-id|bucket-name|access-key-id|secret-access-key|vercel-blob-read-write-token|managed-redis-url|private-ollama-service|oauth2-client-id|oauth2-client-secret|oauth2-refresh-token)>|replace-with-|^API_DOMAIN=api\.example\.com$' "$ENV_FILE"; then
    echo "$ENV_FILE still contains placeholder values." >&2
    exit 1
  fi

  "${COMPOSE[@]}" config --quiet
}

wait_for_api() {
  local container_id
  container_id="$("${COMPOSE[@]}" ps --quiet api)"

  if [[ -z "$container_id" ]]; then
    echo "The API container was not created." >&2
    return 1
  fi

  local attempt status
  for attempt in $(seq 1 60); do
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id")"
    if [[ "$status" == "healthy" ]]; then
      echo "API container is healthy."
      return 0
    fi
    if [[ "$status" == "unhealthy" || "$status" == "exited" || "$status" == "dead" ]]; then
      echo "API container entered state: $status" >&2
      "${COMPOSE[@]}" logs --tail 100 api >&2
      return 1
    fi
    sleep 5
  done

  echo "Timed out waiting for the API health check." >&2
  "${COMPOSE[@]}" logs --tail 100 api >&2
  return 1
}

deploy() {
  preflight
  cd "$ROOT_DIR"

  "${COMPOSE[@]}" pull caddy
  "${COMPOSE[@]}" build --pull api
  "${COMPOSE[@]}" up --detach --remove-orphans
  wait_for_api
  "${COMPOSE[@]}" ps

  echo
  echo "Deployment is running. After DNS is active, run:"
  echo "  ./deploy/oci/deploy.sh smoke"
}

smoke() {
  preflight
  require_command curl

  local api_domain
  api_domain="$(read_env_value API_DOMAIN)"
  curl \
    --fail \
    --silent \
    --show-error \
    --connect-timeout 10 \
    --max-time 30 \
    "https://${api_domain}/health"
  echo
}

case "${1:-deploy}" in
  check)
    preflight
    echo "OCI deployment configuration is valid."
    ;;
  deploy)
    deploy
    ;;
  status)
    preflight
    "${COMPOSE[@]}" ps
    ;;
  logs)
    preflight
    "${COMPOSE[@]}" logs --follow --tail 200 api caddy
    ;;
  smoke)
    smoke
    ;;
  stop)
    preflight
    "${COMPOSE[@]}" stop
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    usage >&2
    exit 1
    ;;
esac
