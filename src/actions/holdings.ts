"use server";

import { z } from "zod";
import Decimal from "decimal.js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseDecimalInput } from "@/lib/parse";

const ASSET_TYPES = [
  "stock",
  "crypto",
  "fund",
  "gold",
  "bond",
  "other",
] as const;

export type AssetType = (typeof ASSET_TYPES)[number];
export type PriceCurrency = "IDR" | "USD";
export type PriceSource = "manual" | "coingecko";

const holdingSchema = z
  .object({
    asset_type: z.enum(ASSET_TYPES),
    symbol: z
      .string()
      .trim()
      .min(1, "Symbol is required")
      .max(40, "Symbol cannot exceed 40 characters"),
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(100, "Name cannot exceed 100 characters"),
    platform: z
      .string()
      .trim()
      .max(50, "Platform cannot exceed 50 characters")
      .nullable()
      .optional(),
    quantity: z.string().min(1, "Quantity is required"),
    avg_cost: z.string().min(1, "Average cost is required"),
    price_currency: z.enum(["IDR", "USD"]).default("IDR"),
    price_source: z.enum(["manual", "coingecko"]).default("manual"),
    provider_ref: z.string().trim().nullable().optional(),
    manual_price: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    // 1. Validate quantity
    const parsedQty = parseDecimalInput(data.quantity);
    if (!parsedQty) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid quantity",
        path: ["quantity"],
      });
    } else {
      try {
        const d = new Decimal(parsedQty);
        if (!d.gt(0)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Quantity must be greater than 0",
            path: ["quantity"],
          });
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid quantity format",
          path: ["quantity"],
        });
      }
    }

    // 2. Validate average cost
    const parsedCost = parseDecimalInput(data.avg_cost);
    if (!parsedCost) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid average cost",
        path: ["avg_cost"],
      });
    } else {
      try {
        const d = new Decimal(parsedCost);
        if (!d.gte(0)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Average cost must be 0 or greater",
            path: ["avg_cost"],
          });
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid average cost format",
          path: ["avg_cost"],
        });
      }
    }

    // 3. Validate manual price if provided
    if (data.manual_price && data.manual_price.trim() !== "") {
      const parsedPrice = parseDecimalInput(data.manual_price);
      if (!parsedPrice) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid price",
          path: ["manual_price"],
        });
      } else {
        try {
          const d = new Decimal(parsedPrice);
          if (!d.gte(0)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Price must be 0 or greater",
              path: ["manual_price"],
            });
          }
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid price format",
            path: ["manual_price"],
          });
        }
      }
    }

    // 4. Provider rules
    if (data.price_source === "manual" && data.provider_ref) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider ref is not allowed for manual price source",
        path: ["provider_ref"],
      });
    }
    if (data.price_source === "coingecko") {
      if (data.asset_type !== "crypto") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "CoinGecko is only available for crypto assets",
          path: ["price_source"],
        });
      }
      if (!data.provider_ref || data.provider_ref.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "CoinGecko coin ID is required",
          path: ["provider_ref"],
        });
      }
    }
  });

export type HoldingInput = z.infer<typeof holdingSchema>;

export async function createHolding(input: HoldingInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const parsed = holdingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Invalid holding input",
    };
  }

  const data = parsed.data;
  const quantity = parseDecimalInput(data.quantity)!;
  const avgCost = parseDecimalInput(data.avg_cost)!;
  const manualPrice =
    data.manual_price && data.manual_price.trim() !== ""
      ? parseDecimalInput(data.manual_price)
      : null;

  const { data: inserted, error } = await supabase
    .from("holdings")
    .insert({
      user_id: user.id,
      asset_type: data.asset_type,
      symbol: data.symbol,
      name: data.name,
      platform: data.platform || null,
      quantity,
      avg_cost: avgCost,
      price_currency: data.price_currency,
      price_source: data.price_source,
      provider_ref:
        data.price_source === "coingecko" ? data.provider_ref : null,
      manual_price: data.price_source === "manual" ? manualPrice : null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/portfolio");
  revalidatePath("/");
  return { success: true, id: inserted?.id };
}

export async function updateHolding(id: string, input: HoldingInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const parsed = holdingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Invalid holding input",
    };
  }

  const data = parsed.data;
  const quantity = parseDecimalInput(data.quantity)!;
  const avgCost = parseDecimalInput(data.avg_cost)!;
  const manualPrice =
    data.manual_price && data.manual_price.trim() !== ""
      ? parseDecimalInput(data.manual_price)
      : null;

  const { error } = await supabase
    .from("holdings")
    .update({
      asset_type: data.asset_type,
      symbol: data.symbol,
      name: data.name,
      platform: data.platform || null,
      quantity,
      avg_cost: avgCost,
      price_currency: data.price_currency,
      price_source: data.price_source,
      provider_ref:
        data.price_source === "coingecko" ? data.provider_ref : null,
      manual_price: data.price_source === "manual" ? manualPrice : null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/portfolio");
  revalidatePath("/");
  return { success: true };
}

export async function deleteHolding(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("holdings")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/portfolio");
  revalidatePath("/");
  return { success: true };
}
