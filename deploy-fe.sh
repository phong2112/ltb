#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="prod"
ENV_PREFIX="dev"

usage() {
  cat <<'USAGE'
Usage:
  ./deploy-fe.sh [--env <prefix>]              Verify and deploy the frontend to Vercel production.
  ./deploy-fe.sh [--env <prefix>] --preview    Verify and deploy a Vercel preview.
  ./deploy-fe.sh [--env <prefix>] --check-only Verify frontend build only; do not deploy.
  ./deploy-fe.sh --dev                       Use .env.dev (default)
  ./deploy-fe.sh --dev --preview             Deploy preview using .env.dev
  ./deploy-fe.sh --dev --check-only          Verify build only using .env.dev
  ./deploy-fe.sh --prod                      Use .env.prod (if exists)
  ./deploy-fe.sh --env dev                   Use .env.dev (same as --dev)
  ./deploy-fe.sh --env prod                  Use .env.prod (same as --prod)

Options:
  --env <prefix>    Use .env.<prefix> file (default: .env.dev). Example: --env dev -> .env.dev, --env prod -> .env.prod
  --dev             Use .env.dev (default)
  --prod            Use .env.prod (if exists)
  --preview|preview Deploy to Vercel preview (non-production)
  --check-only      Verify frontend build only; do not deploy.
  -h, --help        Show this help.

Environment variables read from the chosen .env file:
  VERCEL_TOKEN  Optional Vercel token for non-interactive deploys.
  SKIP_VERIFY   Set to 1 to skip local lint/build before deploy.
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
  local env_path="${ROOT_DIR}/.env.${ENV_PREFIX}"
  if [[ ! -f "${env_path}" ]]; then
    echo "Environment file not found: ${env_path}" >&2
    echo "Available env files:"
    ls -1 "${ROOT_DIR}"/.env* 2>/dev/null | sed 's|.*/||' | sed 's/^/  /' || echo "  (none found)"
    exit 1
  fi
  # shellcheck disable=SC1090
  source "${env_path}"
  echo "Loaded environment from .env.${ENV_PREFIX}"
}

run_verify() {
  if [[ "${SKIP_VERIFY:-0}" == "1" ]]; then
    echo "Skipping frontend verification because SKIP_VERIFY=1."
    return
  fi

  echo "Verifying frontend..."
  pnpm --filter @hr-copilot/web lint
  pnpm --filter @hr-copilot/web build
}

deploy_vercel() {
  local vercel_cmd=()
  local deploy_args=(deploy "$ROOT_DIR")

  if command -v vercel >/dev/null 2>&1; then
    vercel_cmd=(vercel)
  else
    vercel_cmd=(pnpm dlx vercel@latest)
  fi

  if [[ "$MODE" == "prod" ]]; then
    deploy_args+=(--prod)
  fi

  if [[ -n "${VERCEL_TOKEN:-}" ]]; then
    deploy_args+=(--token "$VERCEL_TOKEN")
  fi

  echo "Deploying frontend to Vercel ($MODE)..."
  "${vercel_cmd[@]}" "${deploy_args[@]}"
}

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --env)
      ENV_PREFIX="$2"
      if [[ -z "${ENV_PREFIX}" ]]; then
        echo "--env requires a prefix argument" >&2
        usage
        exit 1
      fi
      shift 2
      ;;
    --dev)
      ENV_PREFIX="dev"
      shift
      ;;
    --prod)
      ENV_PREFIX="prod"
      shift
      ;;
    --preview|preview)
      MODE="preview"
      shift
      ;;
    --check-only|check)
      MODE="check"
      shift
      ;;
    -h|--help|help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

cd "$ROOT_DIR"
load_env_file
require_pnpm
run_verify

if [[ "$MODE" == "check" ]]; then
  echo "Frontend verification complete. Deploy skipped."
  exit 0
fi

deploy_vercel
