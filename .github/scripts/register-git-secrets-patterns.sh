#!/usr/bin/env bash
set -euo pipefail

scope="local"
include_aws=1

while (($# > 0)); do
  case "$1" in
    --global)
      scope="global"
      ;;
    --no-aws)
      include_aws=0
      ;;
    *)
      echo "Usage: $0 [--global] [--no-aws]" >&2
      exit 64
      ;;
  esac
  shift
done

if ! command -v git-secrets >/dev/null 2>&1; then
  echo "git-secrets is required but was not found in PATH." >&2
  exit 127
fi

if ((include_aws)); then
  if [[ "$scope" == "global" ]]; then
    git secrets --register-aws --global
  else
    git secrets --register-aws
  fi
fi

patterns=(
  'password[[:space:]]*=[[:space:]]*[^[:space:]=>]+'
  'secret[[:space:]]*=[[:space:]]*[^[:space:]=>]+'
  'api_key[[:space:]]*=[[:space:]]*[^[:space:]=>]+'
  'private_key[[:space:]]*=[[:space:]]*[^[:space:]=>]+'
)

pattern_exists() {
  local pattern="$1"

  if [[ "$scope" == "global" ]]; then
    git config --global --get-all secrets.patterns | grep -Fqx "$pattern"
  else
    git config --get-all secrets.patterns | grep -Fqx "$pattern"
  fi
}

for pattern in "${patterns[@]}"; do
  if pattern_exists "$pattern"; then
    continue
  fi

  if [[ "$scope" == "global" ]]; then
    git secrets --add --global "$pattern"
  else
    git secrets --add "$pattern"
  fi
done
