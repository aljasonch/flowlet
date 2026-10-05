import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { AppShell } from "./AppShell";
import { usePathname } from "next/navigation";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

vi.mock("@/actions/auth", () => ({
  logout: vi.fn(),
}));

describe("AppShell", () => {
  it("renders desktop sidebar with all 5 nav items and action buttons", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    const aside = document.querySelector("aside");
    expect(aside).not.toBeNull();
    if (!aside) return;

    const asideScope = within(aside);
    expect(asideScope.getByText("Money Manager")).toBeDefined();
    expect(asideScope.getByText("Add transaction")).toBeDefined();
    expect(asideScope.getByText("Dashboard")).toBeDefined();
    expect(asideScope.getByText("Transactions")).toBeDefined();
    expect(asideScope.getByText("Debts")).toBeDefined();
    expect(asideScope.getByText("Portfolio")).toBeDefined();
    expect(asideScope.getByText("Settings")).toBeDefined();
    expect(asideScope.getByText("Sign out")).toBeDefined();
  });

  it("renders mobile top header with title and liquid glass settings button", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    const header = document.querySelector("header");
    expect(header).not.toBeNull();
    if (!header) return;

    expect(header.classList.contains("lg:hidden")).toBe(true);
    const headerScope = within(header);
    expect(headerScope.getByText("Money Manager")).toBeDefined();

    const settingsLink = headerScope.getByRole("link", { name: "Settings" });
    expect(settingsLink.getAttribute("href")).toBe("/settings");
  });

  it("rebalances mobile bottom nav bar with exactly 5 items and excludes settings", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    const mobileNav = screen.getByRole("navigation", {
      name: "Mobile navigation",
    });
    expect(mobileNav).toBeDefined();

    const links = within(mobileNav).getAllByRole("link");
    expect(links).toHaveLength(5);

    // Left destinations
    expect(links[0].getAttribute("href")).toBe("/");
    expect(links[1].getAttribute("href")).toBe("/transactions");

    // Center quick add
    expect(links[2].getAttribute("href")).toBe("/transactions/new");

    // Right destinations
    expect(links[3].getAttribute("href")).toBe("/debts");
    expect(links[4].getAttribute("href")).toBe("/portfolio");

    // Verify Settings is NOT in the mobile bottom nav
    expect(within(mobileNav).queryByText("Settings")).toBeNull();
  });

  it("displays debt and receivable badges when counts are greater than 0", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    render(
      <AppShell unpaidDebtCount={3} unpaidReceivableCount={2}>
        <div>Content</div>
      </AppShell>
    );

    const mobileNav = screen.getByRole("navigation", {
      name: "Mobile navigation",
    });
    const debtsLink = within(mobileNav)
      .getAllByRole("link")
      .find((link) => link.getAttribute("href") === "/debts");

    expect(debtsLink).toBeDefined();
    if (!debtsLink) return;

    // Mobile badge elements
    const debtsScope = within(debtsLink);
    expect(debtsScope.getByTitle("3 unpaid debts")).toBeDefined();
    expect(debtsScope.getByTitle("2 unpaid receivables")).toBeDefined();
  });
});
