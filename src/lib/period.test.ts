import { describe, it, expect } from "vitest";
import {
  periodStart,
  periodEnd,
  getCurrentPeriod,
  formatPeriodRange,
  formatPeriodMonth,
  getAdjacentPeriod,
} from "./period";

describe("reporting period calculations (Section 6.3 spec test cases)", () => {
  it("passes start_day = 1, label = 2026-10", () => {
    expect(periodStart(2026, 10, 1)).toBe("2026-10-01");
    expect(periodEnd(2026, 10, 1)).toBe("2026-10-31");
  });

  it("passes start_day = 25, label = 2026-10", () => {
    expect(periodStart(2026, 10, 25)).toBe("2026-10-25");
    expect(periodEnd(2026, 10, 25)).toBe("2026-11-24");
  });

  it("passes start_day = 25, label = 2026-12", () => {
    expect(periodStart(2026, 12, 25)).toBe("2026-12-25");
    expect(periodEnd(2026, 12, 25)).toBe("2027-01-24");
  });

  it("passes start_day = 31, label = 2026-01", () => {
    expect(periodStart(2026, 1, 31)).toBe("2026-01-31");
    expect(periodEnd(2026, 1, 31)).toBe("2026-02-27");
  });

  it("passes start_day = 31, label = 2026-02", () => {
    expect(periodStart(2026, 2, 31)).toBe("2026-02-28");
    expect(periodEnd(2026, 2, 31)).toBe("2026-03-30");
  });

  it("passes start_day = 31, label = 2028-02 (leap year)", () => {
    expect(periodStart(2028, 2, 31)).toBe("2028-02-29");
    expect(periodEnd(2028, 2, 31)).toBe("2028-03-30");
  });

  it("passes start_day = 30, label = 2026-04", () => {
    expect(periodStart(2026, 4, 30)).toBe("2026-04-30");
    expect(periodEnd(2026, 4, 30)).toBe("2026-05-29");
  });
});

describe("current period rule", () => {
  it("determines period when today is after or on start date of current month", () => {
    // Today is 2026-10-26, startDay is 25 -> label is (2026, 10)
    expect(getCurrentPeriod("2026-10-26", 25)).toEqual({ year: 2026, month: 10 });
    expect(getCurrentPeriod("2026-10-25", 25)).toEqual({ year: 2026, month: 10 });
  });

  it("determines period when today is before start date of current month", () => {
    // Today is 2026-10-15, startDay is 25 -> label is (2026, 9)
    expect(getCurrentPeriod("2026-10-15", 25)).toEqual({ year: 2026, month: 9 });
  });

  it("handles January rollover when today is before start date", () => {
    // Today is 2026-01-10, startDay is 25 -> label is (2025, 12)
    expect(getCurrentPeriod("2026-01-10", 25)).toEqual({ year: 2025, month: 12 });
  });
});

describe("period display and navigation helpers", () => {
  it("formats date ranges cleanly without timezone shifting", () => {
    expect(formatPeriodRange("2026-10-25", "2026-11-24")).toBe("25 Oct 2026 – 24 Nov 2026");
    expect(formatPeriodRange("2026-10-01", "2026-10-31")).toBe("1 Oct 2026 – 31 Oct 2026");
  });

  it("formats period month label", () => {
    expect(formatPeriodMonth(2026, 10)).toBe("October 2026");
    expect(formatPeriodMonth(2027, 1)).toBe("January 2027");
  });

  it("navigates forward and backward cleanly across year boundaries", () => {
    expect(getAdjacentPeriod(2026, 10, -1)).toEqual({ year: 2026, month: 9 });
    expect(getAdjacentPeriod(2026, 10, 1)).toEqual({ year: 2026, month: 11 });
    expect(getAdjacentPeriod(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(getAdjacentPeriod(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
  });
});
