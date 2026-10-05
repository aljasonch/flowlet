import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Logo } from "./Logo";

describe("Logo", () => {
  it("renders the SVG mark with default size", () => {
    const { container } = render(<Logo />);
    const svg = container.querySelector("svg");
    expect(svg).toBeDefined();
    expect(svg?.getAttribute("width")).toBe("32");
    expect(svg?.getAttribute("height")).toBe("32");
  });

  it("renders with custom size", () => {
    const { container } = render(<Logo size={24} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("24");
    expect(svg?.getAttribute("height")).toBe("24");
  });

  it("renders wordmark and subtitle when enabled", () => {
    render(<Logo showWordmark showSubtitle />);
    expect(screen.getByText("Flowlet")).toBeDefined();
    expect(screen.getByText("Personal cash & assets")).toBeDefined();
  });
});
