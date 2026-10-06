"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Scale,
  Briefcase,
  Settings,
  Plus,
  LogOut,
} from "lucide-react";
import { logout } from "@/actions/auth";
import { Logo } from "@/components/ui/Logo";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/debts", label: "Debts", icon: Scale },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/settings", label: "Settings", icon: Settings },
];

export interface AppShellProps {
  children: React.ReactNode;
  unpaidDebtCount?: number;
  unpaidReceivableCount?: number;
  desktopDebtsBadge?: React.ReactNode;
  mobileDebtsBadge?: React.ReactNode;
}

export function AppShell({
  children,
  unpaidDebtCount = 0,
  unpaidReceivableCount = 0,
  desktopDebtsBadge,
  mobileDebtsBadge,
}: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Mobile Top Bar (lg:hidden) */}
      <header className="lg:hidden flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <Logo size={24} />
          <span className="text-sm font-semibold text-[var(--text)] tracking-tight">
            Flowlet
          </span>
        </div>
        <Link
          href="/settings"
          className={`flex items-center justify-center w-9 h-9 rounded-full glass border border-[var(--glass-border)] transition-all active:scale-95 ${
            pathname.startsWith("/settings")
              ? "text-[var(--accent)] shadow-sm bg-[var(--accent)]/15"
              : "text-[var(--text-muted)] hover:text-[var(--text)]"
          }`}
          aria-label="Settings"
          title="Settings"
        >
          <Settings size={18} strokeWidth={1.75} />
        </Link>
      </header>

      {/* Desktop Sidebar (lg:flex, persistent glass) */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 sticky top-4 h-[calc(100vh-2rem)] glass m-4 border border-[var(--glass-border)] p-4 justify-between">
        <div>
          <div className="px-3 py-2 mb-6">
            <Logo size={32} showWordmark showSubtitle />
          </div>

          <div className="mb-4 px-2">
            <Link
              href="/transactions/new"
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-[var(--radius-control)] bg-[var(--accent)] text-[var(--accent-contrast)] text-sm font-medium hover:opacity-90 transition-opacity active:scale-[0.98] shadow-sm"
            >
              <Plus size={18} strokeWidth={1.75} />
              <span>Add transaction</span>
            </Link>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              const isDebts = item.href === "/debts";
              const hasDebtsNotice =
                isDebts && (unpaidDebtCount > 0 || unpaidReceivableCount > 0);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-[var(--radius-control)] text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  <Icon size={18} strokeWidth={1.75} />
                  <span>{item.label}</span>

                  {/* Debt & Receivable badges on desktop */}
                  {isDebts &&
                    (desktopDebtsBadge !== undefined ? (
                      desktopDebtsBadge
                    ) : (
                      hasDebtsNotice && (
                        <div className="ml-auto flex items-center gap-1.5 shrink-0">
                          {unpaidDebtCount > 0 && (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[var(--negative)] text-white shadow-xs"
                              title={`${unpaidDebtCount} unpaid debts`}
                            >
                              {unpaidDebtCount}
                            </span>
                          )}
                          {unpaidReceivableCount > 0 && (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[var(--positive)] text-white shadow-xs"
                              title={`${unpaidReceivableCount} unpaid receivables`}
                            >
                              {unpaidReceivableCount}
                            </span>
                          )}
                        </div>
                      )
                    ))}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-[var(--glass-border)] pt-3">
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-3 w-full px-3 py-2 rounded-[var(--radius-control)] text-sm font-medium text-[var(--text-muted)] hover:text-[var(--negative)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none"
            >
              <LogOut size={18} strokeWidth={1.75} />
              <span>Sign out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 pb-24 lg:p-6 lg:pb-6 overflow-y-auto max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Mobile Bottom Tab Bar (Balanced 5-column grid) */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass !rounded-b-none !rounded-t-[var(--radius-panel)] border-t border-[var(--glass-border)] px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
      >
        <div className="grid grid-cols-5 items-center justify-items-center w-full max-w-lg mx-auto h-[52px]">
          {/* Col 1: Dashboard */}
          <Link
            href="/"
            className={`flex flex-col items-center justify-center gap-0.5 w-full h-full text-[11px] leading-none font-medium transition-colors ${
              pathname === "/"
                ? "text-[var(--accent)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            <LayoutDashboard size={18} strokeWidth={1.75} />
            <span className="truncate">Dashboard</span>
          </Link>

          {/* Col 2: Transactions */}
          <Link
            href="/transactions"
            className={`flex flex-col items-center justify-center gap-0.5 w-full h-full text-[11px] leading-none font-medium transition-colors ${
              pathname.startsWith("/transactions") && pathname !== "/transactions/new"
                ? "text-[var(--accent)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            <ArrowLeftRight size={18} strokeWidth={1.75} />
            <span className="truncate">Transactions</span>
          </Link>

          {/* Col 3: Quick Add (+) */}
          <Link
            href="/transactions/new"
            aria-label="Add transaction"
            className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] shadow-md active:scale-95 transition-transform"
          >
            <Plus size={20} strokeWidth={2} />
          </Link>

          {/* Col 4: Debts */}
          <Link
            href="/debts"
            className={`flex flex-col items-center justify-center gap-0.5 w-full h-full text-[11px] leading-none font-medium transition-colors ${
              pathname.startsWith("/debts")
                ? "text-[var(--accent)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            <div className="relative">
              <Scale size={18} strokeWidth={1.75} />
              {mobileDebtsBadge !== undefined ? (
                mobileDebtsBadge
              ) : (
                (unpaidDebtCount > 0 || unpaidReceivableCount > 0) && (
                  <div className="absolute -top-1.5 -right-3 flex items-center gap-0.5">
                    {unpaidDebtCount > 0 && (
                      <span
                        className="text-[9px] font-bold px-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-[var(--negative)] text-white shadow-xs leading-none"
                        title={`${unpaidDebtCount} unpaid debts`}
                      >
                        {unpaidDebtCount}
                      </span>
                    )}
                    {unpaidReceivableCount > 0 && (
                      <span
                        className="text-[9px] font-bold px-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-[var(--positive)] text-white shadow-xs leading-none"
                        title={`${unpaidReceivableCount} unpaid receivables`}
                      >
                        {unpaidReceivableCount}
                      </span>
                    )}
                  </div>
                )
              )}
            </div>
            <span className="truncate">Debts</span>
          </Link>

          {/* Col 5: Portfolio */}
          <Link
            href="/portfolio"
            className={`flex flex-col items-center justify-center gap-0.5 w-full h-full text-[11px] leading-none font-medium transition-colors ${
              pathname.startsWith("/portfolio")
                ? "text-[var(--accent)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            <Briefcase size={18} strokeWidth={1.75} />
            <span className="truncate">Portfolio</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
