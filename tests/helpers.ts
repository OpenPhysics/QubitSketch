/**
 * helpers.ts
 *
 * Shared builders for the model/physics test suites.
 */
import type { Complex } from "scenerystack/dot";
import type { CircuitCell } from "../src/circuit-screen/model/GateType.js";
import { EMPTY_CELL, MAX_QUBITS, NUM_STEPS } from "../src/circuit-screen/model/GateType.js";

/** Builds a full-size grid from sparse "qubit,step" → cell entries. */
export function grid(cells: Record<string, CircuitCell>): CircuitCell[][] {
  const g: CircuitCell[][] = Array.from({ length: MAX_QUBITS }, () =>
    Array.from({ length: NUM_STEPS }, () => EMPTY_CELL),
  );
  for (const [key, cell] of Object.entries(cells)) {
    const [q, s] = key.split(",").map(Number);
    g[q!]![s!] = cell;
  }
  return g;
}

export const H: CircuitCell = { kind: "gate", gate: "H" };
export const X: CircuitCell = { kind: "gate", gate: "X" };
export const CTRL: CircuitCell = { kind: "control" };
export const ANTI: CircuitCell = { kind: "antiControl" };
export const SWAP: CircuitCell = { kind: "swap" };
export const TARGET_X: CircuitCell = { kind: "controlledTarget", gate: "X" };

/** Measurement probabilities |αₖ|² of a statevector. */
export function probs(state: Complex[]): number[] {
  return state.map((a) => a.magnitudeSquared);
}
