## 2026-01-26 - Fix broken React.memo with useCallback

**Learning:** Forgetting to wrap callback props (like `handleSaveSettings` and `handleResetSettings`) with `useCallback` completely breaks the optimization of `React.memo` for child components (like `ChatSettingsBar`), causing them to re-render unnecessarily on every parent state change.
**Action:** Always verify that all function props passed to `React.memo`-optimized components are stable, using `useCallback` with the correct dependency array.

## 2026-01-26 - Batching asynchronous multi-file reads

**Learning:** Iterating over an array of files and updating component state (`setImages`) inside individual asynchronous callbacks (`FileReader.onloadend`) triggers multiple, rapid state updates and re-renders, impacting performance during bulk actions like image drag-and-drop or pasting.
**Action:** Use `Promise.all` to await all asynchronous file reads concurrently, and apply a single batched state update with the resolved results to minimize render cycles.
