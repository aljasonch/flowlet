import React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getTodayDate } from "@/lib/today";
import { getCurrentPeriod } from "@/lib/period";
import { DashboardView } from "@/components/dashboard/DashboardView";

interface DashboardPageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  console.time("[PERF] dashboard render total");
  const supabase = await createClient();

  console.time("[PERF] dashboard auth.getUser");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.timeEnd("[PERF] dashboard auth.getUser");

  if (!user) {
    console.timeEnd("[PERF] dashboard render total");
    redirect("/login");
  }

  // Read tz cookie and today's date
  const cookieStore = await cookies();
  const tz = cookieStore.get("tz")?.value;
  const today = getTodayDate(tz);

  // Fetch user profile for month_start_day
  console.time("[PERF] dashboard profile.select");
  const { data: profile } = await supabase
    .from("profiles")
    .select("month_start_day")
    .eq("user_id", user.id)
    .single();
  console.timeEnd("[PERF] dashboard profile.select");

  const monthStartDay = profile?.month_start_day ?? 1;
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

  // Fetch data in parallel via SQL RPC functions
  console.time("[PERF] dashboard parallel RPCs");
  const [summaryRes, categoriesRes, sourcesRes, trendRes, portfolioRes, debtsRes] =
    await Promise.all([
      supabase.rpc("month_summary", { p_year: year, p_month: month }),
      supabase.rpc("spending_by_category", { p_year: year, p_month: month }),
      supabase.rpc("income_by_source", { p_year: year, p_month: month }),
      supabase.rpc("monthly_trend", {
        p_year: year,
        p_month: month,
        p_months: 6,
      }),
      supabase.rpc("portfolio_summary"),
      supabase.rpc("debts_summary"),
    ]);
  console.timeEnd("[PERF] dashboard parallel RPCs");
  console.timeEnd("[PERF] dashboard render total");

  const summary = summaryRes.data?.[0] ?? {
    total_income: 0,
    total_expense: 0,
    net: 0,
  };
  const categories = categoriesRes.data ?? [];
  const sources = sourcesRes.data ?? [];
  const trend = trendRes.data ?? [];
  const portfolioSummary = portfolioRes.data?.[0] ?? {
    total_value_idr: 0,
    total_cost_idr: 0,
    total_gain_idr: 0,
    priced_count: 0,
    unpriced_count: 0,
  };
  const debtsSummary = debtsRes.data?.[0] ?? {
    total_unpaid_debt: 0,
    total_unpaid_receivable: 0,
    unpaid_debt_count: 0,
    unpaid_receivable_count: 0,
    overdue_count: 0,
  };

  return (
    <DashboardView
      year={year}
      month={month}
      monthStartDay={monthStartDay}
      currentPeriodYear={currentPeriod.year}
      currentPeriodMonth={currentPeriod.month}
      summary={summary}
      categories={categories}
      sources={sources}
      trend={trend}
      portfolioSummary={portfolioSummary}
      debtsSummary={debtsSummary}
    />
  );
}
