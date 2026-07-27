#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -m)" != "aarch64" && "$(uname -m)" != "arm64" ]]; then
  echo "This bootstrap is intended for an OCI Ampere A1 ARM64 instance." >&2
  exit 1
fi

if [[ ! -r /etc/os-release ]]; then
  echo "Unable to identify the operating system." >&2
  exit 1
fi

# shellcheck disable=SC1091
source /etc/os-release
if [[ "${ID:-}" != "ubuntu" ]]; then
  echo "This bootstrap supports Ubuntu only." >&2
  exit 1
fi

if [[ "${EUID}" -eq 0 ]]; then
  SUDO=()
  TARGET_USER="${SUDO_USER:-ubuntu}"
else
  if ! command -v sudo >/dev/null 2>&1; then
    echo "sudo is required when the script is not run as root." >&2
    exit 1
  fi
  SUDO=(sudo)
  TARGET_USER="${USER}"
fi

"${SUDO[@]}" apt-get update
"${SUDO[@]}" apt-get install --yes \
  ca-certificates \
  curl \
  docker.io \
  docker-compose-v2 \
  git \
  openssl \
  ufw \
  unattended-upgrades

"${SUDO[@]}" systemctl enable --now docker
"${SUDO[@]}" systemctl enable --now apt-daily-upgrade.timer
"${SUDO[@]}" usermod --append --groups docker "$TARGET_USER"

"${SUDO[@]}" ufw default deny incoming
"${SUDO[@]}" ufw default allow outgoing
"${SUDO[@]}" ufw allow OpenSSH
"${SUDO[@]}" ufw allow 80/tcp
"${SUDO[@]}" ufw allow 443/tcp
"${SUDO[@]}" ufw --force enable

echo
echo "OCI host bootstrap complete."
echo "Log out and back in so the Docker group membership takes effect."
echo "Also allow inbound TCP 22, 80, and 443 in the OCI subnet security list."
