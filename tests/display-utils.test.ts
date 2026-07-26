/**
 * display-utils.test.ts
 *
 * Formatting tests for the amplitude/phase display helpers. These strings sit next to each other
 * in a monospace column, so sign glyphs have to be consistent and a rounded-to-zero value must
 * not read as negative.
 */
import { Complex } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import { formatComplex, formatPhase, ketLabel } from "../src/circuit-screen/view/displayUtils.js";

const MINUS = "−"; // U+2212
const HYPHEN = "-"; // U+002D

describe("formatComplex", () => {
  it("uses a true minus sign for both parts, never an ASCII hyphen", () => {
    const text = formatComplex(new Complex(-Math.SQRT1_2, -Math.SQRT1_2));
    expect(text).not.toContain(HYPHEN);
    expect(text).toBe(`${MINUS}0.71${MINUS}0.71i`);
  });

  it("formats the ordinary cases", () => {
    expect(formatComplex(new Complex(Math.SQRT1_2, 0))).toBe("0.71+0.00i");
    expect(formatComplex(new Complex(0, 1))).toBe("0.00+1.00i");
    expect(formatComplex(new Complex(1, 0))).toBe("1.00+0.00i");
    expect(formatComplex(new Complex(0.5, -0.5))).toBe(`0.50${MINUS}0.50i`);
  });

  it("does not render a negative zero", () => {
    // A tiny negative component rounds to zero; showing "−0.00" would imply a sign that is not there.
    expect(formatComplex(new Complex(-1e-9, -1e-9))).toBe("0.00+0.00i");
    expect(formatComplex(new Complex(-0.001, 0.5))).toBe("0.00+0.50i");
  });

  it("honors the digits argument", () => {
    expect(formatComplex(new Complex(Math.SQRT1_2, 0), 4)).toBe("0.7071+0.0000i");
  });
});

describe("formatPhase", () => {
  it("uses a true minus sign for negative phases", () => {
    const text = formatPhase(new Complex(0, -1));
    expect(text).not.toContain(HYPHEN);
    expect(text).toBe(`${MINUS}90°`);
  });

  it("formats positive phases and flags negligible amplitudes", () => {
    expect(formatPhase(new Complex(0, 1))).toBe("90°");
    expect(formatPhase(new Complex(1, 0))).toBe("0°");
    expect(formatPhase(Complex.ZERO)).toBe("—");
  });
});

describe("ketLabel", () => {
  it("renders big-endian kets with qubit 0 rightmost", () => {
    expect(ketLabel(2, 3)).toBe("|010⟩");
    expect(ketLabel(1, 3)).toBe("|001⟩");
    expect(ketLabel(5, 3)).toBe("|101⟩");
    expect(ketLabel(0, 1)).toBe("|0⟩");
  });
});
