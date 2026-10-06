import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import {
  DesktopDebtsBadge,
  MobileDebtsBadge,
} from "@/components/debts/DebtsNavBadges";

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

  console.time("[PERF] layout auth.getUser");
  const user = await getUser();
  console.timeEnd("[PERF] layout auth.getUser");

  if (!user) {
    console.timeEnd("[PERF] layout render total");
    redirect("/login");
  }

  console.timeEnd("[PERF] layout render total");

  return (
    <ToastProvider>
      <AppShell
        desktopDebtsBadge={
          <Suspense fallback={null}>
            <DesktopDebtsBadge />
          </Suspense>
        }
        mobileDebtsBadge={
          <Suspense fallback={null}>
            <MobileDebtsBadge />
          </Suspense>
        }
      >
        {children}
      </AppShell>
    </ToastProvider>
  );
}
