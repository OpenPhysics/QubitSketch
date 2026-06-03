/**
 * QasmDialog.ts
 *
 * A modal dialog for OpenQASM 2.0 interop (no always-on code panel):
 *   - Export: a read-only view of the current circuit as OpenQASM, with a Copy button.
 *   - Import: a textarea to paste OpenQASM into, with a Load button that replaces the circuit.
 *
 * Text entry uses real <textarea> elements hosted in the scene via Scenery DOM nodes, since
 * Scenery has no native multiline text field. The dialog is built lazily and reused; each open
 * refreshes the export text from the current circuit.
 */
import type { ReadOnlyProperty } from "scenerystack/axon";
import { DOM, HBox, Text, VBox } from "scenerystack/scenery";
import { Dialog } from "scenerystack/sim";
import { ButtonNode, TextPushButton } from "scenerystack/sun";
import { StringManager } from "../../i18n/StringManager.js";
import QubitSketchColors from "../../QubitSketchColors.js";
import { circuitToQasm, qasmToCircuit } from "../model/QasmSerializer.js";
import type { QubitSketchModel } from "../model/QubitSketchModel.js";

function makeTextarea(readOnly: boolean): HTMLTextAreaElement {
  const el = document.createElement("textarea");
  el.readOnly = readOnly;
  el.spellcheck = false;
  el.style.width = "340px";
  el.style.height = readOnly ? "118px" : "88px";
  el.style.fontFamily = "monospace";
  el.style.fontSize = "11px";
  el.style.resize = "none";
  el.style.boxSizing = "border-box";
  return el;
}

function label(textProperty: ReadOnlyProperty<string>): Text {
  return new Text(textProperty, { font: "bold 12px sans-serif", fill: QubitSketchColors.textColorProperty });
}

/** Returns a function that opens (building once, then reusing) the OpenQASM dialog for `model`. */
export function createQasmDialogOpener(model: QubitSketchModel): () => void {
  const strings = StringManager.getInstance().getQasmStrings();
  let dialog: Dialog | null = null;
  let exportEl: HTMLTextAreaElement;
  let importEl: HTMLTextAreaElement;
  let status: Text;

  function build(): void {
    exportEl = makeTextarea(true);
    importEl = makeTextarea(false);
    status = new Text("", { font: "11px sans-serif", fill: QubitSketchColors.textColorProperty });

    const copyButton = new TextPushButton(strings.copyStringProperty, {
      buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
      listener: () => {
        exportEl.focus();
        exportEl.select();
        let ok = false;
        try {
          ok = document.execCommand("copy");
        } catch {
          ok = false;
        }
        if (!ok && navigator.clipboard) {
          navigator.clipboard.writeText(exportEl.value).catch(() => undefined);
        }
        status.fill = QubitSketchColors.textColorProperty;
        status.string = strings.copiedStringProperty.value;
      },
    });

    const loadButton = new TextPushButton(strings.loadStringProperty, {
      buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
      listener: () => {
        const parsed = qasmToCircuit(importEl.value);
        if (parsed === null) {
          status.fill = QubitSketchColors.xGateColorProperty;
          status.string = strings.errorStringProperty.value;
          return;
        }
        model.loadCircuit(parsed.circuit, parsed.qubitCount);
        dialog?.hide();
      },
    });

    const content = new VBox({
      align: "left",
      spacing: 8,
      children: [
        label(strings.exportLabelStringProperty),
        new DOM(exportEl),
        copyButton,
        label(strings.importLabelStringProperty),
        new DOM(importEl),
        new HBox({ spacing: 10, align: "center", children: [loadButton, status] }),
      ],
    });

    dialog = new Dialog(content, {
      // The default Dialog background is white, but in the default (dark) theme the title/labels
      // use a light text color — light-on-white is unreadable. Theme the dialog panel + close
      // button so the contrast holds in both color profiles (projector was already fine on white).
      fill: QubitSketchColors.panelBackgroundColorProperty,
      stroke: QubitSketchColors.panelBorderColorProperty,
      closeButtonColor: QubitSketchColors.textColorProperty,
      title: new Text(strings.titleStringProperty, {
        font: "bold 16px sans-serif",
        fill: QubitSketchColors.textColorProperty,
      }),
    });
  }

  return () => {
    if (dialog === null) {
      build();
    }
    exportEl.value = circuitToQasm(model.circuitProperty.value, model.qubitCountProperty.value);
    importEl.value = "";
    status.string = "";
    dialog?.show();
  };
}
