"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = unknown> = {
  success?: boolean;
  error?: string;
  data?: T;
};

const MAX_AMOUNT = 9_999_999_999_999;

const expenseSchema = z.object({
  type: z.literal("expense"),
  amount: z
    .number()
    .int("Amount must be an integer")
    .min(1, "Amount must be greater than 0")
    .max(MAX_AMOUNT, "Amount exceeds maximum limit"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  category_id: z.string().uuid("Category is required"),
  source_id: z.null().optional(),
  note: z
    .string()
    .max(500, "Note cannot exceed 500 characters")
    .nullable()
    .optional(),
});

const incomeSchema = z.object({
  type: z.literal("income"),
  amount: z
    .number()
    .int("Amount must be an integer")
    .min(1, "Amount must be greater than 0")
    .max(MAX_AMOUNT, "Amount exceeds maximum limit"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  source_id: z.string().uuid("Income source is required"),
  category_id: z.null().optional(),
  note: z
    .string()
    .max(500, "Note cannot exceed 500 characters")
    .nullable()
    .optional(),
});

const transactionSchema = z.discriminatedUnion("type", [
  expenseSchema,
  incomeSchema,
]);

export type TransactionInput = z.infer<typeof transactionSchema>;

const idSchema = z.string().uuid("Invalid transaction ID");

export async function createTransaction(
  data: TransactionInput
): Promise<ActionResult> {
  const parsed = transactionSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid transaction" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const payload = {
    user_id: user.id,
    type: parsed.data.type,
    amount: parsed.data.amount,
    date: parsed.data.date,
    category_id:
      parsed.data.type === "expense" ? parsed.data.category_id : null,
    source_id: parsed.data.type === "income" ? parsed.data.source_id : null,
    note: parsed.data.note || null,
  };

  const { error } = await supabase.from("transactions").insert(payload);

  if (error) {
    return { error: "Failed to create transaction" };
  }

  revalidatePath("/transactions");
  revalidatePath("/");

  return { success: true };
}

export async function updateTransaction(
  id: string,
  data: TransactionInput
): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) {
    return { error: parsedId.error.issues[0]?.message ?? "Invalid transaction ID" };
  }

  const parsed = transactionSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid transaction" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const payload = {
    type: parsed.data.type,
    amount: parsed.data.amount,
    date: parsed.data.date,
    category_id:
      parsed.data.type === "expense" ? parsed.data.category_id : null,
    source_id: parsed.data.type === "income" ? parsed.data.source_id : null,
    note: parsed.data.note || null,
  };

  const { error } = await supabase
    .from("transactions")
    .update(payload)
    .eq("id", parsedId.data)
    .eq("user_id", user.id);

  if (error) {
    return { error: "Failed to update transaction" };
  }

  revalidatePath("/transactions");
  revalidatePath("/");

  return { success: true };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) {
    return { error: parsedId.error.issues[0]?.message ?? "Invalid transaction ID" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", parsedId.data)
    .eq("user_id", user.id);

  if (error) {
    return { error: "Failed to delete transaction" };
  }

  revalidatePath("/transactions");
  revalidatePath("/");

  return { success: true };
}
