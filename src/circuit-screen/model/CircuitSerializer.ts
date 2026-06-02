/**
 * CircuitSerializer.ts
 *
 * Encodes a circuit grid + qubit count to a compact JSON string and back, for
 * shareable URLs. Each cell becomes a short tagged token:
 *   "."         empty
 *   "g<KEY>"    gate            (e.g. "gH", "gSdg")
 *   "t<KEY>"    controlled target
 *   "c"         control (•)
 *   "a"         anti-control (◦)
 *   "s"         swap endpoint (✕)
 *   "p<AXIS><θ>" parametrized rotation (e.g. "pX1.5708")
 *
 * `deserialize` is deliberately tolerant: any malformed input yields null rather
 * than throwing, so a bad URL just falls back to an empty circuit.
 */
import type { CircuitCell, GateType, RotationAxis } from "./GateType.js";
import { EMPTY_CELL, GateType as GateTypeValues, MAX_QUBITS, MIN_QUBITS, NUM_STEPS } from "./GateType.js";

const FORMAT_VERSION = 1;
const GATE_KEYS = new Set<string>(Object.values(GateTypeValues));

function cellToken(cell: CircuitCell): string {
  switch (cell.kind) {
    case "empty":
      return ".";
    case "gate":
      return `g${cell.gate}`;
    case "controlledTarget":
      return `t${cell.gate}`;
    case "control":
      return "c";
    case "antiControl":
      return "a";
    case "swap":
      return "s";
    case "paramGate":
      return `p${cell.axis}${cell.theta}`;
  }
}

function parseToken(token: string): CircuitCell | null {
  if (token === "" || token === ".") {
    return EMPTY_CELL;
  }
  const tag = token[0];
  const rest = token.slice(1);
  if (tag === "g" || tag === "t") {
    if (!GATE_KEYS.has(rest)) {
      return null;
    }
    const gate = rest as GateType;
    return tag === "g" ? { kind: "gate", gate } : { kind: "controlledTarget", gate };
  }
  if (tag === "c") {
    return { kind: "control" };
  }
  if (tag === "a") {
    return { kind: "antiControl" };
  }
  if (tag === "s") {
    return { kind: "swap" };
  }
  if (tag === "p") {
    const axis = rest[0];
    if (axis !== "X" && axis !== "Y" && axis !== "Z") {
      return null;
    }
    const theta = Number.parseFloat(rest.slice(1));
    if (!Number.isFinite(theta)) {
      return null;
    }
    return { kind: "paramGate", axis: axis as RotationAxis, theta };
  }
  return null;
}

/** Encodes the full circuit grid and qubit count to a compact JSON string. */
export function serialize(circuit: ReadonlyArray<ReadonlyArray<CircuitCell>>, qubitCount: number): string {
  const rows = circuit.map((row) => row.map(cellToken).join(","));
  return JSON.stringify({ v: FORMAT_VERSION, q: qubitCount, c: rows });
}

/** Parses a string produced by {@link serialize}; returns null on any malformed input. */
export function deserialize(text: string): { circuit: CircuitCell[][]; qubitCount: number } | null {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof obj !== "object" || obj === null) {
    return null;
  }
  const record = obj as { v?: unknown; q?: unknown; c?: unknown };
  if (record.v !== FORMAT_VERSION || !Array.isArray(record.c)) {
    return null;
  }
  const rows = record.c as unknown[];

  const rawCount = typeof record.q === "number" ? record.q : 1;
  const qubitCount = Math.max(MIN_QUBITS, Math.min(MAX_QUBITS, Math.round(rawCount)));

  const circuit: CircuitCell[][] = [];
  for (let q = 0; q < MAX_QUBITS; q++) {
    const rowStr = typeof rows[q] === "string" ? (rows[q] as string) : "";
    const tokens = rowStr === "" ? [] : rowStr.split(",");
    const row: CircuitCell[] = [];
    for (let s = 0; s < NUM_STEPS; s++) {
      row.push(parseToken(tokens[s] ?? ".") ?? EMPTY_CELL);
    }
    circuit.push(row);
  }

  return { circuit, qubitCount };
}
