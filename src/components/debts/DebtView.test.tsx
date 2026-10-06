import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/Toast";
import { DebtView } from "./DebtView";
import type { DebtRow } from "./DebtList";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const mockDebts: DebtRow[] = [
  {
    id: "d1",
    type: "debt",
    person_name: "Budi Santoso",
    amount: 1000000,
    date: "2026-10-01",
    due_date: "2026-10-20",
    note: "Pinjaman modal",
    created_at: "2026-10-01T00:00:00Z",
    paid_amount: 300000,
    remaining_amount: 700000,
    status: "partially_paid",
    is_overdue: false,
  },
  {
    id: "d2",
    type: "receivable",
    person_name: "Siti Aminah",
    amount: 500000,
    date: "2026-10-02",
    due_date: "2026-10-15",
    note: "Pinjam uang makan",
    created_at: "2026-10-02T00:00:00Z",
    paid_amount: 0,
    remaining_amount: 500000,
    status: "pending",
    is_overdue: false,
  },
  {
    id: "d3",
    type: "debt",
    person_name: "Bank Mandiri",
    amount: 2000000,
    date: "2026-09-01",
    due_date: "2026-09-25",
    note: "Cicilan lunas",
    created_at: "2026-09-01T00:00:00Z",
    paid_amount: 2000000,
    remaining_amount: 0,
    status: "settled",
    is_overdue: false,
  },
];

const mockSummary = {
  total_unpaid_debt: 700000,
  total_unpaid_receivable: 500000,
  unpaid_debt_count: 1,
  unpaid_receivable_count: 1,
  overdue_count: 0,
};

function renderComponent() {
  return render(
    <ToastProvider>
      <DebtView
        initialDebts={mockDebts}
        categories={[{ id: "c1", name: "Bills" }]}
        sources={[{ id: "s1", name: "Salary" }]}
        summary={mockSummary}
      />
    </ToastProvider>
  );
}

describe("DebtView", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders active debts and receivables correctly", () => {
    renderComponent();

    // Active items should be visible by default (d1, d2), settled (d3) is hidden under 'active' status
    expect(screen.getByText("Budi Santoso")).toBeDefined();
    expect(screen.getByText("Siti Aminah")).toBeDefined();
    expect(screen.queryByText("Bank Mandiri")).toBeNull();

    // Summary cards visible
    expect(screen.getAllByText("Rp 700.000").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rp 500.000").length).toBeGreaterThan(0);
  });

  it("filters by type: Debts and Receivables", () => {
    renderComponent();

    // Click 'Debts'
    const debtsFilterBtn = screen.getByRole("button", { name: "Debts" });
    fireEvent.click(debtsFilterBtn);

    expect(screen.getByText("Budi Santoso")).toBeDefined();
    expect(screen.queryByText("Siti Aminah")).toBeNull();

    // Click 'Receivables'
    const receivablesFilterBtn = screen.getByRole("button", { name: "Receivables" });
    fireEvent.click(receivablesFilterBtn);

    expect(screen.queryByText("Budi Santoso")).toBeNull();
    expect(screen.getByText("Siti Aminah")).toBeDefined();
  });

  it("shows settled items when 'All Statuses' is selected", () => {
    renderComponent();

    const allStatusBtn = screen.getByRole("button", { name: "All Statuses" });
    fireEvent.click(allStatusBtn);

    expect(screen.getByText("Bank Mandiri")).toBeDefined();
    expect(screen.getByText("Settled")).toBeDefined();
  });

  it("respects privacy mode (masks balances as Rp ••••••)", () => {
    localStorage.setItem("hide_financial_numbers", "true");
    renderComponent();

    const maskedValues = screen.getAllByText("Rp ••••••");
    expect(maskedValues.length).toBeGreaterThan(0);
  });

  it("toggles privacy mode when eye button is clicked", () => {
    renderComponent();

    // Initially unmasked
    expect(screen.getAllByText("Rp 700.000").length).toBeGreaterThan(0);

    // Click toggle button
    const toggleBtn = screen.getByRole("button", { name: "Hide balances" });
    fireEvent.click(toggleBtn);

    // Now masked
    expect(screen.getAllByText("Rp ••••••").length).toBeGreaterThan(0);
  });
});
