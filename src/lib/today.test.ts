import { describe, it, expect } from "vitest";
import { getTodayDate } from "./today";

describe("getTodayDate", () => {
  it("returns YYYY-MM-DD format for valid timezone", () => {
    const todayJakarta = getTodayDate("Asia/Jakarta");
    expect(todayJakarta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("falls back to UTC format when timezone is undefined or null", () => {
    const todayDefault = getTodayDate();
    expect(todayDefault).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("falls back to UTC format when timezone is invalid", () => {
    const todayFallback = getTodayDate("Invalid/Timezone");
    expect(todayFallback).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
