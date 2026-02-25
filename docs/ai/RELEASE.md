# Release Workflow

This repository is currently private and versioned as a monorepo application set. Release flow is tag-based for deploy coordination.

## Strategy

- Semantic versioning at repository level (`vMAJOR.MINOR.PATCH`).
- Release commits must pass `bun run quality` and security workflow.
- Release notes are generated from merged PR titles/body.

## Release Steps

1. Ensure main is green in CI.
2. Run locally:
   ```bash
   bun run quality
   bun run security
   ```
3. Create annotated tag:
   ```bash
   git tag -a vX.Y.Z -m "release: vX.Y.Z"
   git push origin vX.Y.Z
   ```
4. Publish deployment artifacts via existing environment pipelines.

## Rollback

- Revert to previous known-good tag and redeploy.
- Open incident PR with root cause and follow-up fixes.
