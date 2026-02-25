# Security & Dependency Hygiene

## Golden Command

```bash
bun run security
```

## Local Checks

1. Dependency audit: `bun run audit:deps`
2. Secret scanning in CI: Gitleaks
3. Dependency review for pull requests: GitHub dependency-review-action

## CI Policy

- Pull requests run dependency review and secret scanning.
- Main branch pushes run dependency audit checks and secret scanning.
- Any high/critical finding must be remediated before merge.

## Remediation Workflow

1. Reproduce locally (`bun run audit:deps`).
2. Upgrade/patch dependency with lockfile updates.
3. Re-run `bun run quality` and `bun run security`.
4. Document impact in PR notes (risk level + fix).
