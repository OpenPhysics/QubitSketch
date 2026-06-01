/**
 * GatePalettePanel.ts
 *
 * A vertical panel of gate-selection buttons. Clicking a button sets
 * model.selectedToolProperty to that gate type. An eraser button is
 * included at the bottom for removing gates from the circuit.
 *
 * The active tool is shown with a highlight border.
 */
import { Node, Rectangle, Text } from "scenerystack/scenery";
import QubitSketchColors from "../../QubitSketchColors.js";
import type { SelectedTool } from "../model/GateType.js";
import { GateType } from "../model/GateType.js";
import type { QubitSketchModel } from "../model/QubitSketchModel.js";
import { GateNode } from "./GateNode.js";

const BUTTON_SIZE = 52;
const BUTTON_GAP = 8;
const PANEL_PADDING = 10;
const HIGHLIGHT_INSET = 3;

const ALL_TOOLS: SelectedTool[] = [GateType.H, GateType.X, GateType.Y, GateType.Z, GateType.S, GateType.T, "eraser"];

type ButtonEntry = { tool: SelectedTool; highlight: Rectangle };

export class GatePalettePanel extends Node {
  public constructor(model: QubitSketchModel) {
    super();

    const panelHeight = ALL_TOOLS.length * (BUTTON_SIZE + BUTTON_GAP) - BUTTON_GAP + PANEL_PADDING * 2;
    const panelWidth = BUTTON_SIZE + PANEL_PADDING * 2;

    const background = new Rectangle(0, 0, panelWidth, panelHeight, {
      fill: QubitSketchColors.panelBackgroundColorProperty,
      stroke: QubitSketchColors.panelBorderColorProperty,
      lineWidth: 1,
      cornerRadius: 8,
    });
    this.addChild(background);

    const buttonEntries: ButtonEntry[] = [];

    for (let i = 0; i < ALL_TOOLS.length; i++) {
      const tool = ALL_TOOLS[i]!;
      const btnX = PANEL_PADDING;
      const btnY = PANEL_PADDING + i * (BUTTON_SIZE + BUTTON_GAP);

      // Selection highlight — a border drawn around the button when it is active
      const highlight = new Rectangle(
        btnX - HIGHLIGHT_INSET,
        btnY - HIGHLIGHT_INSET,
        BUTTON_SIZE + HIGHLIGHT_INSET * 2,
        BUTTON_SIZE + HIGHLIGHT_INSET * 2,
        {
          fill: null,
          stroke: QubitSketchColors.selectedToolHighlightColorProperty,
          lineWidth: HIGHLIGHT_INSET,
          cornerRadius: 9,
          visible: false,
          pickable: false,
        },
      );
      this.addChild(highlight);

      if (tool === "eraser") {
        const eraserBox = new Rectangle(btnX, btnY, BUTTON_SIZE, BUTTON_SIZE, {
          fill: QubitSketchColors.eraserColorProperty,
          cornerRadius: 6,
          pickable: false,
        });
        const eraserLabel = new Text("✕", {
          font: `bold ${Math.floor(BUTTON_SIZE * 0.44)}px sans-serif`,
          fill: "white",
          centerX: btnX + BUTTON_SIZE / 2,
          centerY: btnY + BUTTON_SIZE / 2,
          pickable: false,
        });
        this.addChild(eraserBox);
        this.addChild(eraserLabel);
      } else {
        const gateNode = new GateNode(tool, BUTTON_SIZE);
        gateNode.x = btnX;
        gateNode.y = btnY;
        gateNode.pickable = false;
        this.addChild(gateNode);
      }

      // Transparent hit-area on top so clicks always register
      const hitArea = new Rectangle(btnX, btnY, BUTTON_SIZE, BUTTON_SIZE, {
        fill: "rgba(0,0,0,0)",
        cursor: "pointer",
      });
      hitArea.addInputListener({
        down: () => {
          model.selectedToolProperty.value = tool;
        },
      });
      this.addChild(hitArea);

      buttonEntries.push({ tool, highlight });
    }

    // Keep highlight in sync with the selected tool
    model.selectedToolProperty.link((activeTool) => {
      for (const entry of buttonEntries) {
        entry.highlight.visible = entry.tool === activeTool;
      }
    });
  }
}
