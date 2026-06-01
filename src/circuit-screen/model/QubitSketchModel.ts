/**
 * QubitSketchModel.ts
 *
 * Top-level model for the quantum circuit builder screen.
 *
 * State:
 *   qubitCountProperty   — number of visible qubit wires (1–MAX_QUBITS)
 *   selectedToolProperty — which gate (or eraser) the user has selected
 *   circuitProperty      — the 2-D circuit grid: circuit[qubit][step]
 */
import { NumberProperty, Property } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import type { CircuitCell, SelectedTool } from "./GateType.js";
import { GateType, MAX_QUBITS, MIN_QUBITS, NUM_STEPS } from "./GateType.js";

export class QubitSketchModel implements TModel {
  public readonly qubitCountProperty = new NumberProperty(3, {
    range: new Range(MIN_QUBITS, MAX_QUBITS),
    numberType: "Integer",
  });

  public readonly selectedToolProperty: Property<SelectedTool> = new Property<SelectedTool>(GateType.H);

  /** circuit[qubitIndex][stepIndex] */
  public readonly circuitProperty: Property<ReadonlyArray<ReadonlyArray<CircuitCell>>>;

  public constructor() {
    this.circuitProperty = new Property<ReadonlyArray<ReadonlyArray<CircuitCell>>>(
      QubitSketchModel.emptyCircuit(),
    );
  }

  private static emptyCircuit(): ReadonlyArray<ReadonlyArray<CircuitCell>> {
    return Array.from({ length: MAX_QUBITS }, () =>
      Array.from<CircuitCell>({ length: NUM_STEPS }, () => null),
    );
  }

  /**
   * Places or removes a gate at the given grid position.
   * Placing on a cell already occupied by the same gate type clears it.
   */
  public toggleCell(qubitIndex: number, stepIndex: number): void {
    const tool = this.selectedToolProperty.value;
    const current = this.circuitProperty.value[qubitIndex]?.[stepIndex] ?? null;
    const next = tool === "eraser" || current === tool ? null : tool;
    this.setCell(qubitIndex, stepIndex, next);
  }

  public setCell(qubitIndex: number, stepIndex: number, cell: CircuitCell): void {
    const updated = this.circuitProperty.value.map((row, q) =>
      q === qubitIndex ? row.map((c, s) => (s === stepIndex ? cell : c)) : row,
    );
    this.circuitProperty.set(updated);
  }

  public clearCircuit(): void {
    this.circuitProperty.set(QubitSketchModel.emptyCircuit());
  }

  public reset(): void {
    this.qubitCountProperty.reset();
    this.selectedToolProperty.reset();
    this.circuitProperty.set(QubitSketchModel.emptyCircuit());
  }

  public step(_dt: number): void {}
}
