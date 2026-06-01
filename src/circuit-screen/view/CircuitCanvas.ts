/**
 * CircuitCanvas.ts
 *
 * Renders the quantum circuit grid — qubit labels, horizontal wire lines,
 * and a grid of clickable gate slots. Clicking a slot places or removes
 * the currently selected gate via model.toggleCell().
 *
 * Layout (all values in SceneryStack's virtual coordinate space):
 *   - LABEL_WIDTH  — left-side qubit labels (q₀, q₁, …)
 *   - SLOT_SIZE    — size of each gate cell (width = height)
 *   - SLOT_GAP     — gap between consecutive cells
 *   - WIRE_EXTEND  — how far the wire extends past the last slot
 */
import { Node, Rectangle, Text } from "scenerystack/scenery";
import QubitSketchColors from "../../QubitSketchColors.js";
import type { CircuitCell } from "../model/GateType.js";
import { MAX_QUBITS, NUM_STEPS } from "../model/GateType.js";
import type { QubitSketchModel } from "../model/QubitSketchModel.js";
import { GateNode } from "./GateNode.js";

const LABEL_WIDTH = 52;
const SLOT_SIZE = 50;
const SLOT_GAP = 8;
const WIRE_EXTEND = 12;
const QUBIT_ROW_HEIGHT = SLOT_SIZE + SLOT_GAP;

// Total canvas dimensions (sized for MAX_QUBITS rows, NUM_STEPS columns)
export const CIRCUIT_CANVAS_WIDTH = LABEL_WIDTH + NUM_STEPS * SLOT_SIZE + (NUM_STEPS - 1) * SLOT_GAP + WIRE_EXTEND;
export const CIRCUIT_CANVAS_HEIGHT = MAX_QUBITS * QUBIT_ROW_HEIGHT - SLOT_GAP;

export class CircuitCanvas extends Node {
  private readonly gateNodes: Array<Array<GateNode | null>>;
  private readonly qubitRows: Node[];

  public constructor(model: QubitSketchModel) {
    super();

    this.gateNodes = [];
    this.qubitRows = [];

    // Build one row per qubit (up to MAX_QUBITS; hidden rows are toggled by qubitCountProperty)
    for (let q = 0; q < MAX_QUBITS; q++) {
      const rowY = q * QUBIT_ROW_HEIGHT;
      const wireCenterY = rowY + SLOT_SIZE / 2;

      const rowNode = new Node();
      this.addChild(rowNode);
      this.qubitRows.push(rowNode);

      // Qubit label
      const label = new Text(`q${q}`, {
        font: "bold 16px monospace",
        fill: QubitSketchColors.textColorProperty,
        right: LABEL_WIDTH - 6,
        centerY: wireCenterY,
        pickable: false,
      });
      rowNode.addChild(label);

      // Horizontal wire spanning all slots
      const wireY = wireCenterY;
      const wireStart = LABEL_WIDTH;
      const wireEnd = LABEL_WIDTH + NUM_STEPS * SLOT_SIZE + (NUM_STEPS - 1) * SLOT_GAP + WIRE_EXTEND;
      const wire = new Rectangle(wireStart, wireY - 1, wireEnd - wireStart, 2, {
        fill: QubitSketchColors.wireColorProperty,
        pickable: false,
      });
      rowNode.addChild(wire);

      const gateRow: Array<GateNode | null> = [];

      // Gate slots
      for (let s = 0; s < NUM_STEPS; s++) {
        const slotX = LABEL_WIDTH + s * (SLOT_SIZE + SLOT_GAP);
        const stepIndex = s;

        const slot = new Rectangle(slotX, rowY, SLOT_SIZE, SLOT_SIZE, {
          fill: QubitSketchColors.slotBackgroundColorProperty,
          stroke: QubitSketchColors.slotBorderColorProperty,
          lineWidth: 1,
          cornerRadius: 4,
          cursor: "pointer",
        });
        rowNode.addChild(slot);
        gateRow.push(null);

        // Hover effect
        slot.addInputListener({
          over: () => {
            slot.fill = QubitSketchColors.slotHoverColorProperty;
          },
          out: () => {
            slot.fill = QubitSketchColors.slotBackgroundColorProperty;
          },
          down: () => {
            model.toggleCell(q, stepIndex);
          },
        });
      }

      this.gateNodes.push(gateRow);
    }

    // React to circuit changes — update gate nodes
    model.circuitProperty.link((circuit) => {
      this.updateGateNodes(circuit);
    });

    // React to qubit count changes — show/hide rows
    model.qubitCountProperty.link((count) => {
      for (let q = 0; q < MAX_QUBITS; q++) {
        const row = this.qubitRows[q];
        if (row !== undefined) {
          row.visible = q < count;
        }
      }
    });
  }

  private updateGateNodes(circuit: ReadonlyArray<ReadonlyArray<CircuitCell>>): void {
    for (let q = 0; q < MAX_QUBITS; q++) {
      const row = this.qubitRows[q];
      if (row === undefined) {
        continue;
      }
      for (let s = 0; s < NUM_STEPS; s++) {
        const cell = circuit[q]?.[s] ?? null;
        const existing = this.gateNodes[q]?.[s] ?? null;

        if (cell === null && existing !== null) {
          // Remove gate
          row.removeChild(existing);
          const gateRow = this.gateNodes[q];
          if (gateRow !== undefined) {
            gateRow[s] = null;
          }
        } else if (cell !== null) {
          if (existing !== null) {
            // Update in place if the gate type changed
            existing.updateGateType(cell);
          } else {
            // Place new gate node
            const slotX = LABEL_WIDTH + s * (SLOT_SIZE + SLOT_GAP);
            const rowY = q * QUBIT_ROW_HEIGHT;
            const gateNode = new GateNode(cell, SLOT_SIZE - 4);
            gateNode.x = slotX + 2;
            gateNode.y = rowY + 2;
            gateNode.pickable = false;
            row.addChild(gateNode);
            const gateRow = this.gateNodes[q];
            if (gateRow !== undefined) {
              gateRow[s] = gateNode;
            }
          }
        }
      }
    }
  }
}
