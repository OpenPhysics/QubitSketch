/**
 * QasmMappings.ts
 *
 * The single source of truth mapping QubitSketch gates to their OpenQASM 2.0 names,
 * shared by the exporter (forward) and importer (reverse lookups derived from these).
 */
import type { GateType, RotationAxis } from "./GateType.js";

/** GateType key → single-qubit qasm gate name. */
export const GATE_TO_QASM: Record<GateType, string> = {
  H: "h",
  X: "x",
  Y: "y",
  Z: "z",
  S: "s",
  T: "t",
  Sdg: "sdg",
  Tdg: "tdg",
  Vx: "sx",
};

/** Rotation axis → (uncontrolled, controlled) qasm gate names. */
export const ROT_TO_QASM: Record<RotationAxis, { single: string; controlled: string }> = {
  X: { single: "rx", controlled: "crx" },
  Y: { single: "ry", controlled: "cry" },
  Z: { single: "rz", controlled: "crz" },
};

/** Single-control forms of fixed gates that exist in qelib1. */
export const SINGLE_CONTROL_QASM: Partial<Record<GateType, string>> = {
  X: "cx",
  Y: "cy",
  Z: "cz",
  H: "ch",
};
