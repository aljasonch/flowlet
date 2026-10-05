"use client";

import React from "react";
import Link from "next/link";
import { Eye, EyeOff, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { usePrivacyMode, togglePrivacyMode } from "@/lib/privacy";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { PortfolioCard } from "@/components/dashboard/PortfolioCard";
import { DebtsSummaryCard } from "@/components/dashboard/DebtsSummaryCard";
import { SpendingChart } from "@/components/dashboard/SpendingChart";
import { IncomeBreakdown } from "@/components/dashboard/IncomeBreakdown";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { EmptyDashboard } from "@/components/dashboard/EmptyDashboard";

export interface DashboardViewProps {
  year: number;
  month: number;
  monthStartDay: number;
  currentPeriodYear: number;
  currentPeriodMonth: number;
  summary: {
    total_income: number | bigint;
    total_expense: number | bigint;
    net: number | bigint;
  };
  categories: {
    category_id: string;
    name: string;
    total: number;
  }[];
  sources: {
    source_id: string;
    name: string;
    total: number;
  }[];
  trend: {
    year: number;
    month: number;
    total_income: number;
    total_expense: number;
  }[];
  portfolioSummary: {
    total_value_idr: number | bigint;
    total_cost_idr: number | bigint;
    total_gain_idr: number | bigint;
    priced_count: number;
    unpriced_count: number;
  };
  debtsSummary?: {
    total_unpaid_debt: number | bigint;
    total_unpaid_receivable: number | bigint;
    unpaid_debt_count: number;
    unpaid_receivable_count: number;
    overdue_count: number;
  };
}

export function DashboardView({
  year,
  month,
  monthStartDay,
  currentPeriodYear,
  currentPeriodMonth,
  summary,
  categories,
  sources,
  trend,
  portfolioSummary,
  debtsSummary = {
    total_unpaid_debt: 0,
    total_unpaid_receivable: 0,
    unpaid_debt_count: 0,
    unpaid_receivable_count: 0,
    overdue_count: 0,
  },
}: DashboardViewProps) {
  const hideNumbers = usePrivacyMode();
  const [mobileChartTab, setMobileChartTab] = React.useState<
    "spending" | "income" | "trend"
  >("spending");

  const hasData =
    Number(summary.total_income) > 0 ||
    Number(summary.total_expense) > 0 ||
    categories.length > 0 ||
    sources.length > 0;

  const formattedMonthStr = `${year}-${String(month).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div
        className="enter flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ "--i": 0 } as React.CSSProperties}
      >
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Cash flow and monthly summary
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Privacy Toggle Button */}
          <Button
            type="button"
            variant="ghost"
            onClick={togglePrivacyMode}
            className="p-2 shrink-0"
            aria-label={hideNumbers ? "Show balances" : "Hide balances"}
            title={hideNumbers ? "Show balances" : "Hide balances"}
          >
            {hideNumbers ? (
              <EyeOff className="w-4 h-4 text-[var(--text-muted)]" />
            ) : (
              <Eye className="w-4 h-4 text-[var(--text-muted)]" />
            )}
          </Button>

          <Link href="/transactions/new" className="flex-1 sm:flex-initial">
            <Button variant="primary" className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-1.5" />
              Add transaction
            </Button>
          </Link>
        </div>
      </div>

      {/* Period Selector */}
      <div className="enter" style={{ "--i": 1 } as React.CSSProperties}>
        <PeriodSelector
          year={year}
          month={month}
          monthStartDay={monthStartDay}
          currentPeriodYear={currentPeriodYear}
          currentPeriodMonth={currentPeriodMonth}
        />
      </div>

      {/* Summary Cards */}
      <div className="enter" style={{ "--i": 2 } as React.CSSProperties}>
        <SummaryCards
          income={summary.total_income}
          expenses={summary.total_expense}
          net={summary.net}
          hideNumbers={hideNumbers}
        />
      </div>

      {/* Portfolio & Debts Row */}
      <div
        className="enter grid grid-cols-1 lg:grid-cols-2 gap-4"
        style={{ "--i": 3 } as React.CSSProperties}
      >
        <PortfolioCard
          totalValueIdr={portfolioSummary.total_value_idr}
          totalCostIdr={portfolioSummary.total_cost_idr}
          totalGainIdr={portfolioSummary.total_gain_idr}
          pricedCount={portfolioSummary.priced_count}
          unpricedCount={portfolioSummary.unpriced_count}
          hideNumbers={hideNumbers}
        />
        <DebtsSummaryCard
          totalUnpaidDebt={debtsSummary.total_unpaid_debt}
          totalUnpaidReceivable={debtsSummary.total_unpaid_receivable}
          unpaidDebtCount={debtsSummary.unpaid_debt_count}
          unpaidReceivableCount={debtsSummary.unpaid_receivable_count}
          overdueCount={debtsSummary.overdue_count}
          hideNumbers={hideNumbers}
        />
      </div>

      {/* Empty State vs Content */}
      {!hasData ? (
        <div className="enter" style={{ "--i": 4 } as React.CSSProperties}>
          <EmptyDashboard />
        </div>
      ) : (
        <>
          {/* Mobile Tabbed Chart View (sm:hidden) */}
          <div
            className="sm:hidden enter space-y-3"
            style={{ "--i": 4 } as React.CSSProperties}
          >
            <div className="flex p-1 glass-strong rounded-[var(--radius-control)] border border-[var(--glass-border)] text-xs">
              <button
                type="button"
                onClick={() => setMobileChartTab("spending")}
                className={`flex-1 py-1.5 rounded-[var(--radius-control)] font-medium transition-all ${
                  mobileChartTab === "spending"
                    ? "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                Spending
              </button>
              <button
                type="button"
                onClick={() => setMobileChartTab("income")}
                className={`flex-1 py-1.5 rounded-[var(--radius-control)] font-medium transition-all ${
                  mobileChartTab === "income"
                    ? "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                Income
              </button>
              <button
                type="button"
                onClick={() => setMobileChartTab("trend")}
                className={`flex-1 py-1.5 rounded-[var(--radius-control)] font-medium transition-all ${
                  mobileChartTab === "trend"
                    ? "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                Trend
              </button>
            </div>

            {mobileChartTab === "spending" && (
              <SpendingChart data={categories} hideNumbers={hideNumbers} />
            )}
            {mobileChartTab === "income" && (
              <IncomeBreakdown data={sources} hideNumbers={hideNumbers} />
            )}
            {mobileChartTab === "trend" && (
              <TrendChart data={trend} hideNumbers={hideNumbers} />
            )}
          </div>

          {/* Desktop Full Grid (hidden sm:block) */}
          <div className="hidden sm:block space-y-6">
            <div
              className="enter grid grid-cols-1 lg:grid-cols-2 gap-6"
              style={{ "--i": 4 } as React.CSSProperties}
            >
              <SpendingChart data={categories} hideNumbers={hideNumbers} />
              <IncomeBreakdown data={sources} hideNumbers={hideNumbers} />
            </div>

            <div className="enter" style={{ "--i": 5 } as React.CSSProperties}>
              <TrendChart data={trend} hideNumbers={hideNumbers} />
            </div>
          </div>

          {/* View Transactions Link */}
          <div
            className="enter flex justify-end pt-2"
            style={{ "--i": 6 } as React.CSSProperties}
          >
            <Link
              href={`/transactions?month=${formattedMonthStr}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)] rounded p-1"
            >
              View all transactions for this period
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
