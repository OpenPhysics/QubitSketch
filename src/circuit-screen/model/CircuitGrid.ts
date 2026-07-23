/**
 * CircuitGrid.ts
 *
 * The shared vocabulary for the circuit grid: its type, bounds-safe access, an
 * immutable single-cell update, an empty-grid factory, and the one column
 * classifier that every layer (simulator, QASM interop, canvas, placement guards)
 * used to re-implement.
 *
 * A grid is `circuit[qubit][step]`. Qubit 0 is the least-significant bit — see
 * GateType.ts for the matching display/endianness convention.
 */
import type { CircuitCell } from "./GateType.js";
import { EMPTY_CELL, MAX_QUBITS, NUM_STEPS } from "./GateType.js";

/** A read-only circuit grid: `grid[qubit][step]`. The shape most APIs accept. */
export type Grid = ReadonlyArray<ReadonlyArray<CircuitCell>>;

/** A mutable circuit grid, for the preset builders and importers that fill one in. */
export type MutableGrid = CircuitCell[][];

/** Bounds-safe cell read: out-of-range coordinates yield {@link EMPTY_CELL}. */
export function cellAt(grid: Grid, qubit: number, step: number): CircuitCell {
  return grid[qubit]?.[step] ?? EMPTY_CELL;
}

/** A fresh MAX_QUBITS × NUM_STEPS grid of empty cells. */
export function emptyGrid(): MutableGrid {
  return Array.from({ length: MAX_QUBITS }, () => Array.from({ length: NUM_STEPS }, (): CircuitCell => EMPTY_CELL));
}

/**
 * Returns a copy of `grid` with a single cell replaced. Rows other than the edited
 * one are shared by reference (the grid is treated as immutable), so this is cheap.
 */
export function withCell(grid: Grid, qubit: number, step: number, cell: CircuitCell): Grid {
  return grid.map((row, q) => (q === qubit ? row.map((c, s) => (s === step ? cell : c)) : row));
}

/**
 * The wire roles present in one column's visible rows (qubits 0…n−1), bucketed by kind.
 * `gateWires` holds every gate-bearing wire (fixed gate, controlled target, or rotation).
 * This is the single source of truth the simulator, QASM export, connector rendering, and
 * placement guards all read the same shape from.
 */
export type ColumnShape = {
  readonly onControls: number[];
  readonly offControls: number[];
  readonly swapWires: number[];
  readonly gateWires: number[];
};

/** Classifies one column of `grid` (visible rows 0…n−1) into its {@link ColumnShape}. */
export function classifyColumn(grid: Grid, step: number, n: number): ColumnShape {
  const onControls: number[] = [];
  const offControls: number[] = [];
  const swapWires: number[] = [];
  const gateWires: number[] = [];
  for (let q = 0; q < n; q++) {
    const cell = cellAt(grid, q, step);
    switch (cell.kind) {
      case "control":
        onControls.push(q);
        break;
      case "antiControl":
        offControls.push(q);
        break;
      case "swap":
        swapWires.push(q);
        break;
      case "gate":
      case "controlledTarget":
      case "paramGate":
        gateWires.push(q);
        break;
      // "empty" contributes nothing.
    }
  }
  return { onControls, offControls, swapWires, gateWires };
}

/** True if the column carries a control of either polarity (• on |1⟩ or ◦ on |0⟩). */
export function columnHasControl(shape: ColumnShape): boolean {
  return shape.onControls.length > 0 || shape.offControls.length > 0;
}
