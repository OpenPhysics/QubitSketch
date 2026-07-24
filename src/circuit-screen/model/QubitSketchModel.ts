/**
 * QubitSketchModel.ts
 *
 * Top-level model for the quantum circuit builder screen.
 *
 * State:
 *   qubitCountProperty   — number of visible qubit wires (1–MAX_QUBITS)
 *   selectedToolProperty — which tool (gate, control, or eraser) the user has selected
 *   circuitProperty      — the 2-D circuit grid: circuit[qubit][step]
 *
 * Derived (live simulation — see QuantumSimulator.ts):
 *   stateVectorProperty   — Complex amplitudes of length 2^qubitCount
 *   probabilitiesProperty — |amplitude|² per basis state
 *   blochVectorsProperty  — per-qubit reduced Bloch vector (Vector3)
 */
import { BooleanProperty, DerivedProperty, NumberProperty, Property, type ReadOnlyProperty } from "scenerystack/axon";
import type { Complex, Vector3 } from "scenerystack/dot";
import { Range } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import type { QubitSketchPreferencesModel } from "../../preferences/QubitSketchPreferencesModel.js";
import type { ColumnShape, Grid } from "./CircuitGrid.js";
import { cellAt, classifyColumn, columnHasControl, emptyGrid, withCell } from "./CircuitGrid.js";
import type { CircuitCell, GateType, SelectedTool } from "./GateType.js";
import {
  cellsEqual,
  DEFAULT_QUBITS,
  EMPTY_CELL,
  MAX_QUBITS,
  MIN_QUBITS,
  NUM_STEPS,
  ROTATION_TOOL_AXIS,
} from "./GateType.js";
import { computeBlochVectors, simulate } from "./QuantumSimulator.js";

/** A position in the circuit grid. */
export type GridPosition = { readonly qubit: number; readonly step: number };

/** A point-in-time circuit state for undo/redo. The grid is immutable, so this is a cheap reference. */
type CircuitSnapshot = { readonly circuit: Grid; readonly qubitCount: number };

export class QubitSketchModel implements TModel {
  /** Backing store for the qubit count; its initial value is injected via the constructor. */
  private readonly _qubitCountProperty: NumberProperty;

  /** Number of visible qubit wires (1–MAX_QUBITS). Mutate via setQubitCount/loadCircuit/reset. */
  public readonly qubitCountProperty: ReadOnlyProperty<number>;

  public readonly selectedToolProperty: Property<SelectedTool> = new Property<SelectedTool>("H");

  /** The parametrized-rotation cell currently being edited (drives the angle inspector), or null. */
  public readonly selectedCellProperty: Property<GridPosition | null> = new Property<GridPosition | null>(null);

  /**
   * Step-through "inspect" cursor: the number of circuit columns applied when showing the
   * intermediate state (0 = initial |0…0⟩, NUM_STEPS = full circuit). `null` means inspect is
   * off and the displays show the final state. This is transient view state — it is deliberately
   * excluded from undo/redo and from the URL hash.
   */
  private readonly _inspectStepProperty = new Property<number | null>(null);
  public readonly inspectStepProperty: ReadOnlyProperty<number | null> = this._inspectStepProperty;

  /** Backing store for the circuit grid; mutated only through this model's methods. */
  private readonly _circuitProperty: Property<Grid>;

  /** circuit[qubitIndex][stepIndex] — read-only; mutate via placeCell/loadCircuit/undo/redo/etc. */
  public readonly circuitProperty: ReadOnlyProperty<Grid>;

  /** Live statevector — recomputed whenever the circuit or qubit count changes. */
  public readonly stateVectorProperty: ReadOnlyProperty<Complex[]>;

  /** Measurement probability of each computational basis state. */
  public readonly probabilitiesProperty: ReadOnlyProperty<number[]>;

  /** Per-qubit reduced Bloch vector (length < 1 ⇒ mixed/entangled). */
  public readonly blochVectorsProperty: ReadOnlyProperty<Vector3[]>;

  /** Number of occupied columns (highest non-empty step + 1; 0 if empty) — the inspect range. */
  public readonly circuitDepthProperty: ReadOnlyProperty<number>;

  /** Whether there is undo/redo history available (drives toolbar button enablement). */
  private readonly _canUndoProperty = new BooleanProperty(false);
  private readonly _canRedoProperty = new BooleanProperty(false);
  public readonly canUndoProperty: ReadOnlyProperty<boolean> = this._canUndoProperty;
  public readonly canRedoProperty: ReadOnlyProperty<boolean> = this._canRedoProperty;

