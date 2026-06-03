# CLAUDE.md — QubitSketch

## Project: QubitSketch

A drag-and-drop quantum circuit builder **with a live CPU statevector simulator**, built with
[SceneryStack](https://scenerystack.org/). Users place quantum gates on qubit wires and the
quantum state is simulated and displayed in real time (probabilities, amplitudes, Bloch
spheres, sampled measurements). Pedagogical reimplementation of [Quirk](https://github.com/Strilanc/Quirk)'s
core. See `README.md` for the full feature list and the **Limitations (vs Quirk)** scope.

## Tech Stack

| Tool | Version | Notes |
|---|---|---|
| SceneryStack | ^3.0.0 | Simulation framework (PhET-derived) |
| Vite | ^8 | Build tool and dev server |
| TypeScript | ^6 | `erasableSyntaxOnly` — no `enum` or `namespace` |
| Biome | ^2.4 | Linting + formatting (not ESLint, not Prettier) |
| vite-plugin-pwa | ^1 | PWA / offline / installable |

## !! Critical: SceneryStack Import Order !!

`src/main.ts` must have `import "./brand.js"` as its **very first import**. This triggers:
```
brand.ts → splash.ts → assert.ts → init.ts
```

## Key Files

| File | Purpose |
|---|---|
| `src/init.ts` | Sim name "qubit-sketch", locales — START of chain |
| `src/main.ts` | Entry point — imports brand.js first |
| `src/QubitSketchColors.ts` | All ProfileColorProperty instances (including per-gate colors) |
| `src/QubitSketchNamespace.ts` | Namespace "qubit-sketch" for scoping color names |
| `src/i18n/StringManager.ts` | Typed localized string access (singleton) |
| `src/circuit-screen/CircuitScreen.ts` | Screen wrapper |
| `src/circuit-screen/model/GateType.ts` | `GateType` const-enum + **discriminated-union `CircuitCell`** (empty/gate/control/antiControl/controlledTarget/swap/paramGate), `SelectedTool`, `RotationTool`/`RotationAxis`, `isAnyControl`, endianness note |
| `src/circuit-screen/model/GateMatrices.ts` | 2×2 complex unitaries per gate + `rotationMatrix(axis, θ)` (`scenerystack/dot` `Complex`) |
| `src/circuit-screen/model/QuantumSimulator.ts` | Pure statevector engine: `applyControlledGate` (on/off controls), `applySwap`, `cellMatrix`, `applyColumn`, `simulate`, `computeBlochVectors` |
| `src/circuit-screen/model/QubitSketchModel.ts` | Circuit state + `placeCell`/`removeCell`/`setCircuit`/`setCellTheta` + undo/redo history + `selectedCellProperty` + `DerivedProperty` chain (`stateVectorProperty` → `probabilitiesProperty`/`blochVectorsProperty`) |
| `src/circuit-screen/model/{CircuitSerializer,CircuitUrlSync}.ts` | Circuit ↔ compact string; two-way URL-hash sync (shareable links) |
| `src/circuit-screen/view/CircuitScreenView.ts` | Top-level view, 3-column layout, drag/tooltip layers, undo/redo buttons + keyboard, inspector mount |
| `src/circuit-screen/view/CircuitCanvas.ts` | Qubit wires, control/swap connectors, click-to-place, `slotIndexAt` (drop hit-test), rotation selection ring |
| `src/circuit-screen/view/GatePalettePanel.ts` | 2-column gate/control/swap/rotation/eraser palette; **drag-to-place** via `DragListener`; hover matrix tooltips |
| `src/circuit-screen/view/GateNode.ts` | Colored rectangle + label for a single gate (`GATE_LABEL_MAP`); `RotationGateNode` for Rx/Ry/Rz |
| `src/circuit-screen/view/{GateInspectorNode,MatrixTooltipNode}.ts` | Rotation-angle slider; hover 2×2-matrix tooltip |
| `src/circuit-screen/view/SimulationPanel.ts` | Right-side `sun.Panel` hosting the four state displays |
| `src/circuit-screen/view/{ProbabilityBarsNode,AmplitudeTableNode,MeasurementHistogramNode}.ts` | Three of the four live displays |
| `src/circuit-screen/view/BlochSpheresNode.ts` | Bloch display: one large **drag-to-rotate 3D** sphere for the focused qubit + a clickable per-qubit thumbnail row; owns the shared camera (azimuth/elevation) + focus state |
| `src/circuit-screen/view/BlochSphereNode.ts` | One reusable Bloch sphere: orthographic 3D projection (shaded ball, front/back equator + axes wireframe, depth-faded state arrow); presentation-only `render(vector, azimuth, elevation)` |
| `src/circuit-screen/view/displayUtils.ts` | Ket label + complex/phase formatting helpers |

## Supported Gates

| Gate | Symbol | Meaning |
|---|---|---|
| Hadamard | H | Creates equal superposition |
| Pauli-X | X | Quantum NOT: \|0⟩↔\|1⟩ |
| Pauli-Y | Y | Combined bit + phase flip |
| Pauli-Z | Z | Phase flip: \|1⟩→-\|1⟩ |
| Phase | S | Adds π/2 phase to \|1⟩ |
| T gate | T | Adds π/4 phase to \|1⟩ |
| S-dagger | S† (`Sdg`) | Inverse phase: adds −π/2 phase to \|1⟩ |
| T-dagger | T† (`Tdg`) | Inverse T: adds −π/4 phase to \|1⟩ |
| √X | √X (`Vx`) | Square root of NOT (X = √X·√X) |
| Rx/Ry/Rz | Rx/Ry/Rz | Parametrized rotation about X/Y/Z by an angle θ (set via the inspector slider) |
| Control | • | Makes the gate in the same column controlled (CNOT = control + X; CCX = two controls + X) |
| Anti-control | ◦ | Conditions the column's gate on \|0⟩ instead of \|1⟩ |
| Swap | ✕ | Two endpoints in a column exchange those qubits |

## Interaction Model

- **Drag-to-place**: drag a gate/control/swap/rotation from the palette onto any slot (`DragListener`)
- **Click-to-place** (fallback): select a tool, then click a slot
- **Toggle**: clicking a slot occupied by the *same* gate removes it
- **Eraser**: select the ✕ eraser tool, then click any slot to clear it
- **Controls**: a control dot (•) or anti-control (◦) in a column makes that column's gate controlled
- **Swap**: place two swap endpoints (✕) in one column to exchange those wires
- **Rotation angle**: click a placed Rx/Ry/Rz gate to open the angle slider below the circuit
- **Tooltips**: hover a palette gate to see its 2×2 matrix + description
- **Undo/redo**: toolbar ↶/↷ buttons or Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z also redoes)
- **Shareable links**: the circuit is encoded in the URL hash (`#circuit=…`)
- **Qubit count**: use +/− buttons above the circuit (1–5 qubits)
- **Measure**: samples one outcome from the final state into a histogram (does not collapse)
- **Reset All**: clears the circuit, history, and resets all controls to defaults

## Endianness

Qubit 0 is the **least-significant bit**: basis index `i` has qubit `q` set iff `(i>>q)&1`,
so model row `circuit[q]` maps to bit `q`. Kets display big-endian: `|q_{n-1}…q_0⟩`.
Keep simulator and displays consistent with this.

## Extending

### Adding a new gate type
1. Add the (ASCII) key to `GateType` in `src/circuit-screen/model/GateType.ts`
2. Add its 2×2 matrix to `GATE_MATRICES` in `src/circuit-screen/model/GateMatrices.ts`
3. Add a `ProfileColorProperty` entry to `src/QubitSketchColors.ts`
4. Add the color mapping to `GATE_COLOR_MAP` **and** the display glyph to `GATE_LABEL_MAP` in
   `src/circuit-screen/view/GateNode.ts` (the label is decoupled from the key so it can be `S†`, `√X`, …)
5. Add the gate to `ALL_TOOLS` in `src/circuit-screen/view/GatePalettePanel.ts`
   (it becomes controllable automatically when a control/anti-control shares its column)
6. Add a one-line description under `descriptions` in **both** `strings_en.json`/`strings_fr.json`
   and to `getToolDescriptions()` in `StringManager.ts` (drives the hover tooltip)
7. The `CircuitSerializer` token map round-trips `gate`/`controlledTarget` by key automatically; add a
   token only if you introduce a brand-new `CircuitCell` *kind*

### Scope / Non-Goals (vs Quirk)
This is a **teaching** tool. Deliberately not implemented (see `README.md` for the full list):
WebGL/GPU sim (CPU only, **≤5 qubits**); arithmetic/modular/QFT/Grover gates; **time-animated**
gates (parametrized Rx/Ry/Rz *are* supported, but with a static angle — no spinning `X^t`);
density-matrix display; custom-gate forge; JSON import/export UI (circuits *are* shareable via
the URL hash); mid-circuit collapsing measurement. (The Bloch sphere **is** a drag-to-rotate 3D
orthographic projection now — vector graphics, not a GPU-lit/perspective scene.)
**One target gate per column when controls are present** (multiple control dots → Toffoli/CCX is
supported; controlled-SWAP/Fredkin is not).

## Common Commands

```bash
npm start          # dev server (http://localhost:5173)
npm run build      # type-check + production build
npm run fix        # biome auto-fix (format + lint)
npm run check      # tsc type check only
npm run icons      # regenerate PNG icons from icons/icon.svg
```

## Conventions

- No `enum` — use `const X = { ... } as const` (TS6 `erasableSyntaxOnly`)
- `import type` required for type-only imports
- Colors → `QubitSketchColors.ts` only, never hardcoded in view files
- Strings → `strings_en.json` / `strings_fr.json`, never hardcoded in source
- Positioning → `this.layoutBounds` only, never magic pixel values in view
- Formatter: 2-space indent, 120-char line width, double quotes, semicolons always
