"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SegmentedToggle } from "@/components/ui/SegmentedToggle";
import { useToast } from "@/components/ui/Toast";
import { formatIDR } from "@/lib/format";
import { parseAmountInput } from "@/lib/parse";
import {
  createTransaction,
  updateTransaction,
  type TransactionInput,
} from "@/actions/transactions";

interface Category {
  id: string;
  name: string;
}

interface IncomeSource {
  id: string;
  name: string;
}

export interface TransactionFormProps {
  categories: Category[];
  sources: IncomeSource[];
  initialData?: {
    id: string;
    type: "income" | "expense";
    amount: number;
    date: string;
    category_id: string | null;
    source_id: string | null;
    note: string | null;
  };
}

export function TransactionForm({
  categories,
  sources,
  initialData,
}: TransactionFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const isEditing = !!initialData;

  // 1. Amount
  const [displayAmount, setDisplayAmount] = useState<string>(
    initialData ? formatIDR(initialData.amount) : ""
  );
  const [numericAmount, setNumericAmount] = useState<number>(
    initialData ? initialData.amount : 0
  );

  // 2. Type toggle
  const [type, setType] = useState<"expense" | "income">(
    initialData ? initialData.type : "expense"
  );

  // 3. Category / Source (initialized with last-used preference from localStorage)
  const [categoryId, setCategoryId] = useState<string>(() => {
    if (initialData?.category_id) return initialData.category_id;
    if (typeof window !== "undefined") {
      const lastCat = localStorage.getItem("last_category_id");
      if (lastCat && categories.some((c) => c.id === lastCat)) return lastCat;
    }
    return categories[0]?.id || "";
  });

  const [sourceId, setSourceId] = useState<string>(() => {
    if (initialData?.source_id) return initialData.source_id;
    if (typeof window !== "undefined") {
      const lastSrc = localStorage.getItem("last_source_id");
      if (lastSrc && sources.some((s) => s.id === lastSrc)) return lastSrc;
    }
    return sources[0]?.id || "";
  });

  // 4. Date (browser-local today by default)
  const [date, setDate] = useState<string>(() => {
    if (initialData?.date) return initialData.date;
    try {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    } catch {
      return "2026-10-05";
    }
  });

  // 5. Note
  const [note, setNote] = useState<string>(initialData?.note || "");

  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const parsed = parseAmountInput(raw);
    setNumericAmount(parsed);
    setDisplayAmount(parsed > 0 ? formatIDR(parsed) : "");
  };

  const handleTypeChange = (newType: "expense" | "income") => {
    setType(newType);
    if (!initialData) {
      if (newType === "expense" && !categoryId) {
        const lastCat = typeof window !== "undefined" ? localStorage.getItem("last_category_id") : null;
        setCategoryId(lastCat && categories.some((c) => c.id === lastCat) ? lastCat : categories[0]?.id || "");
      } else if (newType === "income" && !sourceId) {
        const lastSrc = typeof window !== "undefined" ? localStorage.getItem("last_source_id") : null;
        setSourceId(lastSrc && sources.some((s) => s.id === lastSrc) ? lastSrc : sources[0]?.id || "");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (numericAmount <= 0) {
      setError("Amount must be greater than 0");
      return;
    }

    if (numericAmount > 9_999_999_999_999) {
      setError("Amount exceeds maximum limit");
      return;
    }

    if (type === "expense" && !categoryId) {
      setError("Please select a category");
      return;
    }

    if (type === "income" && !sourceId) {
      setError("Please select an income source");
      return;
    }

    const payload: TransactionInput =
      type === "expense"
        ? {
            type: "expense",
            amount: numericAmount,
            date,
            category_id: categoryId,
            note: note.trim() || null,
          }
        : {
            type: "income",
            amount: numericAmount,
            date,
            source_id: sourceId,
            note: note.trim() || null,
          };

    setIsSubmitting(true);

    try {
      const res = isEditing
        ? await updateTransaction(initialData.id, payload)
        : await createTransaction(payload);

      if (res.error) {
        setError(res.error);
        toast(res.error, "error");
        setIsSubmitting(false);
        return;
      }

      // Save last-used selection
      if (typeof window !== "undefined") {
        if (type === "expense" && categoryId) {
          localStorage.setItem("last_category_id", categoryId);
        } else if (type === "income" && sourceId) {
          localStorage.setItem("last_source_id", sourceId);
        }
      }

      toast(
        isEditing
          ? "Transaction updated"
          : "Transaction added successfully",
        "success"
      );
      router.back();
    } catch {
      setError("An unexpected error occurred");
      toast("An unexpected error occurred", "error");
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="glass p-6 rounded-[var(--radius-panel)] border border-[var(--glass-border)] max-w-lg mx-auto space-y-5"
    >
      <div className="border-b border-[var(--glass-border)] pb-3">
        <h2 className="text-xl font-semibold text-[var(--text)]">
          {isEditing ? "Edit transaction" : "Add transaction"}
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Target: fast entry in under 10 seconds
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-700 dark:text-red-400"
        >
          {error}
        </div>
      )}

      {/* 1. Amount (autofocus, inputMode="numeric") */}
      <div>
        <label
          htmlFor="amount"
          className="block text-xs font-medium text-[var(--text-muted)] mb-1"
        >
          Amount (IDR)
        </label>
        <input
          id="amount"
          name="amount"
          type="text"
          inputMode="numeric"
          autoFocus
          required
          value={displayAmount}
          onChange={handleAmountChange}
          placeholder="Rp 0"
          className="w-full glass-strong rounded-[var(--radius-control)] border border-[var(--glass-border)] px-4 py-3 text-2xl font-bold num text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
        {numericAmount > 0 && (
          <p className="text-xs text-[var(--text-muted)] mt-1 num">
            = {formatIDR(numericAmount)}
          </p>
        )}
      </div>

      {/* 2. Income / Expense Toggle */}
      <div>
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
          Type
        </label>
        <SegmentedToggle
          value={type}
          onChange={(val) => handleTypeChange(val as "expense" | "income")}
          layoutId="transaction-type-toggle"
          options={[
            { value: "expense", label: "Expense" },
            { value: "income", label: "Income" },
          ]}
        />
      </div>

      {/* 3. Category or Source select (switches with the toggle) */}
      {type === "expense" ? (
        <Select
          label="Category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
      ) : (
        <Select
          label="Income source"
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          options={sources.map((s) => ({ value: s.id, label: s.name }))}
        />
      )}

      {/* 4. Date (browser-local today by default) */}
      <div>
        <label
          htmlFor="date"
          className="block text-xs font-medium text-[var(--text-muted)] mb-1"
        >
          Date
        </label>
        <input
          id="date"
          name="date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full glass-strong rounded-[var(--radius-control)] border border-[var(--glass-border)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
      </div>

      {/* 5. Note */}
      <Input
        label="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What was this for?"
        maxLength={500}
      />

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--glass-border)]">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting
            ? "Saving..."
            : isEditing
            ? "Save changes"
            : "Save transaction"}
        </Button>
      </div>
    </form>
  );
}
