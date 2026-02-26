# build-repair-next

## Goal

Resolve Next.js build failures for production output.

## Trigger

Failures from Next.js app builds (`next build`).

## Scope detection

- Identify Next.js workspace(s) via dependency on `next` and build scripts.

## Steps (deterministic)

1. Reproduce with target workspace build command.
2. Fix compile/runtime issues in app code, config, and env assumptions.
3. Rebuild target and then run aggregate build.

## Guardrails

- Maintain SSR/route behavior and existing data-fetching patterns.
- Do not introduce framework-incompatible polyfills unless required.

## Acceptance checks (commands from Command Matrix)

- `bun run --filter web-app build`
- `bun run build`
