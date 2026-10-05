import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardView, type DashboardViewProps } from "./DashboardView";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const mockProps: DashboardViewProps = {
  year: 2026,
  month: 10,
  monthStartDay: 1,
  currentPeriodYear: 2026,
  currentPeriodMonth: 10,
  summary: {
    total_income: 15000000,
    total_expense: 5000000,
    net: 10000000,
  },
  categories: [
    { category_id: "c1", name: "Food", total: 3000000 },
    { category_id: "c2", name: "Transport", total: 2000000 },
  ],
  sources: [{ source_id: "s1", name: "Salary", total: 15000000 }],
  trend: [
    { year: 2026, month: 10, total_income: 15000000, total_expense: 5000000 },
  ],
  portfolioSummary: {
    total_value_idr: 50000000,
    total_cost_idr: 40000000,
    total_gain_idr: 10000000,
    priced_count: 2,
    unpriced_count: 0,
  },
};

describe("DashboardView", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders balances when privacy mode is off", () => {
    render(<DashboardView {...mockProps} />);

    // Income and expenses formatted
    expect(screen.getAllByText("Rp 15.000.000").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rp 5.000.000").length).toBeGreaterThan(0);
    expect(screen.getAllByText("+Rp 10.000.000").length).toBeGreaterThan(0);

    // Portfolio value
    expect(screen.getByText("Rp 50.000.000")).toBeDefined();
  });

  it("toggles privacy mode and masks financial numbers", () => {
    render(<DashboardView {...mockProps} />);

    const toggleButton = screen.getByRole("button", { name: "Hide balances" });
    fireEvent.click(toggleButton);

    // After clicking toggle, "Rp ••••••" should appear
    const maskedAmounts = screen.getAllByText("Rp ••••••");
    expect(maskedAmounts.length).toBeGreaterThan(0);

    // Net and gain should be masked as ••••••
    const maskedBullets = screen.getAllByText("••••••");
    expect(maskedBullets.length).toBeGreaterThan(0);

    // Button label toggles
    expect(screen.getByRole("button", { name: "Show balances" })).toBeDefined();
  });

  it("switches mobile chart tabs", () => {
    render(<DashboardView {...mockProps} />);

    // Click 'Income' mobile tab
    const incomeTab = screen.getByRole("button", { name: "Income" });
    fireEvent.click(incomeTab);
    expect(screen.getAllByText("Salary").length).toBeGreaterThan(0);

    // Click 'Trend' mobile tab
    const trendTab = screen.getByRole("button", { name: "Trend" });
    fireEvent.click(trendTab);
    expect(screen.getAllByText(/6-month trend/i).length).toBeGreaterThan(0);
  });
});
