/**
 * undoRedoKeyboardShortcuts.ts
 *
 * Installs the global undo/redo keyboard shortcuts on `window`:
 *   Ctrl/Cmd+Z              → undo
 *   Ctrl+Y or Ctrl/Cmd+Shift+Z → redo
 *
 * The listener lives on the global `window`, which never releases it on its own,
 * and its closure captures the model. If it is not removed, `window` retains the
 * listener — and through it the whole model + view — for the lifetime of the
 * page. That is a leak whenever the owning view is torn down and recreated
 * (dev hot-reload, tests, or any future multi-screen use): each new view adds
 * another permanent listener. So this returns a disposer that removes the
 * listener; the caller MUST invoke it on disposal (CircuitScreenView registers
 * it with its disposeEmitter).
 */

/** The slice of the model these shortcuts drive. */
export interface UndoRedoTarget {
  undo(): void;
  redo(): void;
}

/**
 * Wires Ctrl/Cmd+Z (undo) and Ctrl+Y / Ctrl/Cmd+Shift+Z (redo) on `window`.
 * Returns a disposer that removes the listener. No-op (returns a no-op disposer)
 * outside a browser.
 */
export function attachUndoRedoKeyboardShortcuts(model: UndoRedoTarget): () => void {
  if (typeof window === "undefined") {
    return () => {
      /* no window to detach from */
    };
  }

  const handler = (e: KeyboardEvent): void => {
    const meta = e.ctrlKey || e.metaKey;
    if (!meta || e.altKey) {
      return;
    }
    const key = e.key.toLowerCase();
    if (key === "z" && !e.shiftKey) {
      model.undo();
      e.preventDefault();
    } else if (key === "y" || (key === "z" && e.shiftKey)) {
      model.redo();
      e.preventDefault();
    }
  };

  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}
