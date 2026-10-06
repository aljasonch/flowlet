import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { ToastProvider } from "@/components/ui/Toast";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    redirect("/login");
  }

  console.time("[PERF] layout render total");
  const supabase = await createClient();

  console.time("[PERF] layout auth.getUser");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.timeEnd("[PERF] layout auth.getUser");

  if (!user) {
    console.timeEnd("[PERF] layout render total");
    redirect("/login");
  }

  console.time("[PERF] layout debts_summary");
  const { data: debtsSummaryRes } = await supabase.rpc("debts_summary");
  console.timeEnd("[PERF] layout debts_summary");

  const debtsSummary = debtsSummaryRes?.[0] ?? {
    unpaid_debt_count: 0,
    unpaid_receivable_count: 0,
  };

  console.timeEnd("[PERF] layout render total");

  return (
    <ToastProvider>
      <AppShell
        unpaidDebtCount={debtsSummary.unpaid_debt_count}
        unpaidReceivableCount={debtsSummary.unpaid_receivable_count}
      >
        {children}
      </AppShell>
    </ToastProvider>
  );
}
