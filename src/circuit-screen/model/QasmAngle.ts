/**
 * QasmAngle.ts
 *
 * Rotation-angle formatting and parsing for QASM interop. `formatAngle` renders radians
 * compactly for export; `parseAngle` is a small recursive-descent evaluator over numbers,
 * `pi`, and + − × ÷ with parentheses, for the angle expressions QASM programs use on import.
 */

/** Formats a rotation angle (radians) compactly, e.g. 1.5707963 → "1.570796". */
export function formatAngle(theta: number): string {
  return String(Math.round(theta * 1e6) / 1e6);
}

/** Evaluates a rotation-angle expression over numbers, `pi`, and + − × ÷ with parentheses. */
export function parseAngle(expr: string): number | null {
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
