# QubitSketch

A drag-and-drop quantum circuit builder **with a live state simulator**, built with
[SceneryStack](https://scenerystack.org/). Place quantum gates on qubit wires and watch the
quantum state update in real time — probabilities, amplitudes, Bloch spheres, and sampled
measurements. Inspired by [Quirk](https://github.com/Strilanc/Quirk), reimplemented
idiomatically in SceneryStack for teaching.

## Features

- **Build circuits** by dragging gates from the palette onto the grid, or by selecting a tool
  and clicking a slot. Gates: **H, X, Y, Z, S, T, S†, T†, √X**, plus parametrized rotations
  **Rx/Ry/Rz** (place one and drag the angle slider beneath the circuit).
- **Controls, CNOT & SWAP**: drop a control dot (•) — or an anti-control (◦, conditions on |0⟩) —
  in a column to make that column's gate controlled. Two control dots make a Toffoli (CCX).
  Two SWAP endpoints (✕) in a column exchange those qubits. This is how you create **entanglement**.
- **Hover any palette gate** to see its 2×2 unitary matrix and a one-line description.
- **Undo / redo** every edit (toolbar buttons or Ctrl+Z / Ctrl+Y).
- **Shareable links**: the circuit is encoded in the URL (`#circuit=…`), so copying the address
  bar shares the exact circuit.
- **Live simulation** (CPU statevector, ≤ 5 qubits) recomputes on every edit and drives four
  displays:
  - **Probabilities** — measurement probability `|amplitude|²` per basis state.
  - **Amplitudes** — the complex amplitude, magnitude, and phase per basis state.
  - **Bloch spheres** — one large, **drag-to-rotate 3D** sphere for the focused qubit (click a
    thumbnail to change focus) plus a per-qubit thumbnail row, all sharing one camera. Under
    entanglement the arrow shrinks toward the center (the reduced state is mixed).
  - **Measurement** — a *Measure* button samples one outcome from the distribution and
    tallies a histogram; with many shots it approaches the probability bars.

### Try this: a Bell state

Drag **H** onto q0, a **control** onto q0 in the next column, and **X** onto q1 in that same
column. The probabilities collapse to 50% `|00⟩` and 50% `|11⟩`, and both Bloch arrows
shrink to dots — the two qubits are entangled.

## Conventions

- **Endianness**: qubit 0 is the *least-significant* bit. Basis index `i` has qubit `q` set
  iff `(i >> q) & 1`. Kets are displayed big-endian, `|q_{n-1} … q_1 q_0⟩`.

## Limitations (vs Quirk)

This is a teaching tool focused on the core of quantum computing (superposition, phase,
interference, entanglement, measurement). It deliberately omits Quirk's advanced machinery:

- **CPU statevector only**, capped at **5 qubits** (32 amplitudes). No WebGL/GPU engine.
- **No arithmetic / modular / increment / QFT / Grover / phase-estimation gates.**
- **Parametrized rotations are static** (an angle you set with a slider). There is **no time
  animation** (no continuously spinning `X^t`).
- **No density-matrix display.** A qubit's mixedness is conveyed only by its shortened Bloch
  arrow.
- **The Bloch sphere is an orthographic 3D projection** drawn with vector graphics — a
  drag-rotatable camera (azimuth + elevation), depth-faded arrow, and front/back wireframe,
  but no GPU lighting/perspective.
- **No custom/composite-gate editor** ("forge") and no gate grouping. (Circuits *are* shareable
  via the URL hash, but there is no JSON import/export UI.)
- **Controls act only within their own column**, and there is **one target gate per column**
  when controls are present. Multiple control dots in a column *do* work (Toffoli/CCX).
  **Controlled-SWAP (Fredkin) is not supported** — SWAP and controls don't combine in one column.
- **Measurement does not collapse the circuit.** The *Measure* button samples the final
  statevector for the histogram only; there is no mid-circuit measurement affecting later
  columns.

## Architecture

```
src/circuit-screen/
  model/
    GateType.ts          discriminated-union CircuitCell (gate/control/antiControl/swap/
                         controlledTarget/paramGate), gate/tool types, endianness note
    GateMatrices.ts      2×2 complex matrices for the gates + rotationMatrix(axis, θ)
    QuantumSimulator.ts  statevector engine: applyControlledGate (on/off controls), applySwap,
                         cellMatrix, applyColumn, simulate, computeBlochVectors
    QubitSketchModel.ts  circuit state + DerivedProperty chain (state → probs/bloch),
                         undo/redo history, selected-cell (rotation) state
    CircuitSerializer.ts circuit ↔ compact string for shareable URLs
    CircuitUrlSync.ts    two-way sync between the circuit and the URL hash
  view/
    CircuitCanvas.ts     grid, control/swap connectors, click-to-place, slotIndexAt, selection ring
    GatePalettePanel.ts  2-column palette + drag-to-place (DragListener) + hover matrix tooltips
    GateNode.ts          gate visual + RotationGateNode (Rx/Ry/Rz)
    GateInspectorNode.ts angle slider for the selected rotation gate
    MatrixTooltipNode.ts hover tooltip showing a gate's 2×2 matrix
    SimulationPanel.ts   hosts the four display nodes (sun.Panel)
    ProbabilityBarsNode.ts  AmplitudeTableNode.ts
    BlochSpheresNode.ts  big sphere + thumbnail strip + shared drag-rotate camera
    BlochSphereNode.ts   one orthographically-projected 3D sphere (ball, wireframe, arrow)
    MeasurementHistogramNode.ts  displayUtils.ts
```

The simulator is pure (no SceneryStack `Node`/`Property` deps); the model exposes
`stateVectorProperty`, `probabilitiesProperty`, and `blochVectorsProperty` as chained
`DerivedProperty`s so each display links only to the slice it needs and updates automatically.

## Quick Start

```bash
npm install
npm run icons    # generate PNG icons from public/icons/icon.svg
npm start        # dev server → http://localhost:5173
```

## Scripts

| Command | Description |
|---|---|
| `npm start` / `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build → `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run check` | TypeScript type check |
| `npm run lint` | Biome lint check |
| `npm run format` | Auto-format all files |
| `npm run fix` | Lint + auto-fix |
| `npm run icons` | Regenerate PWA icons from `public/icons/icon.svg` |
| `npm run clean` | Remove `dist/` |

## Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| [SceneryStack](https://scenerystack.org/) | ^3.0.0 | Simulation framework |
| [Vite](https://vitejs.dev/) | ^8 | Build tool + dev server |
| [TypeScript](https://www.typescriptlang.org/) | ^6 | Type-safe JavaScript |
| [Biome](https://biomejs.dev/) | ^2.4 | Linting + formatting |
| [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) | ^1 | PWA + service worker |

## License

MIT

## Contributing

See [OpenPhysics contributing guidelines](https://github.com/OpenPhysics/.github/blob/main/CONTRIBUTING.md).
Report bugs via GitHub Issues; use org issue templates.
