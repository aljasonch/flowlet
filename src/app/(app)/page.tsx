import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getUser, getMonthStartDay } from "@/lib/supabase/server";
import { getTodayDate } from "@/lib/today";
import { getCurrentPeriod } from "@/lib/period";
import { DashboardView } from "@/components/dashboard/DashboardView";
import {
  MonthSummaryWidget,
  PortfolioSummaryWidget,
  DebtsSummaryWidget,
  SpendingByCategoryWidget,
  IncomeBySourceWidget,
  MonthlyTrendWidget,
  SummaryCardsSkeleton,
  PortfolioCardSkeleton,
  DebtsCardSkeleton,
  ChartSkeleton,
} from "@/components/dashboard/DashboardWidgets";

interface DashboardPageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  // Read tz cookie and today's date
  const cookieStore = await cookies();
  const tz = cookieStore.get("tz")?.value;
  const today = getTodayDate(tz);

  // Fetch cached month_start_day
  const monthStartDay = await getMonthStartDay();

  const currentPeriod = getCurrentPeriod(today, monthStartDay);

  const resolvedParams = await searchParams;
  const monthParam = resolvedParams.month;

  let year = currentPeriod.year;
  let month = currentPeriod.month;

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [yStr, mStr] = monthParam.split("-");
    const parsedY = parseInt(yStr, 10);
    const parsedM = parseInt(mStr, 10);
    if (parsedM >= 1 && parsedM <= 12) {
      year = parsedY;
      month = parsedM;
    }
  }

  return (
    <DashboardView
      year={year}
      month={month}
      monthStartDay={monthStartDay}
      currentPeriodYear={currentPeriod.year}
      currentPeriodMonth={currentPeriod.month}
      summarySlot={
        <Suspense fallback={<SummaryCardsSkeleton />}>
          <MonthSummaryWidget year={year} month={month} />
        </Suspense>
      }
      portfolioSlot={
        <Suspense fallback={<PortfolioCardSkeleton />}>
          <PortfolioSummaryWidget />
        </Suspense>
      }
      debtsSlot={
        <Suspense fallback={<DebtsCardSkeleton />}>
          <DebtsSummaryWidget />
        </Suspense>
      }
      spendingSlot={
        <Suspense fallback={<ChartSkeleton />}>
          <SpendingByCategoryWidget year={year} month={month} />
        </Suspense>
      }
      incomeSlot={
        <Suspense fallback={<ChartSkeleton />}>
          <IncomeBySourceWidget year={year} month={month} />
        </Suspense>
      }
      trendSlot={
        <Suspense fallback={<ChartSkeleton />}>
          <MonthlyTrendWidget year={year} month={month} />
        </Suspense>
      }
    />
  );
}
