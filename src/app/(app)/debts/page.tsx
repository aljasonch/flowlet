import { createClient, getUser } from "@/lib/supabase/server";
import { DebtView } from "@/components/debts/DebtView";

export default async function DebtsPage() {
  const supabase = await createClient();
  const user = await getUser();

  if (!user) return null;

  // Load categories, sources, debts, and summary in parallel
  const [categoriesRes, sourcesRes, debtsRes, summaryRes] = await Promise.all([
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
    supabase.rpc("debts_with_balance"),
    supabase.rpc("debts_summary"),
  ]);

  const categories = categoriesRes.data || [];
  const sources = sourcesRes.data || [];

  const debts = (debtsRes.data || []).map((d) => ({
    ...d,
    amount: Number(d.amount),
    paid_amount: Number(d.paid_amount),
    remaining_amount: Number(d.remaining_amount),
  }));

  const summary = summaryRes.data?.[0] ?? {
    total_unpaid_debt: 0,
    total_unpaid_receivable: 0,
    unpaid_debt_count: 0,
    unpaid_receivable_count: 0,
    overdue_count: 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)] tracking-tight">
            Debts & Receivables
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Track unpaid liabilities and receivables outside of cash flow
          </p>
        </div>
      </div>

      <DebtView
        initialDebts={debts}
        categories={categories}
        sources={sources}
        summary={summary}
      />
    </div>
  );
}
