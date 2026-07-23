/**
 * QasmImport.ts
 *
 * OpenQASM 2.0 → circuit grid (the subset {@link circuitToQasm} emits, plus common
 * equivalents like `pi`-valued angles). Sequential statements are packed greedily into
 * circuit columns. Tolerant: anything it cannot represent yields null.
 *
 * Endianness note: qubit `q[k]` maps to circuit row k (qubit 0 = least-significant bit).
 */
import type { MutableGrid } from "./CircuitGrid.js";
import { emptyGrid } from "./CircuitGrid.js";
import type { CircuitCell, GateType, RotationAxis } from "./GateType.js";
import { MAX_QUBITS, MIN_QUBITS, NUM_STEPS } from "./GateType.js";
import { parseAngle } from "./QasmAngle.js";
import { GATE_TO_QASM, SINGLE_CONTROL_QASM } from "./QasmMappings.js";

// Reverse lookup tables, derived from the forward maps so the two directions cannot drift.
const QASM_TO_GATE: Record<string, GateType> = Object.fromEntries(
  Object.entries(GATE_TO_QASM).map(([gate, name]) => [name, gate as GateType]),
) as Record<string, GateType>;
const QASM_CONTROL_TO_GATE: Record<string, GateType> = Object.fromEntries(
  Object.entries(SINGLE_CONTROL_QASM).map(([gate, name]) => [name as string, gate as GateType]),
) as Record<string, GateType>;
const QASM_TO_AXIS: Record<string, RotationAxis> = { rx: "X", ry: "Y", rz: "Z" };
const QASM_CONTROL_TO_AXIS: Record<string, RotationAxis> = { crx: "X", cry: "Y", crz: "Z" };

/** Statements with no effect on our unitary, statevector model — silently ignored on import. */
const IGNORED_STATEMENTS = new Set(["openqasm", "include", "creg", "barrier", "measure"]);

/** Parses `name[index]` qubit operands, returning their indices (null if any is malformed). */
function parseOperands(operandStr: string): number[] | null {
  const parts = operandStr
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const indices: number[] = [];
  for (const part of parts) {
    const m = part.match(/^[A-Za-z_]\w*\s*\[\s*(\d+)\s*\]$/);
    const digits = m?.[1];
    if (digits === undefined) {
      return null;
    }
    indices.push(Number.parseInt(digits, 10));
  }
  return indices;
}

/**
 * One parsed operation: cells that must share a column, and the inclusive wire span it reserves.
 * `exclusive` ops (a controlled operation or a SWAP pair) must own their whole column — under the
 * v1 column rules the simulator would silently drop any other gate sharing it.
 */
type ParsedOp = {
  placements: Array<{ wire: number; cell: CircuitCell }>;
  spanLo: number;
  spanHi: number;
  exclusive: boolean;
};

/** Reserves the inclusive span across the involved wires (so the column's semantics stay intact). */
function spanOp(placements: Array<{ wire: number; cell: CircuitCell }>): ParsedOp {
  const wires = placements.map((p) => p.wire);
  const exclusive = placements.some((p) => p.cell.kind === "control" || p.cell.kind === "swap");
  return { placements, spanLo: Math.min(...wires), spanHi: Math.max(...wires), exclusive };
}

/** Single-qubit gate/rotation (one operand), or null if unsupported / malformed. */
function parseSingleQubitStatement(name: string, param: string | undefined, operands: number[]): ParsedOp | null {
  if (operands.length !== 1) {
    return null;
  }
  const [wire] = operands;
  if (wire === undefined) {
    return null;
  }
  if (name in QASM_TO_GATE) {
    const gate = QASM_TO_GATE[name];
    return gate === undefined ? null : spanOp([{ wire, cell: { kind: "gate", gate } }]);
  }
  if (name in QASM_TO_AXIS) {
    const axis = QASM_TO_AXIS[name];
    const theta = param === undefined ? null : parseAngle(param);
    return axis === undefined || theta === null ? null : spanOp([{ wire, cell: { kind: "paramGate", axis, theta } }]);
  }
  return null;
}

