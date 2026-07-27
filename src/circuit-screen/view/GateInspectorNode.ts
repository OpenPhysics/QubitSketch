/**
 * GateInspectorNode.ts
 *
 * A small panel that edits the rotation angle of the currently selected parametrized
 * gate (Rx / Ry / Rz). It is hidden unless `model.selectedCellProperty` points at a
 * paramGate cell; dragging the slider rewrites that cell's angle, which re-simulates
 * the circuit automatically through the model's DerivedProperty chain.
 */
import { DerivedProperty, NumberProperty } from "scenerystack/axon";
import { Dimension2, Range } from "scenerystack/dot";
import { Text, VBox } from "scenerystack/scenery";
import { HSlider, Panel } from "scenerystack/sun";
import { StringManager } from "../../i18n/StringManager.js";
import QubitSketchColors from "../../QubitSketchColors.js";
import { FONTS } from "../../QubitSketchFonts.js";
import type { QubitSketchModel } from "../model/QubitSketchModel.js";
import { rotationLabel } from "./GateNode.js";

const TWO_PI = Math.PI * 2;

export class GateInspectorNode extends Panel {
  public constructor(model: QubitSketchModel) {
    const angleProperty = new NumberProperty(Math.PI / 2, { range: new Range(0, TWO_PI) });
    const angleStringProperty = StringManager.getInstance().getInspectorStrings().angleStringProperty;

    const titleText = new Text("", {
      font: FONTS.inspectorTitle,
      fill: QubitSketchColors.textColorProperty,
    });

    const valueStringProperty = new DerivedProperty(
      [angleProperty, angleStringProperty],
      (theta, label) => `${label}: ${Math.round((theta * 180) / Math.PI)}°`,
    );
    const valueText = new Text(valueStringProperty, {
      font: FONTS.body,
      fill: QubitSketchColors.textColorProperty,
    });

    const slider = new HSlider(angleProperty, new Range(0, TWO_PI), {
      accessibleName: angleStringProperty,
      trackSize: new Dimension2(300, 4),
      thumbSize: new Dimension2(14, 26),
      majorTickLength: 18,
      majorTickStroke: QubitSketchColors.textColorProperty,
      minorTickLength: 8,
      minorTickStroke: QubitSketchColors.textColorProperty,
    });

    // Ticks live in radians (slider range is 0..2π) but read as degrees.
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
    const tickLabel = (degrees: number) =>
      new Text(`${degrees}°`, { font: FONTS.tick, fill: QubitSketchColors.textColorProperty });

    // Major (labeled) ticks every 45°, minor ticks every 15° in between.
    for (let degrees = 0; degrees <= 360; degrees += 15) {
      if (degrees % 45 === 0) {
        slider.addMajorTick(toRadians(degrees), tickLabel(degrees));
      } else {
        slider.addMinorTick(toRadians(degrees));
      }
    }

    const content = new VBox({ align: "left", spacing: 6, children: [titleText, valueText, slider] });

    super(content, {
      fill: QubitSketchColors.panelBackgroundColorProperty,
      stroke: QubitSketchColors.panelBorderColorProperty,
      cornerRadius: 8,
      xMargin: 12,
      yMargin: 10,
    });

    // Loading a cell's angle into the slider must not echo back as an edit.
    let suppressWrite = false;

    model.selectedCellProperty.link((sel) => {
      const cell = sel === null ? undefined : model.circuitProperty.value[sel.qubit]?.[sel.step];
      if (cell !== undefined && cell.kind === "paramGate") {
        this.visible = true;
        titleText.string = rotationLabel(cell.axis);
        suppressWrite = true;
        angleProperty.value = cell.theta;
        suppressWrite = false;
      } else {
        this.visible = false;
      }
    });

    angleProperty.lazyLink((theta) => {
      if (suppressWrite) {
        return;
      }
      const sel = model.selectedCellProperty.value;
      if (sel !== null) {
        model.setCellTheta(sel.qubit, sel.step, theta);
      }
    });
  }
}
