import { expect, test, describe } from "bun:test";
import { createStreamStore } from "./StreamStore";

describe("StreamStore", () => {
  test("updates should be async/batched", async () => {
    const store = createStreamStore();
    let updates = 0;

    const unsubscribe = store.subscribe(() => {
      updates++;
    });

    // Queue multiple updates
    store.update("H", "");
    store.update("He", "");
    store.update("Hel", "");
    store.update("Hell", "");
    store.update("Hello", "");

    // Should NOT have updated yet (batched/throttled)
    expect(updates).toBe(0);

    // Wait for next tick (simulates requestAnimationFrame in test env)
    await new Promise(resolve => setTimeout(resolve, 50));

    // Should have updated ONCE with latest state
    expect(updates).toBeGreaterThan(0);
    expect(updates).toBe(1);
    expect(store.getSnapshot()).toEqual({ content: "Hello", thinking: "" });

    unsubscribe();
  });

  test("reset should clear pending updates and state", async () => {
    const store = createStreamStore();
    let updates = 0;
    store.subscribe(() => updates++);

    store.update("Draft", "");

    // Reset immediately
    store.reset();

    // Verify state is reset immediately or eventually
    // We expect reset to be effective immediately for snapshot consistency
    expect(store.getSnapshot()).toEqual({ content: "", thinking: "" });

    // Wait for async updates
    await new Promise(resolve => setTimeout(resolve, 50));

    // Should have received notification for reset, but NOT for "Draft"
    // "Draft" update should be cancelled.
    // If reset notifies, updates >= 1.
    // If "Draft" was cancelled, we shouldn't see intermediate state.
    expect(updates).toBeGreaterThan(0);
    expect(store.getSnapshot()).toEqual({ content: "", thinking: "" });
  });
});
