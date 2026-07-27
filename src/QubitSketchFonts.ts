/**
 * QubitSketchFonts.ts
 *
 * Named font strings for the simulation UI, mirroring how QubitSketchColors centralizes
 * color. Prefer a role from {@link FONTS} over a hand-written font string so sizing/weight
 * stays consistent across the views. For glyphs whose size is computed at layout time (gate
 * boxes that scale), use {@link scaledFont}.
 */

export const FONTS = {
  // Circuit canvas
  qubitLabel: "bold 16px monospace", // wire labels q0, q1, …

  // Qubit-count stepper
  stepperButton: "bold 20px sans-serif", // −/＋ glyphs

  // Toolbar / transport glyphs
  toolbarGlyph: "bold 18px sans-serif", // undo/redo ↶ ↷
  transportGlyph: "bold 16px sans-serif", // inspect ◀ ▶
  transportReadout: "13px monospace", // inspect "k / depth"

  // Titles / labels
  dialogTitle: "bold 16px sans-serif", // dialog headings
  inspectorTitle: "bold 15px monospace", // rotation angle inspector heading
  panelTitle: "bold 14px sans-serif", // panel headings and primary button labels
  blochLabel: "bold 12px monospace", // Bloch per-qubit labels
  captionBold: "bold 12px sans-serif", // small emphasized sub-labels

  // Body / readouts
  control: "14px sans-serif", // control readouts and combo-box items
  body: "13px sans-serif", // basis-state list body text
  caption: "12px sans-serif", // small labels and tooltips
  monoBody: "12px monospace", // matrix cells
  captionSmall: "11px sans-serif", // axis labels, status lines
  monoCaption: "11px monospace", // basis-state kets
  tick: "10px sans-serif", // small tick labels
  monoTick: "9px monospace", // Bloch tick labels
} as const;

/** Builds a font string for a size computed at layout time (e.g. gate glyphs that scale with their box). */
export function scaledFont(pxSize: number, options?: { readonly bold?: boolean; readonly mono?: boolean }): string {
  const weight = options?.bold ? "bold " : "";
  const family = options?.mono ? "monospace" : "sans-serif";
  return `${weight}${pxSize}px ${family}`;
}
