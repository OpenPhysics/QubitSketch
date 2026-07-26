/**
 * ColumnRules.ts
 *
 * The single source of truth for which circuit columns the simulator applies IN FULL.
 *
 * `QuantumSimulator.applyColumn` supports three column shapes (see doc/model.md):
 *   1. no controls, no swaps  — every gate cell is an independent single-qubit gate
 *   2. one or more controls   — exactly one gate-bearing wire is the target
 *   3. exactly two swaps      — those two wires are exchanged
 *
 * Anything else means at least one placed cell has no effect: a second gate in a
 * controlled column, a gate sharing a column with a SWAP, a third swap endpoint.
 * Those cells still *render*, so a grid that violates these rules shows the student
 * gates that never act — the one failure mode this module exists to prevent.
 *
 * Every entry point that can write a grid must agree on this predicate:
 *   - `QubitSketchModel` placement guards (interactive editing)
 *   - `CircuitSerializer.deserialize` (shared `#circuit=` links)
 *   - `QasmSerializer.packOpsIntoColumns` (OpenQASM import)
 */
import type { CircuitCell } from "./GateType.js";
import { EMPTY_CELL, isAnyControl, isGateBearing, MAX_QUBITS, NUM_STEPS } from "./GateType.js";

/** How many cells of each role a single column holds. */
export type ColumnCensus = {
  /** Controls of either polarity (• on |1⟩ or ◦ on |0⟩). */
  readonly controls: number;
  /** SWAP endpoints (✕). */
  readonly swaps: number;
  /** Cells applying a 2×2 unitary (fixed gate, controlled target, or rotation). */
  readonly gates: number;
};

/** Counts the roles present in one column's cells. */
export function censusColumn(cells: readonly CircuitCell[]): ColumnCensus {
  let controls = 0;
  let swaps = 0;
  let gates = 0;
  for (const cell of cells) {
    if (isAnyControl(cell)) {
      controls++;
    } else if (cell.kind === "swap") {
      swaps++;
    } else if (isGateBearing(cell)) {
      gates++;
    }
  }
  return { controls, swaps, gates };
}

/**
 * True if the simulator applies every gate-bearing cell in a column with this census —
 * i.e. the column is one of the three supported shapes and nothing is silently dropped.
 *
 * A lone SWAP endpoint is permitted: it bears no gate, so nothing is dropped, and the user
 * must be able to place the first ✕ before the second.
 */
export function isApplicableColumn(census: ColumnCensus): boolean {
  const { controls, swaps, gates } = census;
  if (swaps === 0) {
    // Independent single-qubit gates, or one controlled operation with a single target.
    return controls === 0 || gates <= 1;
  }
  // A SWAP pair must own its column outright (controlled-SWAP is out of scope in v1).
  return swaps <= 2 && controls === 0 && gates === 0;
}

/**
 * Reads one column out of a `circuit[qubit][step]` grid.
 *
 * `rowCount` defaults to the full grid height rather than the visible wire count on purpose:
 * a cell parked on a hidden wire re-enters the simulation the moment the user grows the wire
 * count, so legality has to hold for every wire count, not just the current one.
 */
export function columnCells(
  circuit: ReadonlyArray<ReadonlyArray<CircuitCell>>,
  step: number,
  rowCount: number = MAX_QUBITS,
): CircuitCell[] {
  const cells: CircuitCell[] = [];
  for (let q = 0; q < rowCount; q++) {
    cells.push(circuit[q]?.[step] ?? EMPTY_CELL);
  }
  return cells;
}

/** True if every column of the grid is one the simulator applies in full. */
export function isApplicableCircuit(
  circuit: ReadonlyArray<ReadonlyArray<CircuitCell>>,
  rowCount: number = MAX_QUBITS,
): boolean {
  for (let step = 0; step < NUM_STEPS; step++) {
    if (!isApplicableColumn(censusColumn(columnCells(circuit, step, rowCount)))) {
      return false;
    }
  }
  return true;
}
