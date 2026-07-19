/**
 * QuantumSimulator.ts
 *
 * A small, pedagogical CPU statevector simulator. No WebGL, no GPU — the whole
 * point is to be readable. With at most MAX_QUBITS (5) qubits the statevector has
 * at most 2^5 = 32 complex amplitudes, so plain arrays and loops are plenty fast.
 *
 * Endianness: qubit 0 is the LEAST-significant bit. Basis-state index `i` has
 * qubit `q` set iff `(i >> q) & 1`, so circuit row `q` maps to bit `q`. See
 * GateType.ts for the matching display convention.
 */
import { Complex, Vector3 } from "scenerystack/dot";
import type { Complex2x2 } from "./GateMatrices.js";
import { GATE_MATRICES, rotationMatrix } from "./GateMatrices.js";
import type { CircuitCell } from "./GateType.js";
import { cellGate, NUM_STEPS } from "./GateType.js";

/**
 * The 2×2 unitary a cell applies, or null if the cell bears no gate
 * (empty / control / anti-control / swap markers).
 */
export function cellMatrix(cell: CircuitCell): Complex2x2 | null {
  if (cell.kind === "paramGate") {
    return rotationMatrix(cell.axis, cell.theta);
  }
  const gate = cellGate(cell);
  return gate === null ? null : GATE_MATRICES[gate];
}

/**
 * Applies a 2×2 gate matrix to one target wire, optionally conditioned on a set
 * of control wires. `onControls` must be |1⟩ and `offControls` (anti-controls)
 * must be |0⟩ for the gate to act.
 *
 * This is the heart of the simulator. The state is a superposition over basis
 * states; flipping `target` connects basis states that differ only in bit
 * `target`. We walk each such pair once and rotate it by the matrix `m`, but
 * only for pairs whose control bits already match the required pattern.
 *
 * Mutates `state` in place.
 */
export function applyControlledGate(
  state: Complex[],
  target: number,
  onControls: readonly number[],
  offControls: readonly number[],
  m: Complex2x2,
): void {
  const targetBit = 1 << target;
  let controlMask = 0;
  let controlValue = 0; // the bit pattern the controls must match: 1 for on-controls, 0 for anti-controls
  for (const c of onControls) {
    const bit = 1 << c;
    controlMask |= bit;
    controlValue |= bit;
  }
  for (const c of offControls) {
    controlMask |= 1 << c;
  }

  for (let i = 0; i < state.length; i++) {
    // Visit only the "0 at target" member of each pair, and only when the controls match.
    if ((i & targetBit) !== 0 || (i & controlMask) !== controlValue) {
      continue;
    }
    const j = i | targetBit; // partner with "1 at target"
    const a0 = state[i];
    const a1 = state[j];
    const m00 = m[0]?.[0];
    const m01 = m[0]?.[1];
    const m10 = m[1]?.[0];
    const m11 = m[1]?.[1];
    if (a0 === undefined || a1 === undefined || !m00 || !m01 || !m10 || !m11) {
      continue;
    }
    state[i] = m00.times(a0).plus(m01.times(a1));
    state[j] = m10.times(a0).plus(m11.times(a1));
  }
}

/**
 * Exchanges two wires (a SWAP gate) by swapping the amplitudes of every basis-state
 * pair that differs on exactly bits `a` and `b`. Mutates `state` in place.
 */
export function applySwap(state: Complex[], a: number, b: number): void {
  if (a === b) {
    return;
  }
  const aBit = 1 << a;
  const bBit = 1 << b;
  for (let i = 0; i < state.length; i++) {
    // Visit each differing pair once: bit a = 0, bit b = 1.
    if ((i & aBit) === 0 && (i & bBit) !== 0) {
      const j = (i | aBit) & ~bBit; // partner with bit a = 1, bit b = 0
      const tmp = state[i]!;
      state[i] = state[j]!;
      state[j] = tmp;
    }
  }
}

