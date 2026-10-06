import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePrivacyMode, togglePrivacyMode, getPrivacySnapshot } from "./privacy";

describe("privacy module", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to false when localStorage is empty", () => {
    expect(getPrivacySnapshot()).toBe(false);
    const { result } = renderHook(() => usePrivacyMode());
    expect(result.current).toBe(false);
  });

  it("reads true when hide_financial_numbers or legacy portfolio_hide_numbers is set", () => {
    localStorage.setItem("hide_financial_numbers", "true");
    expect(getPrivacySnapshot()).toBe(true);

    localStorage.clear();
    localStorage.setItem("portfolio_hide_numbers", "true");
    expect(getPrivacySnapshot()).toBe(true);
  });

  it("toggles privacy mode and updates hook value", () => {
    const { result } = renderHook(() => usePrivacyMode());
    expect(result.current).toBe(false);

    act(() => {
      togglePrivacyMode();
    });

    expect(result.current).toBe(true);
    expect(localStorage.getItem("hide_financial_numbers")).toBe("true");
    expect(localStorage.getItem("portfolio_hide_numbers")).toBe("true");

    act(() => {
      togglePrivacyMode();
    });

    expect(result.current).toBe(false);
    expect(localStorage.getItem("hide_financial_numbers")).toBe("false");
    expect(localStorage.getItem("portfolio_hide_numbers")).toBe("false");
  });
});
