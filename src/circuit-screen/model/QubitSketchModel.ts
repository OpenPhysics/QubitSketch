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
import type { CircuitCell, GateType, SelectedTool } from "./GateType.js";
import { EMPTY_CELL, isAnyControl, MAX_QUBITS, MIN_QUBITS, NUM_STEPS, ROTATION_TOOL_AXIS } from "./GateType.js";
import { computeBlochVectors, simulate } from "./QuantumSimulator.js";

/** A position in the circuit grid. */
export type GridPosition = { readonly qubit: number; readonly step: number };

/** A point-in-time circuit state for undo/redo. The grid is immutable, so this is a cheap reference. */
type CircuitSnapshot = { readonly circuit: ReadonlyArray<ReadonlyArray<CircuitCell>>; readonly qubitCount: number };

export class QubitSketchModel implements TModel {
  public readonly qubitCountProperty = new NumberProperty(3, {
    range: new Range(MIN_QUBITS, MAX_QUBITS),
    numberType: "Integer",
  });

  public readonly selectedToolProperty: Property<SelectedTool> = new Property<SelectedTool>("H");

  /** The parametrized-rotation cell currently being edited (drives the angle inspector), or null. */
  public readonly selectedCellProperty: Property<GridPosition | null> = new Property<GridPosition | null>(null);

  /** circuit[qubitIndex][stepIndex] */
  public readonly circuitProperty: Property<ReadonlyArray<ReadonlyArray<CircuitCell>>>;

  /** Live statevector — recomputed whenever the circuit or qubit count changes. */
  public readonly stateVectorProperty: ReadOnlyProperty<Complex[]>;

  /** Measurement probability of each computational basis state. */
  public readonly probabilitiesProperty: ReadOnlyProperty<number[]>;

  /** Per-qubit reduced Bloch vector (length < 1 ⇒ mixed/entangled). */
  public readonly blochVectorsProperty: ReadOnlyProperty<Vector3[]>;

  /** Whether there is undo/redo history available (drives toolbar button enablement). */
  public readonly canUndoProperty = new BooleanProperty(false);
  public readonly canRedoProperty = new BooleanProperty(false);

  private readonly past: CircuitSnapshot[] = [];
  private readonly future: CircuitSnapshot[] = [];
  /** True while undo/redo is re-applying a snapshot, so those changes do not push new history. */
  private applyingHistory = false;
  /** Coalesces consecutive edits sharing this key (e.g. a slider drag) into one history entry. */
  private lastHistoryKey: string | null = null;
  private static readonly MAX_HISTORY = 100;

  public constructor() {
    this.circuitProperty = new Property<ReadonlyArray<ReadonlyArray<CircuitCell>>>(QubitSketchModel.emptyCircuit());

    this.stateVectorProperty = new DerivedProperty([this.circuitProperty, this.qubitCountProperty], (circuit, n) =>
      simulate(circuit, n),
    );

    this.probabilitiesProperty = new DerivedProperty([this.stateVectorProperty], (state) =>
      state.map((amp) => amp.magnitudeSquared),
    );

    this.blochVectorsProperty = new DerivedProperty([this.stateVectorProperty, this.qubitCountProperty], (state, n) =>
      computeBlochVectors(state, n),
    );

    // Deselect the angle inspector if its qubit row is hidden by a smaller qubit count.
    this.qubitCountProperty.lazyLink((count) => {
      const sel = this.selectedCellProperty.value;
      if (sel !== null && sel.qubit >= count) {
        this.selectedCellProperty.value = null;
      }
    });
  }

  private static emptyCircuit(): ReadonlyArray<ReadonlyArray<CircuitCell>> {
    return Array.from({ length: MAX_QUBITS }, () => Array.from({ length: NUM_STEPS }, (): CircuitCell => EMPTY_CELL));
  }

  /** True if any cell in the given step (column) is a control of either polarity (• or ◦). */
  private columnHasControl(stepIndex: number, exceptQubit: number): boolean {
    const circuit = this.circuitProperty.value;
    for (let q = 0; q < MAX_QUBITS; q++) {
      if (q !== exceptQubit && isAnyControl(circuit[q]?.[stepIndex] ?? EMPTY_CELL)) {
        return true;
      }
    }
    return false;
  }

  /** Number of SWAP endpoints already in the given column (excluding `exceptQubit`). */
  private columnSwapCount(stepIndex: number, exceptQubit: number): number {
    const circuit = this.circuitProperty.value;
    let count = 0;
    for (let q = 0; q < MAX_QUBITS; q++) {
      if (q !== exceptQubit && (circuit[q]?.[stepIndex] ?? EMPTY_CELL).kind === "swap") {
        count++;
      }
    }
    return count;
  }

