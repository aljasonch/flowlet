import { describe, it, expect } from "vitest";
import { parseAmountInput, parseDecimalInput, escapeIlike } from "./parse";

describe("parseAmountInput", () => {
  it("parses formatted rupiah into integer", () => {
    expect(parseAmountInput("Rp 1.250.000")).toBe(1250000);
    expect(parseAmountInput("1.250.000")).toBe(1250000);
    expect(parseAmountInput("50000")).toBe(50000);
  });

  it("handles empty or non-numeric input", () => {
    expect(parseAmountInput("")).toBe(0);
    expect(parseAmountInput("abc")).toBe(0);
  });

  it("enforces maximum 9_999_999_999_999", () => {
    expect(parseAmountInput("999999999999999999")).toBe(9999999999999);
  });
});

describe("parseDecimalInput", () => {
  it("treats comma as decimal separator and ignores dots", () => {
    expect(parseDecimalInput("1.250,5")).toBe("1250.5");
    expect(parseDecimalInput("0,0054")).toBe("0.0054");
    expect(parseDecimalInput("100")).toBe("100");
  });

  it("never treats dot as decimal point", () => {
    // A dot in Indonesian convention is a thousand separator
    expect(parseDecimalInput("1.250")).toBe("1250");
  });

  it("returns null for invalid inputs", () => {
    expect(parseDecimalInput("")).toBeNull();
    expect(parseDecimalInput("abc")).toBeNull();
    expect(parseDecimalInput("1,2,3")).toBeNull();
  });
});

describe("escapeIlike", () => {
  it("escapes %, _, and \\ characters", () => {
    expect(escapeIlike("100%")).toBe("100\\%");
    expect(escapeIlike("food_drink")).toBe("food\\_drink");
    expect(escapeIlike("back\\slash")).toBe("back\\\\slash");
    expect(escapeIlike("normal text 123")).toBe("normal text 123");
  });
});

