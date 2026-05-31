#!/bin/sh
set -eu

lockfile="/app/pnpm-lock.yaml"
checksum_file="/app/node_modules/.pnpm-lock.sha256"

current_checksum="$(sha256sum "$lockfile" | awk '{ print $1 }')"
installed_checksum=""

if [ -f "$checksum_file" ]; then
  installed_checksum="$(cat "$checksum_file")"
fi

if [ ! -f /app/node_modules/.modules.yaml ] || [ "$installed_checksum" != "$current_checksum" ]; then
  pnpm install --frozen-lockfile
  printf '%s\n' "$current_checksum" > "$checksum_file"
fi

exec pnpm start
