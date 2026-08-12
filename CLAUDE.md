# CLAUDE.md — QubitSketch

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenPhysics/.github/CLAUDE.md](https://github.com/OpenPhysics/.github/blob/main/CLAUDE.md).

## Project

Drag-and-drop **quantum circuit builder** with live CPU statevector simulation (≤ 5 qubits). Pedagogical reimplementation of [Quirk](https://github.com/Strilanc/Quirk)'s core (local checkout: `../Baseline/Qubit/Quirk`) — superposition, entanglement, and unitary gates on a grid of qubit wires.

Physics for educators: `doc/model.md`. Architecture: `doc/implementation-notes.md`.

## Key files

| Area | Location |
|---|---|
| Screen | `src/circuit-screen/CircuitScreen.ts` |
| Model | `model/QubitSketchModel.ts`, `QuantumSimulator.ts` (pure engine), `GateType.ts`, `GateMatrices.ts`, `CircuitGrid.ts`, `ColumnRules.ts`, `CircuitSerializer.ts`, `CircuitUrlSync.ts`, `QasmSerializer.ts` (barrel over `QasmExport/Import/Mappings/Angle.ts`) |
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
- **Legal column shapes live in `ColumnRules.ts`** (`isApplicableColumn`), checked by the placement guards, `CircuitSerializer.deserialize`, and the QASM packer. Guards scan **all** `MAX_QUBITS` rows, not just visible ones, so hiding a wire cannot smuggle in a column whose gates get dropped later. Change it in the same commit as `applyColumn`.
- **Measure** samples histogram from \|αₖ\|² but does **not** collapse mid-circuit state.
- CPU-only statevector (no WebGL sim); no density matrix.

## Accessibility

Follows the shared [OpenPhysics accessibility convention](https://github.com/OpenPhysics/Baton/blob/main/ACCESSIBILITY.md).
`CircuitScreenView` registers `CircuitScreenSummaryContent` (live current-details: qubit count)
via the `screenSummaryContent` super-option, and orders the PDOM through a wrapper `Node`. A11y
strings live under the top-level `a11y` key in each locale JSON, via `StringManager.getA11yStrings()`.

## Compliance carve-outs

- **Hardcoded colors:** any remaining non-profile fills are limited to matrix/tooltip debugging chrome; prefer `QubitSketchColors` for new UI.


### `package.json` overrides

JSON cannot carry comments, so the rationale for forced transitive pins lives here. Prefer
**tilde (`~`) or exact** versions — caret (`^`) lets minors drift under what is meant to be a
hard pin. Dependabot ignores these three names (see `.github/dependabot.yml`) so it does not
open PRs that fight the overrides. Revisit when SceneryStack drops or re-pins them upstream.

| Override | Pin | Why |
|---|---|---|
| `lodash` | `~4.18.1` | SceneryStack declares `~4.17.12`. Bump clears Dependabot/npm advisories patched in 4.18.x (e.g. GHSA-r5fr-rjxr-66jc, GHSA-f23m-r3pf-42rh). |
| `three` | `~0.125.2` | SceneryStack declares `^0.104.0`. Floor is 0.125.0 for GHSA-fq6p-x6j3-cmmq (ReDoS). Staying on the 0.125 line avoids a larger API jump; **0.125.x still has open CVEs** (e.g. XSS GHSA-7vvq-7r29-5vg3, fixed only in ≥0.137.0). Remove this override if/when SceneryStack stops depending on `three` or pins a patched line itself. LightPropagation keeps a higher `three` pin — do not force 0.125 there. |
| `brace-expansion` | `~5.0.9` | Transitive via `vite-plugin-pwa` / Workbox. Clears npm audit (originally GHSA-mh99-v99m-4gvg; keep ≥5.0.9 for GHSA-rgw5-rvv9-x895). |

## Testing

Fleet-standard Vitest layout:

| Path | Purpose |
|---|---|
| `vitest.config.ts` | `happy-dom` environment, `setupFiles`, `execArgv: ["--expose-gc"]` |
| `tests/setup.ts` | Canvas / AudioContext mocks + `init({ name: "…" })` before SceneryStack imports |
| `tests/**/*.test.ts` | Model/physics unit tests |
| `tests/memory-leak.test.ts` | WeakRef + `forceGC` dispose regression (fleet pattern) |

Actual specs:

- `tests/quantum-simulator.test.ts` — physics engine (gates, controls, SWAP, Bloch vectors, inspect prefix)
- `tests/serializers.test.ts` — URL + QASM round-trips, import column packing, malformed-input tolerance, angle-expression parsing (scientific notation, nested parens, garbage rejection)
- `tests/qubit-sketch-model.test.ts` — placement guards (column shapes), undo/redo history
- `tests/column-rules.test.ts` — the shared legality predicate + all three writers; includes a 4000-edit editor fuzz asserting the invariant holds over the whole grid after every reachable edit
- `tests/display-utils.test.ts` — amplitude/phase formatting (consistent U+2212 minus, no negative zero)
- `tests/memory-leak.test.ts` (covers `GatePalettePanel.dispose()` — palette drag previews and tooltips link global color Properties)
- Shared grid/cell builders live in `tests/helpers.ts`

Run `npm test`. CI runs the suite when a `test` script is present.

## Commands

```bash
npm run lint && npm run check && npm run build
npm test
```

`npm run release` intentionally skips `npm test` in some sims — append `&& npm test` before the version bump so a release cannot ship a failing suite.

## Development notes

- URL hash `#circuit=…` shares circuits; QASM dialog for export/import (teaching subset). Undo/redo (Ctrl+Z / Ctrl+Y); inspect mode scrubs columns without changing stored circuit.
- **Adding a gate:** key in `GateType.ts` → matrix in `GateMatrices.ts` → color in `QubitSketchColors.ts` → maps in `GateNode.ts` → `ALL_TOOLS` in `GatePalettePanel.ts` → locale JSON + `StringManager.getToolDescriptions()`.
- Non-goals: arithmetic/QFT/Grover gates; time-animated gates; mid-circuit collapsing measurement; one target gate per column when controls present.
