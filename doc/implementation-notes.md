# Implementation Notes - QubitSketch

Developer-facing notes on the architecture. The quantum mechanics is documented for educators in
[model.md](./model.md).

## Architecture Overview

QubitSketch is a single-screen SceneryStack sim with a CPU-only statevector engine (no WebGL). The
code separates into:

```
src/circuit-screen/model/
  ├─ QuantumSimulator.ts       pure math: simulate(), applyControlledGate(), computeBlochVectors()
  ├─ GateMatrices.ts           2×2 unitaries, rotationMatrix(axis, θ)
  ├─ GateType.ts               CircuitCell discriminated union, MAX_QUBITS, NUM_STEPS
  ├─ QubitSketchModel.ts       grid, undo/redo, inspect step, DerivedProperty outputs
  ├─ CircuitSerializer.ts      compact URL hash encoding
  ├─ CircuitUrlSync.ts         #circuit=… load/save on hash change
  ├─ QasmSerializer.ts           OpenQASM 2.0 teaching subset
  └─ CircuitPresets.ts           example circuits

src/circuit-screen/view/
  ├─ CircuitScreenView.ts      palette + canvas + simulation panel + QASM dialog
  ├─ CircuitCanvas.ts          grid, connectors, click/drag placement
  ├─ GatePalettePanel.ts       tool selection, drag-to-place (dispose required)
  ├─ SimulationPanel.ts        probabilities, amplitudes, Bloch, histogram
  ├─ BlochSpheresNode / BlochSphereNode / MeasurementHistogramNode
  ├─ InspectControlNode.ts     ◀ / ▶ / Live scrub of inspectStepProperty
  └─ QasmDialog.ts, GateInspectorNode.ts, ExampleCircuitsComboBox.ts

src/QubitSketchConstants.ts    layout margins, control sizes
src/QubitSketchColors.ts       ProfileColorProperty + gate colors
src/preferences/               qubit count default, query parameters
```

Data flows Model → View through AXON `Property` objects; `QuantumSimulator` imports only `dot`
(`Complex`, `Vector3`) — no axon/scenery.

## Key design decisions

- **Derived simulation.** `stateVectorProperty`, `probabilitiesProperty`, and `blochVectorsProperty`
  are `DerivedProperty` instances recomputing from `circuitProperty`, `qubitCountProperty`, and
  `inspectStepProperty` — no manual invalidation.
- **Immutable grid updates.** Each edit replaces the affected row in `circuitProperty`; undo/redo
  stores cheap `{ circuit, qubitCount }` snapshots (max 100 entries). Slider drags on Rx/Ry/Rz coalesce
  via `pushHistory(coalesceKey)`.
- **Inspect is transient.** `inspectStepProperty` is excluded from undo/redo and URL hash; editing the
  circuit clears inspect back to live final state.
- **Column semantics in one place.** `applyColumn()` in `QuantumSimulator.ts` is the single authority
  for control/SWAP/single-qubit rules — keep tests and docs aligned with it.
- **URL sharing.** `CircuitUrlSync` serializes the grid to `#circuit=…`; `restoreCircuit()` loads at
  startup without pushing undo history.

## Model / view design

- Placement rules live in `QubitSketchModel.placeCell()` (toggle same tool, max two SWAP endpoints,
  auto `controlledTarget` when column has a control).
- Gate colors/labels: `GATE_COLOR_MAP` / `GATE_LABEL_MAP` in `GateNode.ts` from `QubitSketchColors`.
- Phase display: `twilightColormap.ts` for amplitude phase; matrix tooltip on palette hover.
- Circuit canvas uses a fixed virtual size (`QubitSketchConstants`); not model-view metres.

## Disposal conventions

`GatePalettePanel` is the primary dynamic view: drag previews, hover tooltips, and
`selectedToolProperty` links. Its `dispose()` unlinks listeners, disposes drag listeners, and
depth-first disposes children so global color Properties are not retained. Screen-lifetime nodes
(canvas, simulation panel) intentionally omit dispose today.

## Testing

`npm test` (vitest, `--expose-gc`):

- `tests/memory-leak.test.ts` — WeakRef/GC regression after `GatePalettePanel.dispose()`
- No dedicated `QuantumSimulator` unit file yet; add under `tests/circuit-screen/model/` when extending
  gate semantics

## Multi-screen simulations

Single-screen sim. The legacy `Quirk/` folder is upstream reference material, not part of the shipped
build.
