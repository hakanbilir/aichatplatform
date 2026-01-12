## 2025-01-28 - React.lazy TypeScript Typing
**Learning:** `React.lazy` returns a `LazyExoticComponent`, which is not assignable to `React.ComponentType` in strict TypeScript environments. This often breaks HOCs or wrapper functions that expect standard components.
**Action:** When wrapping lazy components, ensure the wrapper accepts `React.LazyExoticComponent<any> | React.ComponentType<any>` or `React.ElementType` to support both lazy and eager components.
