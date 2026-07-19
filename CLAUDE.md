# CLAUDE.md — QubitSketch

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenPhysics/.github/CLAUDE.md](https://github.com/OpenPhysics/.github/blob/main/CLAUDE.md).

## Project

Drag-and-drop quantum circuit builder with live CPU statevector simulation (≤ 5 qubits). Pedagogical reimplementation of [Quirk](https://github.com/Strilanc/Quirk)'s core. See `README.md` for feature list and scope limits vs Quirk.

## Key files

| File | Purpose |
|---|---|
| `src/QubitSketchConstants.ts` | Sim-wide layout constants (margins, control sizes, canvas dimensions) |
| `src/circuit-screen/model/GateType.ts` | Gate types + discriminated-union `CircuitCell` |
| `src/circuit-screen/model/GateMatrices.ts` | 2×2 unitaries + `rotationMatrix(axis, θ)` |
| `src/circuit-screen/model/QuantumSimulator.ts` | Pure statevector engine (no Scenery deps) |
| `src/circuit-screen/model/QubitSketchModel.ts` | Circuit state, undo/redo, inspect step, derived properties |
| `src/circuit-screen/model/{CircuitSerializer,CircuitUrlSync,QasmSerializer}.ts` | URL hash + OpenQASM 2.0 import/export |
| `src/circuit-screen/view/CircuitCanvas.ts` | Grid, connectors, click/drag placement |
| `src/circuit-screen/view/GatePalettePanel.ts` | Palette + drag-to-place |
| `src/circuit-screen/view/BlochSpheresNode.ts` | Drag-rotate 3D Bloch display |

## Supported gates

H, X, Y, Z, S, T, S†, T†, √X, Rx/Ry/Rz, control (•), anti-control (◦), swap (✕). Multiple controls in one column → Toffoli (CCX). **No controlled-SWAP (Fredkin).**

## Interaction model

- Drag or click-to-place; eraser clears slots; rotation gate opens angle slider
- Undo/redo (Ctrl+Z / Ctrl+Y); step-through inspect (◀/▶/Live) scrubs `inspectStepProperty`
- URL hash `#circuit=…` shares circuits; QASM dialog for export/import (teaching subset)
- **Measure** samples histogram only — does not collapse mid-circuit state

## Endianness

Qubit 0 = LSB: basis index `i` has bit `q` set iff `(i >> q) & 1`. Kets display big-endian `|q_{n-1}…q_0⟩`.

## Adding a gate

1. Key in `GateType.ts` → matrix in `GateMatrices.ts` → color in `QubitSketchColors.ts`
2. `GATE_COLOR_MAP` + `GATE_LABEL_MAP` in `GateNode.ts`
3. Add to `ALL_TOOLS` in `GatePalettePanel.ts`
4. Description in locale JSON + `StringManager.getToolDescriptions()`

## Accessibility

Follows the shared [OpenPhysics accessibility convention](https://github.com/OpenPhysics/Baton/blob/main/ACCESSIBILITY.md).
`CircuitScreenView` registers `CircuitScreenSummaryContent` (live current-details: qubit count)
via the `screenSummaryContent` super-option, and orders the PDOM through a wrapper `Node`. A11y
strings live under the top-level `a11y` key in each locale JSON, via `StringManager.getA11yStrings()`.

## Testing

Fleet-standard Vitest layout:

| Path | Purpose |
|---|---|
| `vitest.config.ts` | Test environment + `setupFiles` when present; `execArgv: ["--expose-gc"]` with memory-leak suite |
| `tests/setup.ts` | Canvas / AudioContext mocks + `init({ name: "…" })` before SceneryStack imports (when required) |
| `tests/**/*.test.ts` | Model/physics unit tests — mirror `src/` under `tests/` |
| `tests/memory-leak.test.ts` | WeakRef + `forceGC` dispose regression (fleet pattern) |

- Put unit tests only under root `tests/` (never co-locate or use `__tests__/`).
- Run `npm test`. CI runs the suite when a `test` script is present.
- Expand `memory-leak.test.ts` for components that add/remove nodes or link Properties at runtime (see OpticsLab).

## Disposal and leak tests

`GatePalettePanel.dispose()` is required when tearing down the palette: it unlinks `selectedToolProperty`, disposes drag listeners, and depth-first disposes children (drag previews and tooltips link to global color Properties). `tests/memory-leak.test.ts` verifies collectibility after dispose via `WeakRef` + forced GC — use it as the template for any future dynamic view nodes.

## Non-goals

CPU only (no WebGL sim); no arithmetic/QFT/Grover gates; no time-animated gates; no density matrix; no mid-circuit collapsing measurement; one target gate per column when controls present.
