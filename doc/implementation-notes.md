# Implementation Notes - QubitSketch Simulation

## Architecture Overview

QubitSketch is a single-screen quantum circuit builder and statevector simulator. It is a pedagogical SceneryStack reimplementation inspired by Craig Gidney's Quirk, with a CPU-only pure statevector engine (no WebGL).

### High-Level Architecture

The simulation follows a modular architecture:

- **Model Layer (`src/circuit-screen/model/`)**: Circuit grid, quantum simulation, serialization, and undo/redo
- **View Layer (`src/circuit-screen/view/`)**: Gate palette, circuit canvas, simulation readouts, and QASM dialog

`QuantumSimulator.ts` has no Scenery dependencies and can be tested in isolation. `QubitSketchModel` uses `DerivedProperty` for live simulation outputs.

### Coordinate System

The circuit uses a fixed virtual canvas (`CIRCUIT_CANVAS_WIDTH` × `CIRCUIT_CANVAS_HEIGHT` in `CircuitCanvas.ts`) with grid-based placement rather than physical model-view units. Sim-wide layout spacing (margins, qubit-count control sizes) lives in `src/QubitSketchConstants.ts`.

## Model Components

### Core Model Design

`QubitSketchModel` owns the circuit grid, tool selection, inspect step, and undo/redo stack.

### Component Specialization

Each model component has a single responsibility:

1. **QuantumSimulator**: `simulate()` and `computeBlochVectors()` — statevector engine for ≤ 5 qubits
2. **GateType.ts**: Gate types and discriminated-union `CircuitCell` definitions
3. **GateMatrices.ts**: 2×2 unitaries and `rotationMatrix(axis, θ)`
4. **CircuitSerializer** / **CircuitUrlSync**: URL `#circuit=…` encoding and decoding
5. **QasmSerializer**: OpenQASM 2.0 import/export subset
6. **CircuitPresets**: Example circuits

Derived properties include `stateVectorProperty`, `probabilitiesProperty`, `blochVectorsProperty`, and `circuitDepthProperty`.

### Simulation Approach

- Endianness: qubit 0 is the LSB; kets display in big-endian notation
- Inspect mode scrubs `inspectStepProperty` without affecting undo or URL state
- Measurement samples a histogram only — there is no mid-circuit collapse
- Undo/redo uses immutable circuit snapshots

Colors for gates are mapped in `GateNode.ts` via `GATE_COLOR_MAP` from `QubitSketchColors.ts`.

## View Components

### CircuitScreenView as Coordinator

The screen view assembles the gate palette, circuit canvas, simulation panel, and bottom controls.

Specialized view classes handle specific aspects:

1. **CircuitCanvas**: Grid, connectors, drag/click gate placement
2. **GatePalettePanel**: Tool palette for gate selection
3. **SimulationPanel**: Probabilities, amplitudes, Bloch spheres, measurement histogram
4. **BlochSpheresNode**, **BlochSphereNode**: Drag-rotate 3D Bloch display
5. **InspectControlNode**: Step-through circuit inspect (◀ / ▶ / Live)
6. **QasmDialog**: QASM export and import
7. **GateInspectorNode**: Rotation angle slider for Rx/Ry/Rz gates
8. **ExampleCircuitsComboBox**: Preset circuit loader

Phase visualization uses `twilightColormap.ts`.

### Color Scheme

Gate and UI colors live in `QubitSketchColors.ts`. Phase and amplitude displays should use the shared colormap utilities rather than ad hoc RGB values.

### Performance Optimizations

- Simulation is capped at five qubits to keep statevector size manageable
- Derived properties recompute only when circuit or inspect step changes

The legacy `Quirk/` subfolder is upstream reference material, not part of the active sim.

### Disposal and memory-leak regression

`GatePalettePanel` is the only view that adds/removes nodes at runtime (drag previews, hover tooltips) and links to the shared model's `selectedToolProperty`. Its `dispose()` unlinks that listener, disposes drag listeners, and depth-first disposes the child subtree so global `QubitSketchColors` Properties are not retained.

`tests/memory-leak.test.ts` exercises this pattern: allocate panel + model under a function boundary, call `dispose()`, force GC (`--expose-gc` via vitest config), and assert collectibility via `WeakRef`. Follow this pattern when adding other dynamic view nodes.
