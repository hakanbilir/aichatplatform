#!/usr/bin/env bash
set -euo pipefail

if ! command -v bun >/dev/null 2>&1; then
  echo "bun is required but not installed." >&2
  exit 1
fi

if [[ ! -f bun.lock ]]; then
  echo "bun.lock is required for deterministic installs." >&2
  exit 1
fi

echo "[quality] installing dependencies (frozen lockfile)"
bun install --frozen-lockfile

echo "[quality] format check"
bun run format:check

echo "[quality] lint"
bun run lint

echo "[quality] typecheck"
bun run typecheck

echo "[quality] test"
bun run test

echo "[quality] build"
bun run build

echo "[quality] all gates passed"
