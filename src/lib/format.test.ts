import { describe, it, expect } from "vitest";
import { formatIDR, formatUSD, formatPrice, formatQuantity, formatPercent } from "./format";

describe("formatIDR", () => {
  it("formats positive integer rupiah correctly", () => {
    const formatted = formatIDR(1250000);
    // Replace non-breaking space with regular space for normalized comparison
    expect(formatted.replace(/\s/g, " ")).toBe("Rp 1.250.000");
  });

  it("handles bigint amounts", () => {
    const formatted = formatIDR(BigInt(9999999999999));
    expect(formatted.replace(/\s/g, " ")).toBe("Rp 9.999.999.999.999");
  });

  it("handles zero amount", () => {
    const formatted = formatIDR(0);
    expect(formatted.replace(/\s/g, " ")).toBe("Rp 0");
  });
});

describe("formatUSD", () => {
  it("formats USD currency correctly", () => {
    expect(formatUSD("220.50")).toBe("$220.50");
    expect(formatUSD(220)).toBe("$220.00");
  });
});

describe("formatQuantity", () => {
  it("trims trailing zeros up to 8 decimal places", () => {
    expect(formatQuantity("0.00540000")).toBe("0.0054");
    expect(formatQuantity("100")).toBe("100");
    expect(formatQuantity("12.34567890")).toBe("12.3456789");
  });
});

describe("formatPercent", () => {
  it("shows 2 decimals with explicit sign", () => {
    expect(formatPercent(12.5)).toBe("+12.50%");
    expect(formatPercent(-3.456)).toBe("-3.46%");
    expect(formatPercent(0)).toBe("+0.00%");
  });
});

describe("formatPrice", () => {
  it("formats standard USD prices with 2 decimals", () => {
    expect(formatPrice("220.50", "USD")).toBe("$220.50");
    expect(formatPrice(220, "USD")).toBe("$220.00");
  });

  it("formats micro crypto USD prices preserving up to 8 decimals", () => {
    expect(formatPrice("0.00045", "USD")).toBe("$0.00045");
    expect(formatPrice("1.23456", "USD")).toBe("$1.23456");
    expect(formatPrice("64123.456", "USD")).toBe("$64,123.456");
  });

  it("formats IDR prices with integer or decimal support", () => {
    expect(formatPrice(9500, "IDR").replace(/\s/g, " ")).toBe("Rp 9.500");
    expect(formatPrice("0.45", "IDR").replace(/\s/g, " ")).toBe("Rp 0,45");
    expect(formatPrice("12500.5", "IDR").replace(/\s/g, " ")).toBe("Rp 12.500,5");
  });

  it("handles null or invalid amounts", () => {
    expect(formatPrice(null, "USD")).toBe("-");
    expect(formatPrice("", "USD")).toBe("-");
  });
});
