/**
 * GateNode.ts
 *
 * Visual representation of a single quantum gate — a colored rounded rectangle
 * with a bold label. Used in both the palette and the circuit grid.
 */
import { Node, Rectangle, Text } from "scenerystack/scenery";
import QubitSketchColors from "../../QubitSketchColors.js";
import type { GateType } from "../model/GateType.js";

// Map gate type to its color property
const GATE_COLOR_MAP = {
  H: QubitSketchColors.hGateColorProperty,
  X: QubitSketchColors.xGateColorProperty,
  Y: QubitSketchColors.yGateColorProperty,
  Z: QubitSketchColors.zGateColorProperty,
  S: QubitSketchColors.sGateColorProperty,
  T: QubitSketchColors.tGateColorProperty,
} as const satisfies Record<GateType, unknown>;

export class GateNode extends Node {
  private readonly background: Rectangle;
  private readonly label: Text;

  public constructor(gateType: GateType, size: number) {
    super();

    this.background = new Rectangle(0, 0, size, size, {
      fill: GATE_COLOR_MAP[gateType],
      cornerRadius: 6,
    });

    this.label = new Text(gateType, {
      font: `bold ${Math.floor(size * 0.44)}px monospace`,
      fill: "white",
      centerX: size / 2,
      centerY: size / 2,
    });

    this.addChild(this.background);
    this.addChild(this.label);
  }

  public updateGateType(gateType: GateType): void {
    this.background.fill = GATE_COLOR_MAP[gateType];
    this.label.string = gateType;
  }
}
