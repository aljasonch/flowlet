"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { formatIDR } from "@/lib/format";
import { recordDebtPayment } from "@/actions/debts";

export interface DebtForPayment {
  id: string;
  type: "debt" | "receivable";
  person_name: string;
  amount: number;
  remaining_amount: number;
  paid_amount: number;
}

interface RecordPaymentModalProps {
  open: boolean;
  onClose: () => void;
  debt: DebtForPayment | null;
  categories: { id: string; name: string }[];
  sources: { id: string; name: string }[];
}

export function RecordPaymentModal({
  open,
  onClose,
  debt,
  categories,
  sources,
}: RecordPaymentModalProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [amount, setAmount] = useState(() =>
    debt ? String(debt.remaining_amount) : ""
  );
  const [paymentDate, setPaymentDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [recordToCashflow, setRecordToCashflow] = useState(true);
  const [categoryId, setCategoryId] = useState(() =>
    debt?.type === "debt" && categories.length > 0 ? categories[0].id : ""
  );
  const [sourceId, setSourceId] = useState(() =>
    debt?.type === "receivable" && sources.length > 0 ? sources[0].id : ""
  );
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!debt) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.set("amount", amount);
    formData.set("payment_date", paymentDate);
    formData.set("record_to_cashflow", String(recordToCashflow));
    if (recordToCashflow) {
      if (debt.type === "debt" && categoryId) {
        formData.set("category_id", categoryId);
      }
      if (debt.type === "receivable" && sourceId) {
        formData.set("source_id", sourceId);
      }
    }
    if (note) formData.set("note", note);

    const result = await recordDebtPayment(debt.id, null, formData);
    setIsSubmitting(false);

    if (result.error) {
      toast(result.error, "error");
    } else {
      toast(
        debt.type === "debt"
          ? "Debt payment recorded successfully"
          : "Receivable payment recorded successfully",
        "success"
      );
      onClose();
      router.refresh();
    }
  };

  const isDebt = debt.type === "debt";

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title={isDebt ? "Pay Debt / Installment" : "Receive Payment / Installment"}
      description={`Entity: ${debt.person_name} · Remaining Balance: ${formatIDR(
        BigInt(debt.remaining_amount)
      )}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 mt-2">
        {/* Amount Input */}
        <div>
          <Input
            label="Payment Amount (IDR)"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mt-1">
            <span>Remaining balance: {formatIDR(BigInt(debt.remaining_amount))}</span>
            <button
              type="button"
              onClick={() => setAmount(String(debt.remaining_amount))}
              className="text-[var(--accent)] hover:underline font-medium"
            >
              Pay Full Balance
            </button>
          </div>
        </div>

        {/* Date Input */}
        <Input
          type="date"
          label="Payment Date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
          required
        />

        {/* Cashflow Sync Option */}
        <div className="p-3 glass-strong rounded-[var(--radius-control)] border border-[var(--glass-border)] space-y-3">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={recordToCashflow}
              onChange={(e) => setRecordToCashflow(e.target.checked)}
              className="mt-0.5 rounded border-[var(--glass-border)] text-[var(--accent)] focus:ring-[var(--accent)]"
            />
            <div>
              <span className="text-xs font-semibold text-[var(--text)] block">
                Record to Cash Flow transaction history
              </span>
              <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">
                {isDebt
                  ? "Automatically creates a Realized Expense transaction on the payment date."
                  : "Automatically creates a Realized Income transaction on the payment date."}
              </span>
            </div>
          </label>

          {recordToCashflow && (
            <div className="pt-2 border-t border-[var(--glass-border)]">
              {isDebt ? (
                <Select
                  label="Expense Category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  options={categories.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                  required
                />
              ) : (
                <Select
                  label="Income Source"
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  options={sources.map((s) => ({
                    value: s.id,
                    label: s.name,
                  }))}
                  required
                />
              )}
            </div>
          )}
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
            Payment Note (Optional)
          </label>
          <input
            type="text"
            className="w-full glass-strong rounded-[var(--radius-control)] border border-[var(--glass-border)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            placeholder={isDebt ? "e.g., 1st installment" : "e.g., Bank transfer"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--glass-border)]">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : "Confirm Payment"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
