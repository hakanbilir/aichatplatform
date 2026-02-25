# DeveloperFollowMe Workflow

This repository includes an in-repo generator that creates and validates `DeveloperFollowMe.md` from real repository evidence.

## What this workflow does

- Scans repository structure and workspace `package.json` files.
- Detects package manager, monorepo tool, and Node version source.
- Detects CI workflows, PM2 ecosystem files, Docker-related files, mobile signals, and env file patterns.
- Generates:
  - `DeveloperFollowMe.md` (Turkish, deterministic template output)
  - `docs/_generated/devfollowme.repo-profile.json` (debug profile)
- Avoids reading sensitive `.env` values by design (reads file names only; only “example/sample/template” env files are considered safe references).

## Local usage

```bash
npm run docs:devfollowme
npm run docs:devfollowme:check
```

- `docs:devfollowme`: regenerates docs files.
- `docs:devfollowme:check`: regenerates and fails if git diff is detected.

## CI enforcement

GitHub Actions workflow: `.github/workflows/docs-devfollowme.yml`

- Uses Bun setup aligned with the repository toolchain.
- Installs dependencies.
- Runs `npm run docs:devfollowme:check`.
- Fails PRs/pushes where generated docs drift from committed state.

## Extending the generator

Update `scripts/devfollowme/generate.mjs` and keep output headings stable.

Recommended extension points:

- Add new stack detectors (e.g., Kubernetes manifests, Terraform modules).
- Add package-level heuristics for additional script categories.
- Add optional warning sections for missing quality gates.

When extending, preserve:

- deterministic sorting,
- no secret-value reads,
- stable markdown section order,
- backward-compatible output structure.

## Troubleshooting

- If `docs:devfollowme:check` fails locally, run `npm run docs:devfollowme` and commit generated changes.
- If CI fails due to tool mismatch, verify `package.json` scripts still reference `scripts/devfollowme/generate.mjs`.
- If detection misses new modules, ensure they include `package.json` and are inside scanned folders.
