/**
 * AmplitudeTableNode.ts
 *
 * One row per computational basis state showing its complex amplitude, the
 * magnitude, and the phase. Where the probability bars hide phase, this table
 * exposes it — so the difference between, say, |+⟩ and |−⟩ (same probabilities,
 * opposite phase) becomes visible.
 *
 * Row height auto-scales to a fixed box so the panel never overflows the screen.
 */
import type { ReadOnlyProperty } from "scenerystack/axon";
import type { Complex } from "scenerystack/dot";
import { toFixed } from "scenerystack/dot";
import { Node, Text } from "scenerystack/scenery";
import { StringManager } from "../../i18n/StringManager.js";
import QubitSketchColors from "../../QubitSketchColors.js";
import { basisRowFont, formatComplex, formatPhase, ketLabel, NEGLIGIBLE_AMPLITUDE } from "./displayUtils.js";

const MAX_ROW_HEIGHT = 15;
const COL_STATE = 4;
/** Height reserved for the header row above the amplitude body. */
const HEADER_HEIGHT = 16;

export class AmplitudeTableNode extends Node {
  public constructor(stateVectorProperty: ReadOnlyProperty<Complex[]>, width: number, boxHeight: number) {
    super();

    // Column x-positions scaled to the available width.
    const colAmplitude = Math.round(width * 0.2);
    const colMagnitude = Math.round(width * 0.62);
    const colPhase = Math.round(width * 0.84);

    const headers = StringManager.getInstance().getTableHeaders();
    const headerFont = "bold 10px monospace";

    const headerRow = new Node({ pickable: false });
    headerRow.addChild(
      new Text(headers.stateStringProperty, {
        font: headerFont,
        fill: QubitSketchColors.textColorProperty,
        left: COL_STATE,
        top: 0,
      }),
    );
    headerRow.addChild(
      new Text(headers.amplitudeStringProperty, {
        font: headerFont,
        fill: QubitSketchColors.textColorProperty,
        left: colAmplitude,
        top: 0,
      }),
    );
    headerRow.addChild(
      new Text(headers.magnitudeStringProperty, {
        font: headerFont,
        fill: QubitSketchColors.textColorProperty,
        left: colMagnitude,
        top: 0,
      }),
    );
    headerRow.addChild(
      new Text(headers.phaseStringProperty, {
        font: headerFont,
        fill: QubitSketchColors.textColorProperty,
        left: colPhase,
        top: 0,
      }),
    );
    this.addChild(headerRow);

    const body = new Node({ y: HEADER_HEIGHT });
    this.addChild(body);

    stateVectorProperty.link((state) => {
      body.removeAllChildren();
      const n = Math.round(Math.log2(state.length));
      const rowHeight = Math.min(MAX_ROW_HEIGHT, Math.max(1, (boxHeight - HEADER_HEIGHT) / state.length));
      const font = basisRowFont(rowHeight);

      for (const [i, amp] of state.entries()) {
        const y = i * rowHeight;
        const negligible = amp.magnitudeSquared < NEGLIGIBLE_AMPLITUDE;
        const fill = negligible ? QubitSketchColors.slotBorderColorProperty : QubitSketchColors.textColorProperty;

        body.addChild(new Text(ketLabel(i, n), { font, fill, left: COL_STATE, centerY: y }));
        body.addChild(new Text(formatComplex(amp), { font, fill, left: colAmplitude, centerY: y }));
        body.addChild(new Text(toFixed(amp.magnitude, 2), { font, fill, left: colMagnitude, centerY: y }));
        body.addChild(new Text(formatPhase(amp), { font, fill, left: colPhase, centerY: y }));
      }
    });
  }
}
