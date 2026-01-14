## 2024-05-23 - React Effect Optimization using useRef
**Learning:** When a `useEffect` hook needs to access the *current* value of a state variable (e.g., `selectedId`) inside a closure (like an event handler or async callback) but should NOT re-run when that state changes, adding the state to the dependency array causes unnecessary re-executions. Using `useRef` to track the mutable value allows access to the fresh state without triggering the effect.
**Action:** Use `useRef` to store "latest" state values accessed inside effects that should strictly run only on mount or other specific triggers.

## 2024-05-23 - Performance Impact of Implicit N+1 Requests
**Learning:** In `ConversationList`, including `selectedId` in the `useEffect` dependencies caused the entire conversation list to be re-fetched from the API every time the user selected a conversation. This is a subtle "N+1 request" pattern on the frontend where interaction state accidentally triggers data fetching.
**Action:** Audit `useEffect` dependencies in list components to ensure selection state (UI state) does not trigger data re-fetching.