  private readonly past: CircuitSnapshot[] = [];
  private readonly future: CircuitSnapshot[] = [];
  /** True while undo/redo is re-applying a snapshot, so those changes do not push new history. */
  private applyingHistory = false;
  /** Coalesces consecutive edits sharing this key (e.g. a slider drag) into one history entry. */
  private lastHistoryKey: string | null = null;
  private static readonly MAX_HISTORY = 100;

  private readonly preferences: QubitSketchPreferencesModel | undefined;

  public constructor(preferences?: QubitSketchPreferencesModel) {
    this.preferences = preferences;
    // The initial qubit count comes from the injected preferences model (whose own initial value
    // derives from the ?qubits= query parameter), or the plain default when constructed without one.
    this._qubitCountProperty = new NumberProperty(preferences?.qubitCountProperty.value ?? DEFAULT_QUBITS, {
      range: new Range(MIN_QUBITS, MAX_QUBITS),
      numberType: "Integer",
    });
    this.qubitCountProperty = this._qubitCountProperty;

    this._circuitProperty = new Property<Grid>(emptyGrid());
    this.circuitProperty = this._circuitProperty;

    this.stateVectorProperty = new DerivedProperty(
      [this.circuitProperty, this.qubitCountProperty, this.inspectStepProperty],
      (circuit, n, inspectStep) => simulate(circuit, n, inspectStep ?? NUM_STEPS),
    );

    this.probabilitiesProperty = new DerivedProperty([this.stateVectorProperty], (state) =>
      state.map((amp) => amp.magnitudeSquared),
    );

    this.blochVectorsProperty = new DerivedProperty([this.stateVectorProperty, this.qubitCountProperty], (state, n) =>
      computeBlochVectors(state, n),
    );

    // Scans only the visible rows (0…n−1) so hidden-row content the simulator ignores does not
    // inflate the inspect range.
    this.circuitDepthProperty = new DerivedProperty([this.circuitProperty, this.qubitCountProperty], (circuit, n) => {
      let depth = 0;
      for (let q = 0; q < n; q++) {
        for (let s = NUM_STEPS - 1; s >= depth; s--) {
          if (cellAt(circuit, q, s).kind !== "empty") {
            depth = s + 1;
            break;
          }
        }
      }
      return depth;
    });

    // Deselect the angle inspector if its qubit row is hidden by a smaller qubit count.
    this.qubitCountProperty.lazyLink((count) => {
      const sel = this.selectedCellProperty.value;
      if (sel !== null && sel.qubit >= count) {
        this.selectedCellProperty.value = null;
      }
    });
  }

  /** Rounds and clamps a requested qubit count into the supported [MIN_QUBITS, MAX_QUBITS] range. */
  private static clampQubitCount(count: number): number {
    return Math.max(MIN_QUBITS, Math.min(MAX_QUBITS, Math.round(count)));
  }

  /**
   * The {@link ColumnShape} of a column's VISIBLE rows with `exceptQubit` excluded — i.e. what else
   * already occupies the column the placement guards are testing. Hidden rows (q ≥ qubitCount) are
   * excluded to match the simulator, which ignores them.
   */
  private columnShapeExcept(stepIndex: number, exceptQubit: number): ColumnShape {
    const shape = classifyColumn(this.circuitProperty.value, stepIndex, this.qubitCountProperty.value);
    const without = (wires: number[]): number[] => wires.filter((q) => q !== exceptQubit);
    return {
      onControls: without(shape.onControls),
      offControls: without(shape.offControls),
      swapWires: without(shape.swapWires),
      gateWires: without(shape.gateWires),
    };
  }

  /**
   * True if a gate-bearing cell may be placed at the position — refused when the column already
   * holds a SWAP endpoint or is a controlled column with its (single) target taken. Both would
   * otherwise place a gate the simulator silently ignores under the v1 column rules.
   */
  private canPlaceGate(qubitIndex: number, stepIndex: number): boolean {
    const shape = this.columnShapeExcept(stepIndex, qubitIndex);
    if (shape.swapWires.length > 0) {
      return false;
    }
    return !(columnHasControl(shape) && shape.gateWires.length > 0);
  }

