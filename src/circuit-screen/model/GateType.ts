/**
 * GateType.ts
 *
 * Defines the set of supported single-qubit quantum gates and related types.
 */

export const GateType = {
  H: "H", // Hadamard — creates equal superposition: |0⟩→(|0⟩+|1⟩)/√2
  X: "X", // Pauli-X — quantum NOT gate: |0⟩↔|1⟩
  Y: "Y", // Pauli-Y — combined bit and phase flip
  Z: "Z", // Pauli-Z — phase flip: |1⟩→-|1⟩
  S: "S", // Phase (S) gate — adds π/2 phase to |1⟩
  T: "T", // T gate — adds π/4 phase to |1⟩
} as const;

export type GateType = (typeof GateType)[keyof typeof GateType];

/** A single cell in the circuit grid — either a gate or empty. */
export type CircuitCell = GateType | null;

/** The currently active placement tool (a gate type or the eraser). */
export type SelectedTool = GateType | "eraser";

export const NUM_STEPS = 8;
export const MAX_QUBITS = 5;
export const MIN_QUBITS = 1;
