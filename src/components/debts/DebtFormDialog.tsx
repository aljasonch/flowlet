"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { createDebt } from "@/actions/debts";

interface DebtFormDialogProps {
  open: boolean;
  onClose: () => void;
  defaultDate?: string;
}

export function DebtFormDialog({
  open,
  onClose,
  defaultDate,
}: DebtFormDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [type, setType] = useState<"debt" | "receivable">("debt");
  const [personName, setPersonName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(
    defaultDate || new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.set("type", type);
    formData.set("person_name", personName);
    formData.set("amount", amount);
    formData.set("date", date);
    if (dueDate) formData.set("due_date", dueDate);
    if (note) formData.set("note", note);

    const result = await createDebt(null, formData);
    setIsSubmitting(false);

    if (result.error) {
      toast(result.error, "error");
    } else {
      toast(
        type === "debt"
          ? "Debt recorded successfully"
          : "Receivable recorded successfully",
        "success"
      );
      setPersonName("");
      setAmount("");
      setDueDate("");
      setNote("");
      onClose();
      router.refresh();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title={type === "debt" ? "Record New Debt" : "Record New Receivable"}
      description="Track liabilities or receivables outside of realized cash flow."
    >
      <form onSubmit={handleSubmit} className="space-y-4 mt-2">
        {/* Type Selector */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
            Record Type
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 glass-strong rounded-[var(--radius-control)] border border-[var(--glass-border)]">
            <button
              type="button"
              onClick={() => setType("debt")}
              className={`py-1.5 px-3 text-xs font-medium rounded-[var(--radius-control)] transition-all ${
                type === "debt"
                  ? "bg-[var(--negative)] text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              Debt (I Owe)
            </button>
            <button
              type="button"
              onClick={() => setType("receivable")}
              className={`py-1.5 px-3 text-xs font-medium rounded-[var(--radius-control)] transition-all ${
                type === "receivable"
                  ? "bg-[var(--positive)] text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              Receivable (Owed to Me)
            </button>
          </div>
        </div>

        {/* Person / Institution Name */}
        <Input
          label={type === "debt" ? "Lender / Creditor Name" : "Borrower / Debtor Name"}
          placeholder="e.g. John Doe, Bank, etc."
          value={personName}
          onChange={(e) => setPersonName(e.target.value)}
          required
        />

        {/* Amount */}
        <Input
          label="Amount (IDR)"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />

        {/* Dates row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            type="date"
            label="Date Originated"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Input
            type="date"
            label="Due Date (Optional)"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
            Note (Optional)
          </label>
          <input
            type="text"
            className="w-full glass-strong rounded-[var(--radius-control)] border border-[var(--glass-border)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            placeholder="e.g. Home renovation loan"
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
            {isSubmitting ? "Saving..." : "Save Record"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
