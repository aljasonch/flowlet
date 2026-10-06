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

  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

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