  /**
   * Computes the cell a control/swap marker tool would leave, or null if the placement is refused.
   * Clicking the marker's own cell clears it (toggle).
   */
  private nextMarkerCell(
    tool: "control" | "antiControl" | "swap",
    current: CircuitCell,
    qubitIndex: number,
    stepIndex: number,
  ): CircuitCell | null {
    if (current.kind === tool) {
      return EMPTY_CELL;
    }
    const shape = this.columnShapeExcept(stepIndex, qubitIndex);
    if (tool === "swap") {
      // A column holds at most one SWAP pair, and the pair must have the column to itself.
      const allowed = shape.swapWires.length < 2 && !columnHasControl(shape) && shape.gateWires.length === 0;
      return allowed ? { kind: "swap" } : null;
    }
    // Refused when it would demote all but one gate to dead cells, or condition an unsupported controlled-SWAP.
    const allowed = shape.gateWires.length < 2 && shape.swapWires.length === 0;
    return allowed ? (tool === "control" ? { kind: "control" } : { kind: "antiControl" }) : null;
  }

  /**
   * Computes the cell the active tool would leave at the position, or null if the placement is
   * refused. Each tool toggles: clicking the same tool on a cell it already occupies clears it.
   * Placements the simulator would silently ignore are refused, keeping every column one of the
   * three supported shapes: plain gates only, one controlled operation, or one SWAP pair.
   * Clearing (toggle-off / eraser) is always allowed.
   */
  private nextCellForTool(
    tool: SelectedTool,
    current: CircuitCell,
    qubitIndex: number,
    stepIndex: number,
  ): CircuitCell | null {
    if (tool === "eraser") {
      return EMPTY_CELL;
    }
    if (tool === "control" || tool === "antiControl" || tool === "swap") {
      return this.nextMarkerCell(tool, current, qubitIndex, stepIndex);
    }
    if (tool === "Rx" || tool === "Ry" || tool === "Rz") {
      const axis = ROTATION_TOOL_AXIS[tool];
      if (current.kind === "paramGate" && current.axis === axis) {
        return EMPTY_CELL;
      }
      return this.canPlaceGate(qubitIndex, stepIndex) ? { kind: "paramGate", axis, theta: Math.PI / 2 } : null;
    }
    const gate: GateType = tool;
    if ((current.kind === "gate" || current.kind === "controlledTarget") && current.gate === gate) {
      return EMPTY_CELL;
    }
    if (!this.canPlaceGate(qubitIndex, stepIndex)) {
      return null;
    }
    return columnHasControl(this.columnShapeExcept(stepIndex, qubitIndex))
      ? { kind: "controlledTarget", gate }
      : { kind: "gate", gate };
  }

  /**
   * Applies the currently selected tool to the given grid position (see {@link nextCellForTool}
   * for the per-tool placement and refusal rules).
   */
  public placeCell(qubitIndex: number, stepIndex: number): void {
    const current = cellAt(this.circuitProperty.value, qubitIndex, stepIndex);
    const next = this.nextCellForTool(this.selectedToolProperty.value, current, qubitIndex, stepIndex);

    // A refused placement or a click that changes nothing (e.g. the eraser on an empty cell)
    // records no history and leaves inspect mode alone.
    if (next === null || cellsEqual(current, next)) {
      return;
    }
    // Editing the circuit leaves step-through inspect mode so the displays stay authoritative.
    this._inspectStepProperty.value = null;
    this.pushHistory();
    this.setCell(qubitIndex, stepIndex, next);
    // Auto-select a freshly placed rotation gate so its angle inspector opens; otherwise deselect.
    this.selectedCellProperty.value = next.kind === "paramGate" ? { qubit: qubitIndex, step: stepIndex } : null;
  }

  /** Updates the rotation angle (radians) of a parametrized gate at the given position. */
  public setCellTheta(qubitIndex: number, stepIndex: number, theta: number): void {
    const current = cellAt(this.circuitProperty.value, qubitIndex, stepIndex);
    if (current.kind !== "paramGate" || current.theta === theta) {
      return;
    }
    // Coalesce a continuous slider drag on one cell into a single undo step.
    this.pushHistory(`theta:${qubitIndex}:${stepIndex}`);
    this.setCell(qubitIndex, stepIndex, { kind: "paramGate", axis: current.axis, theta });
  }

  /** Sets the qubit count (clamped to range), recording an undo step. */
  public setQubitCount(count: number): void {
    const clamped = QubitSketchModel.clampQubitCount(count);
    if (clamped === this.qubitCountProperty.value) {
      return;
    }
    this._inspectStepProperty.value = null;
    this.pushHistory();
    this._qubitCountProperty.value = clamped;
  }