/** Controlled / SWAP / Toffoli gate (two or three operands), or null if unsupported / malformed. */
function parseMultiQubitStatement(name: string, param: string | undefined, operands: number[]): ParsedOp | null {
  const [a, b, c] = operands;

  // Single-control fixed gate (cx, cy, cz, ch).
  if (name in QASM_CONTROL_TO_GATE && operands.length === 2 && a !== undefined && b !== undefined) {
    const gate = QASM_CONTROL_TO_GATE[name];
    return gate === undefined
      ? null
      : spanOp([
          { wire: a, cell: { kind: "control" } },
          { wire: b, cell: { kind: "controlledTarget", gate } },
        ]);
  }
  // Single-control rotation (crx, cry, crz).
  if (name in QASM_CONTROL_TO_AXIS && operands.length === 2 && a !== undefined && b !== undefined) {
    const axis = QASM_CONTROL_TO_AXIS[name];
    const theta = param === undefined ? null : parseAngle(param);
    return axis === undefined || theta === null
      ? null
      : spanOp([
          { wire: a, cell: { kind: "control" } },
          { wire: b, cell: { kind: "paramGate", axis, theta } },
        ]);
  }
  // Toffoli.
  if (name === "ccx" && operands.length === 3 && a !== undefined && b !== undefined && c !== undefined) {
    return spanOp([
      { wire: a, cell: { kind: "control" } },
      { wire: b, cell: { kind: "control" } },
      { wire: c, cell: { kind: "controlledTarget", gate: "X" } },
    ]);
  }
  // Swap.
  if (name === "swap" && operands.length === 2 && a !== undefined && b !== undefined) {
    return spanOp([
      { wire: a, cell: { kind: "swap" } },
      { wire: b, cell: { kind: "swap" } },
    ]);
  }
  return null;
}

/** Turns one gate statement into a {@link ParsedOp}, or null if it is unsupported / malformed. */
function parseGateStatement(name: string, param: string | undefined, operands: number[]): ParsedOp | null {
  return parseSingleQubitStatement(name, param, operands) ?? parseMultiQubitStatement(name, param, operands);
}

/** Parses the size out of a `qreg name[N]` declaration body, or null if malformed. */
function parseQregSize(rest: string): number | null {
  const reg = rest.match(/^[A-Za-z_]\w*\s*\[\s*(\d+)\s*\]$/);
  return reg?.[1] === undefined ? null : Number.parseInt(reg[1], 10);
}

/**
 * Parses an OpenQASM 2.0 program into a circuit grid. Returns null on anything it cannot
 * represent — an unknown gate, more than one qreg, or a circuit too wide/tall.
 */
export function qasmToCircuit(qasm: string): { circuit: CircuitCell[][]; qubitCount: number } | null {
  // Strip // line comments and /* */ block comments, then split on ';'.
  const cleaned = qasm.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const statements = cleaned
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  let declaredQubits: number | null = null;
  let maxWire = -1;
  const ops: ParsedOp[] = [];

  for (const stmt of statements) {
    const m = stmt.match(/^([A-Za-z_]\w*)\s*(?:\(([^)]*)\))?\s*([\s\S]*)$/);
    if (m === null) {
      return null;
    }
    const name = (m[1] ?? "").toLowerCase();
    const param = m[2];
    const rest = (m[3] ?? "").trim();

    if (name === "qreg") {
      // Multiple quantum registers are unsupported.
      declaredQubits = declaredQubits === null ? parseQregSize(rest) : null;
      if (declaredQubits === null) {
        return null;
      }
      continue;
    }
    if (IGNORED_STATEMENTS.has(name)) {
      continue;
    }

    const operands = parseOperands(rest);
    if (operands === null) {
      return null;
    }
    const op = parseGateStatement(name, param, operands);
    if (op === null) {
      return null;
    }
    for (const wire of operands) {
      maxWire = Math.max(maxWire, wire);
    }
    ops.push(op);
  }

  const qubitCount = Math.max(declaredQubits ?? 0, maxWire + 1);
  if (qubitCount < MIN_QUBITS || qubitCount > MAX_QUBITS) {
    return null;
  }

  const circuit = packOpsIntoColumns(ops);
  return circuit === null ? null : { circuit, qubitCount };
}

/**
 * Greedy column packing: each op takes the earliest column where its whole span is free AND
 * the column's occupancy is compatible with the v1 column rules — plain single-qubit gates may
 * share a column, but a controlled op or SWAP pair owns its column outright (the simulator
 * would silently drop anything else placed there). Skipping ahead is safe: ops that end up in
 * different columns act on disjoint wires, so they commute. Returns null if the program is
 * deeper than the fixed grid.
 */
function packOpsIntoColumns(ops: readonly ParsedOp[]): MutableGrid | null {
  const circuit = emptyGrid();
  const nextFree: number[] = Array.from({ length: MAX_QUBITS }, () => 0);
  const columnState: Array<"empty" | "gates" | "exclusive"> = Array.from({ length: NUM_STEPS }, () => "empty");

  for (const op of ops) {
    let col = 0;
    for (let w = op.spanLo; w <= op.spanHi; w++) {
      col = Math.max(col, nextFree[w] ?? 0);
    }
    while (col < NUM_STEPS && (columnState[col] === "exclusive" || (op.exclusive && columnState[col] !== "empty"))) {
      col++;
    }
    if (col >= NUM_STEPS) {
      return null;
    }
    for (const { wire, cell } of op.placements) {
      const row = circuit[wire];
      if (row !== undefined) {
        row[col] = cell;
      }
    }
    columnState[col] = op.exclusive ? "exclusive" : "gates";
    for (let w = op.spanLo; w <= op.spanHi; w++) {
      nextFree[w] = col + 1;
    }
  }
  return circuit;
}
