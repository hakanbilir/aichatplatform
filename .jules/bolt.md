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
