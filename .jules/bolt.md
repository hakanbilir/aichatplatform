# Bolt's Journal

## 2024-05-22 - [React.memo and TypeScript]
**Learning:** When wrapping a component in `React.memo`, explicitly typing it as `React.FC` causes TypeScript errors because `memo` returns a `NamedExoticComponent`, not a simple `FunctionComponent`.
**Action:** Remove `React.FC` annotation and rely on type inference or type props directly in the function arguments when using `React.memo`.
