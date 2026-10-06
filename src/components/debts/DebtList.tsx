"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Trash2,
  Clock,
  Calendar,
  AlertCircle,
  Plus,
} from "lucide-react";
import { formatIDR } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { deleteDebt } from "@/actions/debts";
import {
  RecordPaymentModal,
  type DebtForPayment,
} from "@/components/debts/RecordPaymentModal";

export interface DebtRow {
  id: string;
  type: "debt" | "receivable";
  person_name: string;
  amount: number;
  date: string;
  due_date: string | null;
  note: string | null;
  created_at: string;
  paid_amount: number;
  remaining_amount: number;
  status: "pending" | "partially_paid" | "settled";
  is_overdue: boolean;
}

interface DebtListProps {
  debts: DebtRow[];
  categories: { id: string; name: string }[];
  sources: { id: string; name: string }[];
  hideNumbers?: boolean;
  onOpenCreate?: () => void;
}

export function DebtList({
  debts,
  categories,
  sources,
  hideNumbers = false,
  onOpenCreate,
}: DebtListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedDebtForPayment, setSelectedDebtForPayment] =
    useState<DebtForPayment | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const debtToDelete = debts.find((d) => d.id === deletingId);

  const confirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    const result = await deleteDebt(deletingId);
    setIsDeleting(false);
    setDeletingId(null);

    if (result.error) {
      toast(result.error, "error");
    } else {
      toast("Record deleted successfully", "success");
      router.refresh();
    }
  };

  if (debts.length === 0) {
    return (
      <div className="glass p-8 text-center flex flex-col items-center justify-center space-y-3">
        <p className="text-sm text-[var(--text-muted)]">
          No debts or receivables recorded yet.
        </p>
        {onOpenCreate && (
          <Button variant="primary" onClick={onOpenCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add First Record
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {debts.map((d) => {
          const isDebt = d.type === "debt";
          const percentPaid =
            d.amount > 0
              ? Math.min(100, Math.max(0, Math.round((d.paid_amount * 100) / d.amount)))
              : 0;

          return (
            <div
              key={d.id}
              className="glass p-4 sm:p-5 flex flex-col gap-3 transition-all duration-[var(--dur-fast)]"
            >
              {/* Header row: Badge, Person Name, Status, Overdue */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Type badge */}
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                      isDebt
                        ? "bg-[var(--negative)]/15 text-[var(--negative)]"
                        : "bg-[var(--positive)]/15 text-[var(--positive)]"
                    }`}
                  >
                    {isDebt ? "Debt" : "Receivable"}
                  </span>

                  <span className="font-bold text-base text-[var(--text)] tracking-tight">
                    {d.person_name}
                  </span>

                  {/* Status badge */}
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      d.status === "settled"
                        ? "bg-[var(--positive)]/15 text-[var(--positive)]"
                        : d.status === "partially_paid"
                          ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                          : "bg-black/5 dark:bg-white/10 text-[var(--text-muted)]"
                    }`}
                  >
                    {d.status === "settled"
                      ? "Settled"
                      : d.status === "partially_paid"
                        ? "Partially paid"
                        : "Pending"}
                  </span>

                  {/* Overdue alert badge */}
                  {d.is_overdue && (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[var(--chart-4)]/15 text-[var(--chart-4)] font-semibold">
                      <AlertCircle className="w-3 h-3" />
                      Overdue
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  {d.status !== "settled" && (
                    <Button
                      type="button"
                      variant="primary"
                      className="text-xs px-3 py-1.5 h-auto"
                      onClick={() =>
                        setSelectedDebtForPayment({
                          id: d.id,
                          type: d.type,
                          person_name: d.person_name,
                          amount: d.amount,
                          remaining_amount: d.remaining_amount,
                          paid_amount: d.paid_amount,
                        })
                      }
                    >
                      <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                      {isDebt ? "Pay / Installment" : "Receive Payment"}
                    </Button>
                  )}

                  <button
                    type="button"
                    onClick={() => setDeletingId(d.id)}
                    className="p-1.5 rounded-[var(--radius-control)] text-[var(--text-muted)] hover:text-[var(--negative)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    aria-label={`Delete record for ${d.person_name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Amount and Progress Bar */}
              <div className="pt-2 border-t border-[var(--glass-border)]">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 mb-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-[var(--text-muted)]">Remaining:</span>
                    <span className="text-lg font-bold text-[var(--text)] num">
                      {hideNumbers ? "Rp ••••••" : formatIDR(BigInt(d.remaining_amount))}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] num">
                      of total {hideNumbers ? "Rp ••••••" : formatIDR(BigInt(d.amount))}
                    </span>
                  </div>

                  <div className="text-xs text-[var(--text-muted)] num">
                    Paid: {percentPaid}% (
                    {hideNumbers ? "••••••" : formatIDR(BigInt(d.paid_amount))})
                  </div>
                </div>

                {/* Progress bar track */}
                <div className="h-1.5 w-full bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-[var(--dur-base)] ${
                      d.status === "settled"
                        ? "bg-[var(--positive)]"
                        : isDebt
                          ? "bg-[var(--negative)]"
                          : "bg-[var(--positive)]"
                    }`}
                    style={{ width: `${percentPaid}%` }}
                  />
                </div>
              </div>

              {/* Footer info: Date, Due Date, Note */}
              <div className="flex flex-wrap items-center justify-between text-xs text-[var(--text-muted)] pt-1">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Recorded: {d.date}
                  </span>
                  {d.due_date && (
                    <span
                      className={`inline-flex items-center gap-1 ${
                        d.is_overdue
                          ? "text-[var(--chart-4)] font-semibold"
                          : ""
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Due: {d.due_date}
                    </span>
                  )}
                </div>

                {d.note && (
                  <span className="italic text-[11px] truncate max-w-xs">
                    &ldquo;{d.note}&rdquo;
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Record Payment Modal */}
      {selectedDebtForPayment && (
        <RecordPaymentModal
          key={selectedDebtForPayment.id}
          open={true}
          onClose={() => setSelectedDebtForPayment(null)}
          debt={selectedDebtForPayment}
          categories={categories}
          sources={sources}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deletingId !== null}
        onClose={() => {
          if (!isDeleting) setDeletingId(null);
        }}
        title="Delete Record"
        description={`Are you sure you want to delete the record for "${
          debtToDelete?.person_name || "this entity"
        }"? All related payment history will also be deleted.`}
      >
        <div className="flex items-center justify-end gap-3 mt-4">
          <Button
            variant="secondary"
            onClick={() => setDeletingId(null)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
