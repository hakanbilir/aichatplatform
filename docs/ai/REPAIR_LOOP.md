# AI Repair Loop

This loop is designed for safe, repeatable agent/human remediation with minimal scope.

## Golden Command

```bash
bun run repair:ai
```

Optional scoped run (single app/package):

```bash
bun run repair:ai -- <workspace-filter>
# example
bun run repair:ai -- web-app
```

## Loop Steps

1. Run gate sequence in order: lint → typecheck → test → build.
2. Parse first failing command and isolate the smallest impacted workspace.
3. Apply minimal targeted edits only in impacted files.
4. Re-run scoped checks with Turbo filter when possible.
5. Re-run full `bun run quality` before finalizing.

## Exact Commands

- Full loop: `bun run repair:ai`
- Scoped loop: `bash ./scripts/ai-repair-loop.sh web-app`
- Final confidence run: `bun run quality`

## Safety Rules

- Keep RBAC/auth and API contract behavior unchanged unless explicitly requested.
- Prefer existing utilities/types/components over introducing new abstractions.
- Do not bypass failing checks; fix root causes.