  /**
   * Sets the step-through inspect cursor: `null` for the live/final state, or a column count
   * clamped into [0, NUM_STEPS]. This is transient view state, so it records no undo history.
   */
  public setInspectStep(step: number | null): void {
    this._inspectStepProperty.value = step === null ? null : Math.max(0, Math.min(NUM_STEPS, Math.round(step)));
  }

  /** Writes a single cell, replacing the grid immutably. Low-level — does not record history. */
  private setCell(qubitIndex: number, stepIndex: number, cell: CircuitCell): void {
    this._circuitProperty.set(withCell(this.circuitProperty.value, qubitIndex, stepIndex, cell));
  }

  /**
   * Replaces both the grid and qubit count as a single undoable action (used by QASM import and
   * example presets). Leaves step-through inspect mode and clears any rotation selection.
   */
  public loadCircuit(grid: Grid, qubitCount: number): void {
    this._inspectStepProperty.value = null;
    this.selectedCellProperty.value = null;
    this.pushHistory();
    this._qubitCountProperty.value = QubitSketchModel.clampQubitCount(qubitCount);
    this._circuitProperty.set(grid);
  }

  /**
   * Restores a grid and qubit count *without* recording undo history — for URL-hash restore at
   * startup, where the loaded state is the baseline rather than an undoable edit. For an undoable
   * load (QASM import, example presets) use {@link loadCircuit} instead.
   */
  public restoreCircuit(grid: Grid, qubitCount: number): void {
    this._qubitCountProperty.value = QubitSketchModel.clampQubitCount(qubitCount);
    this._circuitProperty.set(grid);
  }

  // ── Undo / redo ─────────────────────────────────────────────────────────────

  private snapshot(): CircuitSnapshot {
    return { circuit: this.circuitProperty.value, qubitCount: this.qubitCountProperty.value };
  }

  /**
   * Records the current state as an undo point, to be called *before* a mutation.
   * A non-null `coalesceKey` matching the previous push (e.g. a slider drag) is folded
   * into the existing entry instead of creating a new one.
   */
  private pushHistory(coalesceKey: string | null = null): void {
    if (this.applyingHistory) {
      return;
    }
    if (coalesceKey !== null && coalesceKey === this.lastHistoryKey) {
      this.future.length = 0;
      this.updateUndoRedoEnabled();
      return;
    }
    this.past.push(this.snapshot());
    if (this.past.length > QubitSketchModel.MAX_HISTORY) {
      this.past.shift();
    }
    this.future.length = 0;
    this.lastHistoryKey = coalesceKey;
    this.updateUndoRedoEnabled();
  }

  private applySnapshot(snap: CircuitSnapshot): void {
    this.applyingHistory = true;
    this.selectedCellProperty.value = null;
    this._qubitCountProperty.value = snap.qubitCount;
    this._circuitProperty.set(snap.circuit);
    this.applyingHistory = false;
    this.lastHistoryKey = null;
  }

  public undo(): void {
    const prev = this.past.pop();
    if (prev === undefined) {
      return;
    }
    this.future.push(this.snapshot());
    this.applySnapshot(prev);
    this.updateUndoRedoEnabled();
  }

  public redo(): void {
    const next = this.future.pop();
    if (next === undefined) {
      return;
    }
    this.past.push(this.snapshot());
    this.applySnapshot(next);
    this.updateUndoRedoEnabled();
  }

  private updateUndoRedoEnabled(): void {
    this._canUndoProperty.value = this.past.length > 0;
    this._canRedoProperty.value = this.future.length > 0;
  }

  private clearHistory(): void {
    this.past.length = 0;
    this.future.length = 0;
    this.lastHistoryKey = null;
    this.updateUndoRedoEnabled();
  }

  public reset(): void {
    this.applyingHistory = true;
    this._qubitCountProperty.reset();
    if (this.preferences) {
      this._qubitCountProperty.value = this.preferences.qubitCountProperty.value;
    }
    this.selectedToolProperty.reset();
    this.selectedCellProperty.reset();
    this._inspectStepProperty.reset();
    this._circuitProperty.set(emptyGrid());
    this.applyingHistory = false;
    this.clearHistory();
  }

  public step(_dt: number): void {
    // The circuit is static — there is no time-dependent state to advance.
  }
}
