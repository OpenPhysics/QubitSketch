# Model - QubitSketch

This document describes the model (the underlying physics, math, and behavior) for the simulation, in
terms appropriate for an educator. It is the companion to
[implementation-notes.md](./implementation-notes.md), which targets developers.

## Overview

QubitSketch is a **quantum-circuit builder and statevector simulator**. Students place quantum gates on
a grid of qubit wires and watch the resulting **statevector**, measurement **probabilities**, and
amplitude phases update live. It is a pedagogical tool (inspired by Quirk) for exploring superposition,
entanglement, interference, and how unitary gates transform a multi-qubit state.

## Quantities and units

These are mathematical quantities, not physical units.

| Quantity | Symbol | Notes |
|---|---|---|
| Number of qubits | n | Circuit has `n` wires; state has `2ⁿ` complex amplitudes |
| Statevector | \|ψ⟩ | Unit-norm vector in a `2ⁿ`-dimensional complex space |
| Amplitude | αₖ | Complex number for basis state `k`; magnitude and phase both shown |
| Probability | pₖ = \|αₖ\|² | Chance of measuring basis state `k`; the pₖ sum to 1 |
| Gate | U | Unitary matrix applied at a circuit column |

## Governing equations

The circuit starts in the all-zeros state `|0…0⟩`. Each column of gates applies a **unitary operator**
to the current state:

```
|ψ'⟩ = U · |ψ⟩
```

Single-qubit gates (X, Y, Z, H, S, T, …) act on one wire; controlled gates (e.g. CNOT) couple wires and
can create **entanglement**. The state is evolved column by column from left to right. Measurement
outcomes follow the **Born rule**, with the probability of basis state `k` equal to `|αₖ|²`. Because
every gate is unitary, the total probability stays 1 at every step.

## Simplifications and assumptions

- Ideal, noiseless gates; no decoherence, gate error, or readout error.
- A pure-state CPU statevector engine — exact but exponential in qubit count, so the number of qubits is
  bounded for performance.
- Measurement displays probabilities (and can sample outcomes) rather than physically collapsing a
  persistent state mid-circuit.
- Global phase has no observable effect and is treated as such.

## References

- Nielsen & Chuang, *Quantum Computation and Quantum Information*, Ch. 1–2 (qubits, gates, measurement).
- Inspired by Craig Gidney's *Quirk* quantum-circuit simulator.
</content>
