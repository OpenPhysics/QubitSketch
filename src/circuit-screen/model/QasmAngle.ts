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

/**
 * Matches one token: a number (with an optional exponent), `pi`, an operator/paren, or — via the
 * trailing `.` catch-all — any single unrecognized character.
 *
 * The exponent branch and the catch-all both matter. Without the exponent, `1e-3` tokenizes as
 * `1`, `-`, `3` and evaluates to −2; without the catch-all, unrecognized characters are dropped
 * silently instead of failing the parse. Both are silent-wrong-answer bugs, so every character of
 * the input has to land in exactly one token and be accounted for by the caller's `pos` check.
 */
const ANGLE_TOKEN = /(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?|pi|[()+\-*/]|./g;

/** Evaluates a rotation-angle expression over numbers, `pi`, and + − × ÷ with parentheses. */
export function parseAngle(expr: string): number | null {
  const matched = expr.toLowerCase().replace(/\s+/g, "").match(ANGLE_TOKEN);
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
    // An unrecognized character (matched by ANGLE_TOKEN's catch-all) parses to NaN and rejects the
    // program. Non-finite values are rejected too: an absurd exponent like 1e999 would otherwise
    // reach rotationMatrix and poison every amplitude with NaN.
    const num = Number.parseFloat(tok);
    if (!Number.isFinite(num)) {
      return null;
    }
    pos++;
    return num;
  }

  const result = parseExpr();
  // `pos !== tokens.length` means trailing junk the grammar could not consume. The finiteness
  // check also catches an expression that overflows or divides by zero (e.g. "pi/0").
  if (result === null || pos !== tokens.length || !Number.isFinite(result)) {
    return null;
  }
  return result;
}
