#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="prod"

usage() {
  cat <<'USAGE'
Usage:
  ./deploy-fe.sh              Verify and deploy the frontend to Vercel production.
  ./deploy-fe.sh --preview    Verify and deploy a Vercel preview.
  ./deploy-fe.sh --check-only Verify frontend build only; do not deploy.

Environment:
  VERCEL_TOKEN Optional Vercel token for non-interactive deploys.
  SKIP_VERIFY  Set to 1 to skip local lint/build before deploy.
USAGE
}

require_pnpm() {
  corepack enable >/dev/null 2>&1 || true

  if ! command -v pnpm >/dev/null 2>&1; then
    echo "pnpm is required. Install Node.js LTS with Corepack, then rerun this script." >&2
    exit 1
  fi
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

case "${1:-}" in
  -h|--help|help)
    usage
    exit 0
    ;;
  --preview|preview)
    MODE="preview"
    ;;
  --check-only|check)
    MODE="check"
    ;;
  ""|--prod|prod)
    MODE="prod"
    ;;
  *)
    usage
    exit 1
    ;;
esac

cd "$ROOT_DIR"
require_pnpm
run_verify

if [[ "$MODE" == "check" ]]; then
  echo "Frontend verification complete. Deploy skipped."
  exit 0
fi

deploy_vercel
