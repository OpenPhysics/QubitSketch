/**
 * SimulationPanel.ts
 *
 * The live-simulation readout shown to the right of the circuit. It hosts the
 * state displays, each driven by a DerivedProperty on the model so they update
 * automatically whenever the circuit changes. Nothing here computes physics —
 * that all lives in QuantumSimulator.ts.
 */

import type { ReadOnlyProperty } from "scenerystack/axon";
import { type Node, Text, VBox } from "scenerystack/scenery";
import { Panel } from "scenerystack/sun";
import { StringManager } from "../../i18n/StringManager.js";
import QubitSketchColors from "../../QubitSketchColors.js";
import type { QubitSketchModel } from "../model/QubitSketchModel.js";
import { AmplitudeTableNode } from "./AmplitudeTableNode.js";
import { BlochSpheresNode } from "./BlochSpheresNode.js";
import { MeasurementHistogramNode } from "./MeasurementHistogramNode.js";
import { ProbabilityBarsNode } from "./ProbabilityBarsNode.js";

export const SIM_PANEL_CONTENT_WIDTH = 300;

// Fixed display heights so the stacked panel always fits the screen; the list
// displays auto-scale their row height to these boxes.
const PROBABILITY_BOX_HEIGHT = 96;
const AMPLITUDE_BOX_HEIGHT = 104;
const MEASUREMENT_BOX_HEIGHT = 84;

export class SimulationPanel extends Panel {
  public constructor(model: QubitSketchModel) {
    const strings = StringManager.getInstance();
    const titles = strings.getDisplayTitles();

    const content = new VBox({
      align: "left",
      spacing: 10,
      children: [
        section(
          titles.probabilitiesStringProperty,
          new ProbabilityBarsNode(model.stateVectorProperty, SIM_PANEL_CONTENT_WIDTH, PROBABILITY_BOX_HEIGHT),
        ),
        section(
          titles.amplitudesStringProperty,
          new AmplitudeTableNode(model.stateVectorProperty, SIM_PANEL_CONTENT_WIDTH, AMPLITUDE_BOX_HEIGHT),
        ),
        section(
          titles.blochStringProperty,
          new BlochSpheresNode(model.blochVectorsProperty, model.qubitCountProperty, SIM_PANEL_CONTENT_WIDTH),
        ),
        section(
          titles.measurementStringProperty,
          new MeasurementHistogramNode(model.probabilitiesProperty, SIM_PANEL_CONTENT_WIDTH, MEASUREMENT_BOX_HEIGHT),
        ),
      ],
    });

    super(content, {
      fill: QubitSketchColors.panelBackgroundColorProperty,
      stroke: QubitSketchColors.panelBorderColorProperty,
      cornerRadius: 8,
      xMargin: 12,
      yMargin: 12,
    });
  }
}

/** Wraps a display node with a bold section title above it. */
function section(titleProperty: ReadOnlyProperty<string>, body: Node): Node {
  return new VBox({
    align: "left",
    spacing: 4,
    children: [
      new Text(titleProperty, {
        font: "bold 14px sans-serif",
        fill: QubitSketchColors.textColorProperty,
      }),
      body,
    ],
  });
}
