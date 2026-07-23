/**
 * global-listener-leak.test.ts
 *
 * Regression tests for two `window`-level listeners that captured the model in
 * their closures and were never removed. Because `window` outlives every model
 * and view, an un-removed listener retains the whole model for the lifetime of
 * the page — a leak that accumulates whenever a new view/model is constructed
 * (dev hot-reload, tests, or any future multi-screen use).
 *
 *   - the undo/redo keyboard shortcut (window "keydown")     — attachUndoRedoKeyboardShortcuts
 *   - the shared-circuit URL hash sync   (window "hashchange") — attachUrlSync
 *
 * Both now return a disposer; these tests confirm the disposer removes the
 * listener AND that the model is collectible afterwards (WeakRef + forceGC,
 * matching the fleet memory-leak pattern).
 */
import { describe, expect, it } from "vitest";
import { attachUrlSync } from "../src/circuit-screen/model/CircuitUrlSync.js";
import { QubitSketchModel } from "../src/circuit-screen/model/QubitSketchModel.js";
import {
  attachUndoRedoKeyboardShortcuts,
  type UndoRedoTarget,
} from "../src/circuit-screen/view/undoRedoKeyboardShortcuts.js";

const noop: () => void = () => {
  /* no-op */
};

/** Force GC with multiple passes, bailing early once `ref` is confirmed collected. */
async function forceGC(ref?: WeakRef<object>): Promise<void> {
  for (let i = 0; i < 15; i++) {
    globalThis.gc?.();
    await new Promise<void>((r) => setTimeout(r, 50));
    if (ref !== undefined && ref.deref() === undefined) {
      return;
    }
    if (ref !== undefined) {
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }
}

function pressCtrlZ(): void {
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, cancelable: true }));
}

describe("undo/redo keyboard shortcut listener", () => {
  it("global.gc is available (--expose-gc)", () => {
    expect(globalThis.gc).toBeDefined();
  });

  it("Ctrl+Z drives undo while attached, and stops after the disposer runs", () => {
    let undoCount = 0;
    const target: UndoRedoTarget = { undo: () => undoCount++, redo: noop };

    const dispose = attachUndoRedoKeyboardShortcuts(target);
    pressCtrlZ();
    expect(undoCount).toBe(1);

    dispose();
    pressCtrlZ();
    expect(undoCount).toBe(1); // listener removed: no further undo
  });

  it("disposer is idempotent (double call does not throw)", () => {
    const dispose = attachUndoRedoKeyboardShortcuts({ undo: noop, redo: noop });
    dispose();
    expect(() => dispose()).not.toThrow();
  });

  it("model is collected after the shortcut is disposed", async () => {
    const ref = (() => {
      const model = new QubitSketchModel();
      const dispose = attachUndoRedoKeyboardShortcuts(model);
      dispose();
      return new WeakRef<object>(model);
    })();
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });

  it("WITHOUT disposing, the window listener keeps the target reachable", async () => {
    // Guards the fix: an un-removed window listener must retain its captured target.
    // (Uses a bare object, not a model, so we don't strand a real model on window.)
    const sentinel: UndoRedoTarget = { undo: noop, redo: noop };
    const ref = new WeakRef<object>(sentinel);
    const dispose = attachUndoRedoKeyboardShortcuts(sentinel);
    await forceGC();
    expect(ref.deref()).toBeDefined(); // still retained by window's keydown listener
    dispose(); // clean up so we don't leak into other tests
  });
});

describe("URL hash sync listener", () => {
  it("hashchange stops loading into the model after the disposer runs", () => {
    const model = new QubitSketchModel();
    const dispose = attachUrlSync(model);

    const before = model.qubitCountProperty.value;
    dispose();

    // Fire a hashchange the disposed listener would have reacted to. With the listener
    // removed, model.loadCircuit is never invoked, so nothing observes this hash.
    window.location.hash = "#circuit=changed-after-dispose";
    window.dispatchEvent(new Event("hashchange"));
    expect(model.qubitCountProperty.value).toBe(before);

    window.location.hash = "";
  });

  it("model is collected after URL sync is disposed", async () => {
    const ref = (() => {
      const model = new QubitSketchModel();
      const dispose = attachUrlSync(model);
      dispose();
      return new WeakRef<object>(model);
    })();
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });
});
