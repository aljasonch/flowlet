import React from "react";
import { createClient, getDebtsSummary } from "@/lib/supabase/server";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { PortfolioCard } from "@/components/dashboard/PortfolioCard";
import { DebtsSummaryCard } from "@/components/dashboard/DebtsSummaryCard";
import { SpendingChart } from "@/components/dashboard/SpendingChart";
import { IncomeBreakdown } from "@/components/dashboard/IncomeBreakdown";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { Skeleton } from "@/components/ui/Skeleton";

export async function MonthSummaryWidget({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("month_summary", {
    p_year: year,
    p_month: month,
  });
  const summary = data?.[0] ?? {
    total_income: 0,
    total_expense: 0,
    net: 0,
  };
  return (
    <SummaryCards
      income={summary.total_income}
      expenses={summary.total_expense}
      net={summary.net}
    />
  );
}

export async function PortfolioSummaryWidget() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("portfolio_summary");
  const portfolioSummary = data?.[0] ?? {
    total_value_idr: 0,
    total_cost_idr: 0,
    total_gain_idr: 0,
    priced_count: 0,
    unpriced_count: 0,
  };
  return (
    <PortfolioCard
      totalValueIdr={portfolioSummary.total_value_idr}
      totalCostIdr={portfolioSummary.total_cost_idr}
      totalGainIdr={portfolioSummary.total_gain_idr}
      pricedCount={portfolioSummary.priced_count}
      unpricedCount={portfolioSummary.unpriced_count}
    />
  );
}

export async function DebtsSummaryWidget() {
  const debtsSummary = await getDebtsSummary();
  return (
    <DebtsSummaryCard
      totalUnpaidDebt={debtsSummary.total_unpaid_debt}
      totalUnpaidReceivable={debtsSummary.total_unpaid_receivable}
      unpaidDebtCount={debtsSummary.unpaid_debt_count}
      unpaidReceivableCount={debtsSummary.unpaid_receivable_count}
      overdueCount={debtsSummary.overdue_count}
    />
  );
}

export async function SpendingByCategoryWidget({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("spending_by_category", {
    p_year: year,
    p_month: month,
  });
  return <SpendingChart data={data ?? []} />;
}

export async function IncomeBySourceWidget({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("income_by_source", {
    p_year: year,
    p_month: month,
  });
  return <IncomeBreakdown data={data ?? []} />;
}

export async function MonthlyTrendWidget({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("monthly_trend", {
    p_year: year,
    p_month: month,
    p_months: 6,
  });
  return <TrendChart data={data ?? []} />;
}

export function SummaryCardsSkeleton() {
  return (
    <>
      <div className="sm:hidden glass p-4 space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-44" />
        <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-[var(--glass-border)]">
          <Skeleton className="h-10 rounded-[var(--radius-control)]" />
          <Skeleton className="h-10 rounded-[var(--radius-control)]" />
        </div>
      </div>
      <div className="hidden sm:grid sm:grid-cols-3 gap-4">
        <Skeleton className="h-28 rounded-[var(--radius-panel)]" />
        <Skeleton className="h-28 rounded-[var(--radius-panel)]" />
        <Skeleton className="h-28 rounded-[var(--radius-panel)]" />
      </div>
    </>
  );
}

export function PortfolioCardSkeleton() {
  return <Skeleton className="h-44 rounded-[var(--radius-panel)]" />;
}

export function DebtsCardSkeleton() {
  return <Skeleton className="h-44 rounded-[var(--radius-panel)]" />;
}

export function ChartSkeleton() {
  return <Skeleton className="h-64 rounded-[var(--radius-panel)]" />;
}
