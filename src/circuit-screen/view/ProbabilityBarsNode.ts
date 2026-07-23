/**
 * ProbabilityBarsNode.ts
 *
 * One horizontal bar per computational basis state, its length proportional to
 * the measurement probability |amplitude|² and its color encoding the amplitude's
 * phase (see the phase legend below the bars). The most intuitive readout of what
 * the circuit "does": place an H on q0 and the |0⟩/|1⟩ bars split 50/50; add a Z
 * and the bars keep their lengths but one flips color (phase π apart).
 *
 * Row height auto-scales to a fixed box so the panel never overflows the screen,
 * however many qubits are active.
 */
import type { ReadOnlyProperty } from "scenerystack/axon";
import type { Complex } from "scenerystack/dot";
import { toFixed } from "scenerystack/dot";
import { Node, Rectangle, Text } from "scenerystack/scenery";
import QubitSketchColors from "../../QubitSketchColors.js";
import { basisRowFont, ketLabel, phaseToColor } from "./displayUtils.js";
import { PhaseLegendNode } from "./PhaseLegendNode.js";

const MAX_ROW_HEIGHT = 16;
const LABEL_WIDTH = 52;
const PERCENT_WIDTH = 44;
const LEGEND_HEIGHT = 18;
const LEGEND_GAP = 4;

export class ProbabilityBarsNode extends Node {
  public constructor(stateVectorProperty: ReadOnlyProperty<Complex[]>, width: number, boxHeight: number) {
    super();

    const trackLeft = LABEL_WIDTH;
    const trackWidth = width - LABEL_WIDTH - PERCENT_WIDTH;
    // Reserve room at the bottom for the phase legend so the section keeps its fixed height.
    const barsHeight = boxHeight - LEGEND_HEIGHT - LEGEND_GAP;

    const barsLayer = new Node();
    this.addChild(barsLayer);

    const legend = new PhaseLegendNode(trackWidth);
    legend.left = trackLeft;
    legend.top = barsHeight + LEGEND_GAP;
    this.addChild(legend);

    stateVectorProperty.link((state) => {
      barsLayer.removeAllChildren();
      const n = Math.round(Math.log2(state.length));
      const rowHeight = Math.min(MAX_ROW_HEIGHT, barsHeight / state.length);
      const font = basisRowFont(rowHeight);

      for (const [i, amp] of state.entries()) {
        const p = amp.magnitudeSquared;
        const y = i * rowHeight;

        barsLayer.addChild(
          new Text(ketLabel(i, n), {
            font,
            fill: QubitSketchColors.textColorProperty,
            right: LABEL_WIDTH - 6,
            centerY: y + rowHeight / 2,
          }),
        );
        barsLayer.addChild(
          new Rectangle(trackLeft, y + 1, trackWidth, rowHeight - 2, {
            fill: QubitSketchColors.slotBackgroundColorProperty,
            cornerRadius: 2,
          }),
        );
        if (p > 1e-6) {
          barsLayer.addChild(
            new Rectangle(trackLeft, y + 1, Math.max(1, trackWidth * p), rowHeight - 2, {
              fill: phaseToColor(amp),
              cornerRadius: 2,
            }),
          );
        }
        barsLayer.addChild(
          new Text(`${toFixed(p * 100, 0)}%`, {
            font,
            fill: QubitSketchColors.textColorProperty,
            left: trackLeft + trackWidth + 6,
            centerY: y + rowHeight / 2,
          }),
        );
      }
    });
  }
}
