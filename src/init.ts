/**
 * init.ts
 *
 * Initializes SceneryStack with simulation metadata.
 *
 * IMPORTANT: This file is the START of the module loading chain:
 *   init.ts → assert.ts → splash.ts → brand.ts → everything else
 *
 * It must run before any other SceneryStack module is imported.
 */
import { init, madeWithSceneryStackSplashDataURI } from "scenerystack/init";

init({
  name: "qubit-sketch",
  version: "0.1.0",
  brand: "made-with-scenerystack",
  locale: "en",
  availableLocales: ["en", "fr"],
  splashDataURI: madeWithSceneryStackSplashDataURI,
  allowLocaleSwitching: true,
  // Register both color profiles so the Projector Mode toggle in the Preferences
  // dialog has a non-projector + projector pair to switch between. These names must
  // match the profile keys used in QubitSketchColors.ts ("default"/"projector").
  colorProfiles: ["default", "projector"],
});
