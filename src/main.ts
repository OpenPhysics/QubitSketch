/**
 * main.ts
 *
 * Entry point for QubitSketch. Initializes SceneryStack, creates the circuit
 * screen, and starts the main event loop.
 *
 * !! CRITICAL IMPORT ORDER !!
 * brand.js MUST be the first import. It triggers the full bootstrap chain:
 *   brand.ts → splash.ts → assert.ts → init.ts
 *
 * Never reorder these imports.
 */

// brand.js MUST be first — triggers: init.ts → assert.ts → splash.ts → brand.ts
import "./brand.js";

import { onReadyToLaunch, PreferencesModel, Sim } from "scenerystack/sim";
import { Tandem } from "scenerystack/tandem";
import { StringManager } from "./i18n/StringManager.js";
import { CircuitScreen } from "./circuit-screen/CircuitScreen.js";

onReadyToLaunch(() => {
  const stringManager = StringManager.getInstance();

  const screens = [
    new CircuitScreen({
      name: stringManager.getScreenNames().circuitStringProperty,
      tandem: Tandem.ROOT.createTandem("circuitScreen"),
    }),
  ];

  const sim = new Sim(stringManager.getTitleStringProperty(), screens, {
    preferencesModel: new PreferencesModel({
      visualOptions: {
        supportsProjectorMode: true,
        supportsInteractiveHighlights: true,
      },
    }),
  });

  sim.start();
});
