import React from "react";
import Link from "next/link";
import { ArrowRight, Scale, AlertCircle } from "lucide-react";
import { formatIDR } from "@/lib/format";

export interface DebtsSummaryCardProps {
  totalUnpaidDebt: number | bigint;
  totalUnpaidReceivable: number | bigint;
  unpaidDebtCount: number;
  unpaidReceivableCount: number;
  overdueCount: number;
  hideNumbers?: boolean;
}

export function DebtsSummaryCard({
  totalUnpaidDebt,
  totalUnpaidReceivable,
  unpaidDebtCount,
  unpaidReceivableCount,
  overdueCount,
  hideNumbers = false,
}: DebtsSummaryCardProps) {
  const debtBig = BigInt(totalUnpaidDebt);
  const receivableBig = BigInt(totalUnpaidReceivable);

  const hasActivity = unpaidDebtCount > 0 || unpaidReceivableCount > 0;

  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="text-sm font-semibold text-[var(--text)]">
            Debts & Receivables
          </h2>
        </div>
        <Link
          href="/debts"
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
        >
          View details
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {!hasActivity ? (
        <div className="py-4 text-xs text-[var(--text-muted)] flex items-center justify-between">
          <span>No active debts or receivables.</span>
          <Link
            href="/debts"
            className="text-xs font-medium text-[var(--accent)] hover:underline"
          >
            Record new &rarr;
          </Link>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Utang */}
            <div className="p-3 glass-strong rounded-[var(--radius-control)] border border-[var(--glass-border)]">
              <span className="block text-xs font-medium text-[var(--text-muted)]">
                Debts (Liabilities)
              </span>
              <div className="mt-1 text-xl font-bold text-[var(--negative)] num tracking-tight">
                {hideNumbers ? "Rp ••••••" : formatIDR(debtBig)}
              </div>
              <span className="text-[11px] text-[var(--text-muted)] num block mt-0.5">
                {unpaidDebtCount} unpaid
              </span>
            </div>

            {/* Piutang */}
            <div className="p-3 glass-strong rounded-[var(--radius-control)] border border-[var(--glass-border)]">
              <span className="block text-xs font-medium text-[var(--text-muted)]">
                Receivables (Assets)
              </span>
              <div className="mt-1 text-xl font-bold text-[var(--positive)] num tracking-tight">
                {hideNumbers ? "Rp ••••••" : formatIDR(receivableBig)}
              </div>
              <span className="text-[11px] text-[var(--text-muted)] num block mt-0.5">
                {unpaidReceivableCount} unpaid
              </span>
            </div>
          </div>

          {/* Overdue alert if any */}
          {overdueCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--chart-4)] font-medium mt-3 pt-2 border-t border-[var(--glass-border)]">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{overdueCount} records past due</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
