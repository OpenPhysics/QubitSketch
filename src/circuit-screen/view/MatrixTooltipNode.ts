/**
 * MatrixTooltipNode.ts
 *
 * A hover tooltip for a palette tool: shows the tool's 2×2 unitary (when it has one)
 * above a one-line description. Pure presentation — it reads a matrix and a localized
 * description string and lays them out inside a small panel.
 */
import type { ReadOnlyProperty } from "scenerystack/axon";
import { Line, Node, Text, VBox } from "scenerystack/scenery";
import { Panel } from "scenerystack/sun";
import QubitSketchColors from "../../QubitSketchColors.js";
import type { Complex2x2 } from "../model/GateMatrices.js";
import { formatComplex } from "./displayUtils.js";

const CELL_WIDTH = 64;
const CELL_HEIGHT = 20;
const BRACKET_GAP = 6;
const BRACKET_TICK = 5;

export class MatrixTooltipNode extends Panel {
  public constructor(matrix: Complex2x2 | null, descriptionProperty: ReadOnlyProperty<string>) {
    const children: Node[] = [];
    if (matrix !== null) {
      children.push(matrixNode(matrix));
    }
    children.push(
      new Text(descriptionProperty, {
        font: "12px sans-serif",
        fill: QubitSketchColors.textColorProperty,
        maxWidth: 220,
      }),
    );

    super(new VBox({ align: "left", spacing: 8, children }), {
      fill: QubitSketchColors.panelBackgroundColorProperty,
      stroke: QubitSketchColors.panelBorderColorProperty,
      cornerRadius: 6,
      xMargin: 10,
      yMargin: 8,
    });
  }
}

/** Renders a 2×2 complex matrix with square brackets. */
function matrixNode(m: Complex2x2): Node {
  const node = new Node({ pickable: false });
  const gridLeft = BRACKET_GAP;
  const gridWidth = 2 * CELL_WIDTH;
  const gridHeight = 2 * CELL_HEIGHT;

  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      node.addChild(
        new Text(formatComplex(m[r]![c]!), {
          font: "12px monospace",
          fill: QubitSketchColors.textColorProperty,
          centerX: gridLeft + c * CELL_WIDTH + CELL_WIDTH / 2,
          centerY: r * CELL_HEIGHT + CELL_HEIGHT / 2,
        }),
      );
    }
  }

  const stroke = QubitSketchColors.textColorProperty;
  const rightX = gridLeft + gridWidth + BRACKET_GAP;
  // Left bracket: vertical bar with top/bottom inward ticks.
  node.addChild(new Line(0, 0, 0, gridHeight, { stroke, lineWidth: 1.5 }));
  node.addChild(new Line(0, 0, BRACKET_TICK, 0, { stroke, lineWidth: 1.5 }));
  node.addChild(new Line(0, gridHeight, BRACKET_TICK, gridHeight, { stroke, lineWidth: 1.5 }));
  // Right bracket.
  node.addChild(new Line(rightX, 0, rightX, gridHeight, { stroke, lineWidth: 1.5 }));
  node.addChild(new Line(rightX - BRACKET_TICK, 0, rightX, 0, { stroke, lineWidth: 1.5 }));
  node.addChild(new Line(rightX - BRACKET_TICK, gridHeight, rightX, gridHeight, { stroke, lineWidth: 1.5 }));

  return node;
}
