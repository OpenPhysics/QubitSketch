# CLAUDE.md — QubitSketch

## Project: QubitSketch

A drag-and-drop quantum circuit builder built with [SceneryStack](https://scenerystack.org/).
Users select quantum gates from a palette and place them on qubit wires to compose circuits.

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
| `src/circuit-screen/model/GateType.ts` | Gate type const-enum, CircuitCell, SelectedTool types |
| `src/circuit-screen/model/QubitSketchModel.ts` | Circuit state, toggle/set/clear operations |
| `src/circuit-screen/view/CircuitScreenView.ts` | Top-level view, layout orchestration |
| `src/circuit-screen/view/CircuitCanvas.ts` | Qubit wires + gate slot grid + click-to-place |
| `src/circuit-screen/view/GatePalettePanel.ts` | Gate selection palette with active highlight |
| `src/circuit-screen/view/GateNode.ts` | Colored rectangle + label for a single gate |

## Supported Gates

| Gate | Symbol | Meaning |
|---|---|---|
| Hadamard | H | Creates equal superposition |
| Pauli-X | X | Quantum NOT: \|0⟩↔\|1⟩ |
| Pauli-Y | Y | Combined bit + phase flip |
| Pauli-Z | Z | Phase flip: \|1⟩→-\|1⟩ |
| Phase | S | Adds π/2 phase to \|1⟩ |
| T gate | T | Adds π/4 phase to \|1⟩ |

## Interaction Model

- **Select gate**: click a gate button in the left palette → highlights active tool
- **Place gate**: click any circuit slot → places the selected gate
- **Toggle**: clicking a slot occupied by the *same* gate removes it
- **Eraser**: select the ✕ tool, then click any slot to clear it
- **Qubit count**: use +/− buttons above the circuit (1–5 qubits)
- **Reset All**: clears the circuit and resets all controls to defaults

## Extending

### Adding a new gate type
1. Add the key to `GateType` in `src/circuit-screen/model/GateType.ts`
2. Add a `ProfileColorProperty` entry to `src/QubitSketchColors.ts`
3. Add the color mapping to `GATE_COLOR_MAP` in `src/circuit-screen/view/GateNode.ts`
4. Add the gate to `ALL_TOOLS` in `src/circuit-screen/view/GatePalettePanel.ts`

### Adding CNOT / two-qubit gates
The current model uses a 1-D `CircuitCell` (single gate per slot). Two-qubit gates
require storing a control qubit reference. Extend `CircuitCell` to a discriminated
union type before adding CNOT/SWAP/CZ support.

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
