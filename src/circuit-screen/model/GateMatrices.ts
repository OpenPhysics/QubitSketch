/**
 * GateMatrices.ts
 *
 * The 2×2 complex unitary matrix for each supported single-qubit gate.
 * These are the textbook quantum gate definitions; the simulator
 * (QuantumSimulator.ts) applies them to the statevector.
 */
import { Complex } from "scenerystack/dot";
import type { GateType, RotationAxis } from "./GateType.js";

/** A 2×2 matrix of complex numbers, row-major: m[row][col]. */
export type Complex2x2 = readonly [readonly [Complex, Complex], readonly [Complex, Complex]];

const INV_SQRT2 = 1 / Math.SQRT2;

export const GATE_MATRICES: Record<GateType, Complex2x2> = {
  // Hadamard: (1/√2)[[1, 1], [1, -1]]
  H: [
    [Complex.real(INV_SQRT2), Complex.real(INV_SQRT2)],
    [Complex.real(INV_SQRT2), Complex.real(-INV_SQRT2)],
  ],
  // Pauli-X (NOT): [[0, 1], [1, 0]]
  X: [
    [Complex.ZERO, Complex.ONE],
    [Complex.ONE, Complex.ZERO],
  ],
  // Pauli-Y: [[0, -i], [i, 0]]
  Y: [
    [Complex.ZERO, new Complex(0, -1)],
    [Complex.I, Complex.ZERO],
  ],
  // Pauli-Z: [[1, 0], [0, -1]]
  Z: [
    [Complex.ONE, Complex.ZERO],
    [Complex.ZERO, Complex.real(-1)],
  ],
  // Phase (S): [[1, 0], [0, i]]
  S: [
    [Complex.ONE, Complex.ZERO],
    [Complex.ZERO, Complex.I],
  ],
  // T: [[1, 0], [0, e^{iπ/4}]]
  T: [
    [Complex.ONE, Complex.ZERO],
    [Complex.ZERO, Complex.createPolar(1, Math.PI / 4)],
  ],
  // S† (inverse phase): [[1, 0], [0, -i]]
  Sdg: [
    [Complex.ONE, Complex.ZERO],
    [Complex.ZERO, new Complex(0, -1)],
  ],
  // T† (inverse T): [[1, 0], [0, e^{-iπ/4}]]
  Tdg: [
    [Complex.ONE, Complex.ZERO],
    [Complex.ZERO, Complex.createPolar(1, -Math.PI / 4)],
  ],
  // √X (square root of NOT): (1/2)[[1+i, 1-i], [1-i, 1+i]]
  Vx: [
    [new Complex(0.5, 0.5), new Complex(0.5, -0.5)],
    [new Complex(0.5, -0.5), new Complex(0.5, 0.5)],
  ],
};

/**
 * The 2×2 unitary R_axis(θ) for a parametrized single-qubit rotation:
 *   Rx(θ) = [[cos θ/2, −i·sin θ/2], [−i·sin θ/2, cos θ/2]]
 *   Ry(θ) = [[cos θ/2, −sin θ/2],   [sin θ/2,    cos θ/2]]
 *   Rz(θ) = [[e^{−iθ/2}, 0],        [0,          e^{+iθ/2}]]
 */
export function rotationMatrix(axis: RotationAxis, theta: number): Complex2x2 {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  switch (axis) {
    case "X":
      return [
        [Complex.real(c), new Complex(0, -s)],
        [new Complex(0, -s), Complex.real(c)],
      ];
    case "Y":
      return [
        [Complex.real(c), Complex.real(-s)],
        [Complex.real(s), Complex.real(c)],
      ];
    case "Z":
      return [
        [Complex.createPolar(1, -theta / 2), Complex.ZERO],
        [Complex.ZERO, Complex.createPolar(1, theta / 2)],
      ];
  }
}
