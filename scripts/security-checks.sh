#!/usr/bin/env bash
set -euo pipefail

echo "[security] validating lockfile install"
bun install --frozen-lockfile >/dev/null

echo "[security] dependency audit (npm audit high+)"
audit_output_file="$(mktemp)"
set +e
npm audit --audit-level=high --omit=dev >"$audit_output_file" 2>&1
npm_exit=$?
set -e
cat "$audit_output_file"

if [[ $npm_exit -ne 0 ]]; then
  if rg -q "ENOLOCK" "$audit_output_file"; then
    echo "[security] npm audit requires package-lock.json. CI dependency-review-action is the authoritative dependency vulnerability gate for this Bun workspace." >&2
  else
    echo "[security] dependency vulnerabilities detected" >&2
    exit $npm_exit
  fi
fi

echo "[security] CI also enforces: dependency-review-action + gitleaks"
