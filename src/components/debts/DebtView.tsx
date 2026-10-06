"use client";

import React, { useState } from "react";
import { Plus, AlertCircle, Eye, EyeOff } from "lucide-react";
import { formatIDR } from "@/lib/format";
import { usePrivacyMode, togglePrivacyMode } from "@/lib/privacy";
import { Button } from "@/components/ui/Button";
import { DebtList, type DebtRow } from "@/components/debts/DebtList";
import { DebtFormDialog } from "@/components/debts/DebtFormDialog";

export interface DebtsSummaryData {
  total_unpaid_debt: number | bigint;
  total_unpaid_receivable: number | bigint;
  unpaid_debt_count: number;
  unpaid_receivable_count: number;
  overdue_count: number;
}

interface DebtViewProps {
  initialDebts: DebtRow[];
  categories: { id: string; name: string }[];
  sources: { id: string; name: string }[];
  summary: DebtsSummaryData;
}

export function DebtView({
  initialDebts,
  categories,
  sources,
  summary,
}: DebtViewProps) {
  const hideNumbers = usePrivacyMode();
  const [typeFilter, setTypeFilter] = useState<"all" | "debt" | "receivable">(
    "all"
  );
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Filter logic
  const filteredDebts = initialDebts.filter((d) => {
    if (typeFilter !== "all" && d.type !== typeFilter) return false;
    if (statusFilter === "active" && d.status === "settled") return false;
    return true;
  });

  const unpaidDebtBig = BigInt(summary.total_unpaid_debt);
  const unpaidReceivableBig = BigInt(summary.total_unpaid_receivable);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Utang Card */}
        <div className="glass p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[var(--text-muted)]">
              Total Active Debts (Liabilities)
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--negative)]/15 text-[var(--negative)] font-semibold">
              {summary.unpaid_debt_count} unpaid
            </span>
          </div>
          <div className="text-2xl font-bold text-[var(--negative)] num tracking-tight mt-2">
            {hideNumbers ? "Rp ••••••" : formatIDR(unpaidDebtBig)}
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">
            Money you owe to others
          </p>
        </div>

        {/* Piutang Card */}
        <div className="glass p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[var(--text-muted)]">
              Total Active Receivables (Assets)
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--positive)]/15 text-[var(--positive)] font-semibold">
              {summary.unpaid_receivable_count} unpaid
            </span>
          </div>
          <div className="text-2xl font-bold text-[var(--positive)] num tracking-tight mt-2">
            {hideNumbers ? "Rp ••••••" : formatIDR(unpaidReceivableBig)}
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">
            Money owed to you by others
          </p>
        </div>
      </div>

      {/* Overdue Warning Banner if any */}
      {summary.overdue_count > 0 && (
        <div className="glass p-4 border border-[var(--chart-4)]/40 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--chart-4)] shrink-0" />
          <div className="text-xs">
            <span className="font-semibold text-[var(--text)]">
              You have {summary.overdue_count} records past their due date!
            </span>
            <p className="text-[var(--text-muted)] mt-0.5">
              Check records marked with &ldquo;Overdue&rdquo; below to settle them promptly.
            </p>
          </div>
        </div>
      )}

      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass p-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter Buttons */}
          <div className="inline-flex rounded-[var(--radius-control)] p-1 glass-strong border border-[var(--glass-border)] text-xs">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={`px-3 py-1 rounded-[var(--radius-control)] transition-colors ${
                typeFilter === "all"
                  ? "bg-[var(--accent)] text-[var(--accent-contrast)] font-medium"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("debt")}
              className={`px-3 py-1 rounded-[var(--radius-control)] transition-colors ${
                typeFilter === "debt"
                  ? "bg-[var(--negative)] text-white font-medium"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              Debts
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("receivable")}
              className={`px-3 py-1 rounded-[var(--radius-control)] transition-colors ${
                typeFilter === "receivable"
                  ? "bg-[var(--positive)] text-white font-medium"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              Receivables
            </button>
          </div>

          {/* Status Filter Buttons */}
          <div className="inline-flex rounded-[var(--radius-control)] p-1 glass-strong border border-[var(--glass-border)] text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1 rounded-[var(--radius-control)] transition-colors ${
                statusFilter === "active"
                  ? "bg-[var(--accent)] text-[var(--accent-contrast)] font-medium"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              Unpaid
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-[var(--radius-control)] transition-colors ${
                statusFilter === "all"
                  ? "bg-[var(--accent)] text-[var(--accent-contrast)] font-medium"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              All Statuses
            </button>
          </div>
        </div>

        {/* Actions: Privacy Toggle & Create Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="ghost"
            onClick={togglePrivacyMode}
            className="p-2 shrink-0"
            aria-label={hideNumbers ? "Show balances" : "Hide balances"}
            title={hideNumbers ? "Show balances" : "Hide balances"}
          >
            {hideNumbers ? (
              <EyeOff className="w-4 h-4 text-[var(--text-muted)]" />
            ) : (
              <Eye className="w-4 h-4 text-[var(--text-muted)]" />
            )}
          </Button>

          <Button
            variant="primary"
            onClick={() => setIsCreateOpen(true)}
            className="flex-1 sm:flex-initial"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Record Debt / Receivable
          </Button>
        </div>
      </div>

      {/* Debt List */}
      <DebtList
        debts={filteredDebts}
        categories={categories}
        sources={sources}
        hideNumbers={hideNumbers}
        onOpenCreate={() => setIsCreateOpen(true)}
      />

      {/* Create Dialog */}
      <DebtFormDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
}
