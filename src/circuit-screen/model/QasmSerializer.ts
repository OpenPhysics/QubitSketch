/**
 * QasmSerializer.ts
 *
 * Barrel for the OpenQASM 2.0 interop (a teaching subset, not a full compiler). The
 * implementation is split by direction:
 *   - {@link circuitToQasm} — circuit grid → QASM program (see QasmExport.ts)
 *   - {@link qasmToCircuit} — QASM program → circuit grid (see QasmImport.ts)
 * with the gate-name maps in QasmMappings.ts and the angle formatter/parser in QasmAngle.ts.
 */
export { circuitToQasm } from "./QasmExport.js";
export { qasmToCircuit } from "./QasmImport.js";
