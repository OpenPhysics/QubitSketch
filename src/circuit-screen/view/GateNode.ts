/**
 * GateNode.ts
 *
 * Visual representation of a single quantum gate — a colored rounded rectangle
 * with a bold label. Used in both the palette and the circuit grid.
 */
import { Node, Rectangle, Text } from "scenerystack/scenery";
import QubitSketchColors from "../../QubitSketchColors.js";
import type { GateType, RotationAxis } from "../model/GateType.js";

// Map gate type to its color property
const GATE_COLOR_MAP = {
  H: QubitSketchColors.hGateColorProperty,
  X: QubitSketchColors.xGateColorProperty,
  Y: QubitSketchColors.yGateColorProperty,
  Z: QubitSketchColors.zGateColorProperty,
  S: QubitSketchColors.sGateColorProperty,
  T: QubitSketchColors.tGateColorProperty,
  Sdg: QubitSketchColors.sdgGateColorProperty,
  Tdg: QubitSketchColors.tdgGateColorProperty,
  Vx: QubitSketchColors.vxGateColorProperty,
} as const satisfies Record<GateType, unknown>;

/**
 * The glyph drawn on each gate, decoupled from the (ASCII, serialization-friendly) GateType key
 * so adjoint/root gates can show "S†", "T†", "√X" while keeping plain keys.
 */
const GATE_LABEL_MAP = {
  H: "H",
  X: "X",
  Y: "Y",
  Z: "Z",
  S: "S",
  T: "T",
  Sdg: "S†",
  Tdg: "T†",
  Vx: "√X",
} as const satisfies Record<GateType, string>;

/** Bold monospace font sized to fit a 1- or multi-character glyph inside the gate box. */
function labelFont(label: string, size: number): string {
  const scale = label.length <= 1 ? 0.44 : 0.3;
  return `bold ${Math.floor(size * scale)}px monospace`;
}

export class GateNode extends Node {
  private readonly background: Rectangle;
  private readonly label: Text;
  private readonly size: number;

  public constructor(gateType: GateType, size: number) {
    super();
    this.size = size;

    this.background = new Rectangle(0, 0, size, size, {
      fill: GATE_COLOR_MAP[gateType],
      cornerRadius: 6,
    });

    const text = GATE_LABEL_MAP[gateType];
    this.label = new Text(text, {
      font: labelFont(text, size),
      fill: QubitSketchColors.onGateTextColorProperty,
      centerX: size / 2,
      centerY: size / 2,
    });

    this.addChild(this.background);
    this.addChild(this.label);
  }

  public updateGateType(gateType: GateType): void {
    const text = GATE_LABEL_MAP[gateType];
    this.background.fill = GATE_COLOR_MAP[gateType];
    this.label.string = text;
    this.label.font = labelFont(text, this.size);
    this.label.centerX = this.size / 2;
    this.label.centerY = this.size / 2;
  }
}

const ROTATION_COLOR_MAP = {
  X: QubitSketchColors.rxGateColorProperty,
  Y: QubitSketchColors.ryGateColorProperty,
  Z: QubitSketchColors.rzGateColorProperty,
} as const satisfies Record<RotationAxis, unknown>;

/** Label drawn on a parametrized rotation gate, e.g. axis "X" → "Rx". */
export function rotationLabel(axis: RotationAxis): string {
  return `R${axis.toLowerCase()}`;
}

/**
 * Visual for a parametrized rotation gate: a colored box with the axis label ("Rx"/"Ry"/"Rz")
 * and, optionally, the current angle in degrees below it.
 */
export class RotationGateNode extends Node {
  public constructor(axis: RotationAxis, size: number, theta?: number) {
    super();

    this.addChild(
      new Rectangle(0, 0, size, size, {
        fill: ROTATION_COLOR_MAP[axis],
        cornerRadius: 6,
      }),
    );

    const showAngle = theta !== undefined;
    this.addChild(
      new Text(rotationLabel(axis), {
        font: `bold ${Math.floor(size * 0.34)}px monospace`,
        fill: QubitSketchColors.onGateTextColorProperty,
        centerX: size / 2,
        centerY: showAngle ? size * 0.36 : size / 2,
      }),
    );

    if (showAngle) {
      const deg = Math.round((theta * 180) / Math.PI);
      this.addChild(
        new Text(`${deg}°`, {
          font: `${Math.floor(size * 0.24)}px sans-serif`,
          fill: QubitSketchColors.onGateTextColorProperty,
          centerX: size / 2,
          centerY: size * 0.7,
        }),
      );
    }
  }
}
