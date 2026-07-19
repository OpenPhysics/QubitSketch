# CLAUDE.md — QubitSketch

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenPhysics/.github/CLAUDE.md](https://github.com/OpenPhysics/.github/blob/main/CLAUDE.md).

## Project

Drag-and-drop **quantum circuit builder** with live CPU statevector simulation (≤ 5 qubits). Pedagogical reimplementation of [Quirk](https://github.com/Strilanc/Quirk)'s core — superposition, entanglement, and unitary gates on a grid of qubit wires.

Physics for educators: `doc/model.md`. Architecture: `doc/implementation-notes.md`.

## Key files

| Area | Location |
|---|---|
| Screen | `src/circuit-screen/CircuitScreen.ts` |
| Model | `model/QubitSketchModel.ts`, `QuantumSimulator.ts` (pure engine), `GateType.ts`, `GateMatrices.ts`, `CircuitSerializer.ts`, `CircuitUrlSync.ts`, `QasmSerializer.ts` |
| View | `view/CircuitScreenView.ts`, `CircuitCanvas.ts`, `GatePalettePanel.ts`, `BlochSpheresNode.ts`, `CircuitScreenSummaryContent.ts` |
| Constants / colors | `src/QubitSketchConstants.ts`, `QubitSketchColors.ts`, `src/i18n/StringManager.ts` |

## Model

`QubitSketchModel implements TModel`. Circuit grid `circuit[qubit][step]` holds `CircuitCell` gate placements; `QuantumSimulator.simulate` recomputes derived state.

| Property | Type | Meaning |
|---|---|---|
| `qubitCountProperty` | `ReadOnlyProperty<number>` | 1–MAX_QUBITS wires |
| `selectedToolProperty` | `Property<SelectedTool>` | active palette tool (gate, control, eraser) |
| `circuitProperty` | `ReadOnlyProperty<CircuitCell[][]>` | 2-D grid; mutate via model methods only |
| `stateVectorProperty` | derived | complex amplitudes, length 2ⁿ |
| `probabilitiesProperty` | derived | \|αₖ\|² per basis state |
| `blochVectorsProperty` | derived | per-qubit reduced Bloch vector (length < 1 ⇒ entangled) |
| `inspectStepProperty` | `Property<number \| null>` | step-through inspect cursor (excluded from undo/URL) |
| `canUndoProperty` / `canRedoProperty` | derived | history availability |

### Simulation rules & numerics

- **Endianness:** qubit 0 = LSB; basis index `i` has bit `q` set iff `(i >> q) & 1`. Kets display big-endian `|q_{n-1}…q_0⟩`.
- Gates apply column-by-column; multiple controls in one column → Toffoli (CCX). **No controlled-SWAP (Fredkin).**
- **Measure** samples histogram from \|αₖ\|² but does **not** collapse mid-circuit state.
- CPU-only statevector (no WebGL sim); no density matrix.

## Accessibility

Follows the shared [OpenPhysics accessibility convention](https://github.com/OpenPhysics/Baton/blob/main/ACCESSIBILITY.md).
`CircuitScreenView` registers `CircuitScreenSummaryContent` (live current-details: qubit count)
via the `screenSummaryContent` super-option, and orders the PDOM through a wrapper `Node`. A11y
strings live under the top-level `a11y` key in each locale JSON, via `StringManager.getA11yStrings()`.

## Compliance carve-outs

- **Hardcoded colors:** any remaining non-profile fills are limited to matrix/tooltip debugging chrome; prefer `QubitSketchColors` for new UI.

## Testing

Fleet-standard Vitest layout:

| Path | Purpose |
|---|---|
| `vitest.config.ts` | `happy-dom` environment, `setupFiles`, `execArgv: ["--expose-gc"]` |
| `tests/setup.ts` | Canvas / AudioContext mocks + `init({ name: "…" })` before SceneryStack imports |
| `tests/**/*.test.ts` | Model/physics unit tests |
| `tests/memory-leak.test.ts` | WeakRef + `forceGC` dispose regression (fleet pattern) |

Actual specs:

- `tests/memory-leak.test.ts` (covers `GatePalettePanel.dispose()` — palette drag previews and tooltips link global color Properties)

Run `npm test`. CI runs the suite when a `test` script is present.

## Commands

```bash
npm run lint && npm run check && npm run build
npm test
```

## Development notes

- URL hash `#circuit=…` shares circuits; QASM dialog for export/import (teaching subset). Undo/redo (Ctrl+Z / Ctrl+Y); inspect mode scrubs columns without changing stored circuit.
- **Adding a gate:** key in `GateType.ts` → matrix in `GateMatrices.ts` → color in `QubitSketchColors.ts` → maps in `GateNode.ts` → `ALL_TOOLS` in `GatePalettePanel.ts` → locale JSON + `StringManager.getToolDescriptions()`.
- Non-goals: arithmetic/QFT/Grover gates; time-animated gates; mid-circuit collapsing measurement; one target gate per column when controls present.
