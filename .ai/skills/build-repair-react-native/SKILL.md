# build-repair-react-native

## Goal

Repair React Native build failures when RN apps are present.

## Trigger

RN app build/test failures.

## Scope detection

- Confirm RN presence from `ios/`, `android/`, `metro.config.*`, or RN dependencies.

## Steps (deterministic)

1. Reproduce failure with repo-defined RN commands.
2. Fix only affected native/JS modules.
3. Re-run RN-targeted checks.

## Guardrails

- Skip this skill when the repository has no RN app.
- Avoid changing unrelated native configuration.

## Acceptance checks (commands from Command Matrix)

- Use discovered RN scripts only.
- If no RN scripts exist, mark as not applicable.
