import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LoginPage from "./page";

vi.mock("@/actions/auth", () => ({
  login: vi.fn(),
}));

describe("LoginPage", () => {
  it("renders Flowlet logo, title, and subtitle", () => {
    render(<LoginPage />);
    expect(screen.getByRole("img", { name: "Flowlet logo" })).toBeDefined();
    expect(screen.getByText("Flowlet")).toBeDefined();
    expect(screen.getByText("Sign in to access your dashboard")).toBeDefined();
  });
});
