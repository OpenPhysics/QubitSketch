/**
 * StringManager.ts
 *
 * Centralizes all localized string access for QubitSketch.
 * Strings update automatically when the user switches locale in Preferences.
 */
import type { ReadOnlyProperty } from "scenerystack/axon";
import { LocalizedString } from "scenerystack/chipper";
import type { SelectedTool } from "../circuit-screen/model/GateType.js";
import stringsEn from "./strings_en.json";
import stringsEs from "./strings_es.json";
import stringsFr from "./strings_fr.json";

// ── Compile-time key-parity check ─────────────────────────────────────────────
// satisfies errors immediately if either locale file is missing keys from the other.
// biome-ignore lint/complexity/noVoid: intentional compile-time type assertion
void (stringsEn satisfies typeof stringsFr);
// biome-ignore lint/complexity/noVoid: intentional compile-time type assertion
void (stringsFr satisfies typeof stringsEn);

const stringProperties = LocalizedString.getNestedStringProperties({
  en: stringsEn,
  fr: stringsFr,
  es: stringsEs,
});

export class StringManager {
  private static instance: StringManager | null = null;

  private constructor() {}

  public static getInstance(): StringManager {
    if (StringManager.instance === null) {
      StringManager.instance = new StringManager();
    }
    return StringManager.instance;
  }

  public getTitleStringProperty(): ReadOnlyProperty<string> {
    return stringProperties.titleStringProperty;
  }

  /**
   * Accessibility (Interactive Description) StringProperties: the screen-summary
   * regions and the live current-details template. See the shared OpenPhysics
   * ACCESSIBILITY.md convention.
   */
  public getA11yStrings() {
    return stringProperties.a11y;
  }

  public getScreenNames(): {
    readonly circuitStringProperty: ReadOnlyProperty<string>;
  } {
    return {
      circuitStringProperty: stringProperties.screens.circuitStringProperty,
    };
  }

  /** Titles for the four simulation displays. */
  public getDisplayTitles(): {
    readonly probabilitiesStringProperty: ReadOnlyProperty<string>;
    readonly amplitudesStringProperty: ReadOnlyProperty<string>;
    readonly blochStringProperty: ReadOnlyProperty<string>;
    readonly measurementStringProperty: ReadOnlyProperty<string>;
  } {
    return {
      probabilitiesStringProperty: stringProperties.displays.probabilitiesStringProperty,
      amplitudesStringProperty: stringProperties.displays.amplitudesStringProperty,
      blochStringProperty: stringProperties.displays.blochStringProperty,
      measurementStringProperty: stringProperties.displays.measurementStringProperty,
    };
  }

  /** Column headers for the amplitude table. */
  public getTableHeaders(): {
    readonly stateStringProperty: ReadOnlyProperty<string>;
    readonly amplitudeStringProperty: ReadOnlyProperty<string>;
    readonly magnitudeStringProperty: ReadOnlyProperty<string>;
    readonly phaseStringProperty: ReadOnlyProperty<string>;
  } {
    return {
      stateStringProperty: stringProperties.table.stateStringProperty,
      amplitudeStringProperty: stringProperties.table.amplitudeStringProperty,
      magnitudeStringProperty: stringProperties.table.magnitudeStringProperty,
      phaseStringProperty: stringProperties.table.phaseStringProperty,
    };
  }

  /** Labels for the measurement buttons. */
  public getButtonLabels(): {
    readonly measureStringProperty: ReadOnlyProperty<string>;
    readonly clearShotsStringProperty: ReadOnlyProperty<string>;
  } {
    return {
      measureStringProperty: stringProperties.buttons.measureStringProperty,
      clearShotsStringProperty: stringProperties.buttons.clearShotsStringProperty,
    };
  }

  /** Labels for the rotation-gate angle inspector. */
  public getInspectorStrings(): {
    readonly angleStringProperty: ReadOnlyProperty<string>;
  } {
    return {
      angleStringProperty: stringProperties.inspector.angleStringProperty,
    };
  }

  /** Labels for the step-through inspect transport. */
  public getInspectStrings(): {
    readonly liveStringProperty: ReadOnlyProperty<string>;
  } {
    return {
      liveStringProperty: stringProperties.inspect.liveStringProperty,
    };
  }

  /** Labels for the OpenQASM export/import dialog. */
  public getQasmStrings(): {
    readonly buttonStringProperty: ReadOnlyProperty<string>;
    readonly titleStringProperty: ReadOnlyProperty<string>;
    readonly exportLabelStringProperty: ReadOnlyProperty<string>;
    readonly importLabelStringProperty: ReadOnlyProperty<string>;
    readonly copyStringProperty: ReadOnlyProperty<string>;
    readonly copiedStringProperty: ReadOnlyProperty<string>;
    readonly loadStringProperty: ReadOnlyProperty<string>;
    readonly errorStringProperty: ReadOnlyProperty<string>;
  } {
    const q = stringProperties.qasm;
    return {
      buttonStringProperty: q.buttonStringProperty,
      titleStringProperty: q.titleStringProperty,
      exportLabelStringProperty: q.exportLabelStringProperty,
      importLabelStringProperty: q.importLabelStringProperty,
      copyStringProperty: q.copyStringProperty,
      copiedStringProperty: q.copiedStringProperty,
      loadStringProperty: q.loadStringProperty,
      errorStringProperty: q.errorStringProperty,
    };
  }

  /** Label, placeholder, and per-preset names for the Example Circuits dropdown. */
  public getExampleStrings(): {
    readonly labelStringProperty: ReadOnlyProperty<string>;
    readonly chooseStringProperty: ReadOnlyProperty<string>;
    readonly names: Record<string, ReadOnlyProperty<string>>;
  } {
    const e = stringProperties.examples;
    return {
      labelStringProperty: e.labelStringProperty,
      chooseStringProperty: e.chooseStringProperty,
      names: {
        bell: e.bellStringProperty,
        ghz: e.ghzStringProperty,
        chsh: e.chshStringProperty,
        teleport: e.teleportStringProperty,
        superdense: e.superdenseStringProperty,
        eraser: e.eraserStringProperty,
        symmetry: e.symmetryStringProperty,
        grover: e.groverStringProperty,
        qft: e.qftStringProperty,
        adder: e.adderStringProperty,
      },
    };
  }

  /** One-line descriptions for each palette tool, keyed by {@link SelectedTool}. */
  public getToolDescriptions(): Record<SelectedTool, ReadOnlyProperty<string>> {
    const d = stringProperties.descriptions;
    return {
      H: d.HStringProperty,
      X: d.XStringProperty,
      Y: d.YStringProperty,
      Z: d.ZStringProperty,
      S: d.SStringProperty,
      T: d.TStringProperty,
      Sdg: d.SdgStringProperty,
      Tdg: d.TdgStringProperty,
      Vx: d.VxStringProperty,
      Rx: d.RxStringProperty,
      Ry: d.RyStringProperty,
      Rz: d.RzStringProperty,
      control: d.controlStringProperty,
      antiControl: d.antiControlStringProperty,
      swap: d.swapStringProperty,
      eraser: d.eraserStringProperty,
    };
  }
}
