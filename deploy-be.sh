#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="deploy"

usage() {
  cat <<'USAGE'
Usage:
  ./deploy-be.sh              Verify the API and trigger a Render deploy hook.
  ./deploy-be.sh --check-only Verify API build only; do not deploy.

Environment:
  RENDER_DEPLOY_HOOK_URL Required to trigger Render deploys.
  SKIP_VERIFY            Set to 1 to skip local lint/build before deploy.
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

Create a Deploy Hook in the Render API service, then run:
  RENDER_DEPLOY_HOOK_URL=https://api.render.com/deploy/... ./deploy-be.sh

If Render auto-deploys from Git, push the branch instead after this script passes with --check-only.
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
    ;;
  ""|deploy)
    MODE="deploy"
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
  echo "Backend verification complete. Deploy skipped."
  exit 0
fi

trigger_render_deploy
