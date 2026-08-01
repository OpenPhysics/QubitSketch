/**
 * QubitSketchPanel.ts
 *
 * A pre-themed Panel that automatically uses QubitSketchColors for background and
 * border. Use this for all control panels and info boxes in the sim so that
 * default / projector mode switching is handled automatically.
 *
 * ── Basic usage ───────────────────────────────────────────────────────────────
 *
 *   import { QubitSketchPanel } from "../../common/QubitSketchPanel.js";
 *   import { VBox, Text } from "scenerystack/scenery";
 *
 *   const content = new VBox({
 *     children: [ new Text("label"), slider ],
 *     spacing: 8,
 *   });
 *   const panel = new QubitSketchPanel(content);
 *
 * ── Overriding defaults ───────────────────────────────────────────────────────
 *
 *   // Wider margins, sharper corners, custom stroke
 *   const panel = new QubitSketchPanel(content, { xMargin: 20, cornerRadius: 0 });
 *
 *   // Transparent background (decorative border only)
 *   const panel = new QubitSketchPanel(content, { fill: "transparent" });
 */

import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { Node } from "scenerystack/scenery";
import { Panel, type PanelOptions } from "scenerystack/sun";
import QubitSketchColors from "../QubitSketchColors.js";
import { PANEL_CORNER_RADIUS } from "../QubitSketchConstants.js";

export type QubitSketchPanelOptions = PanelOptions;

export class QubitSketchPanel extends Panel {
  public constructor(content: Node, providedOptions?: QubitSketchPanelOptions) {
    const options = optionize<QubitSketchPanelOptions, EmptySelfOptions, PanelOptions>()(
      {
        fill: QubitSketchColors.panelBackgroundColorProperty,
        stroke: QubitSketchColors.panelBorderColorProperty,
        cornerRadius: PANEL_CORNER_RADIUS,
        xMargin: 12,
        yMargin: 10,
      },
      providedOptions,
    );
    super(content, options);
  }
}
