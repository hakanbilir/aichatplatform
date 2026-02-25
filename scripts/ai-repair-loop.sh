#!/usr/bin/env bash
set -euo pipefail

TARGET_FILTER="${1:-}"
MAX_ITERATIONS="${MAX_ITERATIONS:-5}"

if ! command -v bun >/dev/null 2>&1; then
  echo "bun is required but not installed." >&2
  exit 1
fi

run_step() {
  local step="$1"
  if [[ -n "$TARGET_FILTER" ]]; then
    bunx turbo run "$step" --filter="$TARGET_FILTER" --continue
  else
    bun run "$step"
  fi
}

for iteration in $(seq 1 "$MAX_ITERATIONS"); do
  echo "[repair-loop] iteration ${iteration}/${MAX_ITERATIONS}"

  set +e
  run_step lint
  lint_exit=$?
  run_step typecheck
  typecheck_exit=$?
  run_step test
  test_exit=$?
  run_step build
  build_exit=$?
  set -e

  if [[ $lint_exit -eq 0 && $typecheck_exit -eq 0 && $test_exit -eq 0 && $build_exit -eq 0 ]]; then
    echo "[repair-loop] all checks passed"
    exit 0
  fi

  echo "[repair-loop] checks failed. Fix the smallest failing scope, then rerun."
  if [[ $iteration -eq $MAX_ITERATIONS ]]; then
    break
  fi

done

echo "[repair-loop] unrecovered failures after ${MAX_ITERATIONS} iterations" >&2
exit 1
