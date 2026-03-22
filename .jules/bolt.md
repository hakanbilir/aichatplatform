## 2026-01-26 - Fix broken React.memo with useCallback

**Learning:** Forgetting to wrap callback props (like `handleSaveSettings` and `handleResetSettings`) with `useCallback` completely breaks the optimization of `React.memo` for child components (like `ChatSettingsBar`), causing them to re-render unnecessarily on every parent state change.
**Action:** Always verify that all function props passed to `React.memo`-optimized components are stable, using `useCallback` with the correct dependency array.

## 2026-01-26 - Batching asynchronous multi-file reads

**Learning:** Iterating over an array of files and updating component state (`setImages`) inside individual asynchronous callbacks (`FileReader.onloadend`) triggers multiple, rapid state updates and re-renders, impacting performance during bulk actions like image drag-and-drop or pasting.
**Action:** Use `Promise.all` to await all asynchronous file reads concurrently, and apply a single batched state update with the resolved results to minimize render cycles.

## 2024-10-24 - React.memo for useSyncExternalStore consumers

**Learning:** Components that subscribe to high-frequency external stores (like \`StreamStore\` via \`useSyncExternalStore\`) can still be re-rendered unnecessarily if their parent component re-renders.
**Action:** Always wrap components that manage their own fast-changing state internally via external stores with \`React.memo()\` to isolate the rendering workload and prevent redundant renders triggered by the parent.

## 2026-01-26 - Fix broken React.memo in ConversationList

**Learning:** Declaring inline functions inside the component body, such as `handleMenuClose` and `handleBeginRename` in `ConversationList`, breaks the `React.memo` optimization of child components like `ConversationListItemView` by passing new references on every render, leading to unnecessary full-list updates.
**Action:** Always wrap event handlers passed to `React.memo` child components in `useCallback` to maintain stable references across parent renders.

## 2025-03-17 - Optimize Database Queries in chat routes
**Learning:** In Fastify routes like `apps/api-gateway/src/routes/chat.ts`, building a complex `OR` filter by pre-fetching associated user records (e.g., `orgMember`) to look up a primary key introduces an N+1 performance bottleneck. Furthermore, removing the `OR` filter to query by `id` directly changes the behavior for unauthorized access from returning `null` (404) to returning the object and failing later (403). This behavioral change exposes existing resource IDs, introducing an IDOR vulnerability.
**Action:** When refactoring database queries from authorization-filtered lookups to direct `findUnique` lookups, explicitly return `404 Not Found` upon authorization failure if the original behavior hid the resource's existence. Additionally, always update the corresponding Prisma test mocks (e.g., `findFirst` -> `findUnique`) to prevent test suite breakages.

## 2025-03-22 - N+1 Authorization Anti-Pattern
**Learning:** In the `conversations.ts` route, a pattern existed where all of a user's organizational memberships were queried first just to build an `OR` query filter (`{ userId }` OR `{ orgId: { in: orgIds } }`) before fetching a conversation by ID (`findFirst`). This created an unnecessary N+1 query overhead for authorization.
**Action:** Always fetch the target resource first by its primary key (`findUnique`), which is an O(1) operation. Then, check authorization against the retrieved resource's properties (like `orgId` or `userId`) in the application layer using existing role-checking functions (like `assertOrgPermission`). Furthermore, ensure unauthorized attempts return `404 Not Found` (by wrapping `assertOrgPermission` in a try-catch to convert 403s) to maintain IDOR protections. This reduces database roundtrips and leverages application-level caching or optimized role checks.
