# Name

07-build-repair-react-native

# Goal

Provide deterministic handling for React Native build repair when RN exists.

# Trigger / When to Use

Use only if RN signals are detected in a future repo revision.

# Scope Detection (Repo-Derived)

- Required RN signals (currently absent): `ios/`, `android/`, `metro.config.*`, `react-native.config.*`, `Podfile`, Gradle app files.
- Current status from `/.ai/repo-facts.json`: `notDetected.reactNative = false`.

# Inputs

- RN project path (if introduced).
- Platform build logs.

# Procedure (Deterministic Steps)

1. Confirm RN markers exist in target path.
2. Install deps with workspace package manager.
3. Run platform-specific lint/type/test/build commands from target scripts.
4. Run CocoaPods/Gradle/Xcode commands only if declared in scripts or documented CI.
5. Update `/.ai/repo-facts.json` and command matrix with discovered RN commands.

# Guardrails

- Do not invent `pod`, Gradle, or Xcode commands if absent from scripts/CI.
- Keep this skill dormant when RN is not detected.

# Acceptance Checks (Commands)

- `bun run lint`
- `bun run typecheck`
- `bun run build`

# Failure Modes & Recovery

- RN not present: exit with “not applicable” and continue remaining workflow steps.
- Native build missing toolchain: mark environment limitation and provide explicit prerequisite list.

# Outputs

- RN applicability report.
- Updated repo facts if RN enters the repository.
