/**
 * CircuitScreenView.ts
 *
 * Top-level view for the quantum circuit builder screen.
 *
 * Layout (1024 × 618 virtual coordinate space):
 *   - Gate palette panel — left edge, vertically centered
 *   - Circuit canvas     — center, fills remaining horizontal space
 *   - Qubit count row    — above the circuit (+ / − buttons + count display)
 *   - Reset All button   — bottom-right corner (PhET convention)
 */
import { Node, Rectangle, Text } from "scenerystack/scenery";
import { ResetAllButton } from "scenerystack/scenery-phet";
import type { ScreenViewOptions } from "scenerystack/sim";
import { ScreenView } from "scenerystack/sim";
import QubitSketchColors from "../../QubitSketchColors.js";
import type { QubitSketchModel } from "../model/QubitSketchModel.js";
import { MAX_QUBITS, MIN_QUBITS } from "../model/GateType.js";
import { CircuitCanvas, CIRCUIT_CANVAS_HEIGHT, CIRCUIT_CANVAS_WIDTH } from "./CircuitCanvas.js";
import { GatePalettePanel } from "./GatePalettePanel.js";

const MARGIN = 20;

export class CircuitScreenView extends ScreenView {
  public constructor(model: QubitSketchModel, options?: ScreenViewOptions) {
    super(options);

    // ── Background ────────────────────────────────────────────────────────────
    const background = new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
      fill: QubitSketchColors.backgroundColorProperty,
    });
    this.addChild(background);

    // ── Gate palette (left side) ──────────────────────────────────────────────
    const palette = new GatePalettePanel(model);
    palette.left = MARGIN;
    palette.centerY = this.layoutBounds.centerY;
    this.addChild(palette);

    // ── Qubit count control (above circuit) ───────────────────────────────────
    const qubitControlNode = this.buildQubitCountControl(model);

    // ── Circuit canvas ────────────────────────────────────────────────────────
    const circuitCanvas = new CircuitCanvas(model);

    // Position circuit canvas: centered horizontally in the space right of the palette
    const availableLeft = palette.right + MARGIN;
    const circuitX = availableLeft + (this.layoutBounds.width - availableLeft - MARGIN - CIRCUIT_CANVAS_WIDTH) / 2;
    circuitCanvas.x = circuitX;
    circuitCanvas.y = this.layoutBounds.centerY - CIRCUIT_CANVAS_HEIGHT / 2 + 20;

    qubitControlNode.left = circuitCanvas.x;
    qubitControlNode.bottom = circuitCanvas.y - 12;

    this.addChild(qubitControlNode);
    this.addChild(circuitCanvas);

    // ── Reset All button ──────────────────────────────────────────────────────
    const resetAllButton = new ResetAllButton({
      listener: () => {
        model.reset();
        this.reset();
      },
      right: this.layoutBounds.maxX - MARGIN,
      bottom: this.layoutBounds.maxY - MARGIN,
    });
    this.addChild(resetAllButton);
  }

  /**
   * Builds the qubit count control: a "−" button, a count readout, and a "+" button.
   */
  private buildQubitCountControl(model: QubitSketchModel): Node {
    const BUTTON_SIZE = 28;
    const BUTTON_RADIUS = 4;
    const READOUT_WIDTH = 80;
    const READOUT_HEIGHT = 28;
    const SPACING = 6;

    const container = new Node();

    // "−" button
    const minusBox = new Rectangle(0, 0, BUTTON_SIZE, BUTTON_SIZE, {
      fill: QubitSketchColors.panelBackgroundColorProperty,
      stroke: QubitSketchColors.panelBorderColorProperty,
      lineWidth: 1,
      cornerRadius: BUTTON_RADIUS,
      cursor: "pointer",
    });
    const minusLabel = new Text("−", {
      font: "bold 20px sans-serif",
      fill: QubitSketchColors.textColorProperty,
      centerX: BUTTON_SIZE / 2,
      centerY: BUTTON_SIZE / 2,
      pickable: false,
    });
    minusBox.addChild(minusLabel);
    minusBox.addInputListener({
      down: () => {
        if (model.qubitCountProperty.value > MIN_QUBITS) {
          model.qubitCountProperty.value--;
        }
      },
    });
    container.addChild(minusBox);

    // Count readout
    const readoutX = BUTTON_SIZE + SPACING;
    const readoutBox = new Rectangle(readoutX, 0, READOUT_WIDTH, READOUT_HEIGHT, {
      fill: QubitSketchColors.slotBackgroundColorProperty,
      stroke: QubitSketchColors.panelBorderColorProperty,
      lineWidth: 1,
      cornerRadius: BUTTON_RADIUS,
      pickable: false,
    });
    container.addChild(readoutBox);

    const readoutText = new Text("3 qubits", {
      font: "14px sans-serif",
      fill: QubitSketchColors.textColorProperty,
      centerX: readoutX + READOUT_WIDTH / 2,
      centerY: BUTTON_SIZE / 2,
      pickable: false,
    });
    container.addChild(readoutText);

    // "+" button
    const plusX = readoutX + READOUT_WIDTH + SPACING;
    const plusBox = new Rectangle(plusX, 0, BUTTON_SIZE, BUTTON_SIZE, {
      fill: QubitSketchColors.panelBackgroundColorProperty,
      stroke: QubitSketchColors.panelBorderColorProperty,
      lineWidth: 1,
      cornerRadius: BUTTON_RADIUS,
      cursor: "pointer",
    });
    const plusLabel = new Text("+", {
      font: "bold 20px sans-serif",
      fill: QubitSketchColors.textColorProperty,
      centerX: BUTTON_SIZE / 2,
      centerY: BUTTON_SIZE / 2,
      pickable: false,
    });
    plusBox.addChild(plusLabel);
    plusBox.addInputListener({
      down: () => {
        if (model.qubitCountProperty.value < MAX_QUBITS) {
          model.qubitCountProperty.value++;
        }
      },
    });
    container.addChild(plusBox);

    // Keep readout text in sync
    model.qubitCountProperty.link((count) => {
      readoutText.string = `${count} qubit${count === 1 ? "" : "s"}`;
      readoutText.centerX = readoutX + READOUT_WIDTH / 2;
    });

    return container;
  }

  public reset(): void {}

  public override step(_dt: number): void {}
}
