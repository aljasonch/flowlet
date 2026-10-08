import { cookies } from "next/headers";
import { createClient, getUser, getMonthStartDay } from "@/lib/supabase/server";
import { getTodayDate } from "@/lib/today";
import { periodStart, periodEnd, getCurrentPeriod } from "@/lib/period";
import { escapeIlike } from "@/lib/parse";
import { TransactionList } from "@/components/transactions/TransactionList";

interface TransactionsPageProps {
  searchParams: Promise<{
    month?: string;
    type?: string;
    entityId?: string;
    q?: string;
    limit?: string;
  }>;
}

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const tz = cookieStore.get("tz")?.value;
  const today = getTodayDate(tz);

  const supabase = await createClient();
  const user = await getUser();

  if (!user) {
    return null;
  }

  // 1. Get cached month_start_day
  const startDay = await getMonthStartDay();

  // 2. Validate and derive period
  const currentPeriod = getCurrentPeriod(today, startDay);
  const currentPeriodLabel = `${currentPeriod.year}-${String(
    currentPeriod.month
  ).padStart(2, "0")}`;

  const selectedMonth =
    params.month && MONTH_REGEX.test(params.month)
      ? params.month
      : currentPeriodLabel;
  const [selectedYearStr, selectedMonthStr] = selectedMonth.split("-");
  const pYear = parseInt(selectedYearStr, 10);
  const pMonth = parseInt(selectedMonthStr, 10);

  const pStart = periodStart(pYear, pMonth, startDay);
  const pEnd = periodEnd(pYear, pMonth, startDay);

  // 3. Validate limit (50 - 500, default 50)
  const rawLimit = parseInt(params.limit || "50", 10);
  const limit =
    Number.isInteger(rawLimit) && rawLimit >= 50
      ? Math.min(rawLimit, 500)
      : 50;

  // 4. Validate type and entityId
  const type =
    params.type === "expense" || params.type === "income"
      ? params.type
      : "all";
  const entityId =
    params.entityId && UUID_REGEX.test(params.entityId)
      ? params.entityId
      : undefined;
  const query = params.q?.trim() || "";

  // 5. Build transactions query with limit + 1 for hasMore detection
  let txQuery = supabase
    .from("transactions")
    .select(
      `
      id,
      type,
      amount,
      date,
      note,
      category:categories(id, name),
      source:income_sources(id, name)
    `
    )
    .eq("user_id", user.id)
    .gte("date", pStart)
    .lte("date", pEnd)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (type === "expense" || type === "income") {
    txQuery = txQuery.eq("type", type);
    if (entityId) {
      if (type === "expense") {
        txQuery = txQuery.eq("category_id", entityId);
      } else {
        txQuery = txQuery.eq("source_id", entityId);
      }
    }
  }

  if (query) {
    txQuery = txQuery.ilike("note", `%${escapeIlike(query)}%`);
  }

  // 6. Execute transactions query, categories, sources, and period summary in parallel
  const [
    { data: transactions, error: txError },
    { data: categories, error: catError },
    { data: sources, error: srcError },
    { data: summaryData, error: summaryError },
  ] = await Promise.all([
    txQuery,
    supabase
      .from("categories")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name"),
    supabase
      .from("income_sources")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name"),
    supabase.rpc("month_summary", {
      p_year: pYear,
      p_month: pMonth,
      p_start_day: startDay,
    }),
  ]);

  if (txError) throw new Error(`Failed to load transactions: ${txError.message}`);
  if (catError) throw new Error(`Failed to load categories: ${catError.message}`);
  if (srcError) throw new Error(`Failed to load income sources: ${srcError.message}`);
  if (summaryError) throw new Error(`Failed to load period summary: ${summaryError.message}`);

  // 7. Compute pagination and format records
  const rawList = transactions || [];
  const hasMore = rawList.length > limit;
  const displayList = hasMore ? rawList.slice(0, limit) : rawList;

  const formattedTransactions = displayList.map((t) => ({
    id: t.id,
    type: t.type,
    amount: Number(t.amount),
    date: t.date,
    note: t.note,
    category: Array.isArray(t.category) ? t.category[0] : t.category,
    source: Array.isArray(t.source) ? t.source[0] : t.source,
  }));

  const summaryRow = summaryData?.[0];
  const periodSummary = summaryRow
    ? {
        total_income: Number(summaryRow.total_income ?? 0),
        total_expense: Number(summaryRow.total_expense ?? 0),
        net: Number(summaryRow.net ?? 0),
      }
    : undefined;

  return (
    <TransactionList
      initialTransactions={formattedTransactions}
      categories={categories || []}
      sources={sources || []}
      currentPeriodLabel={selectedMonth}
      hasMore={hasMore}
      periodSummary={periodSummary}
    />
  );
}

