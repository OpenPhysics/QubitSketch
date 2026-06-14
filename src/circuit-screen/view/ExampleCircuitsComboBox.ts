/**
 * ExampleCircuitsComboBox.ts
 *
 * A labeled dropdown that loads one of the curated {@link CIRCUIT_PRESETS} into the model. The
 * control always shows its "Choose a circuit…" placeholder: selecting an item loads that circuit
 * (an undoable `model.loadCircuit`) and then snaps the selection back to the placeholder, so the
 * dropdown never displays a stale choice once the user edits the loaded circuit.
 *
 * The popup list is drawn into the `listParent` node supplied by the view (which must be an
 * interactive, top-most layer).
 */
import { Property, type ReadOnlyProperty } from "scenerystack/axon";
import { HBox, type Node, Text } from "scenerystack/scenery";
import { ComboBox, type ComboBoxItem } from "scenerystack/sun";
import { StringManager } from "../../i18n/StringManager.js";
import QubitSketchColors from "../../QubitSketchColors.js";
import { CIRCUIT_PRESETS } from "../model/CircuitPresets.js";
import type { QubitSketchModel } from "../model/QubitSketchModel.js";

const PLACEHOLDER = "";

export class ExampleCircuitsComboBox extends HBox {
  public constructor(model: QubitSketchModel, listParent: Node) {
    const strings = StringManager.getInstance().getExampleStrings();
    const itemText = (textProperty: ReadOnlyProperty<string>): Text =>
      new Text(textProperty, { font: "14px sans-serif", fill: QubitSketchColors.textColorProperty });

    // "" selects the placeholder. reentrant: true allows the listener below to reset the value.
    const selectedProperty = new Property<string>(PLACEHOLDER, { reentrant: true });

    const items: ComboBoxItem<string>[] = [
      { value: PLACEHOLDER, createNode: () => itemText(strings.chooseStringProperty) },
    ];
    for (const preset of CIRCUIT_PRESETS) {
      const nameProperty = strings.names[preset.id];
      if (nameProperty) {
        items.push({ value: preset.id, createNode: () => itemText(nameProperty) });
      }
    }

    const comboBox = new ComboBox(selectedProperty, items, listParent, {
      buttonFill: QubitSketchColors.slotBackgroundColorProperty,
      buttonStroke: QubitSketchColors.panelBorderColorProperty,
      listFill: QubitSketchColors.panelBackgroundColorProperty,
      listStroke: QubitSketchColors.panelBorderColorProperty,
      highlightFill: QubitSketchColors.slotHoverColorProperty,
      cornerRadius: 4,
      xMargin: 10,
      yMargin: 6,
      accessibleName: strings.labelStringProperty,
    });

    super({
      spacing: 8,
      align: "center",
      children: [
        new Text(strings.labelStringProperty, {
          font: "bold 14px sans-serif",
          fill: QubitSketchColors.textColorProperty,
        }),
        comboBox,
      ],
    });

    selectedProperty.lazyLink((id) => {
      if (id === PLACEHOLDER) {
        return;
      }
      const preset = CIRCUIT_PRESETS.find((p) => p.id === id);
      if (preset) {
        model.loadCircuit(preset.build(), preset.qubitCount);
      }
      selectedProperty.value = PLACEHOLDER;
    });
  }
}
