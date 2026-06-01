/**
 * CircuitScreen.ts
 *
 * Wires together the QubitSketchModel and CircuitScreenView as a SceneryStack Screen.
 */
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import QubitSketchColors from "../QubitSketchColors.js";
import { QubitSketchModel } from "./model/QubitSketchModel.js";
import { CircuitScreenView } from "./view/CircuitScreenView.js";

type CircuitScreenOptions = ScreenOptions & { tandem: Tandem };

export class CircuitScreen extends Screen<QubitSketchModel, CircuitScreenView> {
  public constructor(options: CircuitScreenOptions) {
    super(
      () => new QubitSketchModel(),
      (model) =>
        new CircuitScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      {
        backgroundColorProperty: QubitSketchColors.backgroundColorProperty,
        ...options,
      },
    );
  }
}
