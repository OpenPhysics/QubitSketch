/**
 * memory-leak.test.ts
 *
 * Creates the model and the GatePalettePanel, disposes them, forces garbage
 * collection, then asserts via WeakRef that the disposed objects were actually
 * collected. Requires --expose-gc (configured in vitest.config.ts execArgv).
 *
 * V8 requires a *function* boundary (not merely a block scope) to release local
 * variables for collection, so every allocation is wrapped in a helper function
 * whose strong references die when it returns.
 *
 * GatePalettePanel is the only sim component that adds/removes nodes at runtime
 * (drag previews in the dragLayer, hover tooltips in the overlayLayer) and links
 * to the shared model's selectedToolProperty. dispose() must unlink that
 * listener, dispose the drag listeners, and dispose the whole child subtree so
 * the global QubitSketchColors Properties no longer retain the panel.
 */

import type { Vector2 } from "scenerystack/dot";
import { Node } from "scenerystack/scenery";
import { describe, expect, it } from "vitest";
import { QubitSketchModel } from "../src/circuit-screen/model/QubitSketchModel.js";
import type { SlotDropTarget } from "../src/circuit-screen/view/CircuitCanvas.js";
import { GatePalettePanel, type PaletteDragContext } from "../src/circuit-screen/view/GatePalettePanel.js";

// Long-lived model sentinel: stays alive across tests so that a disposed panel
// must drop its own reference (unlink selectedToolProperty) to be collectible.
const sharedModel = new QubitSketchModel();

// Drop target that never reports a slot — drags simply cancel.
const noopDropTarget: SlotDropTarget = {
  slotIndexAt: (_globalPoint: Vector2, _qubitCount: number) => null,
};

/** A fresh drag context (drag + overlay layers) for one panel under test. */
function makeDragContext(): PaletteDragContext {
  return { dragLayer: new Node(), dropTarget: noopDropTarget, overlayLayer: new Node() };
}

/**
 * Force garbage collection with multiple passes. When `earlyExitRef` is supplied
 * the loop bails as soon as the object is confirmed collected. The setTimeout(0)
 * yield after a live deref() avoids the WeakRef macrotask-liveness pin (a live
 * deref() keeps the referent alive for the rest of the current macrotask).
 */
async function forceGC(earlyExitRef?: WeakRef<object>): Promise<void> {
  for (let i = 0; i < 15; i++) {
    globalThis.gc?.();
    await new Promise<void>((r) => setTimeout(r, 50));
    if (earlyExitRef !== undefined && earlyExitRef.deref() === undefined) {
      return;
    }
    if (earlyExitRef !== undefined) {
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }
}

/** Create a panel (with or without drag support), dispose it, return WeakRefs. */
function createAndDisposePanel(withDragContext: boolean): {
  panelRef: WeakRef<object>;
  dragContext: PaletteDragContext | undefined;
} {
  const dragContext = withDragContext ? makeDragContext() : undefined;
  const panel = new GatePalettePanel(sharedModel, dragContext);
  const panelRef = new WeakRef<object>(panel);
  panel.dispose();
  return { panelRef, dragContext };
}

describe("Memory leak regression", () => {
  it("global.gc is available (--expose-gc)", () => {
    expect(globalThis.gc).toBeDefined();
  });

  it("sanity: plain object is collected", async () => {
    const ref = (() => new WeakRef({ hello: "world" }))();
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });

  it("bare QubitSketchModel is collected (no global retention)", async () => {
    const ref = (() => new WeakRef<object>(new QubitSketchModel()))();
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });

  it("GatePalettePanel (drag-enabled) is collected after dispose", async () => {
    const { panelRef, dragContext } = createAndDisposePanel(true);
    await forceGC(panelRef);
    expect(panelRef.deref()).toBeUndefined();
    // dispose must not leave preview/tooltip nodes stranded in the layers.
    expect(dragContext?.dragLayer.children.length).toBe(0);
    expect(dragContext?.overlayLayer.children.length).toBe(0);
  });

  it("GatePalettePanel (click-to-select, no dragContext) is collected after dispose", async () => {
    const { panelRef } = createAndDisposePanel(false);
    await forceGC(panelRef);
    expect(panelRef.deref()).toBeUndefined();
  });

  it("double dispose() does not throw", () => {
    const panel = new GatePalettePanel(sharedModel, makeDragContext());
    panel.dispose();
    expect(() => panel.dispose()).not.toThrow();
  });

  it("repeated create/dispose cycles leave no survivors", async () => {
    const refs: WeakRef<object>[] = [];
    for (let i = 0; i < 20; i++) {
      refs.push(createAndDisposePanel(i % 2 === 0).panelRef);
    }
    await forceGC();
    const survivors = refs.filter((r) => r.deref() !== undefined).length;
    expect(survivors).toBe(0);
  });
});
