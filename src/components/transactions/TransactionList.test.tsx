import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/Toast";
import {
  TransactionList,
  type TransactionListProps,
} from "./TransactionList";

const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams("month=2026-10"),
  usePathname: () => "/transactions",
}));

const mockProps: TransactionListProps = {
  initialTransactions: [
    {
      id: "tx-1",
      type: "expense",
      amount: 50000,
      date: "2026-10-06",
      note: "Groceries at supermarket",
      category: { id: "cat-1", name: "Food" },
      source: null,
    },
    {
      id: "tx-2",
      type: "income",
      amount: 5000000,
      date: "2026-10-01",
      note: "Freelance gig",
      category: null,
      source: { id: "src-1", name: "Freelance" },
    },
  ],
  categories: [{ id: "cat-1", name: "Food" }],
  sources: [{ id: "src-1", name: "Freelance" }],
  currentPeriodLabel: "2026-10",
  hasMore: true,
  periodSummary: {
    total_income: 5000000,
    total_expense: 50000,
    net: 4950000,
  },
};

describe("TransactionList Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders transactions and period summary cards correctly", () => {
    render(
      <ToastProvider>
        <TransactionList {...mockProps} />
      </ToastProvider>
    );

    // Header & Period
    expect(screen.getByText("Transactions")).toBeDefined();
    expect(screen.getByText("Period: 2026-10")).toBeDefined();

    // Summary Cards
    expect(screen.getAllByText(/Total income/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Total expenses/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Net cash flow/i).length).toBeGreaterThan(0);

    // Transaction rows
    expect(screen.getByText("Food")).toBeDefined();
    expect(screen.getByText("Groceries at supermarket")).toBeDefined();
    expect(screen.getByText("Freelance")).toBeDefined();
    expect(screen.getByText("Freelance gig")).toBeDefined();
  });

  it("renders load more button when hasMore is true and triggers router.replace with scroll: false", () => {
    render(
      <ToastProvider>
        <TransactionList {...mockProps} />
      </ToastProvider>
    );

    const loadMoreBtn = screen.getByRole("button", {
      name: /Load more transactions/i,
    });
    expect(loadMoreBtn).toBeDefined();

    fireEvent.click(loadMoreBtn);

    expect(mockReplace).toHaveBeenCalledWith("/transactions?month=2026-10&limit=100", {
      scroll: false,
    });
  });

  it("does not render load more button when hasMore is false", () => {
    render(
      <ToastProvider>
        <TransactionList {...mockProps} hasMore={false} />
      </ToastProvider>
    );

    expect(
      screen.queryByRole("button", { name: /Load more transactions/i })
    ).toBeNull();
  });

  it("renders empty state when there are no transactions", () => {
    render(
      <ToastProvider>
        <TransactionList
          {...mockProps}
          initialTransactions={[]}
          hasMore={false}
        />
      </ToastProvider>
    );

    expect(
      screen.getByText("No transactions found for this period.")
    ).toBeDefined();
  });
});
