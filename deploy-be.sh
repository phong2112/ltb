#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="deploy"
ENV_PREFIX="dev"

usage() {
  cat <<'USAGE'
Usage:
  ./deploy-be.sh [--env <prefix>]              Verify the API and trigger a Render deploy hook.
  ./deploy-be.sh [--env <prefix>] --check-only Verify API build only; do not deploy.
  ./deploy-be.sh --dev                       Use .env.dev (default)
  ./deploy-be.sh --dev --check-only          Verify build only using .env.dev
  ./deploy-be.sh --prod                      Use .env.prod (if exists)
  ./deploy-be.sh --env dev                   Use .env.dev (same as --dev)
  ./deploy-be.sh --env prod                  Use .env.prod (same as --prod)

Options:
  --env <prefix>    Use .env.<prefix> file (default: .env.dev). Example: --env dev -> .env.dev, --env prod -> .env.prod
  --dev             Use .env.dev (default)
  --prod            Use .env.prod (if exists)
  --check-only      Verify API build only; do not deploy.
  -h, --help        Show this help.

Environment variables read from the chosen .env file:
  RENDER_DEPLOY_HOOK_URL  Required to trigger Render deploys.
  SKIP_VERIFY=1           Skip local lint/build before deploy.
USAGE
}

require_pnpm() {
  corepack enable >/dev/null 2>&1 || true

  if ! command -v pnpm >/dev/null 2>&1; then
    echo "pnpm is required. Install Node.js LTS with Corepack, then rerun this script." >&2
    exit 1
  fi
}

load_env_file() {
  local env_path="${ROOT_DIR}/${ENV_FILE}"
  if [[ ! -f "${env_path}" ]]; then
    echo "Environment file not found: ${env_path}" >&2
    exit 1
  fi
  # shellcheck disable=SC1090
  source "${env_path}"
  echo "Loaded environment from ${ENV_FILE}"
}

run_verify() {
  if [[ "${SKIP_VERIFY:-0}" == "1" ]]; then
    echo "Skipping backend verification because SKIP_VERIFY=1."
    return
  fi

  echo "Verifying backend..."
  pnpm --filter @hr-copilot/db prisma validate
  pnpm --filter @hr-copilot/api lint
  pnpm --filter @hr-copilot/api build
}

trigger_render_deploy() {
  if [[ -z "${RENDER_DEPLOY_HOOK_URL:-}" ]]; then
    cat >&2 <<'ERROR'
RENDER_DEPLOY_HOOK_URL is required to deploy the backend from this script.

Add it to your environment file (e.g. .env.dev):
  RENDER_DEPLOY_HOOK_URL=https://api.render.com/deploy/...

Or if Render auto-deploys from Git, push the branch instead after this script passes with --check-only.
ERROR
    exit 1
  fi

  if ! command -v curl >/dev/null 2>&1; then
    echo "curl is required to trigger the Render deploy hook." >&2
    exit 1
  fi

  echo "Triggering Render backend deploy..."
  curl -fsS -X POST "$RENDER_DEPLOY_HOOK_URL"
  echo
  echo "Render deploy hook accepted. Check Render logs for migration and API startup status."
}

case "${1:-}" in
  -h|--help|help)
    usage
    exit 0
    ;;
  --check-only|check)
    MODE="check"
    shift
    ;;
  --dev)
    ENV_PREFIX="dev"
    shift
    ;;
  --prod)
    ENV_PREFIX="prod"
    shift
    ;;
  --env)
    ENV_PREFIX="${2:-}"
    if [[ -z "${ENV_PREFIX}" ]]; then
      echo "--env requires a prefix argument" >&2
      usage
      exit 1
    fi
    shift 2
    ;;
  ""|deploy)
    MODE="deploy"
    ;;
  *)
    usage
    exit 1
    ;;
esac

# Handle additional flags after mode
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      ENV_PREFIX="${2:-}"
      if [[ -z "${ENV_PREFIX}" ]]; then
        echo "--env requires a prefix argument" >&2
        usage
        exit 1
      fi
      shift 2
      ;;
    --check-only|check)
      MODE="check"
      shift
      ;;
    --dev)
      ENV_PREFIX="dev"
      shift
      ;;
    --prod)
      ENV_PREFIX="prod"
      shift
      ;;
    -h|--help|help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

# Resolve env file path from prefix
ENV_FILE=".env.${ENV_PREFIX}"
if [[ ! -f "${ROOT_DIR}/${ENV_FILE}" ]]; then
  echo "Environment file not found: ${ROOT_DIR}/${ENV_FILE}" >&2
  echo "Available env files:"
  ls -1 "${ROOT_DIR}"/.env* 2>/dev/null | sed 's|.*/||' | sed 's/^/  /' || echo "  (none found)"
  exit 1
fi

cd "$ROOT_DIR"
load_env_file
require_pnpm
run_verify

if [[ "$MODE" == "check" ]]; then
  echo "Backend verification complete. Deploy skipped."
  exit 0
fi

trigger_render_deploy