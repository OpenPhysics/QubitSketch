/**
 * CircuitScreen.ts
 *
 * Wires together the QubitSketchModel and CircuitScreenView as a SceneryStack Screen.
 */
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import type { QubitSketchPreferencesModel } from "../preferences/QubitSketchPreferencesModel.js";
import QubitSketchColors from "../QubitSketchColors.js";
import { attachUrlSync } from "./model/CircuitUrlSync.js";
import { QubitSketchModel } from "./model/QubitSketchModel.js";
import { CircuitScreenView } from "./view/CircuitScreenView.js";
import { QubitSketchKeyboardHelpContent } from "./view/QubitSketchKeyboardHelpContent.js";

type CircuitScreenOptions = ScreenOptions & { tandem: Tandem; preferences: QubitSketchPreferencesModel };

export class CircuitScreen extends Screen<QubitSketchModel, CircuitScreenView> {
  public constructor(options: CircuitScreenOptions) {
    super(
      () => {
        const model = new QubitSketchModel(options.preferences);
        attachUrlSync(model);
        return model;
      },
      (model) =>
        new CircuitScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      {
        backgroundColorProperty: QubitSketchColors.backgroundColorProperty,
        createKeyboardHelpNode: () => new QubitSketchKeyboardHelpContent(),
        ...options,
      },
    );
  }
}
