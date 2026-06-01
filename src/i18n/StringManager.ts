/**
 * StringManager.ts
 *
 * Centralizes all localized string access for QubitSketch.
 * Strings update automatically when the user switches locale in Preferences.
 */
import type { ReadOnlyProperty } from "scenerystack/axon";
import { LocalizedString } from "scenerystack/chipper";
import stringsEn from "./strings_en.json";
import stringsFr from "./strings_fr.json";

// biome-ignore lint/complexity/noVoid: intentional compile-time type assertion
void (stringsEn satisfies typeof stringsFr);
// biome-ignore lint/complexity/noVoid: intentional compile-time type assertion
void (stringsFr satisfies typeof stringsEn);

const stringProperties = LocalizedString.getNestedStringProperties({
  en: stringsEn,
  fr: stringsFr,
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

  public getScreenNames(): {
    readonly circuitStringProperty: ReadOnlyProperty<string>;
  } {
    return {
      circuitStringProperty: stringProperties.screens.circuitStringProperty,
    };
  }
}
