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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: debtsSummaryRes } = await supabase.rpc("debts_summary");
  const debtsSummary = debtsSummaryRes?.[0] ?? {
    unpaid_debt_count: 0,
    unpaid_receivable_count: 0,
  };

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