  /**
   * Applies the currently selected tool to the given grid position. Each tool toggles:
   * clicking the same tool on a cell it already occupies clears that cell.
   *   - gate tool:    places the gate (as a controlled target if its column has a control).
   *   - control / antiControl: toggles a filled (•) or open (◦) control dot.
   *   - swap:         places a SWAP endpoint (a column holds at most two).
   *   - Rx / Ry / Rz: places a parametrized rotation gate (default angle π/2) and selects it.
   *   - eraser:       clears the cell.
   */
  public placeCell(qubitIndex: number, stepIndex: number): void {
    const tool = this.selectedToolProperty.value;
    const current = this.circuitProperty.value[qubitIndex]?.[stepIndex] ?? EMPTY_CELL;

    let next: CircuitCell;
    if (tool === "eraser") {
      next = EMPTY_CELL;
    } else if (tool === "control") {
      next = current.kind === "control" ? EMPTY_CELL : { kind: "control" };
    } else if (tool === "antiControl") {
      next = current.kind === "antiControl" ? EMPTY_CELL : { kind: "antiControl" };
    } else if (tool === "swap") {
      if (current.kind === "swap") {
        next = EMPTY_CELL;
      } else if (this.columnSwapCount(stepIndex, qubitIndex) >= 2) {
        return; // a column may hold at most two SWAP endpoints
      } else {
        next = { kind: "swap" };
      }
    } else if (tool === "Rx" || tool === "Ry" || tool === "Rz") {
      const axis = ROTATION_TOOL_AXIS[tool];
      const sameAxis = current.kind === "paramGate" && current.axis === axis;
      next = sameAxis ? EMPTY_CELL : { kind: "paramGate", axis, theta: Math.PI / 2 };
    } else {
      const gate: GateType = tool;
      const sameGate = (current.kind === "gate" || current.kind === "controlledTarget") && current.gate === gate;
      if (sameGate) {
        next = EMPTY_CELL;
      } else if (this.columnHasControl(stepIndex, qubitIndex)) {
        next = { kind: "controlledTarget", gate };
      } else {
        next = { kind: "gate", gate };
      }
    }
    this.pushHistory();
    this.setCell(qubitIndex, stepIndex, next);
    // Auto-select a freshly placed rotation gate so its angle inspector opens; otherwise deselect.
    this.selectedCellProperty.value = next.kind === "paramGate" ? { qubit: qubitIndex, step: stepIndex } : null;
  }

  /** Updates the rotation angle (radians) of a parametrized gate at the given position. */
  public setCellTheta(qubitIndex: number, stepIndex: number, theta: number): void {
    const current = this.circuitProperty.value[qubitIndex]?.[stepIndex];
    if (current?.kind !== "paramGate") {
      return;
    }
    // Coalesce a continuous slider drag on one cell into a single undo step.
    this.pushHistory(`theta:${qubitIndex}:${stepIndex}`);
    this.setCell(qubitIndex, stepIndex, { kind: "paramGate", axis: current.axis, theta });
  }

  /** Sets the qubit count (clamped to range), recording an undo step. */
  public setQubitCount(count: number): void {
    const clamped = Math.max(MIN_QUBITS, Math.min(MAX_QUBITS, count));
    if (clamped === this.qubitCountProperty.value) {
      return;
    }
    this.pushHistory();
    this.qubitCountProperty.value = clamped;
  }

  public setCell(qubitIndex: number, stepIndex: number, cell: CircuitCell): void {
    const updated = this.circuitProperty.value.map((row, q) =>
      q === qubitIndex ? row.map((c, s) => (s === stepIndex ? cell : c)) : row,
    );
    this.circuitProperty.set(updated);
  }

  /** Clears a single cell (used by drag-off-grid deletion). */
  public removeCell(qubitIndex: number, stepIndex: number): void {
    this.setCell(qubitIndex, stepIndex, EMPTY_CELL);
  }

  /** Replaces the entire circuit grid in a single update (used by URL load and undo/redo). */
  public setCircuit(grid: ReadonlyArray<ReadonlyArray<CircuitCell>>): void {
    this.circuitProperty.set(grid);
  }

  public clearCircuit(): void {
    this.selectedCellProperty.value = null;
    this.circuitProperty.set(QubitSketchModel.emptyCircuit());
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
    this.qubitCountProperty.value = snap.qubitCount;
    this.circuitProperty.set(snap.circuit);
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
    this.canUndoProperty.value = this.past.length > 0;
    this.canRedoProperty.value = this.future.length > 0;
  }

  private clearHistory(): void {
    this.past.length = 0;
    this.future.length = 0;
    this.lastHistoryKey = null;
    this.updateUndoRedoEnabled();
  }

  public reset(): void {
    this.applyingHistory = true;
    this.qubitCountProperty.reset();
    this.selectedToolProperty.reset();
    this.selectedCellProperty.reset();
    this.circuitProperty.set(QubitSketchModel.emptyCircuit());
    this.applyingHistory = false;
    this.clearHistory();
  }

  public step(_dt: number): void {
    // The circuit is static — there is no time-dependent state to advance.
  }
}
