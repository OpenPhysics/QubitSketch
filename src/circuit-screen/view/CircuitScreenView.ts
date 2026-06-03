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
import { RectangularPushButton } from "scenerystack/sun";
import QubitSketchColors from "../../QubitSketchColors.js";
import type { QubitSketchModel } from "../model/QubitSketchModel.js";
import { CIRCUIT_CANVAS_HEIGHT, CIRCUIT_CANVAS_WIDTH, CircuitCanvas } from "./CircuitCanvas.js";
import { GateInspectorNode } from "./GateInspectorNode.js";
import { GatePalettePanel } from "./GatePalettePanel.js";
import { SimulationPanel } from "./SimulationPanel.js";

const MARGIN = 20;

export class CircuitScreenView extends ScreenView {
  public constructor(model: QubitSketchModel, options?: ScreenViewOptions) {
    super(options);

    // ── Background ────────────────────────────────────────────────────────────
    const background = new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
      fill: QubitSketchColors.backgroundColorProperty,
    });
    this.addChild(background);

    // ── Circuit canvas ────────────────────────────────────────────────────────
    // Created first so the palette can use it as a drag-and-drop drop target.
    const circuitCanvas = new CircuitCanvas(model);

    // Layer that floating drag previews are added to (kept on top of everything).
    const dragLayer = new Node({ pickable: false });
    // Layer for hover tooltips (kept above everything else).
    const tooltipLayer = new Node({ pickable: false });

    // ── Gate palette (left side) ──────────────────────────────────────────────
    const palette = new GatePalettePanel(model, {
      dragLayer,
      dropTarget: circuitCanvas,
      overlayLayer: tooltipLayer,
    });
    palette.left = MARGIN;
    palette.centerY = this.layoutBounds.centerY;
    this.addChild(palette);

    // ── Simulation panel (right side) ─────────────────────────────────────────
    const simulationPanel = new SimulationPanel(model);
    simulationPanel.right = this.layoutBounds.maxX - MARGIN;
    simulationPanel.top = MARGIN;
    this.addChild(simulationPanel);

    // ── Qubit count control (above circuit) ───────────────────────────────────
    const qubitControlNode = this.buildQubitCountControl(model);

    // Position circuit canvas: centered horizontally between the palette and the panel
    const availableLeft = palette.right + MARGIN;
    const availableRight = simulationPanel.left - MARGIN;
    const circuitX = availableLeft + (availableRight - availableLeft - CIRCUIT_CANVAS_WIDTH) / 2;
    circuitCanvas.x = circuitX;
    circuitCanvas.y = this.layoutBounds.centerY - CIRCUIT_CANVAS_HEIGHT / 2 + 20;

    qubitControlNode.left = circuitCanvas.x;
    qubitControlNode.bottom = circuitCanvas.y - 12;

    this.addChild(qubitControlNode);
    this.addChild(circuitCanvas);

    // ── Undo / redo (next to the qubit-count control) ─────────────────────────
    const undoButton = new RectangularPushButton({
      content: new Text("↶", { font: "bold 18px sans-serif", fill: QubitSketchColors.textColorProperty }),
      listener: () => model.undo(),
      enabledProperty: model.canUndoProperty,
      baseColor: QubitSketchColors.panelBackgroundColorProperty,
    });
    const redoButton = new RectangularPushButton({
      content: new Text("↷", { font: "bold 18px sans-serif", fill: QubitSketchColors.textColorProperty }),
      listener: () => model.redo(),
      enabledProperty: model.canRedoProperty,
      baseColor: QubitSketchColors.panelBackgroundColorProperty,
    });
    undoButton.left = qubitControlNode.right + 24;
    undoButton.centerY = qubitControlNode.centerY;
    redoButton.left = undoButton.right + 6;
    redoButton.centerY = qubitControlNode.centerY;
    this.addChild(undoButton);
    this.addChild(redoButton);

    // Keyboard: Ctrl/Cmd+Z = undo, Ctrl+Y or Ctrl/Cmd+Shift+Z = redo.
    window.addEventListener("keydown", (e) => {
      const meta = e.ctrlKey || e.metaKey;
      if (!meta || e.altKey) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        model.undo();
        e.preventDefault();
      } else if (key === "y" || (key === "z" && e.shiftKey)) {
        model.redo();
        e.preventDefault();
      }
    });

    // ── Rotation-gate angle inspector (below the circuit) ─────────────────────
    const inspector = new GateInspectorNode(model);
    inspector.left = circuitCanvas.x;
    inspector.top = circuitCanvas.y + CIRCUIT_CANVAS_HEIGHT + 16;
    this.addChild(inspector);

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

    // Drag previews and tooltips float above all other content.
    this.addChild(dragLayer);
    this.addChild(tooltipLayer);
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
      down: () => model.setQubitCount(model.qubitCountProperty.value - 1),
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
      centerX: plusX + BUTTON_SIZE / 2,
      centerY: BUTTON_SIZE / 2,
      pickable: false,
    });
    plusBox.addChild(plusLabel);
    plusBox.addInputListener({
      down: () => model.setQubitCount(model.qubitCountProperty.value + 1),
    });
    container.addChild(plusBox);

    // Keep readout text in sync
    model.qubitCountProperty.link((count) => {
      readoutText.string = `${count} qubit${count === 1 ? "" : "s"}`;
      readoutText.centerX = readoutX + READOUT_WIDTH / 2;
    });

    return container;
  }

  public reset(): void {
    // All view state is driven by model Property links, so model.reset() suffices.
  }

  public override step(_dt: number): void {
    // No per-frame animation.
  }
}
