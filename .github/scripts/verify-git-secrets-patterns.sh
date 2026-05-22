#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
register_script="$repo_root/.github/scripts/register-git-secrets-patterns.sh"
workdir="$(mktemp -d)"

cleanup() {
  rm -rf "$workdir"
}
trap cleanup EXIT

cd "$workdir"
git init -q
"$register_script" --no-aws >/dev/null

positive_file="$workdir/positive.txt"
negative_file="$workdir/negative.txt"
positive_output="$workdir/positive.out"
negative_output="$workdir/negative.out"

touch "$positive_file" "$negative_file"

write_assignment_case() {
  local key="$1"
  printf '%s=%s\n' "$key" "example-value" >> "$positive_file"
  printf '%s %s %s\n' "$key" "=" "example-value" >> "$positive_file"
}

write_comparison_case() {
  local key="$1"
  local operator="$2"
  printf '$dto->%s %s null;\n' "$key" "$operator" >> "$negative_file"
}

write_arrow_case() {
  local key="$1"
  printf "        '%s' => %s,\n" "$key" "'example-value'" >> "$negative_file"
}

keys=(password secret api_key private_key)

for key in "${keys[@]}"; do
  write_assignment_case "$key"
  write_comparison_case "$key" "==="
  write_comparison_case "$key" "!=="
  write_arrow_case "$key"
done

if git secrets --scan "$positive_file" >"$positive_output" 2>&1; then
  echo "Expected git-secrets to detect key-value secret patterns." >&2
  exit 1
fi

if ! git secrets --scan "$negative_file" >"$negative_output" 2>&1; then
  echo "Expected comparison and arrow syntax to be ignored, but git-secrets reported:" >&2
  cat "$negative_output" >&2
  exit 1
fi

echo "git-secrets custom pattern verification passed."
