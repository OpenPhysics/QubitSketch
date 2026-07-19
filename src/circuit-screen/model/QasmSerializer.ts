/**
 * QasmSerializer.ts
 *
 * Converts a circuit grid to / from OpenQASM 2.0, for copy-into-Qiskit interop.
 * This is a teaching subset, not a full QASM compiler:
 *
 *   - Exports the gates QubitSketch supports (h, x, y, z, s, t, sdg, tdg, sx, rx/ry/rz)
 *     plus the common controlled forms in qelib1 (cx, cy, cz, ch, ccx, crx, cry, crz)
 *     and swap. Anti-controls (◦) are emitted by conjugating the control wire with x.
 *   - Anything OpenQASM 2.0 can't express directly (e.g. a controlled-S, or 3+ controls)
 *     is emitted as a clear `// unsupported` comment rather than incorrect output.
 *   - {@link qasmToCircuit} parses back the same subset, packing the sequential statements
 *     greedily into circuit columns. It is tolerant: unsupported input yields null.
 *
 * Endianness note: qubit `q[k]` maps to circuit row k (qubit 0 = least-significant bit).
 */
import type { CircuitCell, GateType, RotationAxis } from "./GateType.js";
import { cellGate, MAX_QUBITS, MIN_QUBITS, NUM_STEPS } from "./GateType.js";

