# Model - QubitSketch

This document describes the model (the underlying physics, math, and behavior) for the simulation,
in terms appropriate for an educator. It is the companion to
[implementation-notes.md](./implementation-notes.md), which targets developers.

## Overview

QubitSketch is a **quantum-circuit builder and statevector simulator**. Students place gates on a grid
of qubit wires and watch the **statevector**, **measurement probabilities**, **Bloch-sphere reduced
states**, and (optionally) a sampled **measurement histogram** update live. It is a pedagogical tool
inspired by Craig Gidney's *Quirk*, focused on superposition, entanglement, interference, and how
unitary gates transform a multi-qubit register.

The key ideas a student should take away:

- A register of *n* qubits is described by **2ⁿ complex amplitudes**; the state must stay **normalized**
  (total probability 1).
- Each gate column applies a **unitary** transformation; composing gates is matrix multiplication
  applied column-by-column from left to right.
- **Controlled gates** (• on |1⟩, ◦ on |0⟩) act on one target only when all control conditions match;
  CNOT and Toffoli (CCX) are built from control dots plus a target gate.
- **Entanglement** shows up when a single-qubit Bloch vector has length **less than 1** — the qubit
  cannot be described by a pure state alone.
- The **Measure** tool samples outcomes from |αₖ|² but does **not** collapse the simulated state
  mid-circuit (inspect mode scrubs columns without changing the stored circuit).

## Quantities and units

These are dimensionless quantum-mechanical quantities (ħ = 1 convention).

| Quantity | Symbol | Notes |
|---|---|---|
| Number of qubits | n | 1–5 wires; state dimension 2ⁿ |
| Statevector | \|ψ⟩ | Unit-norm vector in ℂ^(2ⁿ) |
| Basis index | k | 0 … 2ⁿ−1; bit q set iff (k >> q) & 1 |
| Amplitude | αₖ | Complex; magnitude and phase displayed |
| Probability | pₖ = \|αₖ\|² | Born rule; Σ pₖ = 1 |
| Gate / column | U | Unitary on one or more wires per column rules |
| Bloch vector | (⟨X⟩, ⟨Y⟩, ⟨Z⟩) | Reduced one-qubit state; length ≤ 1 |
| Rotation angle | θ | Radians for Rx, Ry, Rz parametrized gates |

**Display endianness:** qubit 0 is the **least significant bit** in the basis index, but kets are
shown in **big-endian** notation |q_{n−1}…q_0⟩ to match textbook bra-ket ordering.

## Governing equations

**Initialization.** The circuit starts in |0…0⟩ (α_0 = 1, all other amplitudes 0).

**Column evolution.** For each column (step) from left to right, the engine applies:

```
|ψ'⟩ = U_column · |ψ⟩
```

Column semantics (v1):

- **Single-qubit gates** (H, X, Y, Z, S, T, √X, Rx/Ry/Rz, …) on independent targets commute and
  are all applied when no controls are present.
- **Controls:** one gate-bearing wire is the **target**; all • (on) and ◦ (off) conditions must
  match. Example: CNOT = X target + one • control; Toffoli = X target + two • controls.
- **SWAP:** exactly two ✕ endpoints in a column with **no** controls exchanges those wires.
- Controlled-SWAP (Fredkin) and 3+ swap markers in one column are **not** supported (no-op).

**Controlled single-qubit apply** (conceptually): for each basis pair differing only at the target bit,
if control bits match, rotate amplitudes by the 2×2 gate matrix; otherwise leave them unchanged.

**Measurement display.** Probabilities pₖ = |αₖ|² are exact from the statevector. The histogram **samples**
a basis outcome from that distribution; it is pedagogical, not a mid-circuit projection of |ψ⟩.

**Inspect mode.** `inspectStep = k` shows the state after the first *k* columns without editing the
circuit or undo history.

## Simplifications and assumptions

- **Ideal, noiseless** unitary gates; no decoherence, gate error, or readout error.
- **Pure-state CPU statevector** — exact but exponential in n; capped at **5 qubits** (32 amplitudes).
- **Global phase** is unobservable and not emphasized in the UI.
- **One controlled target per column** when controls are present; multiple gates in a control column
  beyond the first target are ignored.
- OpenQASM import/export covers a **teaching subset** (see QASM dialog); not full OpenQASM 3.

## References

- M. A. Nielsen & I. L. Chuang, *Quantum Computation and Quantum Information*, Ch. 1–2 (qubits,
  gates, measurement, entanglement).
- Craig Gidney, *Quirk* quantum circuit simulator (design inspiration; `Quirk/` in repo is reference
  only).
- Standard gate definitions: Pauli X/Y/Z, Hadamard, phase gates, Rx(θ) = exp(−iθX/2), etc.
