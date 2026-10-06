"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseAmountInput } from "@/lib/parse";

export type ActionResult<T = unknown> = {
  success?: boolean;
  error?: string;
  data?: T;
};

const MAX_AMOUNT = 9_999_999_999_999;

const debtSchema = z.object({
  type: z.enum(["debt", "receivable"], {
    message: "Type must be either debt or receivable",
  }),
  person_name: z
    .string()
    .min(1, "Person or institution name is required")
    .max(100, "Name cannot exceed 100 characters"),
  amount: z
    .number()
    .int("Amount must be an integer")
    .min(1, "Amount must be greater than 0")
    .max(MAX_AMOUNT, "Amount exceeds maximum limit"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid due date format")
    .nullable()
    .optional(),
  note: z
    .string()
    .max(500, "Note cannot exceed 500 characters")
    .nullable()
    .optional(),
});

export async function createDebt(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const rawDueDate = formData.get("due_date") as string;
  const rawNote = formData.get("note") as string;

  const rawData = {
    type: formData.get("type"),
    person_name: (formData.get("person_name") as string)?.trim(),
    amount: parseAmountInput((formData.get("amount") as string) || ""),
    date: formData.get("date"),
    due_date: rawDueDate && rawDueDate.trim() !== "" ? rawDueDate.trim() : null,
    note: rawNote && rawNote.trim() !== "" ? rawNote.trim() : null,
  };

  const validation = debtSchema.safeParse(rawData);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message ?? "Invalid debt input" };
  }

  const { error } = await supabase.from("debts").insert({
    user_id: user.id,
    type: validation.data.type,
    person_name: validation.data.person_name,
    amount: validation.data.amount,
    date: validation.data.date,
    due_date: validation.data.due_date || null,
    note: validation.data.note || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/debts");
  revalidatePath("/transactions");
  revalidatePath("/");
  return { success: true };
}

export async function recordDebtPayment(
  debtId: string,
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Fetch the debt to check ownership and remaining balance
  const { data: debt, error: debtError } = await supabase
    .from("debts")
    .select("*")
    .eq("id", debtId)
    .eq("user_id", user.id)
    .single();

  if (debtError || !debt) {
    return { error: "Debt or receivable not found" };
  }

  const amount = parseAmountInput((formData.get("amount") as string) || "");
  const paymentDate = (formData.get("payment_date") as string) || "";
  const recordToCashflow = formData.get("record_to_cashflow") === "true";
  const categoryId = (formData.get("category_id") as string) || null;
  const sourceId = (formData.get("source_id") as string) || null;
  const rawNote = (formData.get("note") as string) || null;
  const note = rawNote && rawNote.trim() !== "" ? rawNote.trim() : null;

  if (amount <= 0) {
    return { error: "Payment amount must be greater than 0" };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
    return { error: "Invalid payment date format" };
  }

  if (recordToCashflow) {
    if (debt.type === "debt" && !categoryId) {
      return { error: "Expense category is required when recording to cash flow" };
    }
    if (debt.type === "receivable" && !sourceId) {
      return { error: "Income source is required when recording to cash flow" };
    }
  }

  let transactionId: string | null = null;

  if (recordToCashflow) {
    const txNote =
      note ||
      (debt.type === "debt"
        ? `Debt payment to ${debt.person_name}`
        : `Receivable collection from ${debt.person_name}`);

    const txInsert =
      debt.type === "debt"
        ? supabase.from("transactions").insert({
            user_id: user.id,
            type: "expense",
            amount,
            date: paymentDate,
            category_id: categoryId!,
            source_id: null,
            note: txNote,
          })
        : supabase.from("transactions").insert({
            user_id: user.id,
            type: "income",
            amount,
            date: paymentDate,
            source_id: sourceId!,
            category_id: null,
            note: txNote,
          });

    const { data: newTx, error: txError } = await txInsert
      .select("id")
      .single();

    if (txError || !newTx) {
      return { error: txError?.message || "Failed to create cash flow transaction" };
    }
    transactionId = newTx.id;
  }

  const { error: paymentError } = await supabase.from("debt_payments").insert({
    debt_id: debtId,
    user_id: user.id,
    amount,
    payment_date: paymentDate,
    transaction_id: transactionId,
    note,
  });

  if (paymentError) {
    return { error: paymentError.message };
  }

  revalidatePath("/debts");
  revalidatePath("/transactions");
  revalidatePath("/");
  return { success: true };
}

export async function deleteDebt(debtId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("debts")
    .delete()
    .eq("id", debtId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/debts");
  revalidatePath("/transactions");
  revalidatePath("/");
  return { success: true };
}

export async function deleteDebtPayment(paymentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("debt_payments")
    .delete()
    .eq("id", paymentId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/debts");
  revalidatePath("/transactions");
  revalidatePath("/");
  return { success: true };
}