/**
 * Applies one circuit column (all cells at a given step) to the state.
 *
 * Semantics:
 *   - A column with exactly two SWAP endpoints (and no controls) exchanges those wires.
 *   - If the column contains one or more controls (• on |1⟩ or ◦ on |0⟩), there must be
 *     exactly one gate-bearing wire; that gate is applied conditioned on every control.
 *     (CNOT = X target + one control. CCX/Toffoli = X target + two controls.)
 *   - Otherwise every gate cell is an independent single-qubit gate (disjoint targets
 *     commute, so order does not matter).
 *
 * Limitations (v1): with controls present, only the first gate-bearing wire is the target
 * (one controlled operation per column); controlled-SWAP (Fredkin) and 3+ swap endpoints
 * in a column are treated as no-ops.
 */
function applyColumn(
  state: Complex[],
  n: number,
  circuit: ReadonlyArray<ReadonlyArray<CircuitCell>>,
  step: number,
): void {
  const onControls: number[] = [];
  const offControls: number[] = [];
  const swapWires: number[] = [];
  const gateWires: Array<{ wire: number; matrix: Complex2x2 }> = [];

  for (let q = 0; q < n; q++) {
    const cell = circuit[q]?.[step];
    if (cell === undefined) {
      continue;
    }
    if (cell.kind === "control") {
      onControls.push(q);
      continue;
    }
    if (cell.kind === "antiControl") {
      offControls.push(q);
      continue;
    }
    if (cell.kind === "swap") {
      swapWires.push(q);
      continue;
    }
    const m = cellMatrix(cell);
    if (m !== null) {
      gateWires.push({ wire: q, matrix: m });
    }
  }

  const hasControl = onControls.length > 0 || offControls.length > 0;

  // SWAP: exactly two endpoints and no controls (controlled-SWAP is not supported in v1).
  if (swapWires.length === 2 && !hasControl) {
    applySwap(state, swapWires[0]!, swapWires[1]!);
    return;
  }

  if (hasControl) {
    // Controlled operation: apply the first gate target conditioned on all controls.
    const targetGate = gateWires[0];
    if (targetGate !== undefined) {
      applyControlledGate(state, targetGate.wire, onControls, offControls, targetGate.matrix);
    }
    // Stray controls with no target are a no-op (documented).
  } else {
    for (const { wire, matrix } of gateWires) {
      applyControlledGate(state, wire, [], [], matrix);
    }
  }
}

/**
 * Simulates the circuit from |0…0⟩ and returns the statevector (length 2^n) after
 * applying the first `maxColumns` columns. Only the first `n` qubit rows participate.
 *
 * `maxColumns` defaults to the full circuit; passing a smaller value powers the
 * step-through "inspect" mode (the state after the first k columns). Columns beyond
 * the circuit's content are empty, so any value ≥ the circuit depth gives the final state.
 */
export function simulate(
  circuit: ReadonlyArray<ReadonlyArray<CircuitCell>>,
  n: number,
  maxColumns: number = NUM_STEPS,
): Complex[] {
  const dim = 1 << n;
  const state: Complex[] = new Array(dim);
  state[0] = Complex.ONE;
  for (let i = 1; i < dim; i++) {
    state[i] = Complex.ZERO;
  }

  const limit = Math.max(0, Math.min(NUM_STEPS, maxColumns));
  for (let step = 0; step < limit; step++) {
    applyColumn(state, n, circuit, step);
  }
  return state;
}

/**
 * Computes the per-qubit reduced Bloch vector (⟨X⟩, ⟨Y⟩, ⟨Z⟩) for each of the
 * first `n` qubits, directly from the full statevector expectation values.
 *
 * A vector shorter than unit length signals a mixed reduced state — i.e. that
 * qubit is entangled with the rest of the register. That shortening is exactly
 * what makes entanglement visible on the Bloch display.
 */
export function computeBlochVectors(state: Complex[], n: number): Vector3[] {
  const out: Vector3[] = [];
  for (let q = 0; q < n; q++) {
    const bit = 1 << q;
    let x = 0;
    let y = 0;
    let z = 0;
    for (let i = 0; i < state.length; i++) {
      const amp = state[i]!;
      const p = amp.magnitudeSquared;
      z += ((i & bit) === 0 ? 1 : -1) * p;
      if ((i & bit) === 0) {
        const prod = amp.conjugated().times(state[i | bit]!);
        x += 2 * prod.real;
        y += 2 * prod.imaginary;
      }
    }
    out.push(new Vector3(x, y, z));
  }
  return out;
}
