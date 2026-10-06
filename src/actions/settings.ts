"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fetchLiveUsdIdrRate } from "@/lib/prices/fx";

export type ActionResult<T = unknown> = {
  success?: boolean;
  error?: string;
  data?: T;
};

const monthStartDaySchema = z.number().int().min(1).max(31);
const usdIdrRateSchema = z.number().positive("Rate must be greater than 0");
const nameSchema = z
  .string()
  .trim()
  .min(1, "Name cannot be empty")
  .max(50, "Name cannot exceed 50 characters");

export async function updateMonthStartDay(day: number): Promise<ActionResult> {
  const parsed = monthStartDaySchema.safeParse(day);
  if (!parsed.success) {
    return { error: "Month start day must be between 1 and 31" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ month_start_day: parsed.data })
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/transactions");

  return { success: true };
}

export async function updateUsdIdrRate(
  rate: number | null
): Promise<ActionResult> {
  if (rate !== null) {
    const parsed = usdIdrRateSchema.safeParse(rate);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid rate" };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const now = rate !== null ? new Date().toISOString() : null;

  const { error } = await supabase
    .from("profiles")
    .update({
      usd_idr_rate: rate,
      usd_idr_rate_updated_at: now,
    })
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/portfolio");

  return { success: true };
}

export async function refreshLiveExchangeRate(): Promise<
  ActionResult<{ rate: number }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    const rate = await fetchLiveUsdIdrRate();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("profiles")
      .update({
        usd_idr_rate: rate,
        usd_idr_rate_updated_at: now,
      })
      .eq("user_id", user.id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/settings");
    revalidatePath("/portfolio");

    return { success: true, data: { rate } };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to fetch live exchange rate",
    };
  }
}

export async function addCategory(name: string): Promise<ActionResult> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid category name" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name: parsed.data,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "That name already exists" };
    }
    return { error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/transactions");

  return { success: true };
}

export async function renameCategory(
  id: string,
  name: string
): Promise<ActionResult> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid category name" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("categories")
    .update({ name: parsed.data })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "That name already exists" };
    }
    return { error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/transactions");

  return { success: true };
}

export async function toggleArchiveCategory(
  id: string,
  is_archived: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("categories")
    .update({ is_archived })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/transactions");

  return { success: true };
}

export async function addIncomeSource(name: string): Promise<ActionResult> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid source name" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase.from("income_sources").insert({
    user_id: user.id,
    name: parsed.data,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "That name already exists" };
    }
    return { error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/transactions");

  return { success: true };
}

export async function renameIncomeSource(
  id: string,
  name: string
): Promise<ActionResult> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid source name" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("income_sources")
    .update({ name: parsed.data })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "That name already exists" };
    }
    return { error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/transactions");

  return { success: true };
}

export async function toggleArchiveIncomeSource(
  id: string,
  is_archived: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("income_sources")
    .update({ is_archived })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/transactions");

  return { success: true };
}
