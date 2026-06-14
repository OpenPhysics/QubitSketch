/**
 * QubitSketchPreferencesNode.ts
 *
 * Custom preferences UI shown in Preferences → Simulation. Controls are bound to
 * QubitSketchPreferencesModel Properties (initial values from query parameters).
 */

import { Text, VBox } from "scenerystack/scenery";
import { NumberControl, PhetFont } from "scenerystack/scenery-phet";
import type { Tandem } from "scenerystack/tandem";
import { StringManager } from "../i18n/StringManager.js";
import QubitSketchNamespace from "../QubitSketchNamespace.js";
import { QUBIT_COUNT_RANGE, type QubitSketchPreferencesModel } from "./QubitSketchPreferencesModel.js";

export class QubitSketchPreferencesNode extends VBox {
  public constructor(preferencesModel: QubitSketchPreferencesModel, tandem?: Tandem) {
    const prefStrings = StringManager.getInstance().getPreferences();

    const header = new Text(prefStrings.titleStringProperty, {
      font: new PhetFont({ size: 18, weight: "bold" }),
    });

    const qubitCountControl = new NumberControl(
      prefStrings.qubitCountStringProperty,
      preferencesModel.qubitCountProperty,
      QUBIT_COUNT_RANGE,
      {
        delta: 1,
        numberDisplayOptions: { decimalPlaces: 0 },
        titleNodeOptions: { font: new PhetFont(14), maxWidth: 200 },
        arrowButtonOptions: { scale: 0.75 },
        layoutFunction: NumberControl.createLayoutFunction4({ sliderPadding: 5 }),
        ...(tandem && { tandem: tandem.createTandem("qubitCountControl") }),
      },
    );

    super({
      align: "left",
      spacing: 12,
      children: [header, qubitCountControl],
    });
  }
}

QubitSketchNamespace.register("QubitSketchPreferencesNode", QubitSketchPreferencesNode);
