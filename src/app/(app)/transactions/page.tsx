import { cookies } from "next/headers";
import { createClient, getUser } from "@/lib/supabase/server";
import { getTodayDate } from "@/lib/today";
import { periodStart, periodEnd, getCurrentPeriod } from "@/lib/period";
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

  // 1. Get user profile for month_start_day
  const { data: profile } = await supabase
    .from("profiles")
    .select("month_start_day")
    .eq("user_id", user.id)
    .single();

  const startDay = profile?.month_start_day ?? 1;

  // 2. Derive current period if not provided
  const currentPeriod = getCurrentPeriod(today, startDay);
  const currentPeriodLabel = `${currentPeriod.year}-${String(
    currentPeriod.month
  ).padStart(2, "0")}`;

  const selectedMonth = params.month || currentPeriodLabel;
  const [selectedYearStr, selectedMonthStr] = selectedMonth.split("-");
  const pYear = parseInt(selectedYearStr, 10);
  const pMonth = parseInt(selectedMonthStr, 10);

  // 3. Compute period start and end honoring custom startDay
  const pStart = periodStart(pYear, pMonth, startDay);
  const pEnd = periodEnd(pYear, pMonth, startDay);

  const limit = parseInt(params.limit || "50", 10);
  const type = params.type || "all";
  const entityId = params.entityId;
  const query = params.q;

  // 4. Build query
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
    `,
      { count: "exact" }
    )
    .eq("user_id", user.id)
    .gte("date", pStart)
    .lte("date", pEnd)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (type === "expense" || type === "income") {
    txQuery = txQuery.eq("type", type);
    if (entityId && entityId !== "all") {
      if (type === "expense") {
        txQuery = txQuery.eq("category_id", entityId);
      } else {
        txQuery = txQuery.eq("source_id", entityId);
      }
    }
  }

  if (query && query.trim()) {
    txQuery = txQuery.ilike("note", `%${query.trim()}%`);
  }

  const [{ data: transactions, count }, { data: categories }, { data: sources }] =
    await Promise.all([
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
    ]);

  // Format records to match component props
  const formattedTransactions = (transactions || []).map((t) => ({
    id: t.id,
    type: t.type,
    amount: Number(t.amount),
    date: t.date,
    note: t.note,
    category: Array.isArray(t.category) ? t.category[0] : t.category,
    source: Array.isArray(t.source) ? t.source[0] : t.source,
  }));

  return (
    <TransactionList
      initialTransactions={formattedTransactions}
      categories={categories || []}
      sources={sources || []}
      currentPeriodLabel={selectedMonth}
      totalCount={count ?? formattedTransactions.length}
    />
  );
}
