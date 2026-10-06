"use client";

import React, { useState, useOptimistic, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Edit2, Trash2, Search, Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { formatIDR } from "@/lib/format";
import { deleteTransaction } from "@/actions/transactions";

export interface TransactionListItem {
  id: string;
  type: "income" | "expense";
  amount: number;
  date: string;
  note: string | null;
  category?: { id: string; name: string } | null;
  source?: { id: string; name: string } | null;
}

interface FilterOption {
  id: string;
  name: string;
}

export interface TransactionListProps {
  initialTransactions: TransactionListItem[];
  categories: FilterOption[];
  sources: FilterOption[];
  currentPeriodLabel: string;
  totalCount: number;
}

export function TransactionList({
  initialTransactions,
  categories,
  sources,
  currentPeriodLabel,
  totalCount,
}: TransactionListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  // Optimistic list of transactions
  const [optimisticTransactions, setOptimisticTransactions] = useOptimistic(
    initialTransactions,
    (state, deletedId: string) => state.filter((t) => t.id !== deletedId)
  );

  // Filters from URL
  const selectedMonth = searchParams.get("month") || currentPeriodLabel;
  const selectedType = searchParams.get("type") || "all";
  const selectedEntity = searchParams.get("entityId") || "all";
  const searchQuery = searchParams.get("q") || "";

  // Delete modal state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // When changing type, reset entity filter
    if (key === "type") {
      params.delete("entityId");
    }
    // Reset limit
    params.delete("limit");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = (formData.get("q") as string) || "";
    updateFilters("q", query);
  };

  const handleLoadMore = () => {
    const params = new URLSearchParams(searchParams.toString());
    const currentLimit = parseInt(params.get("limit") || "50", 10);
    params.set("limit", String(currentLimit + 50));
    router.push(`${pathname}?${params.toString()}`);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    const targetId = deletingId;
    setDeletingId(null);
    setIsDeleting(true);

    startTransition(async () => {
      setOptimisticTransactions(targetId);
      const res = await deleteTransaction(targetId);
      setIsDeleting(false);

      if (res.error) {
        toast(res.error, "error");
      } else {
        toast("Transaction deleted", "success");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header and Add button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">Transactions</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Period: {selectedMonth} ({totalCount} total)
          </p>
        </div>
        <Link
          href="/transactions/new"
          className="inline-flex items-center justify-center gap-2 py-2 px-4 rounded-[var(--radius-control)] bg-[var(--accent)] text-[var(--accent-contrast)] text-sm font-medium hover:opacity-90 transition-opacity active:scale-[0.98] shadow-sm self-start sm:self-auto"
        >
          <Plus size={18} strokeWidth={1.75} />
          <span>Add transaction</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass p-4 rounded-[var(--radius-panel)] border border-[var(--glass-border)] space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
          <Filter size={14} strokeWidth={1.75} />
          <span>Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Month input / filter */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
              Period (YYYY-MM)
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => updateFilters("month", e.target.value)}
              className="w-full glass-strong rounded-[var(--radius-control)] border border-[var(--glass-border)] px-3 py-1.5 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          {/* Type filter */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
              Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => updateFilters("type", e.target.value)}
              className="w-full glass-strong rounded-[var(--radius-control)] border border-[var(--glass-border)] px-3 py-1.5 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="all">All transactions</option>
              <option value="expense">Expenses</option>
              <option value="income">Income</option>
            </select>
          </div>

          {/* Category or Source filter (shown only when type is chosen) */}
          {selectedType !== "all" && (
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                {selectedType === "expense" ? "Category" : "Income source"}
              </label>
              <select
                value={selectedEntity}
                onChange={(e) => updateFilters("entityId", e.target.value)}
                className="w-full glass-strong rounded-[var(--radius-control)] border border-[var(--glass-border)] px-3 py-1.5 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                <option value="all">
                  All {selectedType === "expense" ? "categories" : "sources"}
                </option>
                {(selectedType === "expense" ? categories : sources).map(
                  (opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  )
                )}
              </select>
            </div>
          )}

          {/* Note Search Form */}
          <form onSubmit={handleSearchSubmit} className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
              Search note
            </label>
            <div className="relative">
              <input
                name="q"
                type="text"
                defaultValue={searchQuery}
                placeholder="Search..."
                className="w-full glass-strong rounded-[var(--radius-control)] border border-[var(--glass-border)] pl-8 pr-3 py-1.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
              />
            </div>
          </form>
        </div>
      </div>

      {/* Transaction Table / List */}
      <div className="glass rounded-[var(--radius-panel)] border border-[var(--glass-border)] overflow-hidden shadow-sm">
        {optimisticTransactions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm text-[var(--text-muted)]">
              No transactions found for this period.
            </p>
            <Link
              href="/transactions/new"
              className="inline-flex items-center justify-center py-2 px-4 rounded-[var(--radius-control)] bg-[var(--accent)] text-[var(--accent-contrast)] text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Add transaction
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--glass-border)]">
            <AnimatePresence initial={false}>
              {optimisticTransactions.map((tx) => {
                const isExpense = tx.type === "expense";
                const label = isExpense
                  ? tx.category?.name || "Uncategorized"
                  : tx.source?.name || "Income";

                return (
                  <motion.li
                    key={tx.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                    transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[var(--text)] truncate">
                          {label}
                        </span>
                        <span className="text-xs text-[var(--text-muted)] shrink-0">
                          {tx.date}
                        </span>
                      </div>
                      {tx.note && (
                        <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                          {tx.note}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-3">
                      <span
                        className={`text-sm font-bold num ${
                          isExpense
                            ? "text-[var(--text)]"
                            : "text-[var(--positive)]"
                        }`}
                      >
                        {isExpense ? "-" : "+"}
                        {formatIDR(tx.amount)}
                      </span>

                      <div className="flex items-center gap-1">
                        <Link
                          href={`/transactions/${tx.id}/edit`}
                          className="p-1 rounded-[var(--radius-control)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                          aria-label="Edit transaction"
                        >
                          <Edit2 size={16} strokeWidth={1.75} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeletingId(tx.id)}
                          disabled={isDeleting}
                          className="p-1 rounded-[var(--radius-control)] text-[var(--text-muted)] hover:text-[var(--negative)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none"
                          aria-label="Delete transaction"
                        >
                          <Trash2 size={16} strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}

        {/* Load More Button */}
        {optimisticTransactions.length < totalCount && (
          <div className="p-4 border-t border-[var(--glass-border)] text-center">
            <Button variant="secondary" size="sm" onClick={handleLoadMore}>
              Load more transactions
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Delete transaction"
        description="Are you sure you want to delete this transaction? This action cannot be undone."
      >
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeletingId(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
