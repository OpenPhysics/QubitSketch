/**
 * qubitSketchQueryParameters.ts
 *
 * Sim-specific startup query parameters for QubitSketch. All entries are public
 * and provide the initial values for the sim-specific preferences in
 * QubitSketchPreferencesModel.
 *
 * Usage: append e.g. `?qubits=4` to the sim URL.
 */

import { logGlobal } from "scenerystack/phet-core";
import { QueryStringMachine } from "scenerystack/query-string-machine";
import { DEFAULT_QUBITS, MAX_QUBITS, MIN_QUBITS } from "../circuit-screen/model/GateType.js";
import QubitSketchNamespace from "../QubitSketchNamespace.js";

const qubitSketchQueryParameters = QueryStringMachine.getAll({
  /** Initial number of visible qubit wires. */
  qubits: {
    type: "number" as const,
    defaultValue: DEFAULT_QUBITS,
    public: true,
    isValidValue: (value: number) => Number.isInteger(value) && value >= MIN_QUBITS && value <= MAX_QUBITS,
  },
});

QubitSketchNamespace.register("qubitSketchQueryParameters", qubitSketchQueryParameters);

// Log query parameters (for the console / PhET-iO).
logGlobal("phet.chipper.queryParameters");

export default qubitSketchQueryParameters;