/** GateType key → single-qubit qasm gate name. */
const GATE_TO_QASM: Record<GateType, string> = {
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
const ROT_TO_QASM: Record<RotationAxis, { single: string; controlled: string }> = {
  X: { single: "rx", controlled: "crx" },
  Y: { single: "ry", controlled: "cry" },
  Z: { single: "rz", controlled: "crz" },
};

/** Single-control forms of fixed gates that exist in qelib1. */
const SINGLE_CONTROL_QASM: Partial<Record<GateType, string>> = {
  X: "cx",
  Y: "cy",
  Z: "cz",
  H: "ch",
};

/** A gate-bearing cell reduced to what export/import need. */
type GateTarget = { wire: number } & (
  | { kind: "gate"; gate: GateType }
  | { kind: "rot"; axis: RotationAxis; theta: number }
);

/** Formats a rotation angle (radians) compactly, e.g. 1.5707963 → "1.570796". */
function formatAngle(theta: number): string {
  return String(Math.round(theta * 1e6) / 1e6);
}

/** Builds the controlled-operation statement for `controls` → `target`, or null if 2.0 can't express it. */
function controlledStatement(controls: readonly number[], target: GateTarget): string | null {
  const targets = `q[${target.wire}]`;
  if (controls.length === 1) {
    const c = `q[${controls[0]}]`;
    if (target.kind === "gate") {
      const name = SINGLE_CONTROL_QASM[target.gate];
      return name ? `${name} ${c},${targets};` : null;
    }
    return `${ROT_TO_QASM[target.axis].controlled}(${formatAngle(target.theta)}) ${c},${targets};`;
  }
  if (controls.length === 2 && target.kind === "gate" && target.gate === "X") {
    return `ccx q[${controls[0]}],q[${controls[1]}],${targets};`;
  }
  return null;
}

/** Builds the single-qubit statement for a gate-bearing cell. */
function singleStatement(target: GateTarget): string {
  if (target.kind === "rot") {
    return `${ROT_TO_QASM[target.axis].single}(${formatAngle(target.theta)}) q[${target.wire}];`;
  }
  return `${GATE_TO_QASM[target.gate]} q[${target.wire}];`;
}

/** Reduces a cell to a {@link GateTarget}, or null if it bears no gate. */
function gateTarget(cell: CircuitCell, wire: number): GateTarget | null {
  if (cell.kind === "paramGate") {
    return { wire, kind: "rot", axis: cell.axis, theta: cell.theta };
  }
  const gate = cellGate(cell);
  return gate === null ? null : { wire, kind: "gate", gate };
}

/** Emits the statements for one circuit column into `lines`. */
function columnToQasm(
  circuit: ReadonlyArray<ReadonlyArray<CircuitCell>>,
  n: number,
  step: number,
  lines: string[],
): void {
  const onControls: number[] = [];
  const offControls: number[] = [];
  const swapWires: number[] = [];
  const gateTargets: GateTarget[] = [];

  for (let q = 0; q < n; q++) {
    const cell = circuit[q]?.[step];
    if (cell === undefined || cell.kind === "empty") {
      continue;
    }
    if (cell.kind === "control") {
      onControls.push(q);
    } else if (cell.kind === "antiControl") {
      offControls.push(q);
    } else if (cell.kind === "swap") {
      swapWires.push(q);
    } else {
      const target = gateTarget(cell, q);
      if (target !== null) {
        gateTargets.push(target);
      }
    }
  }

  const hasControl = onControls.length > 0 || offControls.length > 0;

  if (swapWires.length === 2 && !hasControl) {
    lines.push(`swap q[${swapWires[0]}],q[${swapWires[1]}];`);
    return;
  }

  if (hasControl) {
    const target = gateTargets[0];
    if (target === undefined) {
      return; // stray controls with no target — a no-op, like the simulator
    }
    // Anti-controls (◦) become positive controls conjugated by x on those wires.
    for (const a of offControls) {
      lines.push(`x q[${a}];`);
    }
    const stmt = controlledStatement([...onControls, ...offControls], target);
    const label = target.kind === "rot" ? `controlled-${ROT_TO_QASM[target.axis].single}` : `controlled-${target.gate}`;
    lines.push(
      stmt ?? `// unsupported in OpenQASM 2.0: ${label} with ${onControls.length + offControls.length} control(s)`,
    );
    for (const a of offControls) {
      lines.push(`x q[${a}];`);
    }
    return;
  }

  for (const target of gateTargets) {
    lines.push(singleStatement(target));
  }
}

/** Encodes the circuit (first `qubitCount` wires) as an OpenQASM 2.0 program. */
export function circuitToQasm(circuit: ReadonlyArray<ReadonlyArray<CircuitCell>>, qubitCount: number): string {
  const lines: string[] = [
    "OPENQASM 2.0;",
    'include "qelib1.inc";',
    `qreg q[${qubitCount}];`,
    `creg c[${qubitCount}];`,
  ];
  for (let step = 0; step < NUM_STEPS; step++) {
    columnToQasm(circuit, qubitCount, step, lines);
  }
  return `${lines.join("\n")}\n`;
}

// ── Import (OpenQASM 2.0 → circuit) ──────────────────────────────────────────

// Reverse lookup tables.
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

/** Evaluates a rotation-angle expression over numbers, `pi`, and + − × ÷ with parentheses. */
function parseAngle(expr: string): number | null {
  const matched = expr.toLowerCase().match(/(\d+\.?\d*|\.\d+|pi|[()+\-*/])/g);
  if (matched === null) {
    return null;
  }
  const tokens: string[] = matched;
  let pos = 0;
  const peek = (): string | undefined => tokens[pos];

  // Recursive descent: expr = term (('+'|'-') term)*; term = factor (('*'|'/') factor)*.
  function parseExpr(): number | null {
    let value = parseTerm();
    if (value === null) {
      return null;
    }
    while (peek() === "+" || peek() === "-") {
      const op = tokens[pos++];
      const rhs = parseTerm();
      if (rhs === null) {
        return null;
      }
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  }
  function parseTerm(): number | null {
    let value = parseFactor();
    if (value === null) {
      return null;
    }
    while (peek() === "*" || peek() === "/") {
      const op = tokens[pos++];
      const rhs = parseFactor();
      if (rhs === null) {
        return null;
      }
      value = op === "*" ? value * rhs : value / rhs;
    }
    return value;
  }
  function parseFactor(): number | null {
    const tok = peek();
    if (tok === undefined) {
      return null;
    }
    if (tok === "-") {
      pos++;
      const v = parseFactor();
      return v === null ? null : -v;
    }
    if (tok === "+") {
      pos++;
      return parseFactor();
    }
    if (tok === "(") {
      pos++;
      const v = parseExpr();
      if (v === null || tokens[pos++] !== ")") {
        return null;
      }
      return v;
    }
    if (tok === "pi") {
      pos++;
      return Math.PI;
    }
    const num = Number.parseFloat(tok);
    if (Number.isNaN(num)) {
      return null;
    }
    pos++;
    return num;
  }

  const result = parseExpr();
  return result === null || pos !== tokens.length ? null : result;
}

/** Parses `name[index]` qubit operands, returning their indices (null if any is malformed). */
function parseOperands(operandStr: string): number[] | null {
  const parts = operandStr
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const indices: number[] = [];
  for (const part of parts) {
    const m = part.match(/^[A-Za-z_]\w*\s*\[\s*(\d+)\s*\]$/);
    if (m === null) {
      return null;
    }
    indices.push(Number.parseInt(m[1]!, 10));
  }
  return indices;
}

/** One parsed operation: cells that must share a column, and the inclusive wire span it reserves. */
type ParsedOp = { placements: Array<{ wire: number; cell: CircuitCell }>; spanLo: number; spanHi: number };

/** Reserves the inclusive span across the involved wires (so the column's semantics stay intact). */
function spanOp(placements: Array<{ wire: number; cell: CircuitCell }>): ParsedOp {
  const wires = placements.map((p) => p.wire);
  return { placements, spanLo: Math.min(...wires), spanHi: Math.max(...wires) };
}

/** Turns one gate statement into a {@link ParsedOp}, or null if it is unsupported / malformed. */
function parseGateStatement(name: string, param: string | undefined, operands: number[]): ParsedOp | null {
  const angle = (): number | null => (param === undefined ? null : parseAngle(param));

  // Single-qubit fixed gate.
  if (name in QASM_TO_GATE && operands.length === 1) {
    return spanOp([{ wire: operands[0]!, cell: { kind: "gate", gate: QASM_TO_GATE[name]! } }]);
  }
  // Single-qubit rotation.
  if (name in QASM_TO_AXIS && operands.length === 1) {
    const theta = angle();
    return theta === null
      ? null
      : spanOp([{ wire: operands[0]!, cell: { kind: "paramGate", axis: QASM_TO_AXIS[name]!, theta } }]);
  }
  // Single-control fixed gate (cx, cy, cz, ch).
  if (name in QASM_CONTROL_TO_GATE && operands.length === 2) {
    return spanOp([
      { wire: operands[0]!, cell: { kind: "control" } },
      { wire: operands[1]!, cell: { kind: "controlledTarget", gate: QASM_CONTROL_TO_GATE[name]! } },
    ]);
  }
  // Single-control rotation (crx, cry, crz).
  if (name in QASM_CONTROL_TO_AXIS && operands.length === 2) {
    const theta = angle();
    return theta === null
      ? null
      : spanOp([
          { wire: operands[0]!, cell: { kind: "control" } },
          { wire: operands[1]!, cell: { kind: "paramGate", axis: QASM_CONTROL_TO_AXIS[name]!, theta } },
        ]);
  }
  // Toffoli.
  if (name === "ccx" && operands.length === 3) {
    return spanOp([
      { wire: operands[0]!, cell: { kind: "control" } },
      { wire: operands[1]!, cell: { kind: "control" } },
      { wire: operands[2]!, cell: { kind: "controlledTarget", gate: "X" } },
    ]);
  }
  // Swap.
  if (name === "swap" && operands.length === 2) {
    return spanOp([
      { wire: operands[0]!, cell: { kind: "swap" } },
      { wire: operands[1]!, cell: { kind: "swap" } },
    ]);
  }
  return null;
}

/**
 * Parses an OpenQASM 2.0 program (the subset {@link circuitToQasm} emits, plus common
 * equivalents like `pi`-valued angles) into a circuit grid. Returns null on anything it
 * cannot represent — an unknown gate, more than one qreg, or a circuit too wide/tall.
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
      if (declaredQubits !== null) {
        return null; // multiple quantum registers are unsupported
      }
      const reg = rest.match(/^[A-Za-z_]\w*\s*\[\s*(\d+)\s*\]$/);
      if (reg === null || reg[1] === undefined) {
        return null;
      }
      declaredQubits = Number.parseInt(reg[1], 10);
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

  // Greedy column packing: each op takes the earliest column where its whole span is free.
  const circuit: CircuitCell[][] = Array.from({ length: MAX_QUBITS }, () =>
    Array.from({ length: NUM_STEPS }, (): CircuitCell => ({ kind: "empty" })),
  );
  const nextFree: number[] = Array.from({ length: MAX_QUBITS }, () => 0);

  for (const op of ops) {
    let col = 0;
    for (let w = op.spanLo; w <= op.spanHi; w++) {
      col = Math.max(col, nextFree[w]!);
    }
    if (col >= NUM_STEPS) {
      return null; // circuit is deeper than the fixed grid
    }
    for (const { wire, cell } of op.placements) {
      circuit[wire]![col] = cell;
    }
    for (let w = op.spanLo; w <= op.spanHi; w++) {
      nextFree[w] = col + 1;
    }
  }

  return { circuit, qubitCount };
}
